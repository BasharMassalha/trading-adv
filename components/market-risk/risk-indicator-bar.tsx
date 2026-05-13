"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { REGIME_ORDER, scoreToHsl } from "./risk-style-utils";
import type { RiskRegime } from "@/lib/market-risk/types";

type Props = { score: number; regime: RiskRegime };

const BAND_RANGES: { label: RiskRegime; start: number; end: number }[] = [
  { label: "Low", start: 0, end: 20 },
  { label: "Normal", start: 20, end: 40 },
  { label: "Elevated", start: 40, end: 60 },
  { label: "High", start: 60, end: 80 },
  { label: "Extreme", start: 80, end: 100 },
];

export function RiskIndicatorBar({ score, regime }: Props) {
  const pct = Math.max(0, Math.min(100, score));
  const accent = scoreToHsl(pct);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Risk indicator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* ── Color band ─────────────────────────────────────── */}
          <div className="relative h-6 w-full overflow-hidden rounded-full border bg-muted">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, hsl(150,75%,45%) 0%, hsl(105,75%,45%) 25%, hsl(45,80%,50%) 50%, hsl(25,85%,50%) 75%, hsl(0,80%,50%) 100%)",
                opacity: 0.85,
              }}
            />
            {/* Band dividers */}
            {BAND_RANGES.slice(1).map((b) => (
              <div
                key={b.label}
                className="absolute top-0 h-full w-px bg-background/60"
                style={{ left: `${b.start}%` }}
              />
            ))}
            {/* Pointer */}
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pct}%` }}
            >
              <div
                className="h-7 w-3 rounded-sm border-2 border-background shadow-md"
                style={{ background: accent }}
                aria-label={`Risk score ${pct}`}
              />
            </div>
          </div>

          {/* ── Band labels ────────────────────────────────────── */}
          <div className="grid grid-cols-5 gap-1 text-center text-[11px] font-medium">
            {REGIME_ORDER.map((label) => {
              const active = label === regime;
              return (
                <div
                  key={label}
                  className={cn(
                    "rounded-md border px-2 py-1 transition-colors",
                    active
                      ? "border-foreground/40 bg-foreground/5 text-foreground"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  {label}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span>
              Score{" "}
              <span className="font-medium text-foreground tabular-nums">
                {pct}
              </span>{" "}
              / 100 — currently in the{" "}
              <span className="font-medium text-foreground">{regime}</span>{" "}
              band.
            </span>
            <span className="italic">
              Risk indicator — not a forecast.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
