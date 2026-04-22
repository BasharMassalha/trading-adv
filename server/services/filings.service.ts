/**
 * Portfolio filings service.
 *
 * Orchestrates SEC filings retrieval for portfolio analysis by:
 * 1. Selecting the most important U.S. equity holdings
 * 2. Fetching recent filings for those holdings
 * 3. Filtering and normalizing results
 * 4. Preparing context for analysis input
 *
 * HOLDING SELECTION CRITERIA
 * ──────────────────────────
 * - U.S. equities only (skip crypto, ETFs)
 * - Top portfolio weight
 * - Enriched holdings preferred
 *
 * By default, retrieves filings for top 3-5 important equity holdings.
 */

import type { FilingItem, FilingsContext } from "@/lib/filings/types";
import { getFilingsProvider, getFilingsProviderName } from "@/lib/filings/provider";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { toNum } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TOP_HOLDINGS = 5;
const MAX_FILINGS_PER_TICKER = 3;
const MAX_TOTAL_FILINGS = 10;
const DEFAULT_DAYS_BACK = 90;

// Asset types that may have SEC filings
const EQUITY_TYPES = new Set(["STOCK"]);

// ETFs have different filing structures, skip for now
const SKIP_TYPES = new Set(["ETF", "CRYPTO", "BOND", "CASH", "OTHER"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PortfolioWithHoldings = Awaited<
  ReturnType<typeof portfolioRepository.findById>
>;

type HoldingForFilings = {
  ticker: string;
  name: string;
  type: string;
  weight: number;
  isEnriched: boolean;
};

export type FilingsServiceOptions = {
  /** Max holdings to fetch filings for (default: 5) */
  maxHoldings?: number;
  /** Max filings per ticker (default: 3) */
  filingsPerTicker?: number;
  /** How many days back to search (default: 90) */
  daysBack?: number;
};

// ---------------------------------------------------------------------------
// Holding selection logic
// ---------------------------------------------------------------------------

function selectEquityHoldings(
  portfolio: NonNullable<PortfolioWithHoldings>,
  options: FilingsServiceOptions = {},
): HoldingForFilings[] {
  const maxHoldings = options.maxHoldings ?? DEFAULT_TOP_HOLDINGS;

  // Filter to equities only
  const holdings: HoldingForFilings[] = portfolio.holdings
    .filter((h) => {
      if (!h.asset || !h.asset.symbol) return false;

      // Only include stock-type assets
      const assetType = h.asset.type;
      if (SKIP_TYPES.has(assetType)) return false;

      // Require enrichment for better accuracy
      return h.asset.latestPrice != null;
    })
    .map((h) => ({
      ticker: h.asset.symbol,
      name: h.asset.name,
      type: h.asset.type,
      weight: toNum(h.weight) ?? 0,
      isEnriched: h.asset.latestPrice != null,
    }));

  // Sort by weight descending
  holdings.sort((a, b) => b.weight - a.weight);

  return holdings.slice(0, maxHoldings);
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateFilings(filings: FilingItem[]): FilingItem[] {
  const seen = new Set<string>();
  const unique: FilingItem[] = [];

  for (const filing of filings) {
    // Use ticker + filing type + date as dedup key
    const key = `${filing.ticker}:${filing.filingType}:${filing.filedAt ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(filing);
    }
  }

  return unique;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const filingsService = {
  /**
   * Fetch filings context for a portfolio's important equity holdings.
   */
  async getFilingsForPortfolio(
    portfolioId: string,
    options: FilingsServiceOptions = {},
  ): Promise<FilingsContext> {
    const portfolio = await portfolioRepository.findById(portfolioId);

    if (!portfolio) {
      return {
        items: [],
        tickersQueried: [],
        tickersNotFound: [],
        warnings: ["Portfolio not found"],
        provider: "none",
        retrievedAt: new Date(),
      };
    }

    // Select equity holdings
    const equityHoldings = selectEquityHoldings(portfolio, options);

    if (equityHoldings.length === 0) {
      return {
        items: [],
        tickersQueried: [],
        tickersNotFound: [],
        warnings: ["No U.S. equity holdings found for filings retrieval"],
        provider: "none",
        retrievedAt: new Date(),
      };
    }

    const tickers = equityHoldings.map((h) => h.ticker);
    console.info(`[filings] Selected ${tickers.length} equity holdings:`, tickers.join(", "));

    // Fetch filings
    const provider = getFilingsProvider();
    const filingsPerTicker = options.filingsPerTicker ?? MAX_FILINGS_PER_TICKER;
    const daysBack = options.daysBack ?? DEFAULT_DAYS_BACK;

    const allFilings: FilingItem[] = [];
    const allWarnings: string[] = [];
    const tickersNotFound: string[] = [];

    for (const ticker of tickers) {
      try {
        const result = await provider.getRecentFilingsForTicker(ticker, {
          limit: filingsPerTicker,
          daysBack,
        });

        if (result.filings.length === 0) {
          // Check if it's because ticker wasn't found in SEC
          if (result.warnings.some((w) => w.includes("not found"))) {
            tickersNotFound.push(ticker);
          }
        }

        allFilings.push(...result.filings);
        allWarnings.push(...result.warnings);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[filings] Error fetching filings for ${ticker}:`, message);
        allWarnings.push(`Failed to fetch filings for ${ticker}`);
      }
    }

    // Deduplicate
    let uniqueFilings = deduplicateFilings(allFilings);

    // Limit total filings
    if (uniqueFilings.length > MAX_TOTAL_FILINGS) {
      uniqueFilings = uniqueFilings.slice(0, MAX_TOTAL_FILINGS);
    }

    // Sort by date (newest first)
    uniqueFilings.sort((a, b) => {
      const dateA = a.filedAt ? new Date(a.filedAt).getTime() : 0;
      const dateB = b.filedAt ? new Date(b.filedAt).getTime() : 0;
      return dateB - dateA;
    });

    console.info(
      `[filings] Retrieved ${uniqueFilings.length} filings from ${getFilingsProviderName()}`,
    );

    return {
      items: uniqueFilings,
      tickersQueried: tickers,
      tickersNotFound,
      warnings: allWarnings,
      provider: getFilingsProviderName(),
      retrievedAt: new Date(),
    };
  },

  /**
   * Get equity holdings that would be used for filings retrieval.
   * Useful for debugging or display.
   */
  async getEquityHoldings(
    portfolioId: string,
    options: FilingsServiceOptions = {},
  ): Promise<HoldingForFilings[]> {
    const portfolio = await portfolioRepository.findById(portfolioId);

    if (!portfolio) {
      return [];
    }

    return selectEquityHoldings(portfolio, options);
  },

  /**
   * Check if real filings retrieval is available.
   */
  isRealFilingsAvailable(): boolean {
    const provider = getFilingsProvider();
    return !provider.name.includes("mock");
  },

  /**
   * Get the current provider name.
   */
  getProviderName(): string {
    return getFilingsProviderName();
  },
};
