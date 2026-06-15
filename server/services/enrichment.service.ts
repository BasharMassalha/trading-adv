/**
 * Portfolio enrichment service.
 *
 * Responsibilities:
 *  1. Load a portfolio's holdings from the DB.
 *  2. Fetch asset profiles + latest quotes + 1-year price history from the
 *     configured market-data provider (Yahoo Finance by default).
 *  3. Persist enriched data (asset metadata, price history, holding snapshots).
 *  4. Recalculate portfolio-level metrics (total value, total gain/loss).
 *  5. Return a rich view type that the UI can render directly.
 *
 * CACHING STRATEGY
 * ────────────────
 * - Profile data: Cached in-memory for 1 hour (rarely changes)
 * - Quote data: Cached in-memory for 5 minutes (frequent during market hours)
 * - Historical data: Cached in-memory for 1 hour (daily candles change once/day)
 * - DB-level: Uses `lastEnrichedAt` to skip recently enriched assets
 *
 * ERROR HANDLING
 * ──────────────
 * - Individual ticker failures don't break the entire enrichment
 * - Failed tickers are logged and returned in the result
 * - Rate limits are handled gracefully with exponential backoff
 */

import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { getMarketDataProvider, getProviderName } from "@/lib/market-data/provider";
import type { HistoricalRange } from "@/lib/market-data/types";
import { assetRepository } from "@/server/repositories/asset.repository";
import { priceHistoryRepository } from "@/server/repositories/price-history.repository";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { NotFoundError } from "@/lib/errors";

/** Minimum time between full enrichments for an asset (in milliseconds) */
const ENRICHMENT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if an asset was recently enriched and can be skipped.
 */
function wasRecentlyEnriched(lastEnrichedAt: Date | null): boolean {
  if (!lastEnrichedAt) return false;
  return Date.now() - lastEnrichedAt.getTime() < ENRICHMENT_COOLDOWN_MS;
}

/**
 * Simple delay helper for rate limit handling.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysToRange(days: number): HistoricalRange {
  if (days <= 31) return "1M";
  if (days <= 92) return "3M";
  if (days <= 182) return "6M";
  if (days <= 365) return "1Y";
  if (days <= 730) return "2Y";
  return "5Y";
}

function normalizeToIndex(
  points: { date: string; value: number }[],
): { date: string; value: number }[] {
  if (points.length === 0) return [];
  const base = points[0].value;
  if (base === 0) return points.map((p) => ({ date: p.date, value: 100 }));
  return points.map((p) => ({
    date: p.date,
    value: Math.round((p.value / base) * 1000) / 10,
  }));
}

function returnPctFromIndex(
  points: { date: string; value: number }[],
): number | null {
  if (points.length < 2) return null;
  const start = points[0].value;
  const end = points[points.length - 1].value;
  if (start === 0) return null;
  return Math.round(((end - start) / start) * 1000) / 10;
}

export type PerformanceComparison = {
  portfolio: { date: string; value: number }[];
  benchmark: { date: string; value: number }[];
  combined: { date: string; portfolio: number; benchmark?: number }[];
  benchmarkSymbol: string;
  portfolioReturnPct: number | null;
  benchmarkReturnPct: number | null;
};

// ---------------------------------------------------------------------------
// View types — what the UI consumes
// ---------------------------------------------------------------------------

export type HoldingView = {
  id: string;
  symbol: string;
  name: string;
  type: string;
  sector: string | null;
  exchange: string | null;
  quantity: number;
  averageCost: number | null;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  marketValue: number | null;
  costBasis: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  weight: number | null;
  /** true if the asset has been enriched (has a latestPrice) */
  isEnriched: boolean;
};

export type PortfolioView = {
  id: string;
  name: string;
  source: string;
  baseCurrency: string;
  totalValue: number | null;
  totalCost: number | null;
  totalGain: number | null;
  totalGainPct: number | null;
  lastEnrichedAt: Date | null;
  holdingCount: number;
  sectorAllocation: { name: string; value: number }[];
  holdings: HoldingView[];
};

