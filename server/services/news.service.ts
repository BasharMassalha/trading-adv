/**
 * Portfolio news service.
 *
 * Orchestrates news retrieval for portfolio analysis by:
 * 1. Selecting the most important holdings for news retrieval
 * 2. Fetching recent news for those holdings
 * 3. Deduplicating and normalizing results
 * 4. Preparing context for analysis input
 *
 * HOLDING SELECTION CRITERIA
 * ──────────────────────────
 * - Top portfolio weight (concentration importance)
 * - Recent large price moves
 * - Enriched holdings only (have ticker data)
 *
 * By default, retrieves news for top 3-5 important holdings.
 */

import type { NewsItem, NewsContext, HoldingForNews } from "@/lib/news/types";
import { getNewsProvider, getNewsProviderName } from "@/lib/news/provider";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { toNum } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TOP_HOLDINGS = 5;
const CONCENTRATION_THRESHOLD = 0.15; // 15% weight = concentration
const LARGE_MOVE_THRESHOLD = 5; // 5% price move
const MAX_ARTICLES_PER_TICKER = 3;
const MAX_TOTAL_ARTICLES = 10;
/** Hard cap to protect APIs */
const MAX_TOTAL_ARTICLES_CAP = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PortfolioWithHoldings = Awaited<
  ReturnType<typeof portfolioRepository.findById>
>;

export type NewsServiceOptions = {
  /** Max holdings to fetch news for (default: 5) */
  maxHoldings?: number;
  /** Max articles per ticker (default: 3) */
  articlesPerTicker?: number;
  /** Cap after deduplication (default: 10) */
  maxTotalArticles?: number;
  /** How many days back to search (default: 7) */
  daysBack?: number;
};

// ---------------------------------------------------------------------------
// Holding selection logic
// ---------------------------------------------------------------------------

function selectImportantHoldings(
  portfolio: NonNullable<PortfolioWithHoldings>,
  options: NewsServiceOptions = {},
): HoldingForNews[] {
  const maxHoldings = options.maxHoldings ?? DEFAULT_TOP_HOLDINGS;

  const holdings: HoldingForNews[] = portfolio.holdings
    .filter((h) => h.asset && h.asset.symbol) // Only holdings with enriched assets
    .map((h) => {
      const weight = toNum(h.weight) ?? 0;
      const avgCost = toNum(h.averageCost);
      const currentPrice = toNum(h.asset.latestPrice);

      // Calculate recent change if we have both prices
      let recentChangePct: number | undefined;
      if (avgCost && avgCost > 0 && currentPrice) {
        recentChangePct = ((currentPrice - avgCost) / avgCost) * 100;
      }

      return {
        ticker: h.asset.symbol, // Asset uses 'symbol' field
        name: h.asset.name,
        weight,
        recentChangePct,
        isConcentration: weight >= CONCENTRATION_THRESHOLD,
        isEnriched: h.asset.latestPrice != null,
      };
    });

  // Score and sort holdings by importance
  const scored = holdings.map((h) => {
    let score = 0;

    // Weight contributes most to score
    score += h.weight * 100;

    // Concentration holdings get bonus
    if (h.isConcentration) {
      score += 20;
    }

    // Large movers get bonus
    if (h.recentChangePct && Math.abs(h.recentChangePct) >= LARGE_MOVE_THRESHOLD) {
      score += 15;
    }

    // Enriched holdings are preferred
    if (h.isEnriched) {
      score += 5;
    }

    return { ...h, score };
  });

  // Sort by score descending and take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxHoldings);
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateArticles(articles: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const unique: NewsItem[] = [];

  for (const article of articles) {
    // Use headline + source as dedup key
    const key = `${article.headline.toLowerCase().trim()}:${article.source ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(article);
    }
  }

  return unique;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const newsService = {
  /**
   * Fetch news context for a portfolio's important holdings.
   */
  async getNewsForPortfolio(
    portfolioId: string,
    options: NewsServiceOptions = {},
  ): Promise<NewsContext> {
    const portfolio = await portfolioRepository.findById(portfolioId);

    if (!portfolio) {
      return {
        items: [],
        tickersQueried: [],
        warnings: ["Portfolio not found"],
        provider: "none",
        retrievedAt: new Date(),
      };
    }

    // Select important holdings
    const importantHoldings = selectImportantHoldings(portfolio, options);

    if (importantHoldings.length === 0) {
      return {
        items: [],
        tickersQueried: [],
        warnings: ["No enriched holdings available for news retrieval"],
        provider: "none",
        retrievedAt: new Date(),
      };
    }

    const tickers = importantHoldings.map((h) => h.ticker);
    console.info(`[news] Selected ${tickers.length} important holdings:`, tickers.join(", "));

    // Fetch news
    const provider = getNewsProvider();
    const articlesPerTicker = options.articlesPerTicker ?? MAX_ARTICLES_PER_TICKER;
    const maxTotalArticles = Math.min(
      options.maxTotalArticles ?? MAX_TOTAL_ARTICLES,
      MAX_TOTAL_ARTICLES_CAP,
    );
    const daysBack = options.daysBack ?? 7;

    const allArticles: NewsItem[] = [];
    const allWarnings: string[] = [];

    for (const ticker of tickers) {
      try {
        const result = await provider.getRecentNewsForTicker(ticker, {
          limit: articlesPerTicker,
          daysBack,
        });

        allArticles.push(...result.articles);
        allWarnings.push(...result.warnings);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[news] Error fetching news for ${ticker}:`, message);
        allWarnings.push(`Failed to fetch news for ${ticker}`);
      }
    }

    // Deduplicate
    let uniqueArticles = deduplicateArticles(allArticles);

    // Limit total articles
    if (uniqueArticles.length > maxTotalArticles) {
      uniqueArticles = uniqueArticles.slice(0, maxTotalArticles);
    }

    // Sort by date (newest first)
    uniqueArticles.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    console.info(`[news] Retrieved ${uniqueArticles.length} unique articles from ${getNewsProviderName()}`);

    return {
      items: uniqueArticles,
      tickersQueried: tickers,
      warnings: allWarnings,
      provider: getNewsProviderName(),
      retrievedAt: new Date(),
    };
  },

  /**
   * Get important holdings that would be used for news retrieval.
   * Useful for debugging or display.
   */
  async getImportantHoldings(
    portfolioId: string,
    options: NewsServiceOptions = {},
  ): Promise<HoldingForNews[]> {
    const portfolio = await portfolioRepository.findById(portfolioId);

    if (!portfolio) {
      return [];
    }

    return selectImportantHoldings(portfolio, options);
  },

  /**
   * Check if real news retrieval is available.
   */
  isRealNewsAvailable(): boolean {
    const provider = getNewsProvider();
    return !provider.name.includes("mock");
  },

  /**
   * Get the current provider name.
   */
  getProviderName(): string {
    return getNewsProviderName();
  },
};
