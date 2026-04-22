/**
 * Filings Retrieval Module
 *
 * Provides SEC filings retrieval for portfolio analysis with:
 * - Pluggable provider architecture (mock, SEC EDGAR)
 * - Structured FilingItem normalization
 * - Rate limiting and error handling
 *
 * USAGE
 * ─────
 * import { getFilingsProvider, type FilingItem } from "@/lib/filings";
 *
 * const provider = getFilingsProvider();
 * const result = await provider.getRecentFilingsForTicker("AAPL");
 *
 * CONFIGURATION
 * ─────────────
 * - FILINGS_PROVIDER: "mock" | "sec" (default: "mock")
 * - No API key required for SEC EDGAR (public data)
 */

// Types
export type {
  FilingItem,
  FilingsQueryOptions,
  FilingsQueryResult,
  IFilingsProvider,
  FilingsErrorCode,
  FilingsContext,
  RelevantFilingType,
} from "./types";

export { FilingsProviderError, RELEVANT_FILING_TYPES } from "./types";

// Provider factory
export {
  getFilingsProvider,
  resetFilingsProvider,
  getFilingsProviderName,
  isRealFilingsProviderAvailable,
} from "./provider";

// Providers (for direct use or testing)
export { MockFilingsProvider } from "./mock-provider";
export { SECFilingsProvider } from "./sec-provider";
