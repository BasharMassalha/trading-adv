/**
 * Market Risk Regime Monitor — scoring engine.
 *
 * Pure, deterministic math. No I/O. No data fetching. The engine takes a
 * set of indicator scores (0–100, where higher = more stress) and produces:
 *
 *   - a weighted totalScore (0–100)
 *   - a qualitative regime label ("Low" .. "Extreme")
 *   - a status label per indicator
 *   - a human explanation paragraph
 *
 * Wording note: All generated copy intentionally avoids forecast language
 * (no "will crash", no "guarantees"). Phrasing leans on "historically
 * associated with", "elevated", and "may indicate".
 */

import type {
  IndicatorStatus,
  RiskIndicator,
  RiskIndicatorKey,
  RiskRegime,
} from "./types";

// ---------------------------------------------------------------------------
// Indicator catalogue
// ---------------------------------------------------------------------------

/**
 * Metadata for every indicator the engine understands.
 *
 * `weight` is the relative contribution to the aggregated total score.
 * Weights do not need to sum to 1 — they are normalised at score time.
 */
export const INDICATOR_META: Record<
  RiskIndicatorKey,
  {
    label: string;
    weight: number;
    /** Used to phrase the per-indicator explanation. */
    descriptor: string;
  }
> = {
  valuation: {
    label: "Valuation risk",
    weight: 1.0,
    descriptor: "how stretched equity valuations look vs. long-run norms",
  },
  volatility: {
    label: "Volatility risk",
    weight: 1.1,
    descriptor: "realised and implied volatility across major equity indices",
  },
  credit: {
    label: "Credit stress",
    weight: 1.2,
    descriptor: "corporate credit spreads and signs of funding stress",
  },
  breadth: {
    label: "Market breadth",
    weight: 0.9,
    descriptor: "how broadly stocks participate in the current trend",
  },
  momentum: {
    label: "Momentum risk",
    weight: 0.9,
    descriptor: "trend strength and risk of momentum unwinds",
  },
  macro: {
    label: "Macro / liquidity risk",
    weight: 1.1,
    descriptor: "growth, policy and global liquidity conditions",
  },
  sentiment: {
    label: "Sentiment risk",
    weight: 0.8,
    descriptor: "positioning and crowd sentiment extremes",
  },
};

// ---------------------------------------------------------------------------
// Score → regime mapping
// ---------------------------------------------------------------------------

/**
 * Map a 0–100 score to a regime label.
 *
 *   0–20   Low
 *   21–40  Normal
 *   41–60  Elevated
 *   61–80  High
 *   81–100 Extreme
 */
export function scoreToRegime(score: number): RiskRegime {
  const s = clamp(score, 0, 100);
  if (s <= 20) return "Low";
  if (s <= 40) return "Normal";
  if (s <= 60) return "Elevated";
  if (s <= 80) return "High";
  return "Extreme";
}

