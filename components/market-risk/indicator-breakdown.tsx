"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { regimeToneClasses, scoreToHsl } from "./risk-style-utils";
import type { RiskIndicator } from "@/lib/market-risk/types";

function TrendIcon({ trend }: { trend: RiskIndicator["trend"] }) {
  if (trend === "rising")
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-destructive">
        <ArrowUpRight className="h-3.5 w-3.5 stroke-[1.6]" />
        rising
      </span>
    );
  if (trend === "falling")
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-success">
        <ArrowDownRight className="h-3.5 w-3.5 stroke-[1.6]" />
        falling
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground">
      <ArrowRight className="h-3.5 w-3.5 stroke-[1.6]" />
      stable
    </span>
  );
}

function IndicatorCard({ indicator }: { indicator: RiskIndicator }) {
  const tone = regimeToneClasses(indicator.status);
  const accent = scoreToHsl(indicator.score);

  return (
    <div className="flex h-full flex-col px-[18px] py-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-faint">
          {indicator.label}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
            tone.badge,
          )}
        >
          {indicator.status}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span
          className="font-mono text-[21px] font-semibold leading-none tracking-tight"
          style={{ color: accent }}
        >
          {indicator.score}
        </span>
        <span className="font-mono text-[11px] text-faint">/ 100</span>
      </div>

      {/* Score track */}
      <div className="mt-2.5 h-1 w-full bg-border">
        <div
          className="h-full"
          style={{ width: `${indicator.score}%`, background: accent }}
        />
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
        {indicator.explanation}
      </p>

      <div className="mt-auto pt-2.5">
        <TrendIcon trend={indicator.trend} />
      </div>
    </div>
  );
}

export function IndicatorBreakdown({
  indicators,
}: {
  indicators: RiskIndicator[];
}) {
  return (
    <div className="border bg-surface">
      <div className="border-b px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold tracking-tight">
          Indicator breakdown
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          How each input contributes to the overall risk score. These are
          components of a risk indicator, not individual forecasts.
        </p>
      </div>

      {indicators.length === 0 ? (
        <div className="p-5">
          <div className="border border-dashed bg-surface p-8 text-center text-[13px] text-muted-foreground">
            No indicator data available yet.
          </div>
        </div>
      ) : (
        <div className="hairline-grid grid border-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {indicators.map((ind) => (
            <IndicatorCard key={ind.key} indicator={ind} />
          ))}
        </div>
      )}
    </div>
  );
}
