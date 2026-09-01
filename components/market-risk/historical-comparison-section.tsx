"use client";

import { Check, History, Minus } from "lucide-react";
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
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold tracking-tight">
            {comparison.label}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {meta.era} · {meta.tag}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium"
          style={{ color: accent, background: soft }}
        >
          {similarityBand(comparison.similarityScore)}
        </span>
      </div>

      {/* Similarity meter */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-faint">
            Similarity
          </span>
          <span
            className="font-mono text-[19px] font-semibold leading-none tracking-tight"
            style={{ color: accent }}
          >
            {comparison.similarityScore}
            <span className="ml-1 font-mono text-[11px] font-normal text-faint">
              / 100
            </span>
          </span>
        </div>
        <div className="mt-2 h-1 w-full bg-border">
          <div
            className="h-full"
            style={{
              width: `${comparison.similarityScore}%`,
              background: accent,
            }}
          />
        </div>
      </div>

      {/* Similarities */}
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-wide text-faint">
          Key similarities
        </div>
        <ul className="mt-1.5 space-y-1.5">
          {comparison.similarities.map((s, idx) => (
            <li
              key={`${comparison.period}-sim-${idx}`}
              className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.6] text-success" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Differences */}
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-wide text-faint">
          Key differences
        </div>
        <ul className="mt-1.5 space-y-1.5">
          {comparison.differences.map((s, idx) => (
            <li
              key={`${comparison.period}-diff-${idx}`}
              className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground"
            >
              <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.6] text-faint" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 border border-dashed bg-background px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
        {comparison.explanation}
      </p>
    </div>
  );
}

export function HistoricalComparisonSection({
  comparisons,
}: {
  comparisons: HistoricalComparison[];
}) {
  return (
    <div className="border bg-surface">
      <div className="flex items-start gap-2.5 border-b px-5 py-3.5">
        <History className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
        <div>
          <h2 className="text-[13.5px] font-semibold tracking-tight">
            Historical similarity
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            How today&apos;s indicator profile compares to canonical historical
            stress periods. Similarity is a lens, not a forecast that the same
            outcome will repeat.
          </p>
        </div>
      </div>

      {comparisons.length === 0 ? (
        <div className="p-5">
          <div className="border border-dashed bg-surface p-8 text-center text-[13px] text-muted-foreground">
            No historical comparisons available yet.
          </div>
        </div>
      ) : (
        <div className="hairline-grid grid border-0 md:grid-cols-2">
          {comparisons.map((c) => (
            <ComparisonCard key={c.period} comparison={c} />
          ))}
        </div>
      )}
    </div>
  );
}
