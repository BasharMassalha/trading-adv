"use client";

import { Activity, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  regimeShortBlurb,
  regimeToneClasses,
  scoreToHsl,
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
  const pct = Math.max(0, Math.min(100, snapshot.totalScore));

  return (
    <div className="flex h-full flex-col border bg-surface">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
          <span className="text-[11px] uppercase tracking-wide text-faint">
            Current market risk regime
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
          <Clock className="h-3.5 w-3.5 shrink-0 stroke-[1.6]" />
          Updated {formatTimestamp(snapshot.updatedAt)}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-start justify-between gap-x-8 gap-y-5 p-5">
        {/* ── Left: regime + framing ─────────────────────────────── */}
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "text-[19px] font-semibold tracking-tight",
                tone.text,
              )}
            >
              {snapshot.regime}
            </span>
            <Badge variant="outline">Risk indicator</Badge>
          </div>

          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {regimeShortBlurb(snapshot.regime)}
          </p>

          <div className="flex items-start gap-2 border border-dashed bg-background px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
            <Info className="mt-px h-3.5 w-3.5 shrink-0 stroke-[1.6] text-faint" />
            <span>
              This is a risk indicator, not a forecast. It summarises several
              market and macro signals into one number. It does not predict a
              market crash or guarantee any specific outcome.
            </span>
          </div>
        </div>

        {/* ── Right: score ───────────────────────────────────────── */}
        <div className="shrink-0">
          <div className="text-[11px] uppercase tracking-wide text-faint">
            Risk score
          </div>
          <div
            className="mt-1.5 font-mono text-[40px] font-semibold leading-none tracking-tight"
            style={{ color: accent }}
          >
            {snapshot.totalScore}
            <span className="ml-1.5 font-mono text-[13px] font-normal text-faint">
              / 100
            </span>
          </div>
          <div
            className="mt-3.5 h-1.5 w-[180px] max-w-full bg-border"
            role="img"
            aria-label={`Risk score ${pct} of 100`}
          >
            <div
              className="h-full transition-all"
              style={{ width: `${pct}%`, background: accent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
