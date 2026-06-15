import Link from "next/link";
import { AlertTriangle, ArrowRight, Shield, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RiskScoreResult } from "@/lib/portfolio/risk-score";

function ScoreGauge({
  score,
  comfortLevel,
}: {
  score: number;
  comfortLevel: number;
}) {
  const pct = (score / 10) * 100;
  const comfortPct = (comfortLevel / 10) * 100;

  return (
    <div className="relative mx-auto w-full max-w-xs">
      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-destructive transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 z-10 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground shadow-sm"
          style={{ left: `calc(${comfortPct}% - 1px)` }}
          title={`Your comfort level: ${comfortLevel}/10`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>Low risk</span>
        <span>High risk</span>
      </div>
    </div>
  );
}

export function RiskScoreCard({
  result,
  showAdvisorLink = true,
  compact = false,
}: {
  result: RiskScoreResult;
  showAdvisorLink?: boolean;
  compact?: boolean;
}) {
  const isAbove = result.alignment === "above";
  const isBelow = result.alignment === "below";

  const headline = isAbove
    ? "Portfolio risk is above your comfort level"
    : isBelow
      ? "Portfolio risk is below your comfort level"
      : "Portfolio risk aligns with your profile";

  const Icon = isAbove ? AlertTriangle : isBelow ? TrendingUp : Shield;

  return (
    <Card
      className={cn(
        "border-border/70",
        isAbove && "border-amber-500/40 bg-amber-500/[0.03]",
        isBelow && "border-emerald-500/30 bg-emerald-500/[0.03]",
      )}
    >
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon
                className={cn(
                  "h-4 w-4",
                  isAbove && "text-amber-500",
                  isBelow && "text-emerald-500",
                  !isAbove && !isBelow && "text-primary",
                )}
              />
              Risk vs profile
            </CardTitle>
            <CardDescription className="mt-1">{headline}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums tracking-tight">
              {result.score}
              <span className="text-base font-normal text-muted-foreground">/10</span>
            </div>
            <Badge variant="outline" className="mt-1 text-[10px]">
              {result.riskLabel} risk
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScoreGauge score={result.score} comfortLevel={result.comfortLevel} />

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>
            Your portfolio:{" "}
            <strong className="text-foreground">{result.score}/10</strong>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            {result.comfortLabel} comfort:{" "}
            <strong className="text-foreground">{result.comfortLevel}/10</strong>
          </span>
          {result.delta !== 0 && (
            <>
              <span className="hidden sm:inline">·</span>
              <span
                className={cn(
                  isAbove && "text-amber-600",
                  isBelow && "text-emerald-600",
                )}
              >
                {result.delta > 0 ? "+" : ""}
                {result.delta} vs target
              </span>
            </>
          )}
        </div>

        {!compact && (
          <ul className="space-y-2">
            {result.factors.map((f) => (
              <li
                key={f.label}
                className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
              >
                <Badge
                  variant={
                    f.impact === "high"
                      ? "destructive"
                      : f.impact === "medium"
                        ? "warning"
                        : "secondary"
                  }
                  className="mt-0.5 shrink-0 text-[9px]"
                >
                  {f.impact}
                </Badge>
                <div>
                  <span className="font-medium">{f.label}</span>
                  <p className="text-xs text-muted-foreground">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showAdvisorLink && isAbove && (
          <Button variant="outline" size="sm" className="w-full gap-1" asChild>
            <Link href="/advisor">
              Get rebalancing ideas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
