"use client";

import { Activity, Clock, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  regimeShortBlurb,
  regimeToneClasses,
  scoreToHsl,
  scoreToSoftHsl,
} from "./risk-style-utils";
import type { MarketRiskSnapshot } from "@/lib/market-risk/types";

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function RegimeCard({ snapshot }: { snapshot: MarketRiskSnapshot }) {
  const tone = regimeToneClasses(snapshot.regime);
  const accent = scoreToHsl(snapshot.totalScore);
  const accentSoft = scoreToSoftHsl(snapshot.totalScore, 0.18);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border",
        tone.border,
      )}
      style={{
        background: `radial-gradient(circle at top right, ${accentSoft}, transparent 60%)`,
      }}
    >
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {/* ── Left: regime + label ─────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Current market risk regime
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span
                className="text-5xl font-semibold tracking-tight md:text-6xl"
                style={{ color: accent }}
              >
                {snapshot.regime}
              </span>
              <Badge
                variant="outline"
                className={cn("border", tone.badge)}
              >
                Risk indicator
              </Badge>
            </div>

            <p className="max-w-xl text-sm text-muted-foreground">
              {regimeShortBlurb(snapshot.regime)}
            </p>

            <div className="flex items-start gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                This is a <em>risk indicator</em>, not a forecast. It summarises
                several market and macro signals into one number — it does not
                predict a market crash or guarantee any specific outcome.
              </span>
            </div>
          </div>

          {/* ── Right: big score dial ────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-6">
            <ScoreRing score={snapshot.totalScore} accent={accent} />
            <div className="hidden md:block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Risk score
              </div>
              <div className="mt-1 text-4xl font-semibold tabular-nums">
                {snapshot.totalScore}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  /100
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Updated {formatTimestamp(snapshot.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground md:hidden">
          <Clock className="h-3.5 w-3.5" />
          Updated {formatTimestamp(snapshot.updatedAt)}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Score ring (SVG)
// ---------------------------------------------------------------------------

function ScoreRing({ score, accent }: { score: number; accent: string }) {
  const size = 132;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - score / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 800ms ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-semibold tabular-nums"
          style={{ color: accent }}
        >
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}
