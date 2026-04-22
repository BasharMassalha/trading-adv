/**
 * Finnhub news provider.
 *
 * Uses the Finnhub API to retrieve recent news for stocks.
 * Free tier: 60 API calls/minute.
 *
 * API Documentation: https://finnhub.io/docs/api/company-news
 *
 * CONFIGURATION
 * ─────────────
 * - NEWS_API_KEY: Finnhub API key (get one at https://finnhub.io/)
 */

import type {
  INewsProvider,
  NewsItem,
  NewsQueryOptions,
  NewsQueryResult,
} from "./types";
import { NewsProviderError } from "./types";

// ---------------------------------------------------------------------------
// Finnhub API response types (vendor-specific, isolated here)
// ---------------------------------------------------------------------------

interface FinnhubNewsArticle {
  category: string;
  datetime: number; // Unix timestamp
  headline: string;
  id: number;
  image: string;
  related: string; // Ticker symbol(s)
  source: string;
  summary: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function truncateSummary(summary: string, maxLength = 300): string {
  if (!summary || summary.length <= maxLength) return summary;
  const truncated = summary.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

function normalizeFinnhubArticle(article: FinnhubNewsArticle, ticker: string): NewsItem {
  return {
    ticker,
    headline: article.headline,
    summary: truncateSummary(article.summary),
    source: article.source,
    url: article.url,
    publishedAt: new Date(article.datetime * 1000).toISOString(),
    category: article.category || "general",
    sentiment: undefined, // Finnhub doesn't provide sentiment in free tier
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class FinnhubNewsProvider implements INewsProvider {
  readonly name = "finnhub";
  private apiKey: string;
  private baseUrl = "https://finnhub.io/api/v1";
  private lastRequestTime = 0;
  private minRequestInterval = 100; // ms between requests (rate limit protection)

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new NewsProviderError(
        "Finnhub API key is required",
        "INVALID_API_KEY",
      );
    }
    this.apiKey = apiKey;
  }

  async getRecentNewsForTicker(
    ticker: string,
    options?: NewsQueryOptions,
  ): Promise<NewsQueryResult> {
    const normalizedTicker = ticker.toUpperCase().trim();
    const daysBack = options?.daysBack ?? 7;
    const limit = options?.limit ?? 5;

    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    const params = new URLSearchParams({
      symbol: normalizedTicker,
      from: formatDate(fromDate),
      to: formatDate(toDate),
      token: this.apiKey,
    });

    const url = `${this.baseUrl}/company-news?${params.toString()}`;

    console.info(`[news:finnhub] Fetching news for ${normalizedTicker}`);

    try {
      // Rate limit protection
      await this.throttle();

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return this.handleHttpError(response, normalizedTicker);
      }

      const data: FinnhubNewsArticle[] = await response.json();

      if (!Array.isArray(data)) {
        console.warn(`[news:finnhub] Unexpected response format for ${normalizedTicker}`);
        return {
          ticker: normalizedTicker,
          articles: [],
          warnings: ["Unexpected API response format"],
          success: false,
          provider: this.name,
        };
      }

      // Normalize and limit articles
      const articles = data
        .slice(0, limit)
        .map((article) => normalizeFinnhubArticle(article, normalizedTicker));

      const warnings: string[] = [];
      if (articles.length === 0) {
        warnings.push(`No recent news found for ${normalizedTicker}`);
      }

      console.info(`[news:finnhub] Retrieved ${articles.length} articles for ${normalizedTicker}`);

      return {
        ticker: normalizedTicker,
        articles,
        warnings,
        success: true,
        provider: this.name,
      };
    } catch (err) {
      return this.handleError(err, normalizedTicker);
    }
  }

  async getRecentNewsForTickers(
    tickers: string[],
    options?: NewsQueryOptions,
  ): Promise<NewsQueryResult[]> {
    const results: NewsQueryResult[] = [];

    for (const ticker of tickers) {
      const result = await this.getRecentNewsForTicker(ticker, options);
      results.push(result);

      // Extra delay between tickers for rate limiting
      await delay(150);
    }

    return results;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await delay(this.minRequestInterval - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  private handleHttpError(response: Response, ticker: string): NewsQueryResult {
    console.error(`[news:finnhub] HTTP error ${response.status} for ${ticker}`);

    if (response.status === 401 || response.status === 403) {
      throw new NewsProviderError(
        "Invalid Finnhub API key",
        "INVALID_API_KEY",
      );
    }

    if (response.status === 429) {
      return {
        ticker,
        articles: [],
        warnings: ["Rate limit exceeded - try again later"],
        success: false,
        provider: this.name,
      };
    }

    return {
      ticker,
      articles: [],
      warnings: [`API error (${response.status})`],
      success: false,
      provider: this.name,
    };
  }

  private handleError(err: unknown, ticker: string): NewsQueryResult {
    if (err instanceof NewsProviderError) {
      throw err;
    }

    console.error(`[news:finnhub] Error fetching news for ${ticker}:`, err);

    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ticker,
      articles: [],
      warnings: [`Failed to fetch news: ${message}`],
      success: false,
      provider: this.name,
    };
  }
}
