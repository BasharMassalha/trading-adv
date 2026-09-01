"use client";

import { Sparkles } from "lucide-react";
import type {
  HistoricalComparison,
  MarketRiskSnapshot,
  RiskIndicator,
} from "@/lib/market-risk/types";
import { regimeToneClasses } from "./risk-style-utils";
import { cn } from "@/lib/utils";

function topContributors(indicators: RiskIndicator[], n = 3): RiskIndicator[] {
  return [...indicators].sort((a, b) => b.score - a.score).slice(0, n);
}

function strongestAnalogy(
  comparisons: HistoricalComparison[],
): HistoricalComparison | null {
  if (comparisons.length === 0) return null;
  return [...comparisons].sort(
    (a, b) => b.similarityScore - a.similarityScore,
  )[0];
}

export function AiExplanation({
  snapshot,
}: {
  snapshot: MarketRiskSnapshot;
}) {
  const top = topContributors(snapshot.indicators);
  const analogy = strongestAnalogy(snapshot.historicalComparisons);
  const tone = regimeToneClasses(snapshot.regime);

  return (
    <div className="border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b px-5 py-3.5">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
          <div>
            <h2 className="text-[13.5px] font-semibold tracking-tight">
              Explanation
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Why the score is what it is, and what it does and does not mean.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
            tone.badge,
          )}
        >
          {snapshot.regime} regime ·{" "}
          <span className="font-mono">{snapshot.totalScore}/100</span>
        </span>
      </div>

      <div className="space-y-4 p-5">
        {/* Engine narrative */}
        <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
          {snapshot.explanation.split("\n\n").map((p, idx) => (
            <p key={`para-${idx}`}>{p}</p>
          ))}
        </div>

        {/* Top contributors */}
        {top.length > 0 && (
          <div className="border bg-background px-4 py-3.5">
            <div className="text-[11px] uppercase tracking-wide text-faint">
              Biggest contributors right now
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {top.map((ind) => (
                <li
                  key={ind.key}
                  className="flex items-start justify-between gap-3 text-[12.5px]"
                >
                  <span className="text-foreground">{ind.label}</span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    <span className="font-mono font-medium text-foreground">
                      {ind.score}
                    </span>{" "}
                    · {ind.status} · {ind.trend}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Historical analogy lens */}
        {analogy && (
          <div className="border bg-background px-4 py-3.5">
            <div className="text-[11px] uppercase tracking-wide text-faint">
              Closest historical analogy
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Today&apos;s profile most resembles{" "}
              <span className="font-medium text-foreground">
                {analogy.label}
              </span>{" "}
              at a similarity of{" "}
              <span className="font-mono font-medium text-foreground">
                {analogy.similarityScore}/100
              </span>
              . That regime was historically associated with the conditions
              listed under its card. Historical similarity is a lens for asking
              better questions, not a forecast that the same outcome will
              repeat.
            </p>
          </div>
        )}

        {/* Hard disclaimer */}
        <div className="border border-warning/30 bg-warning-soft px-4 py-3 text-[12.5px] leading-relaxed text-warning">
          <div className="font-semibold">Not a crash prediction.</div>
          <p className="mt-1">
            The Market Risk Regime Monitor summarises several market and macro
            signals into a single risk indicator. Elevated readings describe
            conditions historically associated with stress. They do not predict
            whether, when, or by how much markets will fall. Treat this as one
            input alongside your own analysis and your risk tolerance.
          </p>
        </div>
      </div>
    </div>
  );
}
