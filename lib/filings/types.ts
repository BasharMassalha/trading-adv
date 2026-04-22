/**
 * Filings retrieval module types.
 *
 * These types define the internal structure for company filings used in
 * portfolio analysis. SEC EDGAR and other vendor-specific response shapes
 * are normalized into these types by individual providers.
 */

// ---------------------------------------------------------------------------
// Core filing item type (matches AnalysisInput.filingsContext)
// ---------------------------------------------------------------------------

export type FilingItem = {
  /** Ticker symbol this filing relates to */
  ticker?: string;
  /** Company name */
  companyName?: string;
  /** Filing type (10-K, 10-Q, 8-K, etc.) */
  filingType: string;
  /** Brief summary of the filing (1-3 sentences) */
  summary: string;
  /** ISO date string when filed */
  filedAt?: string;
  /** Source (e.g., "SEC EDGAR") */
  source?: string;
  /** URL to the filing */
  url?: string;
  /** Period covered by the filing */
  periodOfReport?: string;
  /** CIK (Central Index Key) for SEC filings */
  cik?: string;
};

// ---------------------------------------------------------------------------
// Filing types we care about
// ---------------------------------------------------------------------------

export const RELEVANT_FILING_TYPES = [
  "10-K",   // Annual report
  "10-Q",   // Quarterly report
  "8-K",    // Current report (material events)
  "6-K",    // Foreign private issuer reports
  "20-F",   // Annual report for foreign companies
  "S-1",    // Registration statement
  "DEF 14A", // Proxy statement
] as const;

export type RelevantFilingType = typeof RELEVANT_FILING_TYPES[number];

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export type FilingsQueryOptions = {
  /** Number of filings to fetch per ticker (default: 5) */
  limit?: number;
  /** How many days back to search (default: 90) */
  daysBack?: number;
  /** Filter by specific filing types */
  filingTypes?: string[];
};

export type FilingsQueryResult = {
  /** Ticker that was queried */
  ticker: string;
  /** Retrieved filings */
  filings: FilingItem[];
  /** Warnings (e.g., "Ticker not found in SEC", "No recent filings") */
  warnings: string[];
  /** Whether the query was successful */
  success: boolean;
  /** Provider name */
  provider: string;
};

export interface IFilingsProvider {
  readonly name: string;

  /**
   * Fetch recent filings for a single ticker.
   */
  getRecentFilingsForTicker(
    ticker: string,
    options?: FilingsQueryOptions,
  ): Promise<FilingsQueryResult>;

  /**
   * Fetch recent filings for multiple tickers in batch.
   */
  getRecentFilingsForTickers?(
    tickers: string[],
    options?: FilingsQueryOptions,
  ): Promise<FilingsQueryResult[]>;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class FilingsProviderError extends Error {
  constructor(
    message: string,
    public readonly code: FilingsErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "FilingsProviderError";
  }
}

export type FilingsErrorCode =
  | "TICKER_NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "PARSE_ERROR"
  | "NO_RESULTS";

// ---------------------------------------------------------------------------
// Service types
// ---------------------------------------------------------------------------

export type FilingsContext = {
  /** Filing items for analysis */
  items: FilingItem[];
  /** Tickers that were queried */
  tickersQueried: string[];
  /** Tickers that couldn't be resolved */
  tickersNotFound: string[];
  /** Warnings about filings retrieval */
  warnings: string[];
  /** Provider used */
  provider: string;
  /** Timestamp of retrieval */
  retrievedAt: Date;
};
