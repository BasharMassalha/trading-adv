"use client";

import { cn } from "@/lib/utils";
import { REGIME_ORDER } from "./risk-style-utils";
import type { RiskRegime } from "@/lib/market-risk/types";

type Props = { score: number; regime: RiskRegime };

const BAND_RANGES: { label: RiskRegime; start: number; end: number }[] = [
  { label: "Low", start: 0, end: 20 },
  { label: "Normal", start: 20, end: 40 },
  { label: "Elevated", start: 40, end: 60 },
  { label: "High", start: 60, end: 80 },
  { label: "Extreme", start: 80, end: 100 },
];

/**
 * The 0–100 scale is a genuine risk ramp, so the colour sweep here is data
 * encoding rather than decoration. It is built from the semantic tokens.
 */
const RISK_RAMP =
  "linear-gradient(to right, hsl(var(--success)) 0%, hsl(var(--success)) 22%, hsl(var(--warning)) 50%, hsl(var(--destructive)) 78%, hsl(var(--destructive)) 100%)";

export function RiskIndicatorBar({ score, regime }: Props) {
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div className="flex h-full flex-col border bg-surface">
      <div className="border-b px-5 py-3">
        <h2 className="text-[13.5px] font-semibold tracking-tight">
          Risk indicator
        </h2>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* ── Colour band ────────────────────────────────────────── */}
        <div className="relative h-5 w-full border bg-muted">
          <div className="absolute inset-0" style={{ background: RISK_RAMP }} />

          {/* Band dividers */}
          {BAND_RANGES.slice(1).map((b) => (
            <div
              key={b.label}
              className="absolute top-0 h-full w-px bg-surface/70"
              style={{ left: `${b.start}%` }}
            />
          ))}

          {/* Pointer */}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct}%` }}
          >
            <div
              className="h-7 w-[3px] bg-foreground ring-1 ring-surface"
              role="img"
              aria-label={`Risk score ${pct} of 100`}
            />
          </div>
        </div>

        {/* ── Band labels ────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-1 text-center text-[11px]">
          {REGIME_ORDER.map((label) => {
            const active = label === regime;
            return (
              <div
                key={label}
                className={cn(
                  "border px-1.5 py-1 transition-colors",
                  active
                    ? "border-border-strong bg-background font-medium text-foreground"
                    : "border-transparent text-faint",
                )}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div className="mt-auto space-y-1 pt-1 text-[12px] text-muted-foreground">
          <p>
            Score <span className="font-mono text-foreground">{pct}</span> / 100,
            currently in the{" "}
            <span className="font-medium text-foreground">{regime}</span> band.
          </p>
          <p className="text-[11px] text-faint">
            Risk indicator, not a forecast.
          </p>
        </div>
      </div>
    </div>
  );
}
