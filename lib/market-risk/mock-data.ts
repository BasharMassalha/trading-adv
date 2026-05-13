/**
 * Deterministic mock data for the Market Risk Regime Monitor.
 *
 * All numbers are generated from a seeded PRNG so the page renders the same
 * shape every time (within the same UTC day). When real macro APIs are
 * integrated later, only this file needs to change — the engine, service,
 * and UI layers consume the same shapes.
 */

import type {
  IndicatorTrend,
  RiskIndicatorKey,
} from "./types";
import type { IndicatorScoreInput } from "./risk-engine";

// ---------------------------------------------------------------------------
// Seeded PRNG (Mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDate(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return y * 10000 + m * 100 + day;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Current indicator scores
// ---------------------------------------------------------------------------

/**
 * Generate a plausible current indicator profile.
 *
 * Each indicator has a baseline and a daily wiggle. Indicators are pulled
 * loosely toward each other (mild correlation) so the resulting picture
 * tells a coherent story rather than a uniform random scatter.
 */
export function generateCurrentIndicatorScores(
  now: Date = new Date(),
): IndicatorScoreInput[] {
  const rng = mulberry32(seedFromDate(now));

  // Baselines describe the current "world" we want the mock to live in.
  // Tuned so the default snapshot lands in the Elevated / High band — the
  // most useful state for showcasing the page. Real data would replace these.
  const baselines: Record<RiskIndicatorKey, number> = {
    valuation: 68,
    volatility: 52,
    credit: 45,
    breadth: 58,
    momentum: 60,
    macro: 65,
    sentiment: 55,
  };

  const trendsSeed: Record<RiskIndicatorKey, IndicatorTrend> = {
    valuation: "stable",
    volatility: "rising",
    credit: "stable",
    breadth: "falling",
    momentum: "stable",
    macro: "rising",
    sentiment: "rising",
  };

  const out: IndicatorScoreInput[] = [];
  const keys = Object.keys(baselines) as RiskIndicatorKey[];
  for (const key of keys) {
    const wiggle = (rng() - 0.5) * 12;
    const raw = baselines[key] + wiggle;
    out.push({
      key,
      score: clamp(Math.round(raw), 0, 100),
      trend: trendsSeed[key],
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Risk score history
// ---------------------------------------------------------------------------

export interface GeneratedHistoryPoint {
  date: string;
  score: number;
}

/**
 * Build a coherent risk-score history that ends near `endingScore`.
 *
 * The series uses a slow drifting mean plus daily noise, then is gently
 * pulled toward the desired ending value so today's score on the trend
 * chart matches today's snapshot card.
 */
export function generateRiskHistory(
  days: number,
  endingScore: number,
  endDate: Date = new Date(),
): GeneratedHistoryPoint[] {
  const rng = mulberry32(seedFromDate(endDate) ^ 0x9e3779b1);
  const points: GeneratedHistoryPoint[] = [];

  let level = 35 + rng() * 25; // start somewhere in Normal–Elevated
  let drift = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - i);

    // Random walk with mean reversion to a slowly drifting target.
    drift += (rng() - 0.5) * 1.5;
    drift = clamp(drift, -8, 8);
    const target = 50 + drift;
    level += (target - level) * 0.08 + (rng() - 0.5) * 4;

    // Inject a couple of mini-stress spikes so the chart looks realistic.
    if (i === Math.floor(days * 0.7)) level += 18;
    if (i === Math.floor(days * 0.4)) level -= 10;

    // Gradually pull the tail toward today's score for visual continuity.
    const blend = 1 - i / Math.max(1, days - 1); // 0 → 1 as we approach today
    const blended = level * (1 - blend) + endingScore * blend;

    const score = clamp(Math.round(blended), 0, 100);
    points.push({ date: isoDate(d), score });
  }

  // Force last point to match the snapshot exactly.
  if (points.length > 0) {
    points[points.length - 1].score = clamp(Math.round(endingScore), 0, 100);
  }

  return points;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}
