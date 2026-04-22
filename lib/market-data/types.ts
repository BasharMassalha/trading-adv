/**
 * Market-data provider contract.
 *
 * All concrete providers (mock, Polygon.io, Yahoo Finance, Alpha Vantage, etc.)
 * must implement IMarketDataProvider. The rest of the app only depends on this
 * interface, so switching vendors is a one-line change in provider.ts.
 */

// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

export type AssetKind = "STOCK" | "ETF" | "CRYPTO" | "BOND" | "CASH" | "OTHER";

export interface AssetProfile {
  symbol: string;
  name: string;
  type: AssetKind;
  exchange?: string;
  currency: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  description?: string;
}

export interface LatestQuote {
  symbol: string;
  price: number;
  /** Absolute change from the previous session close */
  change: number;
  /** Percentage change from the previous session close (e.g. 1.34 = +1.34%) */
  changePercent: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  /** UTC timestamp of the quote */
  timestamp: Date;
}

export interface HistoricalPricePoint {
  /** ISO date string "YYYY-MM-DD" */
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export type HistoricalRange = "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y";

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface IMarketDataProvider {
  readonly name: string;

  /**
   * Return the static profile (name, sector, exchange, etc.) for a ticker.
   * Throws if the ticker is completely unknown and no fallback can be built.
   */
  getAssetProfile(symbol: string): Promise<AssetProfile>;

  /**
   * Return the latest price quote for a ticker.
   * Throws on network error; returns a best-effort quote for unknown tickers.
   */
  getLatestQuote(symbol: string): Promise<LatestQuote>;

  /**
   * Return sorted (oldest → newest) daily OHLCV candles for a ticker.
   */
  getHistoricalPrices(
    symbol: string,
    range: HistoricalRange,
  ): Promise<HistoricalPricePoint[]>;
}

// ---------------------------------------------------------------------------
// Enrichment result types (used by the enrichment service)
// ---------------------------------------------------------------------------

export interface TickerEnrichmentData {
  profile: AssetProfile;
  quote: LatestQuote;
  history: HistoricalPricePoint[];
}
