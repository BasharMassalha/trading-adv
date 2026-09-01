/**
 * Shared styling helpers for the Market Risk Regime Monitor UI.
 *
 * Centralises the regime → tone mapping so every section (the regime card,
 * the indicator bar, indicator cards, etc.) stays visually consistent.
 *
 * Everything resolves to the design-system semantic tokens, so the same code
 * works in both themes without `dark:` variants.
 */

import type { RiskRegime } from "@/lib/market-risk/types";

export const REGIME_ORDER: RiskRegime[] = [
  "Low",
  "Normal",
  "Elevated",
  "High",
  "Extreme",
];

/** The three stops of the risk ramp: calm → caution → stress. */
type RampStop = "success" | "warning" | "destructive";

function scoreToStop(score: number): RampStop {
  const s = Math.max(0, Math.min(100, score));
  if (s < 40) return "success";
  if (s < 60) return "warning";
  return "destructive";
}

function regimeToStop(regime: RiskRegime): RampStop {
  switch (regime) {
    case "Low":
    case "Normal":
      return "success";
    case "Elevated":
      return "warning";
    case "High":
    case "Extreme":
      return "destructive";
  }
}

/**
 * Score → CSS colour string on the success → warning → destructive ramp.
 * Returned as an inline-style-ready string.
 */
export function scoreToHsl(score: number): string {
  return `hsl(var(--${scoreToStop(score)}))`;
}

export function scoreToSoftHsl(score: number, alpha = 0.15): string {
  return `hsl(var(--${scoreToStop(score)}) / ${alpha})`;
}

const TONE_CLASSES: Record<
  RampStop,
  { text: string; bg: string; border: string; badge: string }
> = {
  success: {
    text: "text-success",
    bg: "bg-success-soft",
    border: "border-success/30",
    badge: "border-transparent bg-success-soft text-success",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning-soft",
    border: "border-warning/30",
    badge: "border-transparent bg-warning-soft text-warning",
  },
  destructive: {
    text: "text-destructive",
    bg: "bg-destructive-soft",
    border: "border-destructive/30",
    badge: "border-transparent bg-destructive-soft text-destructive",
  },
};

/**
 * Tailwind classes describing the *tone* of a regime — used on chips,
 * borders, and indicator panel backgrounds.
 */
export function regimeToneClasses(regime: RiskRegime): {
  text: string;
  bg: string;
  border: string;
  badge: string;
} {
  return TONE_CLASSES[regimeToStop(regime)];
}

/** Short blurb for a regime banner. Plain language, no forecasts. */
export function regimeShortBlurb(regime: RiskRegime): string {
  switch (regime) {
    case "Low":
      return "Market stress indicators look benign right now.";
    case "Normal":
      return "Market conditions are within their typical historical range.";
    case "Elevated":
      return "Several indicators have moved into the upper half. Conditions may be choppier than usual.";
    case "High":
      return "Multiple indicators are running hot together, historically associated with risk-off regimes.";
    case "Extreme":
      return "Indicators sit at stress-period levels: a risk signal, not a forecast of any specific outcome.";
  }
}
