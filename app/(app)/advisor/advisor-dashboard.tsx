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
  Lock,
  MessageSquare,
  Newspaper,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { AdvisorChat } from "./advisor-chat";
import {
  PortfolioNewsSection,
  type NewsBundleView,
} from "./portfolio-news-section";
import type {
  ReportView,
  InvestorProfileView,
  HoldingRecommendation,
} from "@/server/services/analysis.service";
import { TickerContextDrawer } from "@/components/advisor/ticker-context-drawer";
import { HoldingsSlideshow } from "@/components/advisor/holdings-slideshow";
import { BriefingPlayer } from "@/components/advisor/briefing-player";
import {
  AdvisorPortfolioPicker,
  type AdvisorPortfolioOption,
} from "@/components/advisor/advisor-portfolio-picker";
import { GuestTrialBanner } from "@/components/auth/guest-trial-banner";
import { GuestSaveAnalysisCard } from "@/components/auth/guest-save-analysis-card";
import { TrialSignupWall } from "@/components/auth/trial-signup-wall";
import { TrialContentLock } from "@/components/auth/trial-content-lock";

const GUEST_VISIBLE_HOLDINGS = 3;
const GUEST_VISIBLE_NEWS = 2;

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
  portfolios: AdvisorPortfolioOption[];
  portfolio: PortfolioSummary | null;
  investorProfile: InvestorProfileView | null;
  latestReport: ReportView | null;
  readiness: Readiness | null;
  newsBundle: NewsBundleView | null;
  isGuest?: boolean;
};

