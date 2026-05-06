"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Heart, Sparkles, TrendingUp, X } from "lucide-react";
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
import { RETURN_PRESETS, buildProjection, type HorizonProjection } from "@/lib/projections/growth";
import type { ProjectionReturnAssumption } from "@/lib/projections/assumptions";
import { buildLifeImpactBlock } from "@/lib/projections/life-impact";

type Props = {
  portfolioValue: number | null;
  investmentGoal?: string | null;
  /** Server-derived default rate + copy */
  assumption: ProjectionReturnAssumption;
  isDemo?: boolean;
};

function ProjectionColumn({
  title,
  proj,
  base,
}: {
  title: string;
  proj: HorizonProjection;
  base: number;
}) {
  return (
    <div className="rounded-xl border bg-card/50 p-4 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 font-mono text-xl font-bold tracking-tight sm:text-2xl">
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
  assumption,
  isDemo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [adjustRate, setAdjustRate] = useState(false);
  const [manualPct, setManualPct] = useState(assumption.annualReturnPct);

  const analysisPct = assumption.annualReturnPct;

  useEffect(() => {
    if (open) {
      setAdjustRate(false);
      setManualPct(assumption.annualReturnPct);
    }
  }, [open, assumption.annualReturnPct]);

  const displayPct = adjustRate ? manualPct : analysisPct;

  const projection = useMemo(
    () =>
      portfolioValue != null && portfolioValue > 0
        ? buildProjection(portfolioValue, displayPct)
        : null,
    [portfolioValue, displayPct],
  );

  const lifeBlock = useMemo(() => {
    if (!projection) return null;
    return buildLifeImpactBlock({
      startValue: projection.startValue,
      year10Profit: projection.year10.profitFromToday,
      year10Value: projection.year10.endValue,
      year20Profit: projection.year20.profitFromToday,
      year20Value: projection.year20.endValue,
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
            Future value outlook
          </CardTitle>
          <CardDescription>
            Add a portfolio with a positive value to open the projection tool.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.05] via-transparent to-violet-500/[0.04]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Future value outlook
            </CardTitle>
            <CardDescription className="max-w-xl">
              Hypothetical 5 / 10 / 20 year paths from today, using your profile and
              analysis-backed assumptions. Not a forecast or advice.
              {isDemo ? " Demo portfolio." : ""}
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setOpen(true)} className="shrink-0 gap-2">
            <Calculator className="h-4 w-4" />
            Open projection
          </Button>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-mono">
              ~{analysisPct}% / yr baseline
            </Badge>
            <span>Based on your settings{isDemo ? "" : " and latest analysis when available"}.</span>
          </div>
        </CardContent>
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="projection-dialog-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl",
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2
                  id="projection-dialog-title"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Calculator className="h-5 w-5 text-primary" />
                  Where this portfolio could go
                </h2>
                <Badge variant="outline" className="mt-2 font-mono text-xs">
                  Today: {formatCurrency(portfolioValue)}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Our assumption
                </p>
                <p className="mt-2">{assumption.rationale}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing compound growth at{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {displayPct}% per year
                  </span>{" "}
                  (nominal), no contributions or withdrawals, taxes, or fees.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">Annual return</span>
                  {!adjustRate ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdjustRate(true);
                        setManualPct(analysisPct);
                      }}
                    >
                      Adjust the rate yourself
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAdjustRate(false);
                          setManualPct(analysisPct);
                        }}
                      >
                        Use analysis default ({analysisPct}%)
                      </Button>
                    </div>
                  )}
                </div>

                {adjustRate && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {RETURN_PRESETS.map((p) => (
                        <Button
                          key={p.id}
                          type="button"
                          size="sm"
                          variant={manualPct === p.pct ? "default" : "outline"}
                          className="rounded-full"
                          onClick={() => setManualPct(p.pct)}
                        >
                          {p.label} ~{p.pct}%
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Custom: {manualPct}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={15}
                        step={0.5}
                        value={manualPct}
                        onChange={(e) => setManualPct(Number(e.target.value))}
                        className="accent-primary"
                      />
                    </div>
                  </>
                )}
              </div>

              {projection && (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <ProjectionColumn
                      title="~5 years"
                      proj={projection.year5}
                      base={projection.startValue}
                    />
                    <ProjectionColumn
                      title="~10 years"
                      proj={projection.year10}
                      base={projection.startValue}
                    />
                    <ProjectionColumn
                      title="~20 years"
                      proj={projection.year20}
                      base={projection.startValue}
                    />
                  </div>

                  <p className="mt-4 text-center text-[11px] text-muted-foreground">
                    Value × (1 + r)^n. Real life includes volatility, cash flows, and costs
                    — use this as a planning sketch only.
                  </p>

                  {lifeBlock && (
                    <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5">
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

              <div className="mt-6 flex justify-end">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