/** Same buckets, used per-indicator. */
export function scoreToIndicatorStatus(score: number): IndicatorStatus {
  return scoreToRegime(score);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface IndicatorScoreInput {
  key: RiskIndicatorKey;
  score: number;
  /** Trend can be supplied externally or computed by the data layer. */
  trend?: RiskIndicator["trend"];
}

/**
 * Combine raw indicator scores into the aggregated totalScore.
 *
 * Uses weighted mean with a mild non-linear penalty so that several
 * concurrently-elevated indicators are scored slightly worse than the same
 * stress in a single indicator. This keeps the score sensitive to broad
 * stress without becoming volatile.
 */
export function computeTotalScore(inputs: IndicatorScoreInput[]): number {
  if (inputs.length === 0) return 0;

  let weightedSum = 0;
  let weightTotal = 0;
  let elevatedCount = 0;

  for (const { key, score } of inputs) {
    const meta = INDICATOR_META[key];
    if (!meta) continue;
    const s = clamp(score, 0, 100);
    weightedSum += s * meta.weight;
    weightTotal += meta.weight;
    if (s >= 60) elevatedCount += 1;
  }

  if (weightTotal === 0) return 0;
  const base = weightedSum / weightTotal;

  // Concurrency boost: when many indicators are already elevated, nudge the
  // overall score up — broad stress matters more than a single hot reading.
  const concurrencyBoost = Math.min(elevatedCount * 1.5, 9);

  return Math.round(clamp(base + concurrencyBoost, 0, 100));
}

/**
 * Build full RiskIndicator objects (label, status, trend, explanation)
 * from raw score inputs.
 */
export function buildIndicators(
  inputs: IndicatorScoreInput[],
): RiskIndicator[] {
  return inputs.map(({ key, score, trend }) => {
    const meta = INDICATOR_META[key];
    const s = clamp(Math.round(score), 0, 100);
    const status = scoreToIndicatorStatus(s);
    return {
      key,
      label: meta.label,
      score: s,
      status,
      trend: trend ?? "stable",
      explanation: phraseIndicatorExplanation(key, s, status),
    };
  });
}

// ---------------------------------------------------------------------------
// Phrasing helpers (no prediction language)
// ---------------------------------------------------------------------------

function phraseIndicatorExplanation(
  key: RiskIndicatorKey,
  score: number,
  status: IndicatorStatus,
): string {
  const meta = INDICATOR_META[key];
  if (status === "Low") {
    return `${capitalize(meta.descriptor)} look benign — readings are at the calmer end of their historical range.`;
  }
  if (status === "Normal") {
    return `${capitalize(meta.descriptor)} are near long-run averages; nothing unusual at the moment.`;
  }
  if (status === "Elevated") {
    return `${capitalize(meta.descriptor)} have moved into the upper half of historical readings, which has historically coincided with choppier markets.`;
  }
  if (status === "High") {
    return `${capitalize(meta.descriptor)} are running hot relative to history — a condition often associated with risk-off regimes.`;
  }
  // Extreme
  return `${capitalize(meta.descriptor)} are at stress-period levels rarely seen outside of major drawdowns; this is a signal to study positioning, not a prediction.`;
}

const REGIME_BLURB: Record<RiskRegime, string> = {
  Low: "broad market conditions look calm: volatility, credit, and macro readings are all near the low end of their historical ranges. This is informational, not a forecast.",
  Normal:
    "market conditions are within their typical range. Indicators are mixed but none are flashing stress; risk levels look ordinary in historical context.",
  Elevated:
    "several indicators have moved into their upper half. Conditions are not unusual in modern markets but may indicate a regime of higher volatility ahead — not a guaranteed downturn.",
  High: "multiple risk indicators are running hot together. Historically, clusters like this have been associated with stressed markets and larger drawdowns, but they are not a crash prediction.",
  Extreme:
    "indicators are at stress-period levels. Conditions similar to these have, in the past, accompanied major market dislocations. This is a risk signal — not a guaranteed forecast of any specific outcome.",
};

/**
 * Build the long-form human explanation rendered in the AI Explanation panel.
 */
export function buildExplanation(
  totalScore: number,
  indicators: RiskIndicator[],
): string {
  const regime = scoreToRegime(totalScore);

  const sorted = [...indicators].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 3);
  const calm = sorted[sorted.length - 1];

  const driverLine = top
    .map((i) => `${i.label.toLowerCase()} (${i.score}/100, ${i.status.toLowerCase()})`)
    .join(", ");

  const lines: string[] = [];
  lines.push(
    `The current Market Risk Regime score is ${totalScore}/100, which falls in the "${regime}" band. In plain English, ${REGIME_BLURB[regime]}`,
  );
  lines.push(
    `The biggest contributors to today's score are ${driverLine}. ${
      calm ? `By contrast, ${calm.label.toLowerCase()} (${calm.score}/100) is the calmest input.` : ""
    }`,
  );
  lines.push(
    "Important: this score is a *risk indicator*, not a forecast. It compresses several market and macro signals into one number to help you ask the right questions about your portfolio — it does not predict whether the market will go up or down on any given day.",
  );

  return lines.join("\n\n");
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
