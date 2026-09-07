import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TryFreeAnalysisButton } from "@/components/landing/try-free-analysis-button";

/** Static sample — mirrors the shape of a real generated report. */
const SAMPLE = {
  portfolioLabel: "$482K book · Moderate mandate · 14 positions",
  summary:
    "The book is up 18.4%, but the return is carried by two names. NVDA and MSFT together account for 41% of value, well above the ceiling implied by a moderate mandate, and technology sits at 62% of exposure, so a multiple compression event hits nearly two thirds of the portfolio at once. Balance-sheet quality across the top five is strong and the average hold period is over two years, which argues against wholesale selling. Recycling 8–12% out of the winners into broad-market and defensive exposure brings measured risk back inside the 5.5 comfort level without abandoning the thesis.",
  riskScore: { portfolio: 7.2, comfort: 5.5, label: "Elevated" },
  strengths: [
    "Unrealised gains concentrated in cash-generative AI beneficiaries (NVDA +94%, MSFT +32%)",
    "Minimal overlap with high-leverage sectors; aggregate net debt / EBITDA below peer median",
    "Average holding period above two years on the top five names",
  ],
  risks: [
    "Single-name concentration: NVDA alone is 24% of portfolio value",
    "Sector correlation: 62% technology means one macro shock moves every major line",
    "No fixed income or defensive sleeve despite a stated moderate mandate",
  ],
  holdings: [
    {
      ticker: "NVDA",
      verdict: "Recycle" as const,
      weight: "24.1%",
      reason:
        "Exceptional run, but position size exceeds the mandate ceiling. Trim toward 12–15% and redeploy into diversified exposure.",
    },
    {
      ticker: "MSFT",
      verdict: "Hold" as const,
      weight: "16.8%",
      reason:
        "Core compounder with cloud and AI optionality. Size is elevated, but filing-level fundamentals support keeping it large.",
    },
    {
      ticker: "AAPL",
      verdict: "Accumulate" as const,
      weight: "6.4%",
      reason:
        "Underweight versus historical allocation. Services margin expansion and the buyback support gradual adds on weakness.",
    },
  ],
  additions: [
    {
      ticker: "VTI",
      suggestion: "Broad US equity",
      rationale: "Cuts single-name risk while staying invested in US growth.",
    },
    {
      ticker: "BND",
      suggestion: "Investment-grade bonds",
      rationale: "Adds ballast in line with a moderate mandate.",
    },
  ],
};

const VERDICT_TONE: Record<string, string> = {
  Accumulate: "bg-success-soft text-success",
  Hold: "bg-warning-soft text-warning",
  Recycle: "bg-destructive-soft text-destructive",
};

export function LandingSampleReport() {
  const { riskScore } = SAMPLE;
  const gap = (riskScore.portfolio - riskScore.comfort).toFixed(1);

  return (
    <section className="border-t bg-surface py-16 md:py-[70px]">
      <div className="mx-auto max-w-[1160px] px-6 md:px-10">
        <div className="max-w-[600px]">
          <h2 className="text-[27px] font-semibold leading-tight tracking-tight">
            What the report actually says.
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            Not a score and a shrug. A written case for every position, the risk
            measured against the mandate you set, and the specific trades that
            would close the gap.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          {/* Risk vs mandate */}
          <div className="border bg-background p-5 lg:col-span-2">
            <div className="text-[11px] uppercase tracking-wide text-faint">
              Risk versus mandate
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {SAMPLE.portfolioLabel}
            </div>

            <div className="mt-6 flex items-end justify-between">
              <div>
                <div className="text-[12px] text-muted-foreground">
                  Measured risk
                </div>
                <div className="mt-1 font-mono text-[38px] font-semibold leading-none">
                  {riskScore.portfolio}
                  <span className="text-[18px] text-faint">/10</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] text-muted-foreground">
                  Your comfort level
                </div>
                <div className="mt-1 font-mono text-[22px] font-semibold leading-none text-muted-foreground">
                  {riskScore.comfort}/10
                </div>
              </div>
            </div>

            <div className="relative mt-5 h-2 bg-border">
              <div
                className="absolute inset-y-0 left-0 bg-foreground"
                style={{ width: `${(riskScore.portfolio / 10) * 100}%` }}
              />
              <div
                className="absolute -top-1 h-4 w-0.5 bg-destructive"
                style={{ left: `${(riskScore.comfort / 10) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10.5px] text-faint">
              {[0, 2, 4, 6, 8, 10].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>

            <p className="mt-5 border-t pt-4 text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-destructive">
                +{gap} above mandate.
              </span>{" "}
              Driven by concentration in two names rather than by the volatility
              of the book as a whole, which is why the fix is a trim, not a
              de-risk.
            </p>
          </div>

          {/* Executive summary */}
          <div className="border bg-background p-5 lg:col-span-3">
            <div className="text-[11px] uppercase tracking-wide text-faint">
              Executive summary
            </div>
            <p className="mt-3 text-[13px] leading-[1.75]">{SAMPLE.summary}</p>

            <div className="mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2">
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-wide text-success">
                  What is working
                </h4>
                <ul className="mt-2.5 space-y-2">
                  {SAMPLE.strengths.map((s) => (
                    <li
                      key={s}
                      className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 bg-success" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-wide text-destructive">
                  What is exposed
                </h4>
                <ul className="mt-2.5 space-y-2">
                  {SAMPLE.risks.map((r) => (
                    <li
                      key={r}
                      className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 bg-destructive" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action plan */}
        <div className="mt-4 border bg-background">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
            <div className="text-[13.5px] font-semibold">
              Positions to act on
            </div>
            <div className="text-[11px] text-faint">
              Every verdict links back to the filing behind it
            </div>
          </div>

          <div className="hairline-grid grid border-0 md:grid-cols-3">
            {SAMPLE.holdings.map((h) => (
              <div key={h.ticker} className="bg-background p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[15px] font-semibold">
                    {h.ticker}
                  </span>
                  <span
                    className={cn(
                      "rounded-[5px] px-2 py-0.5 text-[11px] font-medium",
                      VERDICT_TONE[h.verdict],
                    )}
                  >
                    {h.verdict}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-faint">
                  {h.weight} of book
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  {h.reason}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t px-5 py-5">
            <h4 className="text-[11px] uppercase tracking-wide text-faint">
              Where the proceeds could go
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {SAMPLE.additions.map((a) => (
                <div key={a.ticker} className="flex items-start gap-3 border p-3">
                  <span className="mt-px shrink-0 rounded-md border bg-surface px-2 py-0.5 font-mono text-[11px] font-medium">
                    {a.ticker}
                  </span>
                  <div>
                    <p className="text-[13px] font-medium">{a.suggestion}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {a.rationale}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t px-5 py-5">
            <TryFreeAnalysisButton tone="inline">
              Analyse your book free
            </TryFreeAnalysisButton>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Open the worked example</Link>
            </Button>
            <p className="text-[11px] text-faint">
              Sample figures, shown for illustration. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
