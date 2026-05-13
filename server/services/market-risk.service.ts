/**
 * Market Risk Regime Monitor — service layer.
 *
 * Pulls indicator scores from the (currently mocked) data layer, runs them
 * through the deterministic risk engine, and assembles the snapshot, history
 * and historical comparisons consumed by the API routes and the page.
 *
 * Important: no real macro APIs are wired up here yet. The shape of every
 * return value is designed so the data source can later be swapped out
 * without touching the engine, the API routes, or the UI.
 */

import {
  buildExplanation,
  buildIndicators,
  computeTotalScore,
  scoreToRegime,
} from "@/lib/market-risk/risk-engine";
import { buildHistoricalComparisons } from "@/lib/market-risk/historical-comparison";
import {
  generateCurrentIndicatorScores,
  generateRiskHistory,
} from "@/lib/market-risk/mock-data";
import type {
  HistoricalComparison,
  MarketRiskSnapshot,
  RiskHistoryPoint,
} from "@/lib/market-risk/types";

// ---------------------------------------------------------------------------
// In-memory cache (per server process)
// ---------------------------------------------------------------------------
//
// The mock pipeline is fully deterministic for a given UTC day, but it still
// involves a small amount of work. Cache the assembled snapshot for the day
// so repeated requests on the same page render are essentially free.

let snapshotCache: { dateKey: string; snapshot: MarketRiskSnapshot } | null =
  null;

function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const marketRiskService = {
  /** Today's full snapshot — used by the Risk Regime card, indicators, etc. */
  async getCurrentSnapshot(): Promise<MarketRiskSnapshot> {
    const now = new Date();
    const key = todayKey(now);
    if (snapshotCache && snapshotCache.dateKey === key) {
      return snapshotCache.snapshot;
    }

    const rawScores = generateCurrentIndicatorScores(now);
    const indicators = buildIndicators(rawScores);
    const totalScore = computeTotalScore(rawScores);
    const regime = scoreToRegime(totalScore);
    const explanation = buildExplanation(totalScore, indicators);
    const historicalComparisons = buildHistoricalComparisons(indicators);

    const snapshot: MarketRiskSnapshot = {
      date: key,
      totalScore,
      regime,
      indicators,
      explanation,
      historicalComparisons,
      updatedAt: now.toISOString(),
    };

    snapshotCache = { dateKey: key, snapshot };
    return snapshot;
  },

  /** Trailing risk-score history aligned with today's snapshot. */
  async getRiskHistory(days = 180): Promise<RiskHistoryPoint[]> {
    const snapshot = await this.getCurrentSnapshot();
    const safeDays = Math.max(7, Math.min(days, 720));
    const series = generateRiskHistory(safeDays, snapshot.totalScore);
    return series.map((p) => ({
      date: p.date,
      score: p.score,
      regime: scoreToRegime(p.score),
    }));
  },

  /** Just the historical comparison block. */
  async getHistoricalComparisons(): Promise<HistoricalComparison[]> {
    const snapshot = await this.getCurrentSnapshot();
    return snapshot.historicalComparisons;
  },
};
