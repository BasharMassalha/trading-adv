/**
 * Historical Comparison module for the Market Risk Regime Monitor.
 *
 * Given today's indicator profile, produce a similarity score (0–100) to
 * each canonical historical stress period:
 *   - 1999–2000 Dot-Com Bubble
 *   - 2007–2008 Global Financial Crisis
 *   - 2020 COVID Crash
 *   - 2022 Rate-Hike / Tech Drawdown
 *
 * Similarity is computed as 100 minus a normalised Euclidean distance over
 * the indicator vectors, with extra credit when the *defining* indicators
 * of a period are also elevated today. The output is intentionally fuzzy:
 * this is a historical-analogy lens, not a forecast.
 */

import { INDICATOR_META } from "./risk-engine";
import type {
  HistoricalComparison,
  HistoricalPeriodKey,
  HistoricalProfile,
  RiskIndicator,
  RiskIndicatorKey,
} from "./types";

// ---------------------------------------------------------------------------
// Canonical historical profiles
// ---------------------------------------------------------------------------

/**
 * Indicator profiles for each canonical stress period. Numbers are rough,
 * source-agnostic stylised representations on the same 0–100 scale used by
 * the live indicators. They encode the *character* of the regime, not a
 * specific historical reading.
 */
export const HISTORICAL_PROFILES: Record<HistoricalPeriodKey, HistoricalProfile> = {
  dotcom: {
    period: "dotcom",
    label: "1999–2000 Dot-Com Bubble",
    tagline:
      "Stretched valuations, narrow tech-led leadership, weakening breadth",
    indicators: {
      valuation: 92,
      volatility: 55,
      credit: 35,
      breadth: 78,
      momentum: 70,
      macro: 45,
      sentiment: 88,
    },
    hallmarks: [
      "Equity valuations at historical highs, especially in technology",
      "Performance concentrated in a narrow set of mega-cap tech names",
      "Market breadth deteriorating as fewer stocks make new highs",
      "Retail and institutional sentiment at euphoric extremes",
    ],
  },
  "gfc-2008": {
    period: "gfc-2008",
    label: "2007–2008 Global Financial Crisis",
    tagline:
      "Credit stress, funding pressure, financial-sector contagion",
    indicators: {
      valuation: 55,
      volatility: 90,
      credit: 95,
      breadth: 75,
      momentum: 70,
      macro: 88,
      sentiment: 80,
    },
    hallmarks: [
      "Corporate credit spreads widening sharply",
      "Funding markets showing signs of stress",
      "Financial-sector earnings and balance sheets deteriorating",
      "Macro indicators softening into a synchronised slowdown",
    ],
  },
  "covid-2020": {
    period: "covid-2020",
    label: "2020 COVID Crash",
    tagline: "Sudden volatility spike and short-lived liquidity shock",
    indicators: {
      valuation: 60,
      volatility: 98,
      credit: 80,
      breadth: 85,
      momentum: 80,
      macro: 78,
      sentiment: 75,
    },
    hallmarks: [
      "Implied and realised volatility surging in a matter of days",
      "Short-lived but acute liquidity strain across asset classes",
      "Exogenous macro shock with rapidly changing fundamentals",
      "Sentiment flipping from complacent to panicked at speed",
    ],
  },
  "rate-hike-2022": {
    period: "rate-hike-2022",
    label: "2022 Rate-Hike / Tech Drawdown",
    tagline:
      "Liquidity withdrawal, duration-led drawdown, growth derating",
    indicators: {
      valuation: 70,
      volatility: 65,
      credit: 55,
      breadth: 70,
      momentum: 75,
      macro: 80,
      sentiment: 65,
    },
    hallmarks: [
      "Central banks tightening policy and removing liquidity",
      "Long-duration growth and tech assets leading the drawdown",
      "Bond yields rising sharply alongside equity weakness",
      "Macro and inflation surprises driving cross-asset volatility",
    ],
  },
};

/** Defining indicators for each period — used to bias the similarity score. */
const KEY_INDICATORS: Record<HistoricalPeriodKey, RiskIndicatorKey[]> = {
  dotcom: ["valuation", "breadth", "sentiment"],
  "gfc-2008": ["credit", "macro", "volatility"],
  "covid-2020": ["volatility", "macro"],
  "rate-hike-2022": ["macro", "valuation", "momentum"],
};

