/**
 * News retrieval module types.
 *
 * These types define the internal structure for news articles used in
 * portfolio analysis. Vendor-specific response shapes are normalized into
 * these types by individual providers.
 */

// ---------------------------------------------------------------------------
// Core news item type (matches AnalysisInput.newsContext)
// ---------------------------------------------------------------------------

export type NewsItem = {
  /** Ticker symbol this news relates to */
  ticker?: string;
  /** Article headline */
  headline: string;
  /** Brief summary (2-3 sentences max) */
  summary: string;
  /** Publication source (e.g., "Reuters", "Bloomberg") */
  source?: string;
  /** Article URL */
  url?: string;
  /** ISO date string when published */
  publishedAt?: string;
  /** Category/topic (e.g., "earnings", "analyst", "general") */
  category?: string;
  /** Sentiment if analyzed */
  sentiment?: "positive" | "negative" | "neutral";
  /** Relevance score (0-1) if provided by API */
  relevance?: number;
};

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export type NewsQueryOptions = {
  /** Number of articles to fetch per ticker (default: 5) */
  limit?: number;
  /** How many days back to search (default: 7) */
  daysBack?: number;
  /** Category filter */
  category?: string;
};

export type NewsQueryResult = {
  /** Ticker that was queried */
  ticker: string;
  /** Retrieved articles */
  articles: NewsItem[];
  /** Warnings (e.g., "No news found", "Rate limited") */
  warnings: string[];
  /** Whether the query was successful */
  success: boolean;
  /** Provider name */
  provider: string;
};

export interface INewsProvider {
  readonly name: string;

  /**
   * Fetch recent news for a single ticker.
   */
  getRecentNewsForTicker(
    ticker: string,
    options?: NewsQueryOptions,
  ): Promise<NewsQueryResult>;

  /**
   * Fetch recent news for multiple tickers in batch.
   * Default implementation calls getRecentNewsForTicker sequentially.
   */
  getRecentNewsForTickers?(
    tickers: string[],
    options?: NewsQueryOptions,
  ): Promise<NewsQueryResult[]>;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class NewsProviderError extends Error {
  constructor(
    message: string,
    public readonly code: NewsErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "NewsProviderError";
  }
}

export type NewsErrorCode =
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "INVALID_TICKER"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "NO_RESULTS";

// ---------------------------------------------------------------------------
// Holding selection types
// ---------------------------------------------------------------------------

export type HoldingForNews = {
  ticker: string;
  name: string;
  weight: number;
  recentChangePct?: number;
  isConcentration: boolean;
  isEnriched: boolean;
};

export type NewsContext = {
  /** News items for analysis */
  items: NewsItem[];
  /** Tickers that were queried */
  tickersQueried: string[];
  /** Warnings about news retrieval */
  warnings: string[];
  /** Provider used */
  provider: string;
  /** Timestamp of retrieval */
  retrievedAt: Date;
};
