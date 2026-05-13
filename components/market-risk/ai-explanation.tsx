"use client";

import { ShieldAlert, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Explanation</CardTitle>
              <Badge variant="outline" className={cn("border", tone.badge)}>
                {snapshot.regime} regime · {snapshot.totalScore}/100
              </Badge>
            </div>
            <CardDescription>
              Why the score is what it is, and what it does — and does
              not — mean.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm leading-relaxed">
        {/* Engine narrative */}
        <div className="space-y-3 text-foreground/90">
          {snapshot.explanation.split("\n\n").map((p, idx) => (
            <p key={`para-${idx}`}>{p}</p>
          ))}
        </div>

        {/* Top contributors */}
        {top.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Biggest contributors right now
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {top.map((ind) => (
                <li
                  key={ind.key}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="text-foreground/90">{ind.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">
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
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Closest historical analogy
            </div>
            <p className="mt-2 text-sm text-foreground/90">
              Today&apos;s profile most resembles{" "}
              <span className="font-medium">{analogy.label}</span> at a
              similarity of{" "}
              <span className="font-medium tabular-nums">
                {analogy.similarityScore}/100
              </span>
              . That regime was historically associated with the conditions
              listed under its card. Historical similarity is a lens for
              asking better questions — not a forecast that the same outcome
              will repeat.
            </p>
          </div>
        )}

        {/* Hard disclaimer */}
        <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Not a crash prediction.</div>
            <p className="mt-1">
              The Market Risk Regime Monitor summarises several market and
              macro signals into a single risk indicator. Elevated readings
              describe conditions historically associated with stress — they
              do <em>not</em> predict whether, when, or by how much markets
              will fall. Treat this as one input alongside your own analysis
              and your risk tolerance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