// ---------------------------------------------------------------------------
// Similarity logic
// ---------------------------------------------------------------------------

function indicatorMap(indicators: RiskIndicator[]): Record<RiskIndicatorKey, number> {
  const out = {
    valuation: 0,
    volatility: 0,
    credit: 0,
    breadth: 0,
    momentum: 0,
    macro: 0,
    sentiment: 0,
  } as Record<RiskIndicatorKey, number>;
  for (const i of indicators) out[i.key] = i.score;
  return out;
}

/**
 * 0–100 similarity score. Higher = today looks more like that historical
 * period on the dimensions that mattered then.
 */
function similarityFor(
  current: Record<RiskIndicatorKey, number>,
  profile: HistoricalProfile,
): number {
  const keys = Object.keys(INDICATOR_META) as RiskIndicatorKey[];
  const keyIndicators = new Set(KEY_INDICATORS[profile.period]);

  let sumSq = 0;
  let weight = 0;
  for (const k of keys) {
    const w = keyIndicators.has(k) ? 2 : 1;
    const diff = current[k] - profile.indicators[k];
    sumSq += w * diff * diff;
    weight += w;
  }

  // Weighted RMSE on 0–100 scale → convert to similarity.
  const rmse = Math.sqrt(sumSq / weight);
  const similarity = 100 - rmse;
  return clamp(Math.round(similarity), 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Per-period narrative
// ---------------------------------------------------------------------------

function buildSimilaritiesAndDifferences(
  current: Record<RiskIndicatorKey, number>,
  profile: HistoricalProfile,
): { similarities: string[]; differences: string[] } {
  const keys = Object.keys(INDICATOR_META) as RiskIndicatorKey[];
  const similarities: string[] = [];
  const differences: string[] = [];

  for (const k of keys) {
    const today = current[k];
    const then = profile.indicators[k];
    const meta = INDICATOR_META[k];
    const gap = Math.abs(today - then);

    if (gap <= 12 && today >= 50 && then >= 50) {
      similarities.push(
        `${meta.label}: today ${today}/100 vs. ${then}/100 then — both elevated.`,
      );
    } else if (gap >= 25) {
      const lower = today < then ? "today" : "then";
      const higher = lower === "today" ? "then" : "today";
      differences.push(
        `${meta.label}: ${lower} reads markedly lower than ${higher} (${today} vs. ${then}).`,
      );
    }
  }

  if (similarities.length === 0) {
    similarities.push(
      "No single indicator stands out as a close mirror of that period.",
    );
  }
  if (differences.length === 0) {
    differences.push(
      "Most indicators are roughly in line with that period's typical readings.",
    );
  }

  // Cap the output so cards stay scannable.
  return {
    similarities: similarities.slice(0, 4),
    differences: differences.slice(0, 4),
  };
}

function buildPeriodExplanation(
  profile: HistoricalProfile,
  similarity: number,
): string {
  const band =
    similarity >= 75
      ? "a strong resemblance"
      : similarity >= 55
        ? "a moderate resemblance"
        : similarity >= 35
          ? "some overlap"
          : "a weak resemblance";

  return (
    `Today's indicator profile shows ${band} (${similarity}/100) to the ${profile.label}. ` +
    `That regime was historically associated with: ${profile.tagline.toLowerCase()}. ` +
    "Historical similarity is a lens for asking better questions about positioning — it is not a forecast and does not imply the same outcome will repeat."
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildHistoricalComparisons(
  indicators: RiskIndicator[],
): HistoricalComparison[] {
  const current = indicatorMap(indicators);
  const order: HistoricalPeriodKey[] = [
    "dotcom",
    "gfc-2008",
    "covid-2020",
    "rate-hike-2022",
  ];

  return order.map((key) => {
    const profile = HISTORICAL_PROFILES[key];
    const similarity = similarityFor(current, profile);
    const { similarities, differences } = buildSimilaritiesAndDifferences(
      current,
      profile,
    );
    return {
      period: profile.period,
      label: profile.label,
      similarityScore: similarity,
      similarities,
      differences,
      explanation: buildPeriodExplanation(profile, similarity),
    };
  });
}
