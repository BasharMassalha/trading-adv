/**
 * Types for the Market Risk Regime Monitor.
 *
 * Important wording:
 *   This module estimates a *market risk regime* — an indicator of how
 *   stressed conditions appear right now, relative to historical context.
 *   It is NOT a crash prediction, forecast, or guarantee.
 *
 * The types are intentionally shaped to be source-agnostic so that the
 * current mock implementation can later be swapped for real macro/market
 * data without changing any UI code.
 */

// ---------------------------------------------------------------------------
// Regime scale
// ---------------------------------------------------------------------------

/**
 * Five-step qualitative regime label derived from the 0–100 risk score.
 *
 * Mapping (inclusive):
 *   0–20   → Low
 *   21–40  → Normal
 *   41–60  → Elevated
 *   61–80  → High
 *   81–100 → Extreme
 */
export type RiskRegime = "Low" | "Normal" | "Elevated" | "High" | "Extreme";

// ---------------------------------------------------------------------------
// Indicator definitions
// ---------------------------------------------------------------------------

/**
 * Stable indicator keys. Adding a new indicator only requires:
 *   1) adding a key here
 *   2) adding it to INDICATOR_META in lib/market-risk/risk-engine.ts
 *   3) returning a score for it from the data layer
 */
export type RiskIndicatorKey =
  | "valuation"
  | "volatility"
  | "credit"
  | "breadth"
  | "momentum"
  | "macro"
  | "sentiment";

/** Qualitative status banner for a single indicator card. */
export type IndicatorStatus =
  | "Low"
  | "Normal"
  | "Elevated"
  | "High"
  | "Extreme";

/** Direction of recent change for a single indicator. */
export type IndicatorTrend = "rising" | "falling" | "stable";

export interface RiskIndicator {
  /** Stable machine key (see RiskIndicatorKey). */
  key: RiskIndicatorKey;
  /** Human label, e.g. "Valuation risk". */
  label: string;
  /** 0–100 risk contribution; 100 is most stressed. */
  score: number;
  /** Qualitative bucket mirroring RiskRegime. */
  status: IndicatorStatus;
  /** Recent direction of travel. */
  trend: IndicatorTrend;
  /** One-sentence explanation, written without prediction language. */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Historical comparisons
// ---------------------------------------------------------------------------

/**
 * Stable identifiers for the canonical historical stress periods this
 * module compares against. These do NOT imply a forecast — they describe
 * conditions that, in the past, were associated with elevated market risk.
 */
export type HistoricalPeriodKey =
  | "dotcom"
  | "gfc-2008"
  | "covid-2020"
  | "rate-hike-2022";

export interface HistoricalComparison {
  /** Stable key. */
  period: HistoricalPeriodKey;
  /** Display label, e.g. "1999–2000 Dot-Com Bubble". */
  label: string;
  /** 0–100 — how similar today's indicator profile is to that period. */
  similarityScore: number;
  /** Short bullet list of overlapping conditions. */
  similarities: string[];
  /** Short bullet list of meaningfully different conditions. */
  differences: string[];
  /**
   * Plain-language paragraph. MUST avoid prediction language; uses phrasing
   * like "historically associated with" / "may indicate" / "not a forecast".
   */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export interface MarketRiskSnapshot {
  /** ISO date "YYYY-MM-DD" the snapshot represents. */
  date: string;
  /** Aggregated 0–100 risk score. */
  totalScore: number;
  /** Qualitative bucket derived from totalScore. */
  regime: RiskRegime;
  /** Individual indicator contributions. */
  indicators: RiskIndicator[];
  /**
   * Multi-paragraph human explanation of *why* the score is what it is.
   * Designed to be rendered in the AI Explanation Section.
   */
  explanation: string;
  /** Similarity profile to the canonical historical stress periods. */
  historicalComparisons: HistoricalComparison[];
  /** ISO timestamp when this snapshot was generated. */
  updatedAt: string;
}

/** A single point on the trend chart. */
export interface RiskHistoryPoint {
  date: string;
  score: number;
  regime: RiskRegime;
}

// ---------------------------------------------------------------------------
// Historical profile (what we compare *against*)
// ---------------------------------------------------------------------------

/**
 * Canonical indicator profile for a historical stress period.
 * Each value is on the same 0–100 scale as the live indicators so we can
 * compute a simple similarity distance.
 */
export interface HistoricalProfile {
  period: HistoricalPeriodKey;
  label: string;
  /** One-line tagline describing the regime. */
  tagline: string;
  /** Target indicator scores that characterised the period. */
  indicators: Record<RiskIndicatorKey, number>;
  /** Bullets that describe the period in plain English. */
  hallmarks: string[];
}
