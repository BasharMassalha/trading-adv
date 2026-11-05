/**
 * Refresh latest prices for holdings without a click.
 *
 * Quotes only. Full history and company profiles stay on the manual
 * "Refresh market data" action. Cash is always $1.
 */

import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { getMarketDataProvider } from "@/lib/market-data/provider";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";

const DEFAULT_LIMIT = 40;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCash(symbol: string, type: string) {
  return symbol.toUpperCase() === "CASH" || type === "CASH";
}

async function recomputePortfolio(portfolioId: string) {
  const portfolio = await portfolioRepository.findById(portfolioId);
  if (!portfolio) return;

  let totalValue = 0;
  let totalCost = 0;
  const rows: {
    id: string;
    marketValue: number | null;
    unrealized: number | null;
  }[] = [];

  for (const holding of portfolio.holdings) {
    const qty = toNum(holding.quantity) ?? 0;
    const avg = toNum(holding.averageCost);
    const cash = isCash(holding.asset.symbol, holding.asset.type);
    const price = cash ? 1 : toNum(holding.asset.latestPrice);
    if (qty <= 0 || price == null || !(price > 0)) {
      const existing = toNum(holding.marketValue);
      if (existing != null) totalValue += existing;
      if (avg != null) totalCost += qty * avg;
      rows.push({
        id: holding.id,
        marketValue: existing,
        unrealized: toNum(holding.unrealizedGainLoss),
      });
      continue;
    }
    const marketValue = qty * price;
    const cost = avg != null ? qty * avg : null;
    totalValue += marketValue;
    if (cost != null) totalCost += cost;
    rows.push({
      id: holding.id,
      marketValue,
      unrealized: cost != null ? marketValue - cost : null,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.portfolioHolding.update({
        where: { id: row.id },
        data: {
          marketValue: row.marketValue,
          unrealizedGainLoss: row.unrealized,
          weight:
            row.marketValue != null && totalValue > 0
              ? row.marketValue / totalValue
              : null,
        },
      });
    }
    await tx.portfolio.update({
      where: { id: portfolioId },
      data: {
        totalValue: totalValue > 0 ? totalValue : null,
        totalCost: totalCost > 0 ? totalCost : null,
        totalGain: totalValue > 0 ? totalValue - totalCost : null,
        lastEnrichedAt: new Date(),
      },
    });
  });
}

export const quoteRefreshService = {
  /**
   * Pull fresh quotes for held symbols and rewrite portfolio values.
   * Pass userId to limit the pull to one account (the open app).
   * With no userId, the stalest symbols across every book are refreshed.
   */
  async refresh(options?: { userId?: string; limit?: number }) {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const holdings = await prisma.portfolioHolding.findMany({
      where: options?.userId
        ? { portfolio: { userId: options.userId } }
        : undefined,
      select: {
        portfolioId: true,
        asset: {
          select: {
            id: true,
            symbol: true,
            type: true,
            lastEnrichedAt: true,
          },
        },
      },
    });

    const bySymbol = new Map<
      string,
      { assetId: string; last: number }
    >();
    for (const holding of holdings) {
      if (isCash(holding.asset.symbol, holding.asset.type)) continue;
      const symbol = holding.asset.symbol.toUpperCase();
      const last = holding.asset.lastEnrichedAt?.getTime() ?? 0;
      const prev = bySymbol.get(symbol);
      if (!prev || last < prev.last) {
        bySymbol.set(symbol, { assetId: holding.asset.id, last });
      }
    }

    const batch = [...bySymbol.entries()]
      .sort((a, b) => a[1].last - b[1].last)
      .slice(0, limit);

    const provider = getMarketDataProvider();
    const updatedAssets = new Set<string>();
    const failed: string[] = [];

    for (const [symbol, meta] of batch) {
      try {
        const quote = await provider.getLatestQuote(symbol);
        if (!(quote.price > 0)) {
          failed.push(symbol);
          continue;
        }
        await prisma.asset.update({
          where: { id: meta.assetId },
          data: {
            latestPrice: quote.price,
            priceChange: quote.change,
            priceChangePercent: quote.changePercent,
            lastEnrichedAt: new Date(),
          },
        });
        updatedAssets.add(meta.assetId);
      } catch (err) {
        failed.push(symbol);
        console.warn(
          `[quotes] ${symbol}:`,
          err instanceof Error ? err.message : err,
        );
      }
      await delay(120);
    }

    const portfolioIds = [
      ...new Set(
        holdings
          .filter((holding) => updatedAssets.has(holding.asset.id))
          .map((holding) => holding.portfolioId),
      ),
    ];
    for (const portfolioId of portfolioIds) {
      await recomputePortfolio(portfolioId);
    }

    if (updatedAssets.size > 0) {
      console.info(
        `[quotes] updated ${updatedAssets.size} symbol(s) across ${portfolioIds.length} book(s)`,
      );
    }

    return {
      updated: updatedAssets.size,
      portfolios: portfolioIds.length,
      failed,
    };
  },
};
