/**
 * Earnings retrieval for a portfolio: pulls latest earnings event + next
 * scheduled date for each ticker, with sensible limits to protect Yahoo.
 */

import { getEarningsProvider, getEarningsProviderName } from "@/lib/earnings/provider";
import type { EarningsContext, EarningsEvent } from "@/lib/earnings/types";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";

const DEFAULT_MAX_TICKERS = 8;

type Options = {
  maxTickers?: number;
};

export const earningsService = {
  async getEarningsForPortfolio(
    portfolioId: string,
    options: Options = {},
  ): Promise<EarningsContext> {
    const portfolio = await portfolioRepository.findById(portfolioId);

    if (!portfolio) {
      return {
        items: [],
        tickersQueried: [],
        warnings: ["Portfolio not found"],
        provider: getEarningsProviderName(),
        retrievedAt: new Date(),
      };
    }

    const candidates = portfolio.holdings
      .filter((h) => h.asset && h.asset.symbol)
      .map((h) => ({
        ticker: h.asset.symbol.toUpperCase().trim(),
        weight: Number(h.weight ?? 0),
      }))
      .filter((h) => h.ticker.length > 0);

    candidates.sort((a, b) => b.weight - a.weight);

    const limit = Math.min(
      options.maxTickers ?? DEFAULT_MAX_TICKERS,
      candidates.length,
    );
    const tickers = Array.from(
      new Set(candidates.slice(0, limit).map((c) => c.ticker)),
    );

    const provider = getEarningsProvider();
    const items: EarningsEvent[] = [];
    const warnings: string[] = [];

    for (const ticker of tickers) {
      try {
        const ev = await provider.getEarningsForTicker(ticker);
        if (ev) {
          items.push(ev);
          if (ev.warnings?.length) warnings.push(...ev.warnings);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[earnings] Failed for ${ticker}:`, msg);
        warnings.push(`Earnings lookup failed for ${ticker}`);
      }
    }

    return {
      items,
      tickersQueried: tickers,
      warnings,
      provider: getEarningsProviderName(),
      retrievedAt: new Date(),
    };
  },
};