export type EnrichmentResult = {
  portfolioId: string;
  enrichedCount: number;
  failedTickers: string[];
  totalValue: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const enrichmentService = {
  /**
   * Run a full enrichment cycle for a portfolio:
   *  - fetch fresh market data for every held ticker
   *  - upsert asset records + price history
   *  - update holding snapshots (marketValue, unrealizedGainLoss, weight)
   *  - update portfolio totals
   *
   * Options:
   *  - forceRefresh: Skip the cooldown check and refresh all assets
   */
  async enrich(
    portfolioId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<EnrichmentResult> {
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio) throw new NotFoundError("Portfolio not found.");
    if (portfolio.holdings.length === 0) {
      return { portfolioId, enrichedCount: 0, failedTickers: [], totalValue: 0 };
    }

    const provider = getMarketDataProvider();
    const providerName = getProviderName();
    const failedTickers: string[] = [];
    const skippedTickers: string[] = [];
    const forceRefresh = options?.forceRefresh ?? false;

    console.log(
      `[enrichment] Starting enrichment for portfolio ${portfolioId} using ${providerName} provider`,
    );

    // ── Phase 1: fetch market data for all tickers ─────────────────────────
    type FetchedData = {
      holdingId: string;
      assetId: string;
      symbol: string;
      quantity: number;
      averageCost: number | null;
      price: number;
      change: number;
      changePercent: number;
    };

    const fetched: FetchedData[] = [];

    // Process holdings sequentially with small delay to avoid rate limits
    // This is safer for free API tiers like Yahoo Finance
    for (const holding of portfolio.holdings) {
      const symbol = holding.asset.symbol;
      const lastEnriched = holding.asset.lastEnrichedAt;

      // Skip recently enriched assets unless force refresh
      if (!forceRefresh && wasRecentlyEnriched(lastEnriched)) {
        console.log(`[enrichment] Skipping ${symbol} (recently enriched)`);
        skippedTickers.push(symbol);

        // Use existing data for this holding
        const existingPrice = toNum(holding.asset.latestPrice);
        if (existingPrice != null) {
          fetched.push({
            holdingId: holding.id,
            assetId: holding.assetId,
            symbol,
            quantity: toNum(holding.quantity) ?? 0,
            averageCost: toNum(holding.averageCost),
            price: existingPrice,
            change: toNum(holding.asset.priceChange) ?? 0,
            changePercent: toNum(holding.asset.priceChangePercent) ?? 0,
          });
        }
        continue;
      }

      try {
        // Fetch all data for this ticker
        const [profile, quote, history] = await Promise.all([
          provider.getAssetProfile(symbol),
          provider.getLatestQuote(symbol),
          provider.getHistoricalPrices(symbol, "1Y"),
        ]);

        // Skip if we got a fallback quote with price 0
        if (quote.price === 0) {
          console.warn(`[enrichment] No valid quote for ${symbol}, skipping`);
          failedTickers.push(symbol);
          continue;
        }

        // Upsert enriched asset record
        const asset = await assetRepository.upsertEnriched(profile, quote);

        // Bulk-insert price history (idempotent via skipDuplicates)
        if (history.length > 0) {
          await priceHistoryRepository.upsertMany(asset.id, history);
        }

        fetched.push({
          holdingId: holding.id,
          assetId: asset.id,
          symbol,
          quantity: toNum(holding.quantity) ?? 0,
          averageCost: toNum(holding.averageCost),
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
        });

        console.log(
          `[enrichment] ${symbol}: $${quote.price.toFixed(2)} (${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%)`,
        );

        // Small delay between requests to avoid rate limits
        await delay(100);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[enrichment] Failed for ${symbol}: ${errMsg}`);
        failedTickers.push(symbol);

        // If it looks like a rate limit, add extra delay
        if (errMsg.toLowerCase().includes("rate") || errMsg.includes("429")) {
          console.warn(`[enrichment] Rate limit detected, adding delay...`);
          await delay(2000);
        }
      }
    }

    // ── Phase 2: compute portfolio metrics & persist in one transaction ─────
    // Calculate totals from ALL holdings, using existing data for failed/skipped ones
    // This ensures partial enrichment doesn't reset portfolio totals
    const fetchedByHoldingId = new Map(fetched.map((f) => [f.holdingId, f]));

    let totalValue = 0;
    let totalCost = 0;

    for (const holding of portfolio.holdings) {
      const fetchedData = fetchedByHoldingId.get(holding.id);
      const qty = toNum(holding.quantity) ?? 0;

      if (fetchedData) {
        // Use fresh data from enrichment
        totalValue += fetchedData.quantity * fetchedData.price;
        totalCost += fetchedData.quantity * (fetchedData.averageCost ?? fetchedData.price);
      } else {
        // Use existing data for failed/skipped holdings
        const existingMarketValue = toNum(holding.marketValue);
        const existingAvgCost = toNum(holding.averageCost);
        const existingPrice = toNum(holding.asset.latestPrice);

        if (existingMarketValue != null) {
          totalValue += existingMarketValue;
        } else if (existingPrice != null) {
          totalValue += qty * existingPrice;
        }

        if (existingAvgCost != null) {
          totalCost += qty * existingAvgCost;
        } else if (existingPrice != null) {
          totalCost += qty * existingPrice;
        }
      }
    }

    // Preserve existing totals if we couldn't compute valid new ones
    const existingTotalValue = toNum(portfolio.totalValue);
    const existingTotalCost = toNum(portfolio.totalCost);
    const existingTotalGain = toNum(portfolio.totalGain);

    const finalTotalValue = totalValue > 0 ? totalValue : existingTotalValue;
    const finalTotalCost = totalCost > 0 ? totalCost : existingTotalCost;
    const finalTotalGain =
      finalTotalValue != null && finalTotalCost != null
        ? finalTotalValue - finalTotalCost
        : existingTotalGain;

    await prisma.$transaction(async (tx) => {
      // Update each holding snapshot - only for successfully enriched holdings
      for (const f of fetched) {
        const mktVal = f.quantity * f.price;
        const cost = f.quantity * (f.averageCost ?? f.price);
        const gain = mktVal - cost;
        const weight = finalTotalValue != null && finalTotalValue > 0 ? mktVal / finalTotalValue : 0;

        await tx.portfolioHolding.update({
          where: { id: f.holdingId },
          data: {
            marketValue: mktVal,
            unrealizedGainLoss: gain,
            weight,
          },
        });
      }

      // Update portfolio-level totals (preserving existing if enrichment failed)
      await tx.portfolio.update({
        where: { id: portfolioId },
        data: {
          totalValue: finalTotalValue,
          totalCost: finalTotalCost,
          totalGain: finalTotalGain,
          lastEnrichedAt: new Date(),
        },
      });
    });

    console.log(
      `[enrichment] Completed: ${fetched.length} enriched, ${skippedTickers.length} skipped, ${failedTickers.length} failed`,
    );

    return {
      portfolioId,
      enrichedCount: fetched.length,
      failedTickers,
      totalValue: finalTotalValue ?? 0,
    };
  },

  // ---------------------------------------------------------------------------
  // View builder — assembles the rich UI type from DB data
  // ---------------------------------------------------------------------------

  /**
   * Load a portfolio from the DB and assemble a `PortfolioView` suitable for
   * rendering. Works whether or not the portfolio has been enriched.
   */
  async getPortfolioView(portfolioId: string): Promise<PortfolioView> {
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio) throw new NotFoundError("Portfolio not found.");

    const totalValue = toNum(portfolio.totalValue);

    const holdings: HoldingView[] = portfolio.holdings.map((h) => {
      const qty = toNum(h.quantity) ?? 0;
      const avgCost = toNum(h.averageCost);
      const price = toNum(h.asset.latestPrice);
      const isEnriched = price != null;

      const mktVal = toNum(h.marketValue) ?? (isEnriched ? qty * price! : null);
      const costBasis = avgCost != null ? qty * avgCost : null;
      const unrealized =
        toNum(h.unrealizedGainLoss) ??
        (mktVal != null && costBasis != null ? mktVal - costBasis : null);
      const unrealizedPct =
        unrealized != null && costBasis && costBasis !== 0
          ? (unrealized / costBasis) * 100
          : null;
      const weight =
        toNum(h.weight) ??
        (mktVal != null && totalValue && totalValue > 0
          ? mktVal / totalValue
          : null);

      return {
        id: h.id,
        symbol: h.asset.symbol,
        name: h.asset.name,
        type: h.asset.type,
        sector: h.asset.sector,
        exchange: h.asset.exchange,
        quantity: qty,
        averageCost: avgCost,
        currentPrice: price,
        priceChange: toNum(h.asset.priceChange),
        priceChangePercent: toNum(h.asset.priceChangePercent),
        marketValue: mktVal,
        costBasis,
        unrealizedGainLoss: unrealized,
        unrealizedGainLossPct: unrealizedPct,
        weight,
        isEnriched,
      };
    });

    // Compute totals from holdings when portfolio totals are stale / absent
    const holdingsTotalValue = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
    const computedTotalValue =
      totalValue ?? (holdingsTotalValue > 0 ? holdingsTotalValue : null);

    const holdingsTotalCost = holdings.reduce((s, h) => s + (h.costBasis ?? 0), 0);
    const computedTotalCost =
      toNum(portfolio.totalCost) ?? (holdingsTotalCost > 0 ? holdingsTotalCost : null);

    const computedTotalGain =
      toNum(portfolio.totalGain) ??
      (computedTotalValue != null && computedTotalCost != null
        ? computedTotalValue - computedTotalCost
        : null);

    const totalGainPct =
      computedTotalGain != null && computedTotalCost && computedTotalCost > 0
        ? (computedTotalGain / computedTotalCost) * 100
        : null;

    // Sector allocation
    const sectorMap = new Map<string, number>();
    for (const h of holdings) {
      const key = h.sector ?? "Unknown";
      sectorMap.set(key, (sectorMap.get(key) ?? 0) + (h.marketValue ?? 0));
    }
    const sectorAllocation = Array.from(sectorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      id: portfolio.id,
      name: portfolio.name,
      source: portfolio.source,
      baseCurrency: portfolio.baseCurrency,
      totalValue: computedTotalValue,
      totalCost: computedTotalCost,
      totalGain: computedTotalGain,
      totalGainPct,
      lastEnrichedAt: portfolio.lastEnrichedAt,
      holdingCount: holdings.length,
      sectorAllocation,
      holdings: holdings.sort(
        (a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0),
      ),
    };
  },

  // ---------------------------------------------------------------------------
  // Performance time-series
  // ---------------------------------------------------------------------------

  /**
   * Build a daily portfolio-value time series from stored price history.
   * Returns `{ date, value }` points sorted oldest → newest.
   */
  async getPerformanceSeries(
    portfolioId: string,
    daysBack = 365,
  ): Promise<{ date: string; value: number }[]> {
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio || portfolio.holdings.length === 0) return [];

    const assetIds = portfolio.holdings.map((h) => h.assetId);
    const from = new Date();
    from.setDate(from.getDate() - daysBack);

    const rows = await priceHistoryRepository.findByAssetIdsInRange(
      assetIds,
      from,
    );

    if (rows.length === 0) return [];

    // Build assetId → quantity map
    const quantityMap = new Map<string, number>();
    for (const h of portfolio.holdings) {
      quantityMap.set(h.assetId, toNum(h.quantity) ?? 0);
    }

    // Aggregate by date
    const dateMap = new Map<string, number>();
    for (const row of rows) {
      const dateStr = row.date.toISOString().slice(0, 10);
      const qty = quantityMap.get(row.assetId) ?? 0;
      const close = toNum(row.close) ?? 0;
      dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + qty * close);
    }

    return Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Portfolio performance indexed to 100 at start, plus S&P 500 (SPY) benchmark.
   */
  async getPerformanceComparison(
    portfolioId: string,
    daysBack = 365,
  ): Promise<PerformanceComparison> {
    const empty: PerformanceComparison = {
      portfolio: [],
      benchmark: [],
      combined: [],
      benchmarkSymbol: "SPY",
      portfolioReturnPct: null,
      benchmarkReturnPct: null,
    };

    const rawPortfolio = await this.getPerformanceSeries(portfolioId, daysBack);
    if (rawPortfolio.length === 0) return empty;

    const portfolio = normalizeToIndex(rawPortfolio);

    try {
      const provider = getMarketDataProvider();
      const range = daysToRange(daysBack);
      const spyHistory = await provider.getHistoricalPrices("SPY", range);
      const spyMap = new Map(spyHistory.map((p) => [p.date, p.close]));

      const benchmarkRaw = rawPortfolio
        .map(({ date }) => {
          const close = spyMap.get(date);
          return close != null ? { date, value: close } : null;
        })
        .filter((p): p is { date: string; value: number } => p != null);

      const benchmark = normalizeToIndex(benchmarkRaw);

      const benchmarkByDate = new Map(benchmark.map((p) => [p.date, p.value]));
      const combined = portfolio.map((p) => ({
        date: p.date,
        portfolio: p.value,
        benchmark: benchmarkByDate.get(p.date),
      }));

      return {
        portfolio,
        benchmark,
        combined,
        benchmarkSymbol: "SPY",
        portfolioReturnPct: returnPctFromIndex(portfolio),
        benchmarkReturnPct: returnPctFromIndex(benchmark),
      };
    } catch (err) {
      console.warn("[enrichment] Benchmark fetch failed:", err);
      return {
        portfolio,
        benchmark: [],
        combined: portfolio.map((p) => ({
          date: p.date,
          portfolio: p.value,
        })),
        benchmarkSymbol: "SPY",
        portfolioReturnPct: returnPctFromIndex(portfolio),
        benchmarkReturnPct: null,
      };
    }
  },
};
