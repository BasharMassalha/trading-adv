/** Distinct categorical colors for sector/allocation charts. */
export const ALLOCATION_CHART_COLORS = [
  "hsl(221 83% 53%)",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(346 77% 50%)",
  "hsl(199 89% 48%)",
  "hsl(25 95% 53%)",
  "hsl(142 71% 45%)",
  "hsl(239 84% 67%)",
  "hsl(173 80% 40%)",
];

export function allocationColor(index: number): string {
  return ALLOCATION_CHART_COLORS[index % ALLOCATION_CHART_COLORS.length];
}
