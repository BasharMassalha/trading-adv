"use client";

import { useMemo, useState } from "react";
import { Calculator, Heart, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import {
  RETURN_PRESETS,
  buildProjection,
  type GrowthProjection,
} from "@/lib/projections/growth";
import { buildLifeImpactBlock } from "@/lib/projections/life-impact";

type Props = {
  /** Current total portfolio value (USD) */
  portfolioValue: number | null;
  /** Optional investor goal from profile for tone in the life section */
  investmentGoal?: string | null;
  /** When true, show a short note that demo value is used */
  isDemo?: boolean;
};

function ProjectionColumn({
  title,
  proj,
  base,
}: {
  title: string;
  proj: GrowthProjection["year5"];
  base: number;
}) {
  return (
    <div className="rounded-xl border bg-card/50 p-4 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold tracking-tight">
        {formatCurrency(proj.endValue)}
      </div>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between gap-2">
          <span>Gain from today</span>
          <span
            className={cn(
              "font-medium text-foreground",
              proj.profitFromToday >= 0 ? "text-emerald-600 dark:text-emerald-400" : "",
            )}
          >
            {proj.profitFromToday >= 0 ? "+" : ""}
            {formatCurrency(proj.profitFromToday)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Total return</span>
          <span className="font-mono text-foreground">
            {formatPercent(proj.totalReturnPct, 1)}
          </span>
        </div>
        <div className="flex justify-between gap-2 text-xs">
          <span>vs. starting</span>
          <span className="font-mono">
            {base > 0 ? `${(proj.endValue / base).toFixed(2)}×` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FuturePortfolioProjection({
  portfolioValue,
  investmentGoal,
  isDemo,
}: Props) {
  const [annualPct, setAnnualPct] = useState<number>(7);

  const projection = useMemo(
    () =>
      portfolioValue != null && portfolioValue > 0
        ? buildProjection(portfolioValue, annualPct)
        : null,
    [portfolioValue, annualPct],
  );

  const lifeBlock = useMemo(() => {
    if (!projection) return null;
    return buildLifeImpactBlock({
      startValue: projection.startValue,
      year10Profit: projection.year10.profitFromToday,
      year10Value: projection.year10.endValue,
      annualReturnPct: projection.annualReturnPct,
      investmentGoal,
    });
  }, [projection, investmentGoal]);

  if (portfolioValue == null || portfolioValue <= 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Future value calculator
          </CardTitle>
          <CardDescription>
            Add a portfolio with a positive value to see hypothetical 5- and 10-year
            projections.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-transparent to-violet-500/[0.05]">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Future value calculator
            </CardTitle>
            <CardDescription className="max-w-2xl">
              Hypothetical compounding from today’s portfolio value — no
              contributions, withdrawals, taxes, or fees. Not a prediction or
              advice.
              {isDemo ? " Demo portfolio value shown." : ""}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 font-mono text-xs">
            Today: {formatCurrency(portfolioValue)}
          </Badge>
        </div>

        {/* Presets + custom rate */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {RETURN_PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={annualPct === p.pct ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setAnnualPct(p.pct)}
              >
                {p.label} ~{p.pct}%
              </Button>
            ))}
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
            <label className="text-xs font-medium text-muted-foreground">
              Custom annual return: {annualPct}%
            </label>
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={annualPct}
              onChange={(e) => setAnnualPct(Number(e.target.value))}
              className="accent-primary"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {projection && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ProjectionColumn
                title="About 5 years"
                proj={projection.year5}
                base={projection.startValue}
              />
              <ProjectionColumn
                title="About 10 years"
                proj={projection.year10}
                base={projection.startValue}
              />
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Formula: value × (1 + r)^n where r = {annualPct}% per year. Real
              results depend on returns, volatility, cash flows, and costs.
            </p>

            {lifeBlock && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 sm:p-6">
                <div className="mb-3 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <h3 className="text-sm font-semibold tracking-tight">
                      How your life could feel if this happened
                    </h3>
                  </div>
                  <p className="pl-6 text-xs text-muted-foreground">{lifeBlock.headline}</p>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {lifeBlock.intro}
                </p>
                <ul className="mt-4 space-y-3">
                  {lifeBlock.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                    >
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
