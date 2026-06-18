"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Film,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquare,
  Newspaper,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdvisorChat } from "./advisor-chat";
import {
  PortfolioNewsSection,
  type NewsBundleView,
} from "./portfolio-news-section";
import type { ReportView, InvestorProfileView } from "@/server/services/analysis.service";
import { TickerContextDrawer } from "@/components/advisor/ticker-context-drawer";
import { HoldingsSlideshow } from "@/components/advisor/holdings-slideshow";
import { BriefingPlayer } from "@/components/advisor/briefing-player";

type PortfolioSummary = {
  id: string;
  name: string;
  holdingCount: number;
  lastEnrichedAt: string | null;
};

type Readiness = {
  ready: boolean;
  hasProfile: boolean;
  hasPortfolio: boolean;
  isEnriched: boolean;
  holdingCount: number;
  message: string | null;
};

type Props = {
  portfolio: PortfolioSummary | null;
  investorProfile: InvestorProfileView | null;
  latestReport: ReportView | null;
  readiness: Readiness | null;
  newsBundle: NewsBundleView | null;
};

export function AdvisorDashboard({
  portfolio,
  investorProfile,
  latestReport,
  readiness,
  newsBundle,
}: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseTicker, setPulseTicker] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);

  async function generateAnalysis() {
    if (!portfolio) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/portfolio/${portfolio.id}/analyze`, {
        method: "POST",
      });
      const json = await res.json();

      if (!json.ok) {
        setError(json.message ?? "Failed to generate analysis.");
        return;
      }

      // Vercel: analysis runs in background — poll until READY.
      if (res.status === 202 || json.data?.status === "GENERATING") {
        const reportId = json.data?.reportId as string | undefined;
        if (!reportId) {
          setError("Analysis started but no report id was returned.");
          return;
        }
        await pollUntilReportReady(portfolio.id, reportId);
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function pollUntilReportReady(
    portfolioId: string,
    reportId: string,
  ): Promise<void> {
    const maxAttempts = 120; // ~6 minutes at 3s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(
        `/api/portfolio/${portfolioId}/analyze?reportId=${encodeURIComponent(reportId)}`,
      );
      const json = await res.json();
      if (!json.ok) continue;

      const status = json.data?.status ?? json.data?.report?.status;
      if (status === "READY") return;
      if (status === "FAILED") {
        const msg =
          json.data?.report?.summary ??
          "Analysis failed. Please try again.";
        throw new Error(msg);
      }
    }
    throw new Error(
      "Analysis is taking longer than expected. Please refresh the page in a minute.",
    );
  }

  // ── No portfolio state ───────────────────────────────────────────────────
  if (!portfolio) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import your portfolio to get started
          </h1>
          <p className="mt-2 text-muted-foreground">
            The AI advisor needs portfolio data to analyze. Upload a CSV or
            screenshot to begin.
          </p>
        </div>
        <div className="flex justify-center">
          <Link href="/portfolio/upload">
            <Button size="lg" className="gap-2">
              <Upload className="h-4 w-4" />
              Import portfolio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Setup prompts ────────────────────────────────────────────────────────
  const showSetupPrompts = !investorProfile || !readiness?.isEnriched;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Advisor</h1>
          <p className="text-sm text-muted-foreground">
            Personalized portfolio analysis and recommendations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            {portfolio.name}
          </Badge>
          {latestReport && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Report ready
            </Badge>
          )}
          {latestReport && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => setShowBriefing(true)}
            >
              <Film className="h-3.5 w-3.5" />
              Watch briefing
            </Button>
          )}
          {latestReport?.actionPlan?.holdingsToReview &&
            latestReport.actionPlan.holdingsToReview.some(
              (h) => h.ticker && h.ticker !== "BLEND",
            ) && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowSlideshow(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Walk through stocks
              </Button>
            )}
        </div>
      </div>

      {/* Setup prompts */}
      {showSetupPrompts && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!investorProfile && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-amber-600" />
                  Set up your investor profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get personalized analysis by telling us your risk tolerance
                  and goals.
                </p>
                <Link href="/settings/investor-profile">
                  <Button variant="outline" size="sm" className="gap-1">
                    Complete profile
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {!readiness?.isEnriched && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  Enrich with market data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Fetch current prices and market data for accurate analysis.
                </p>
                <Link href={`/portfolio/${portfolio.id}`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    Go to portfolio
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main content */}
      <Tabs defaultValue={latestReport ? "report" : "news"} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="mt-6">
          {newsBundle ? (
            <PortfolioNewsSection
              bundle={newsBundle}
              portfolioName={portfolio.name}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          {latestReport ? (
            <ReportDisplay report={latestReport} onTickerPulse={setPulseTicker} />
          ) : (
            <EmptyReportState
              readiness={readiness}
              generating={generating}
              error={error}
              onGenerate={generateAnalysis}
            />
          )}

          {/* Generate / regenerate button */}
          {latestReport && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                onClick={generateAnalysis}
                disabled={generating || !readiness?.ready}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing… (may take 2–3 min)
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate analysis
                  </>
                )}
              </Button>
              {error && (
                <span className="text-sm text-destructive">{error}</span>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <div className="h-[calc(100vh-20rem)]">
            <AdvisorChat portfolioId={portfolio.id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground">
        <Sparkles className="mr-1 inline-block h-3 w-3" />
        AI analysis is informational only — not financial advice. Always do your
        own research before making investment decisions.
      </p>

      <TickerContextDrawer
        ticker={pulseTicker}
        onClose={() => setPulseTicker(null)}
      />

      <HoldingsSlideshow
        open={showSlideshow}
        onClose={() => setShowSlideshow(false)}
        holdings={latestReport?.actionPlan?.holdingsToReview ?? []}
        onTickerPulse={(t) => {
          setShowSlideshow(false);
          setPulseTicker(t);
        }}
      />

      <BriefingPlayer
        open={showBriefing}
        onClose={() => setShowBriefing(false)}
        report={latestReport}
        portfolioName={portfolio.name}
        news={newsBundle?.items}
      />
    </div>
  );
}

function EmptyReportState({
  readiness,
  generating,
  error,
  onGenerate,
}: {
  readiness: Readiness | null;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const canGenerate = readiness?.ready ?? false;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Generate your first analysis</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
          {canGenerate
            ? "Click below to generate a comprehensive AI analysis of your portfolio."
            : readiness?.message ??
              "Complete the setup steps above to unlock analysis."}
        </p>

        <Button
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          className="mt-6 gap-2"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing… (may take 2–3 min)
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Generate analysis
            </>
          )}
        </Button>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ReportDisplay({
  report,
  onTickerPulse,
}: {
  report: ReportView;
  onTickerPulse: (ticker: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Summary
          </CardTitle>
          <CardDescription>
            <span className="block text-xs text-muted-foreground/90">
              Analysis may incorporate recent company and market news for your
              largest positions. See the <strong>News</strong> tab for the
              articles used.
            </span>
            {report.generatedAt && (
              <span className="mt-1 block text-sm">
                Generated{" "}
                {new Date(report.generatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {report.modelUsed && (
                  <span className="ml-2 text-xs">({report.modelUsed})</span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-foreground/90">{report.summary}</p>
        </CardContent>
      </Card>

      {/* Action Plan - NEW prominent section */}
      {report.actionPlan && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Action Plan
            </CardTitle>
            <CardDescription>
              Holdings to review, ideas for new names to research, and rebalancing — grounded in
              this analysis. Not personal financial advice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Holdings to Review */}
            {report.actionPlan.holdingsToReview && report.actionPlan.holdingsToReview.length > 0 && (
              <div>
                <h4 className="mb-3 font-semibold">Holdings to Review</h4>
                <div className="space-y-3">
                  {report.actionPlan.holdingsToReview.map((h, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-3 rounded-lg border bg-background p-3"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            h.ticker && h.ticker !== "BLEND"
                              ? onTickerPulse(h.ticker)
                              : undefined
                          }
                          className="shrink-0 rounded-md outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          disabled={!h.ticker || h.ticker === "BLEND"}
                        >
                          <Badge
                            variant={
                              h.action === "CONSIDER_SELLING"
                                ? "destructive"
                                : h.action === "CONSIDER_REDUCING"
                                  ? "warning"
                                  : h.action === "CONSIDER_ADDING"
                                    ? "success"
                                    : "secondary"
                            }
                            className="cursor-pointer font-mono text-xs hover:opacity-90"
                          >
                            {h.ticker}
                          </Badge>
                        </button>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium">
                              {h.action.replace("CONSIDER_", "Consider ").replace("_", " ")}
                            </div>
                            {h.verdict && (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] tracking-wide"
                              >
                                {h.verdict}
                                {h.conviction ? ` · ${h.conviction[0]}-conv` : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{h.reason}</p>
                          {!h.ticker || h.ticker === "BLEND" ? null : (
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => onTickerPulse(h.ticker)}
                                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                              >
                                What’s moving lately →
                              </button>
                              {(h.thesis || (h.bullCase?.length ?? 0) > 0) && (
                                <span className="text-[11px] text-muted-foreground">
                                  Tap “Walk through stocks” for the full read
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {(h.todoItems?.length ?? 0) > 0 && (
                        <div className="border-t border-border/60 pt-3">
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            To-do
                          </div>
                          <ul className="space-y-1.5">
                            {(h.todoItems ?? []).map((task, ti) => (
                              <li
                                key={ti}
                                className="flex gap-2 text-sm leading-snug text-foreground/90"
                              >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                                  {ti + 1}
                                </span>
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Potential Additions */}
            {report.actionPlan.potentialAdditions && report.actionPlan.potentialAdditions.length > 0 && (
              <div>
                <h4 className="mb-1 font-semibold">Stocks & ETFs to consider (research next)</h4>
                <p className="mb-3 text-xs text-muted-foreground">
                  Specific symbols for your watchlist. Informational only — not a recommendation to buy
                  or sell. Verify against your plan, costs, and tax situation.
                </p>
                <div className="space-y-3">
                  {report.actionPlan.potentialAdditions.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border bg-background p-3"
                    >
                      {a.ticker ? (
                        <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                          {a.ticker}
                        </Badge>
                      ) : (
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{a.suggestion}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{a.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rebalancing Steps */}
            {report.actionPlan.rebalancingSteps && report.actionPlan.rebalancingSteps.length > 0 && (
              <div>
                <h4 className="mb-3 font-semibold">Rebalancing Steps</h4>
                <ol className="space-y-2">
                  {report.actionPlan.rebalancingSteps.map((step, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-lg border bg-background p-3 text-sm"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid of sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Risks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Potential Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.risks.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.opportunities.map((o, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {o}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Suggested Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-purple-600" />
              Suggested Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.suggestedActions.map((a, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Questions */}
      {report.followUpQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              Questions to Consider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {report.followUpQuestions.map((q, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-default font-normal"
                >
                  {q}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
