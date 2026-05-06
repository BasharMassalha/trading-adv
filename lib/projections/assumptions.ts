/**
 * Long-run return assumption for portfolio projections (illustrative only).
 * Ties to saved investor risk profile and whether a completed AI analysis exists.
 */

export type ProjectionAssumptionSource =
  | "profile_and_analysis"
  | "profile_only"
  | "demo_default";

export type ProjectionReturnAssumption = {
  /** Annual nominal return % used for compounding illustration */
  annualReturnPct: number;
  /** Short explanation shown next to the projection */
  rationale: string;
  source: ProjectionAssumptionSource;
};

function clampPct(n: number): number {
  return Math.min(12, Math.max(3, Math.round(n * 10) / 10));
}

function basePctFromRisk(riskTolerance: string | null | undefined): number {
  switch (riskTolerance) {
    case "CONSERVATIVE":
      return 4.5;
    case "AGGRESSIVE":
      return 9;
    case "MODERATE":
    default:
      return 6.5;
  }
}

/** Small nudge from stated investment goal (still clamped). */
function goalAdjustment(goal: string | null | undefined): number {
  switch (goal) {
    case "GROWTH":
      return 0.5;
    case "INCOME":
      return -0.5;
    case "CAPITAL_PRESERVATION":
      return -1;
    case "BALANCED":
    default:
      return 0;
  }
}

function riskLabel(risk: string | null | undefined): string {
  switch (risk) {
    case "CONSERVATIVE":
      return "conservative";
    case "AGGRESSIVE":
      return "aggressive";
    case "MODERATE":
    default:
      return "moderate";
  }
}

/**
 * Build the default annual return % and copy for the projection modal.
 */
export function buildProjectionReturnAssumption(input: {
  riskTolerance: string | null | undefined;
  investmentGoal: string | null | undefined;
  hasLatestAnalysis: boolean;
  isDemo: boolean;
}): ProjectionReturnAssumption {
  if (input.isDemo) {
    const pct = 6.5;
    return {
      annualReturnPct: pct,
      rationale:
        "Demo uses a moderate illustrative rate (6.5% per year, nominal) with no deposits or withdrawals. Sign in and save your investor profile so we can align this with your risk level and latest analysis.",
      source: "demo_default",
    };
  }

  const base = basePctFromRisk(input.riskTolerance);
  const pct = clampPct(base + goalAdjustment(input.investmentGoal));
  const rl = riskLabel(input.riskTolerance);

  if (input.hasLatestAnalysis) {
    return {
      annualReturnPct: pct,
      rationale: `Terminal001 anchors this view to your ${rl} risk profile (and your saved goal). With a completed analysis on this portfolio, we use ${pct}% per year as a long-run illustrative compound rate — not a promise of returns. Use “Adjust the rate” below to stress-test.`,
      source: "profile_and_analysis",
    };
  }

  return {
    annualReturnPct: pct,
    rationale: `We use ${pct}% per year as an illustrative rate based on your ${rl} risk profile. Run an AI analysis on this portfolio anytime to ground this in a fresh review — you can still adjust the rate manually.`,
    source: "profile_only",
  };
}
