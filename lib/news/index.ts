/**
 * News Retrieval Module
 *
 * Provides news retrieval for portfolio analysis with:
 * - Pluggable provider architecture (mock, Finnhub)
 * - Structured NewsItem normalization
 * - Rate limiting and error handling
 *
 * USAGE
 * ─────
 * import { getNewsProvider, type NewsItem } from "@/lib/news";
 *
 * const provider = getNewsProvider();
 * const result = await provider.getRecentNewsForTicker("AAPL");
 *
 * CONFIGURATION
 * ─────────────
 * - NEWS_PROVIDER: "mock" | "finnhub"
 * - NEWS_API_KEY: Required for Finnhub
 */

// Types
export type {
  NewsItem,
  NewsQueryOptions,
  NewsQueryResult,
  INewsProvider,
  NewsErrorCode,
  HoldingForNews,
  NewsContext,
} from "./types";

export { NewsProviderError } from "./types";

// Provider factory
export {
  getNewsProvider,
  resetNewsProvider,
  getNewsProviderName,
  isRealNewsProviderAvailable,
} from "./provider";

// Providers (for direct use or testing)
export { MockNewsProvider } from "./mock-provider";
export { FinnhubNewsProvider } from "./finnhub-provider";
