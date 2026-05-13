"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  regimeToneClasses,
  scoreToHsl,
  scoreToSoftHsl,
} from "./risk-style-utils";
import type { RiskIndicator } from "@/lib/market-risk/types";

function TrendIcon({ trend }: { trend: RiskIndicator["trend"] }) {
  if (trend === "rising")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
        <ArrowUpRight className="h-3.5 w-3.5" />
        rising
      </span>
    );
  if (trend === "falling")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
        <ArrowDownRight className="h-3.5 w-3.5" />
        falling
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <ArrowRight className="h-3.5 w-3.5" />
      stable
    </span>
  );
}

function IndicatorCard({ indicator }: { indicator: RiskIndicator }) {
  const tone = regimeToneClasses(indicator.status);
  const accent = scoreToHsl(indicator.score);
  const fillSoft = scoreToSoftHsl(indicator.score, 0.18);

  return (
    <Card
      className={cn(
        "h-full border transition-shadow hover:shadow-md",
        tone.border,
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {indicator.label}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="text-3xl font-semibold tabular-nums"
                style={{ color: accent }}
              >
                {indicator.score}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <Badge variant="outline" className={cn("border text-[10px]", tone.badge)}>
            {indicator.status}
          </Badge>
        </div>

        {/* Mini bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${indicator.score}%`,
              background: accent,
              boxShadow: `0 0 8px ${fillSoft}`,
            }}
          />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {indicator.explanation}
        </p>

        <div className="pt-1">
          <TrendIcon trend={indicator.trend} />
        </div>
      </CardContent>
    </Card>
  );
}

export function IndicatorBreakdown({
  indicators,
}: {
  indicators: RiskIndicator[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Indicator breakdown</CardTitle>
        <CardDescription>
          How each input contributes to the overall risk score. These are
          components of a risk indicator — not individual forecasts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {indicators.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No indicator data available yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {indicators.map((ind) => (
              <IndicatorCard key={ind.key} indicator={ind} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
