"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import {
  RETURN_PRESETS,
  buildProjection,
  type HorizonProjection,
} from "@/lib/projections/growth";
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
    <div className="bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wide text-faint">
        {title}
      </div>
      <div className="mt-1.5 font-mono text-[20px] font-semibold tracking-tight">
        {formatCurrency(proj.endValue)}
      </div>
      <div className="mt-3 space-y-1.5 border-t pt-3 text-[12px]">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Gain from today</span>
          <span
            className={cn(
              "font-mono",
              proj.profitFromToday >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {proj.profitFromToday >= 0 ? "+" : ""}
            {formatCurrency(proj.profitFromToday)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Total return</span>
          <span className="font-mono">
            {formatPercent(proj.totalReturnPct, 1)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Multiple</span>
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
      <div className="border border-dashed bg-surface p-5">
        <h3 className="text-[13.5px] font-semibold">Future value outlook</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Add a portfolio with a positive value to open the projection tool.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border bg-surface px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold">Future value outlook</h3>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            Hypothetical 5, 10, and 20 year paths from today, compounded at an
            assumption drawn from your profile and latest analysis. A planning
            sketch, not a forecast.
            {isDemo ? " Sample portfolio." : ""}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px] text-faint">
            <span className="rounded-md border bg-background px-2 py-0.5 font-mono">
              ~{analysisPct}% / yr baseline
            </span>
            <span>No contributions, taxes, or fees modelled.</span>
          </div>
        </div>
        <Button type="button" onClick={() => setOpen(true)} className="shrink-0">
          Open projection
        </Button>
      </div>

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
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border bg-surface shadow-pop">
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2
                  id="projection-dialog-title"
                  className="text-[15px] font-semibold"
                >
                  Where this portfolio could go
                </h2>
                <p className="mt-1 font-mono text-[11.5px] text-faint">
                  Today: {formatCurrency(portfolioValue)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              <div className="border bg-background p-4">
                <p className="text-[11px] uppercase tracking-wide text-faint">
                  The assumption
                </p>
                <p className="mt-2 text-[13px] leading-relaxed">
                  {assumption.rationale}
                </p>
                <p className="mt-3 text-[11.5px] text-muted-foreground">
                  Compounding at{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {displayPct}% per year
                  </span>{" "}
                  nominal, with no contributions, withdrawals, taxes, or fees.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium">Annual return</span>
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
                          onClick={() => setManualPct(p.pct)}
                        >
                          {p.label} ~{p.pct}%
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[11.5px] text-muted-foreground">
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
                  <div className="hairline-grid mt-4 grid sm:grid-cols-3">
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

                  <p className="mt-3 text-[11px] text-faint">
                    Value × (1 + r)ⁿ. Real outcomes include volatility, cash
                    flows, and costs.
                  </p>

                  {lifeBlock && (
                    <div className="mt-5 border bg-background p-5">
                      <h3 className="text-[13.5px] font-semibold tracking-tight">
                        What that would mean in practice
                      </h3>
                      <p className="mt-0.5 text-[11.5px] text-faint">
                        {lifeBlock.headline}
                      </p>
                      <p className="mt-3 text-[13px] leading-relaxed">
                        {lifeBlock.intro}
                      </p>
                      <ul className="mt-4 space-y-2.5">
                        {lifeBlock.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-[7px] h-1 w-1 shrink-0 bg-faint" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
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
