/**
 * Earnings event data fed to the analysis pipeline and shown to the user.
 *
 * The shape is intentionally provider-agnostic so we can swap Yahoo for
 * Finnhub / Alpha Vantage / FMP later.
 */

export type EarningsSurpriseLabel = "BEAT" | "MISSED" | "MET" | "UNKNOWN";

export type EarningsEvent = {
  ticker: string;

  /** ISO date of the most recent earnings report Yahoo can find. */
  lastReportDate?: string;
  /** Human label such as "Q3 2025" or "FY2024". */
  lastReportPeriod?: string;
  /** Reported EPS in USD (or local currency). */
  epsActual?: number;
  /** Analyst consensus EPS estimate at the time of the report. */
  epsEstimate?: number;
  /** Surprise % vs estimate ((actual - estimate) / |estimate| * 100). */
  surprisePct?: number;
  surpriseLabel?: EarningsSurpriseLabel;

  /** Revenue in absolute units (USD). */
  revenueActual?: number;
  revenueEstimate?: number;
  revenueSurprisePct?: number;

  /** ISO date string of the next scheduled earnings (when available). */
  nextReportDate?: string;
  /** Human-readable timing such as "Pre-market", "After hours", or "TBC". */
  nextReportTiming?: string;

  /** Provider that produced the data (yahoo, finnhub, mock…). */
  source: string;
  /** Soft warnings the UI may surface (e.g. "Estimate unavailable"). */
  warnings?: string[];
};

export type EarningsContext = {
  items: EarningsEvent[];
  tickersQueried: string[];
  warnings: string[];
  provider: string;
  retrievedAt: Date;
};

export interface IEarningsProvider {
  readonly name: string;
  getEarningsForTicker(ticker: string): Promise<EarningsEvent | null>;
}
