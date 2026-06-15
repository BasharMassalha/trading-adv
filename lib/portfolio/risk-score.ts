/**
 * Portfolio risk score vs investor profile comfort level.
 *
 * Produces a 0–10 score from concentration, sector mix, and asset types,
 * then compares it to the user's stated risk tolerance.
 */

import type { RiskTolerance } from "@prisma/client";

export type RiskFactor = {
  label: string;
  impact: "high" | "medium" | "low";
  detail: string;
};

export type RiskScoreInput = {
  holdings: {
    symbol: string;
    type: string;
    weight: number | null;
  }[];
  sectorAllocation: { name: string; value: number }[];
  totalValue: number | null;
  riskTolerance: RiskTolerance | string | null;
};

export type RiskScoreResult = {
  /** Computed portfolio risk 0–10 */
  score: number;
  /** Target comfort level from investor profile 0–10 */
  comfortLevel: number;
  /** score minus comfortLevel */
  delta: number;
  alignment: "aligned" | "above" | "below";
  factors: RiskFactor[];
  riskLabel: string;
  comfortLabel: string;
};

const COMFORT_BY_TOLERANCE: Record<string, number> = {
  CONSERVATIVE: 3.5,
  MODERATE: 5.5,
  AGGRESSIVE: 7.5,
};

const TOLERANCE_LABEL: Record<string, string> = {
  CONSERVATIVE: "Conservative",
  MODERATE: "Moderate",
  AGGRESSIVE: "Aggressive",
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function sectorWeights(
  sectors: { name: string; value: number }[],
  totalValue: number | null,
): { name: string; weight: number }[] {
  if (!totalValue || totalValue <= 0) return [];
  return sectors
    .map((s) => ({ name: s.name, weight: s.value / totalValue }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Compute portfolio risk score and compare to investor profile.
 */
export function computeRiskScore(input: RiskScoreInput): RiskScoreResult {
  const factors: RiskFactor[] = [];
  let score = 4.5;

  const weights = input.holdings
    .filter((h) => h.weight != null && h.weight > 0)
    .map((h) => ({ ...h, weight: h.weight! }))
    .sort((a, b) => b.weight - a.weight);

  const maxWeight = weights[0]?.weight ?? 0;
  if (maxWeight > 0.35) {
    score += 2;
    factors.push({
      label: "High concentration",
      impact: "high",
      detail: `${weights[0].symbol} is ${(maxWeight * 100).toFixed(0)}% of the portfolio`,
    });
  } else if (maxWeight > 0.25) {
    score += 1.2;
    factors.push({
      label: "Elevated concentration",
      impact: "medium",
      detail: `${weights[0].symbol} is ${(maxWeight * 100).toFixed(0)}% of the portfolio`,
    });
  } else if (maxWeight > 0.15) {
    score += 0.5;
    factors.push({
      label: "Moderate concentration",
      impact: "low",
      detail: `Largest position (${weights[0]?.symbol ?? "—"}) above 15%`,
    });
  }

  const sectors = sectorWeights(input.sectorAllocation, input.totalValue);
  const topSector = sectors[0];
  if (topSector) {
    if (topSector.weight > 0.55) {
      score += 1.5;
      factors.push({
        label: "Sector-heavy",
        impact: "high",
        detail: `${topSector.name} is ${(topSector.weight * 100).toFixed(0)}% of exposure`,
      });
    } else if (topSector.weight > 0.4) {
      score += 0.8;
      factors.push({
        label: "Sector tilt",
        impact: "medium",
        detail: `${topSector.name} is ${(topSector.weight * 100).toFixed(0)}% of exposure`,
      });
    }
  }

  const cryptoWeight = weights
    .filter((h) => h.type === "CRYPTO")
    .reduce((sum, h) => sum + h.weight, 0);
  if (cryptoWeight > 0.15) {
    score += 1.5;
    factors.push({
      label: "Crypto exposure",
      impact: "high",
      detail: `Crypto is ${(cryptoWeight * 100).toFixed(0)}% of the portfolio`,
    });
  } else if (cryptoWeight > 0.05) {
    score += 0.6;
    factors.push({
      label: "Crypto exposure",
      impact: "low",
      detail: `Crypto is ${(cryptoWeight * 100).toFixed(0)}% of the portfolio`,
    });
  }

  const holdingCount = input.holdings.length;
  if (holdingCount < 5) {
    score += 1;
    factors.push({
      label: "Low diversification",
      impact: "medium",
      detail: `Only ${holdingCount} position${holdingCount === 1 ? "" : "s"}`,
    });
  } else if (holdingCount < 10) {
    score += 0.4;
    factors.push({
      label: "Limited breadth",
      impact: "low",
      detail: `${holdingCount} holdings — broader mix may reduce single-name risk`,
    });
  } else if (holdingCount >= 15) {
    score -= 0.3;
    factors.push({
      label: "Broad holdings",
      impact: "low",
      detail: `${holdingCount} positions spread risk across names`,
    });
  }

  if (factors.length === 0) {
    factors.push({
      label: "Balanced profile",
      impact: "low",
      detail: "No major concentration or sector flags detected",
    });
  }

  score = clamp(Math.round(score * 10) / 10, 1, 10);

  const tolerance = input.riskTolerance ?? "MODERATE";
  const comfortLevel = COMFORT_BY_TOLERANCE[tolerance] ?? 5.5;
  const delta = Math.round((score - comfortLevel) * 10) / 10;

  let alignment: RiskScoreResult["alignment"] = "aligned";
  if (delta > 1) alignment = "above";
  else if (delta < -1) alignment = "below";

  return {
    score,
    comfortLevel,
    delta,
    alignment,
    factors: factors.slice(0, 4),
    riskLabel: score <= 3.5 ? "Low" : score <= 6 ? "Moderate" : score <= 8 ? "Elevated" : "High",
    comfortLabel: TOLERANCE_LABEL[tolerance] ?? "Moderate",
  };
}
