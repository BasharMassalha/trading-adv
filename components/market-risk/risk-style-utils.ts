/**
 * Shared styling helpers for the Market Risk Regime Monitor UI.
 *
 * Centralises the regime → color/tone mapping so every section (the regime
 * card, the indicator bar, indicator cards, etc.) stays visually consistent.
 */

import type { RiskRegime } from "@/lib/market-risk/types";

export const REGIME_ORDER: RiskRegime[] = [
  "Low",
  "Normal",
  "Elevated",
  "High",
  "Extreme",
];

/**
 * Score → HSL color string. Smoothly interpolates green → amber → red
 * across the 0–100 risk band. Returned as an inline-style-ready string.
 */
export function scoreToHsl(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  // 0 -> 150 (green), 50 -> 45 (amber), 100 -> 0 (red)
  const hue = 150 - (s / 100) * 150;
  return `hsl(${hue.toFixed(0)}, 75%, 45%)`;
}

export function scoreToSoftHsl(score: number, alpha = 0.15): string {
  const s = Math.max(0, Math.min(100, score));
  const hue = 150 - (s / 100) * 150;
  return `hsla(${hue.toFixed(0)}, 75%, 45%, ${alpha})`;
}

/**
 * Tailwind classes describing the *tone* of a regime — used on chips,
 * borders, and indicator card backgrounds.
 */
export function regimeToneClasses(regime: RiskRegime): {
  text: string;
  bg: string;
  border: string;
  badge: string;
} {
  switch (regime) {
    case "Low":
      return {
        text: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        badge:
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      };
    case "Normal":
      return {
        text: "text-sky-600 dark:text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/30",
        badge:
          "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
      };
    case "Elevated":
      return {
        text: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        badge:
          "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      };
    case "High":
      return {
        text: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        badge:
          "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
      };
    case "Extreme":
      return {
        text: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        badge:
          "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      };
  }
}

/** Short blurb for a regime banner. Plain language, no forecasts. */
export function regimeShortBlurb(regime: RiskRegime): string {
  switch (regime) {
    case "Low":
      return "Market stress indicators look benign right now.";
    case "Normal":
      return "Market conditions are within their typical historical range.";
    case "Elevated":
      return "Several indicators have moved into the upper half — conditions may be choppier than usual.";
    case "High":
      return "Multiple indicators are running hot together — historically associated with risk-off regimes.";
    case "Extreme":
      return "Indicators sit at stress-period levels — a risk signal, not a forecast of any specific outcome.";
  }
}