export function AdvisorDashboard({
  portfolios,
  portfolio,
  investorProfile,
  latestReport,
  readiness,
  newsBundle,
  isGuest = false,
}: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseTicker, setPulseTicker] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showSignupWall, setShowSignupWall] = useState(false);
  const [wallCopy, setWallCopy] = useState<{
    title: string;
    description: string;
  } | null>(null);

  function openSignupWall(title: string, description: string) {
    setWallCopy({ title, description });
    setShowSignupWall(true);
  }

  async function generateAnalysis() {
    if (!portfolio) return;

    // Guests get one analysis; further runs require sign-up
    if (isGuest && latestReport) {
      openSignupWall(
        "Sign up to run another analysis",
        "You've used your free analysis. Create an account to regenerate reports and ask follow-ups.",
      );
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/portfolio/${portfolio.id}/analyze`, {
        method: "POST",
      });
      const json = await res.json();

      if (!json.ok) {
        const code = json.error?.code as string | undefined;
        if (code === "TRIAL_SIGNUP_REQUIRED" || code === "TRIAL_EXPIRED") {
          openSignupWall(
            "Sign up to continue",
            json.error?.message ??
              "Create a free account to keep analysing your portfolio.",
          );
          return;
        }
        setError(json.error?.message ?? json.message ?? "Failed to generate analysis.");
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
      <div className="space-y-5">
        <PageHeader
          title="AI advisor"
          description="The advisor works from your holdings. Import a CSV or a screenshot to begin."
        />
        <div className="border border-dashed bg-surface p-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            No portfolio on this account yet.
          </p>
          <Button className="mt-4 gap-2" asChild>
            <Link href="/portfolio/upload">
              <Upload className="h-4 w-4 stroke-[1.6]" />
              Import portfolio
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Setup prompts ────────────────────────────────────────────────────────
  const showSetupPrompts =
    (!investorProfile && !isGuest) || !readiness?.isEnriched;

  return (
    <div className="space-y-5">
      {isGuest ? (
        <GuestTrialBanner
          variant="advisor"
          returnTo={portfolio ? `/advisor?portfolio=${portfolio.id}` : "/advisor"}
        />
      ) : null}

      <PageHeader
        title="AI advisor"
        description="Analysis, news, and chat for the portfolio you select below."
        actions={
          <>
            {portfolio && portfolios.length > 0 ? (
              <AdvisorPortfolioPicker
                portfolios={portfolios}
                selectedId={portfolio.id}
              />
            ) : null}
            {latestReport && (
              <Badge variant="success" className="gap-1.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 stroke-[1.6]" />
                Report ready
              </Badge>
            )}
            {latestReport && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5"
                onClick={() => {
                  if (isGuest) {
                    openSignupWall(
                      "Sign up for voice briefings",
                      "Voice narration is available on a free account. Sign up to keep your report and unlock briefings.",
                    );
                    return;
                  }
                  setShowBriefing(true);
                }}
              >
                <Film className="h-3.5 w-3.5 stroke-[1.6]" />
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
                  onClick={() => {
                    if (isGuest) {
                      openSignupWall(
                        "Sign up for the full walkthrough",
                        "Create a free account to walk through every holding and keep this analysis.",
                      );
                      return;
                    }
                    setShowSlideshow(true);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 stroke-[1.6]" />
                  Walk through stocks
                </Button>
              )}
          </>
        }
      />

      {/* Setup prompts */}
      {showSetupPrompts && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!investorProfile && !isGuest && (
            <div className="border bg-surface p-5">
              <div className="text-[11px] uppercase tracking-wide text-faint">
                Setup
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
                <h3 className="text-[13.5px] font-semibold">
                  Set up your investor profile
                </h3>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Risk tolerance and goals let the analysis speak to your
                situation rather than a generic book.
              </p>
              <Button variant="outline" size="sm" className="mt-3.5 gap-1.5" asChild>
                <Link href="/settings/investor-profile">
                  Complete profile
                  <ArrowRight className="h-3.5 w-3.5 stroke-[1.6]" />
                </Link>
              </Button>
            </div>
          )}

          {!readiness?.isEnriched && (
            <div className="border bg-surface p-5">
              <div className="text-[11px] uppercase tracking-wide text-faint">
                Setup
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
                <h3 className="text-[13.5px] font-semibold">
                  Load market data
                </h3>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Current prices are needed to value the book and weight the
                analysis correctly.
              </p>
              <Button variant="outline" size="sm" className="mt-3.5 gap-1.5" asChild>
                <Link href={`/portfolio/${portfolio.id}`}>
                  Go to portfolio
                  <ArrowRight className="h-3.5 w-3.5 stroke-[1.6]" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <Tabs defaultValue={latestReport ? "report" : "news"} className="w-full">
        <TabsList>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4 stroke-[1.6]" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4 stroke-[1.6]" />
            News
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            {isGuest ? (
              <Lock className="h-3.5 w-3.5 stroke-[1.6]" />
            ) : (
              <MessageSquare className="h-4 w-4 stroke-[1.6]" />
            )}
            Chat
            {isGuest ? (
              <span className="text-[10px] font-normal text-faint">Sign up</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="mt-5">
          {newsBundle ? (
            <PortfolioNewsSection
              bundle={newsBundle}
              portfolioName={portfolio.name}
              isGuest={isGuest}
              maxItems={isGuest ? GUEST_VISIBLE_NEWS : undefined}
              onRequireSignup={() =>
                openSignupWall(
                  "Sign in to see more news",
                  "Create a free account or sign in to open the full news feed and keep this analysis.",
                )
              }
            />
          ) : null}
        </TabsContent>

        <TabsContent value="report" className="mt-5">
          {latestReport ? (
            <ReportDisplay
              report={latestReport}
              onTickerPulse={setPulseTicker}
              isGuest={isGuest}
              onSeeMore={() =>
                openSignupWall(
                  "Sign in to see more",
                  "Create a free account or sign in to unlock every holding verdict and keep this portfolio.",
                )
              }
            />
          ) : (
            <EmptyReportState
              readiness={readiness}
              generating={generating}
              error={error}
              onGenerate={generateAnalysis}
            />
          )}

          {/* Generate / regenerate button */}
          {latestReport && !isGuest && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={generateAnalysis}
                disabled={generating || !readiness?.ready}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin stroke-[1.6]" />
                    Analysing, usually 2–3 min
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 stroke-[1.6]" />
                    Regenerate analysis
                  </>
                )}
              </Button>
              {error && (
                <span className="text-[12.5px] text-destructive">{error}</span>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-5">
          {isGuest ? (
            <TrialContentLock
              title="Chat unlocks with a free account"
              description="Ask follow-ups on any holding, verdict, or risk call. Sign up to keep this analysis and open chat."
              ctaLabel="Sign up to unlock"
              onSeeMore={() =>
                openSignupWall(
                  "Sign up to ask follow-ups",
                  "Chat with the advisor is available after you create a free account. Your analysis stays with you.",
                )
              }
            />
          ) : (
            <div className="h-[calc(100vh-20rem)]">
              <AdvisorChat portfolioId={portfolio.id} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {isGuest && latestReport ? (
        <div className="sticky bottom-0 z-20 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <GuestSaveAnalysisCard portfolioId={portfolio.id} />
        </div>
      ) : null}

      {/* Disclaimer */}
      <p className="text-center text-[11px] text-faint">
        Informational only, not financial advice. Verify against your own plan
        before acting.
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

      <TrialSignupWall
        open={showSignupWall}
        onClose={() => setShowSignupWall(false)}
        title={wallCopy?.title}
        description={wallCopy?.description}
        returnTo={
          portfolio ? `/advisor?portfolio=${portfolio.id}` : "/advisor"
        }
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

  if (generating) {
    return (
      <div className="border bg-surface p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin stroke-[1.6] text-primary" />
        <h3 className="mt-4 text-[14px] font-semibold">
          Building your analysis
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          Usually 2–3 minutes. You can leave this page and come back — the report
          stays on this portfolio when it finishes.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-dashed bg-surface p-8 text-center">
      <h3 className="text-[14px] font-semibold">No analysis yet</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        {canGenerate
          ? "Run the first pass to get strengths, risks, and an action plan for this book."
          : readiness?.message ??
            "Complete the setup steps above to unlock analysis."}
      </p>

      <Button
        onClick={onGenerate}
        disabled={!canGenerate || generating}
        className="mt-5 gap-2"
      >
        <Zap className="h-4 w-4 stroke-[1.6]" />
        Generate analysis
      </Button>

      {error && (
        <p className="mt-4 text-[12.5px] text-destructive">{error}</p>
      )}
    </div>
  );
}

function HoldingReviewRow({
  holding: h,
  onTickerPulse,
}: {
  holding: HoldingRecommendation;
  onTickerPulse: (ticker: string) => void;
}) {
  return (
    <div className="border bg-background">
      <div className="flex items-start gap-3 p-3.5">
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
            className="cursor-pointer font-mono font-semibold"
          >
            {h.ticker}
          </Badge>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[13px] font-medium">
              {h.action.replace("CONSIDER_", "Consider ").replace("_", " ")}
            </div>
            {h.verdict && (
              <Badge variant="outline" className="font-mono">
                {h.verdict}
                {h.conviction ? ` · ${h.conviction[0]}-conv` : ""}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {h.reason}
          </p>
          {!h.ticker || h.ticker === "BLEND" ? null : (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => onTickerPulse(h.ticker)}
                className="text-[12px] font-medium text-primary underline-offset-4 hover:underline"
              >
                What’s moving lately
              </button>
              {(h.thesis || (h.bullCase?.length ?? 0) > 0) && (
                <span className="text-[11px] text-faint">
                  Open “Walk through stocks” for the full read
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {(h.todoItems?.length ?? 0) > 0 && (
        <div className="border-t px-3.5 py-3">
          <div className="text-[11px] uppercase tracking-wide text-faint">
            To-do
          </div>
          <ul className="mt-2 space-y-1.5">
            {(h.todoItems ?? []).map((task, ti) => (
              <li
                key={ti}
                className="flex gap-2.5 text-[12.5px] leading-relaxed"
              >
                <span className="shrink-0 font-mono text-[11px] font-semibold text-faint">
                  {ti + 1}
                </span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReportDisplay({
  report,
  onTickerPulse,
  isGuest = false,
  onSeeMore,
}: {
  report: ReportView;
  onTickerPulse: (ticker: string) => void;
  isGuest?: boolean;
  onSeeMore?: () => void;
}) {
  const allHoldings = report.actionPlan?.holdingsToReview ?? [];
  const visibleHoldings = isGuest
    ? allHoldings.slice(0, GUEST_VISIBLE_HOLDINGS)
    : allHoldings;
  const lockedHoldings = isGuest
    ? allHoldings.slice(GUEST_VISIBLE_HOLDINGS)
    : [];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
            <h2 className="text-[13.5px] font-semibold tracking-tight">
              Summary
            </h2>
          </div>
          {report.generatedAt && (
            <div className="font-mono text-[11px] text-faint">
              {new Date(report.generatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {report.modelUsed ? ` · ${report.modelUsed}` : ""}
            </div>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] leading-relaxed">{report.summary}</p>
          <p className="mt-3.5 border-t pt-3 text-[11.5px] leading-relaxed text-faint">
            May incorporate recent company and market news for your largest
            positions. The News tab lists the articles used.
          </p>
        </div>
      </div>

      {/* Action plan */}
      {report.actionPlan && (
        <div className="border bg-surface">
          <div className="border-b px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
              <h2 className="text-[13.5px] font-semibold tracking-tight">
                Action plan
              </h2>
              {isGuest && allHoldings.length > GUEST_VISIBLE_HOLDINGS ? (
                <Badge variant="info" className="font-normal">
                  {Math.min(GUEST_VISIBLE_HOLDINGS, allHoldings.length)} of{" "}
                  {allHoldings.length}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {isGuest && allHoldings.length > GUEST_VISIBLE_HOLDINGS
                ? `Showing ${GUEST_VISIBLE_HOLDINGS} of ${allHoldings.length} holdings to review.`
                : "Holdings to review, names to research, and rebalancing steps drawn from this analysis. Not personal financial advice."}
            </p>
          </div>
          <div className="divide-y">
            {/* Holdings to review */}
            {visibleHoldings.length > 0 && (
              <div className="px-5 py-4">
                <h3 className="text-[13px] font-semibold">
                  Holdings to review
                </h3>
                <div className="mt-3 space-y-2.5">
                  {visibleHoldings.map((h, i) => (
                    <HoldingReviewRow
                      key={i}
                      holding={h}
                      onTickerPulse={onTickerPulse}
                    />
                  ))}
                </div>

                {lockedHoldings.length > 0 && onSeeMore ? (
                  <div className="mt-3">
                    <TrialContentLock
                      title={`${lockedHoldings.length} more holding${lockedHoldings.length === 1 ? "" : "s"}`}
                      description="See the rest of the action plan for this book."
                      onSeeMore={onSeeMore}
                      blurredPreview={
                        <div className="space-y-2">
                          {lockedHoldings.slice(0, 2).map((h, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 border bg-background p-2.5 text-[12px]"
                            >
                              <span className="font-mono font-semibold">
                                {h.ticker}
                              </span>
                              <span className="text-muted-foreground">
                                {h.action
                                  .replace("CONSIDER_", "Consider ")
                                  .replace("_", " ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      }
                    />
                  </div>
                ) : null}
              </div>
            )}

            {/* Potential additions — always visible */}
            {report.actionPlan.potentialAdditions &&
              report.actionPlan.potentialAdditions.length > 0 && (
                <div className="px-5 py-4">
                  <h3 className="text-[13px] font-semibold">
                    Stocks and ETFs to research next
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    Symbols for your watchlist. Informational only, not a
                    recommendation to buy or sell. Verify against your plan,
                    costs, and tax situation.
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {report.actionPlan.potentialAdditions.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 border bg-background p-3.5"
                      >
                        {a.ticker ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 font-mono font-semibold"
                          >
                            {a.ticker}
                          </Badge>
                        ) : (
                          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
                        )}
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium">
                            {a.suggestion}
                          </div>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                            {a.rationale}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Rebalancing steps — always visible */}
            {report.actionPlan.rebalancingSteps &&
              report.actionPlan.rebalancingSteps.length > 0 && (
                <div className="px-5 py-4">
                  <h3 className="text-[13px] font-semibold">Rebalancing steps</h3>
                  <ol className="mt-3 space-y-2">
                    {report.actionPlan.rebalancingSteps.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-3 border bg-background p-3.5 text-[12.5px] leading-relaxed"
                      >
                        <span className="shrink-0 font-mono text-[11px] font-semibold text-faint">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Grid of sections */}
      <div className="hairline-grid grid md:grid-cols-2">
        {/* Strengths */}
        <div className="p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[1.6] text-success" />
            <h3 className="text-[13.5px] font-semibold">Strengths</h3>
          </div>
          <ul className="mt-3 space-y-2">
            {report.strengths.map((s, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 bg-success" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="p-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 stroke-[1.6] text-warning" />
            <h3 className="text-[13.5px] font-semibold">Potential risks</h3>
          </div>
          <ul className="mt-3 space-y-2">
            {report.risks.map((r, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 bg-warning" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 stroke-[1.6] text-primary" />
            <h3 className="text-[13.5px] font-semibold">Opportunities</h3>
          </div>
          <ul className="mt-3 space-y-2">
            {report.opportunities.map((o, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 bg-primary" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggested actions */}
        <div className="p-5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
            <h3 className="text-[13.5px] font-semibold">Suggested actions</h3>
          </div>
          <ul className="mt-3 space-y-2">
            {report.suggestedActions.map((a, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 bg-faint" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Follow-up questions */}
      {report.followUpQuestions.length > 0 && (
        <div className="border bg-surface p-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
            <h3 className="text-[13.5px] font-semibold">
              Questions to consider
            </h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {report.followUpQuestions.map((q, i) => (
              <span
                key={i}
                className="rounded-md border bg-background px-2.5 py-1.5 text-[12px] text-muted-foreground"
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
