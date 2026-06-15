import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Static sample — mirrors a real AI report for marketing. */
const SAMPLE = {
  portfolioLabel: "$482K tech-heavy portfolio · Moderate risk profile",
  generatedAt: "Sample report",
  summary:
    "Your portfolio is up 18.4% overall but carries meaningful concentration risk. NVDA and MSFT together represent 41% of total value — well above a typical moderate-risk target. Technology sector exposure sits at 62%, creating correlated downside if growth multiples compress. Cash flow quality across top holdings remains strong, but rebalancing 8–12% from winners into broad-market and defensive exposure would better align with your stated 5/10 comfort level.",
  riskScore: { portfolio: 7.2, comfort: 5.5, label: "Elevated" },
  strengths: [
    "Strong unrealised gains in core AI beneficiaries (NVDA +94%, MSFT +32%)",
    "Low overlap with high-debt sectors — balance sheet quality is solid",
    "Cost basis discipline: average hold period > 2 years on top 5 names",
  ],
  risks: [
    "Single-name concentration: NVDA alone is 24% of portfolio value",
    "Sector correlation: 62% technology — macro rate shocks hit all positions",
    "No fixed-income or defensive allocation despite moderate risk profile",
  ],
  holdings: [
    {
      ticker: "NVDA",
      action: "CONSIDER_REDUCING" as const,
      verdict: "TRIM",
      reason:
        "Exceptional run but position size exceeds prudent limits. Trim toward 12–15% and redeploy into diversified ETF exposure.",
    },
    {
      ticker: "MSFT",
      action: "HOLD" as const,
      verdict: "HOLD",
      reason:
        "Core compounder with cloud + AI optionality. Size is elevated but fundamentals support maintaining a large position.",
    },
    {
      ticker: "AAPL",
      action: "CONSIDER_ADDING" as const,
      verdict: "ACCUMULATE",
      reason:
        "Underweight vs historical allocation. Services margin expansion and capital return program support gradual adds on weakness.",
    },
  ],
  additions: [
    {
      ticker: "VTI",
      suggestion: "Broad US equity ETF",
      rationale: "Reduce single-name risk while staying invested in US growth.",
    },
    {
      ticker: "BND",
      suggestion: "Investment-grade bond ETF",
      rationale: "Add ballast aligned with moderate risk tolerance.",
    },
  ],
};

const ACTION_VARIANT: Record<
  string,
  "destructive" | "warning" | "success" | "secondary"
> = {
  CONSIDER_SELLING: "destructive",
  CONSIDER_REDUCING: "warning",
  HOLD: "secondary",
  CONSIDER_ADDING: "success",
};

function formatAction(action: string): string {
  return action.replace("CONSIDER_", "Consider ").replace("_", " ");
}

export function LandingSampleReport() {
  const { riskScore } = SAMPLE;
  const isAbove = riskScore.portfolio > riskScore.comfort + 1;

  return (
    <section className="relative z-10 border-y border-border/50 bg-gradient-to-b from-background via-muted/15 to-background py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Sample analysis
          </p>
          <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
            This is what you get — not a generic chat reply
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Structured report with risk scoring, per-holding actions, and concrete
            rebalancing ideas — generated from your actual holdings and investor
            profile.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <Card className="border-amber-500/30 bg-amber-500/[0.04] lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-amber-500" />
                Risk vs your profile
              </CardTitle>
              <CardDescription>{SAMPLE.portfolioLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Portfolio risk</p>
                  <p className="text-4xl font-semibold tabular-nums">
                    {riskScore.portfolio}
                    <span className="text-lg text-muted-foreground">/10</span>
                  </p>
                  <Badge variant="warning" className="mt-1">
                    {riskScore.label}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Your comfort</p>
                  <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
                    {riskScore.comfort}/10
                  </p>
                </div>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-destructive"
                  style={{ width: `${(riskScore.portfolio / 10) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-foreground"
                  style={{ left: `${(riskScore.comfort / 10) * 100}%` }}
                />
              </div>
              {isAbove && (
                <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Portfolio risk is 1.7 points above your moderate comfort level —
                  rebalancing recommended.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Executive summary
              </CardTitle>
              <CardDescription>{SAMPLE.generatedAt}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-relaxed text-foreground/90">
                {SAMPLE.summary}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Strengths
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {SAMPLE.strengths.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-emerald-500">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                    <Shield className="h-3.5 w-3.5" />
                    Risks
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {SAMPLE.risks.map((r) => (
                      <li key={r} className="flex gap-2">
                        <span className="text-destructive">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-primary/25 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Action plan — holdings to review
            </CardTitle>
            <CardDescription>
              Per-ticker verdicts with reasons. Tap through in the full product.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              {SAMPLE.holdings.map((h) => (
                <div
                  key={h.ticker}
                  className="rounded-lg border bg-background/80 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={ACTION_VARIANT[h.action] ?? "secondary"}
                      className="font-mono text-xs"
                    >
                      {h.ticker}
                    </Badge>
                    {h.verdict && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {h.verdict}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-medium">
                    {formatAction(h.action)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {h.reason}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Research next
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {SAMPLE.additions.map((a) => (
                  <div
                    key={a.ticker}
                    className="flex items-start gap-3 rounded-lg border bg-background/80 p-3"
                  >
                    <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                      {a.ticker}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{a.suggestion}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/sign-up">
                  <Sparkles className="h-4 w-4" />
                  Generate yours — free to start
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg" className="gap-2">
                <Link href="/dashboard">
                  View demo dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Sample data for illustration. Not financial advice.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
