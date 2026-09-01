import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RiskScoreResult } from "@/lib/portfolio/risk-score";

const IMPACT_TONE: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-faint",
};

/** Absolute risk level, independent of whether it matches the mandate. */
const LEVEL_TONE: Record<string, string> = {
  Low: "bg-success-soft text-success",
  Moderate: "bg-primary-soft text-primary",
  Elevated: "bg-warning-soft text-warning",
  High: "bg-destructive-soft text-destructive",
};

export function RiskScoreCard({
  result,
  showAdvisorLink = true,
  compact = false,
  portfolioId,
}: {
  result: RiskScoreResult;
  showAdvisorLink?: boolean;
  compact?: boolean;
  portfolioId?: string;
}) {
  const isAbove = result.alignment === "above";
  const isBelow = result.alignment === "below";

  const headline = isAbove
    ? "Measured risk sits above the comfort level you set"
    : isBelow
      ? "Measured risk sits below the comfort level you set"
      : "Measured risk is in line with the comfort level you set";

  const fillPct = Math.max(0, Math.min(100, (result.score / 10) * 100));
  const comfortPct = Math.max(
    0,
    Math.min(100, (result.comfortLevel / 10) * 100),
  );

  return (
    <div className="border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[13.5px] font-semibold">Risk exposure</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{headline}</p>
        </div>
        <span
          className={cn(
            "rounded-[5px] px-2 py-0.5 text-[11px] font-medium",
            LEVEL_TONE[result.riskLabel] ?? "bg-primary-soft text-primary",
          )}
        >
          {result.riskLabel} risk
        </span>
      </div>

      {/* Scale with a marker at the stated comfort level */}
      <div className="relative mt-5 h-2 bg-border">
        <div
          className="absolute inset-y-0 left-0 bg-foreground transition-all"
          style={{ width: `${fillPct}%` }}
        />
        <div
          className="absolute -top-1 h-4 w-0.5 bg-destructive"
          style={{ left: `calc(${comfortPct}% - 1px)` }}
          title={`Comfort level: ${result.comfortLevel}/10`}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10.5px] text-faint">
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4">
        <div className="text-[12px] text-muted-foreground">
          Your portfolio
          <span className="mt-0.5 block font-mono text-[15px] font-semibold text-foreground">
            {result.score}
          </span>
        </div>
        <div className="text-[12px] text-muted-foreground">
          {result.comfortLabel} comfort
          <span className="mt-0.5 block font-mono text-[15px] font-semibold text-foreground">
            {result.comfortLevel}
          </span>
        </div>
        <div className="text-[12px] text-muted-foreground">
          Delta
          <span
            className={cn(
              "mt-0.5 block font-mono text-[15px] font-semibold",
              isAbove
                ? "text-destructive"
                : isBelow
                  ? "text-success"
                  : "text-foreground",
            )}
          >
            {result.delta > 0 ? "+" : ""}
            {result.delta}
          </span>
        </div>
      </div>

      {!compact && result.factors.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {result.factors.map((f) => (
            <li
              key={f.label}
              className="flex items-start gap-2.5 border px-2.5 py-2 text-[11.5px] text-muted-foreground"
            >
              <span
                className={cn(
                  "mt-[5px] h-[7px] w-[7px] shrink-0",
                  IMPACT_TONE[f.impact] ?? "bg-faint",
                )}
              />
              <span>
                <span className="font-medium text-foreground">{f.label}</span>
                {f.detail ? <>, {f.detail}</> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {showAdvisorLink && isAbove ? (
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link
            href={
              portfolioId
                ? `/advisor?portfolio=${encodeURIComponent(portfolioId)}`
                : "/advisor"
            }
          >
            Get rebalancing ideas
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
