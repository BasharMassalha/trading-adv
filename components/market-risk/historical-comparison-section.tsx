"use client";

import { Check, History, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  HistoricalComparison,
  HistoricalPeriodKey,
} from "@/lib/market-risk/types";
import { scoreToHsl, scoreToSoftHsl } from "./risk-style-utils";

const PERIOD_META: Record<
  HistoricalPeriodKey,
  { era: string; tag: string }
> = {
  dotcom: { era: "1999 – 2000", tag: "Tech bubble" },
  "gfc-2008": { era: "2007 – 2008", tag: "Credit crisis" },
  "covid-2020": { era: "Q1 2020", tag: "Liquidity shock" },
  "rate-hike-2022": { era: "2022", tag: "Rate-hike drawdown" },
};

function similarityBand(score: number): string {
  if (score >= 75) return "Strong resemblance";
  if (score >= 55) return "Moderate resemblance";
  if (score >= 35) return "Some overlap";
  return "Weak resemblance";
}

function ComparisonCard({ comparison }: { comparison: HistoricalComparison }) {
  const meta = PERIOD_META[comparison.period];
  const accent = scoreToHsl(comparison.similarityScore);
  const soft = scoreToSoftHsl(comparison.similarityScore, 0.14);

  return (
    <Card
      className="h-full overflow-hidden border transition-shadow hover:shadow-md"
      style={{ background: `linear-gradient(180deg, ${soft}, transparent 65%)` }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{comparison.label}</CardTitle>
            <CardDescription className="mt-1">
              {meta.era} · {meta.tag}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="border text-[10px]"
            style={{ borderColor: accent, color: accent }}
          >
            {similarityBand(comparison.similarityScore)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Similarity meter */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Similarity
            </span>
            <span
              className="text-2xl font-semibold tabular-nums"
              style={{ color: accent }}
            >
              {comparison.similarityScore}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / 100
              </span>
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${comparison.similarityScore}%`,
                background: accent,
              }}
            />
          </div>
        </div>

        {/* Similarities */}
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key similarities
          </div>
          <ul className="space-y-1.5">
            {comparison.similarities.map((s, idx) => (
              <li
                key={`${comparison.period}-sim-${idx}`}
                className="flex items-start gap-2 text-xs text-foreground/90"
              >
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Differences */}
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key differences
          </div>
          <ul className="space-y-1.5">
            {comparison.differences.map((s, idx) => (
              <li
                key={`${comparison.period}-diff-${idx}`}
                className="flex items-start gap-2 text-xs text-foreground/90"
              >
                <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {comparison.explanation}
        </p>
      </CardContent>
    </Card>
  );
}

export function HistoricalComparisonSection({
  comparisons,
}: {
  comparisons: HistoricalComparison[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <History className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">
              Historical similarity
            </CardTitle>
            <CardDescription>
              How today&apos;s indicator profile compares to canonical historical
              stress periods. Similarity is a lens — not a forecast that the
              same outcome will repeat.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {comparisons.length === 0 ? (
          <div
            className={cn(
              "rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground",
            )}
          >
            No historical comparisons available yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {comparisons.map((c) => (
              <ComparisonCard key={c.period} comparison={c} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
