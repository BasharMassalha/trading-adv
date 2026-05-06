/**
 * Hypothetical portfolio growth (compound interest, no cash flows).
 * For illustration only — not a forecast or financial advice.
 */

export type HorizonProjection = {
  years: number;
  endValue: number;
  profitFromToday: number;
  totalReturnPct: number;
};

export type GrowthProjection = {
  annualReturnPct: number;
  startValue: number;
  year5: HorizonProjection;
  year10: HorizonProjection;
};

/** FV = PV × (1 + r)^n */
export function compoundValue(
  principal: number,
  annualReturnDecimal: number,
  years: number,
): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return principal;
  const r = annualReturnDecimal;
  return principal * Math.pow(1 + r, years);
}

export function buildProjection(
  startValue: number,
  annualReturnPct: number,
): GrowthProjection | null {
  if (!Number.isFinite(startValue) || startValue <= 0) return null;
  const r = annualReturnPct / 100;
  const mk = (years: number): HorizonProjection => {
    const endValue = compoundValue(startValue, r, years);
    const profitFromToday = endValue - startValue;
    const totalReturnPct = startValue > 0 ? (profitFromToday / startValue) * 100 : 0;
    return {
      years,
      endValue,
      profitFromToday,
      totalReturnPct,
    };
  };
  return {
    annualReturnPct,
    startValue,
    year5: mk(5),
    year10: mk(10),
  };
}

export const RETURN_PRESETS = [
  { id: "conservative", label: "Conservative", pct: 4 },
  { id: "balanced", label: "Balanced", pct: 7 },
  { id: "growth", label: "Growth", pct: 10 },
] as const;
