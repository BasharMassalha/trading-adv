/**
 * Portfolio analysis service.
 *
 * Orchestrates the end-to-end flow:
 *   1. Load portfolio data + investor profile
 *   2. Build analysis input context
 *   3. Call the report generator
 *   4. Persist the report to the database
 *   5. Return the completed report
 */

import { NotFoundError, AppError } from "@/lib/errors";
import { getReportGenerator, getGeneratorName, isRealGeneratorAvailable } from "@/lib/analysis/generator";
import type {
  AnalysisInput,
  HoldingContext,
  InvestorProfileContext,
  PortfolioContext,
  NewsItem,
  FilingItem,
  EarningsItem,
} from "@/lib/analysis/types";
import { AnalysisProviderError } from "@/lib/analysis/types";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { investmentProfileRepository } from "@/server/repositories/investment-profile.repository";
import { aiReportRepository } from "@/server/repositories/ai-report.repository";
import { enrichmentService, type PortfolioView } from "./enrichment.service";
import { newsService } from "./news.service";
import { filingsService } from "./filings.service";
import { earningsService } from "./earnings.service";
import type { AIReport, UserInvestmentProfile } from "@prisma/client";

// ---------------------------------------------------------------------------
// View types for the frontend
// ---------------------------------------------------------------------------

export type HoldingVerdict =
  | "BUY"
  | "ACCUMULATE"
  | "HOLD"
  | "TRIM"
  | "SELL"
  | "WATCH";

export type ConvictionLevel = "HIGH" | "MEDIUM" | "LOW";

export type HoldingRecommendation = {
  ticker: string;
  action: "CONSIDER_SELLING" | "CONSIDER_REDUCING" | "HOLD" | "CONSIDER_ADDING";
  reason: string;
  verdict?: HoldingVerdict;
  conviction?: ConvictionLevel;
  thesis?: string;
  bullCase?: string[];
  bearCase?: string[];
  catalysts?: string[];
  recentDevelopments?: string[];
  risks?: string[];
  todoItems?: string[];
  earningsHighlight?: {
    lastReportDate?: string;
    lastReportPeriod?: string;
    surpriseLabel?: "BEAT" | "MET" | "MISSED" | "UNKNOWN";
    surprisePct?: number;
    story?: string;
    nextReportDate?: string;
    nextWatchPoints?: string[];
  };
};

export type AdditionSuggestion = {
  /** Omitted in older stored reports */
  ticker?: string;
  suggestion: string;
  rationale: string;
};

export type ActionPlanView = {
  holdingsToReview?: HoldingRecommendation[];
  potentialAdditions?: AdditionSuggestion[];
  rebalancingSteps?: string[];
};

export type ReportView = {
  id: string;
  portfolioId: string | null;
  status: string;
  summary: string | null;
  strengths: string[];
  risks: string[];
  opportunities: string[];
  suggestedActions: string[];
  followUpQuestions: string[];
  actionPlan: ActionPlanView | null;
  modelUsed: string | null;
  generatedAt: Date | null;
  createdAt: Date;
};

export type InvestorProfileView = {
  id: string;
  riskTolerance: string;
  investmentHorizon: string;
  investmentGoal: string;
  assetPreference: string;
  preferredRegions: string[];
  preferredSectors: string[];
  avoidedSectors: string[];
  notes: string | null;
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

function toReportView(report: AIReport): ReportView {
  // Extract actionPlan from rawJson if available
  let actionPlan: ActionPlanView | null = null;
  if (report.rawJson && typeof report.rawJson === "object") {
    const raw = report.rawJson as Record<string, unknown>;
    if (raw.actionPlan && typeof raw.actionPlan === "object") {
      const plan = raw.actionPlan as Record<string, unknown>;
      const stringArray = (v: unknown): string[] | undefined =>
        Array.isArray(v)
          ? (v as unknown[]).map((x) => String(x)).filter((s) => s.trim().length > 0)
          : undefined;

      actionPlan = {
        holdingsToReview: Array.isArray(plan.holdingsToReview)
          ? (plan.holdingsToReview as Record<string, unknown>[]).map((h) => ({
              ticker: String(h.ticker ?? ""),
              action: h.action as HoldingRecommendation["action"],
              reason: String(h.reason ?? ""),
              verdict:
                typeof h.verdict === "string"
                  ? (h.verdict as HoldingVerdict)
                  : undefined,
              conviction:
                typeof h.conviction === "string"
                  ? (h.conviction as ConvictionLevel)
                  : undefined,
              thesis:
                typeof h.thesis === "string" && h.thesis.trim().length > 0
                  ? String(h.thesis)
                  : undefined,
              bullCase: stringArray(h.bullCase),
              bearCase: stringArray(h.bearCase),
              catalysts: stringArray(h.catalysts),
              recentDevelopments: stringArray(h.recentDevelopments),
              risks: stringArray(h.risks),
              todoItems: stringArray(h.todoItems) ?? [],
              earningsHighlight: (() => {
                const e = h.earningsHighlight;
                if (!e || typeof e !== "object") return undefined;
                const eo = e as Record<string, unknown>;
                const surprise =
                  typeof eo.surpriseLabel === "string"
                    ? (eo.surpriseLabel as "BEAT" | "MET" | "MISSED" | "UNKNOWN")
                    : undefined;
                return {
                  lastReportDate:
                    typeof eo.lastReportDate === "string"
                      ? eo.lastReportDate
                      : undefined,
                  lastReportPeriod:
                    typeof eo.lastReportPeriod === "string"
                      ? eo.lastReportPeriod
                      : undefined,
                  surpriseLabel: surprise,
                  surprisePct:
                    typeof eo.surprisePct === "number"
                      ? eo.surprisePct
                      : undefined,
                  story:
                    typeof eo.story === "string" && eo.story.trim().length > 0
                      ? eo.story
                      : undefined,
                  nextReportDate:
                    typeof eo.nextReportDate === "string"
                      ? eo.nextReportDate
                      : undefined,
                  nextWatchPoints: stringArray(eo.nextWatchPoints),
                };
              })(),
            }))
          : undefined,
        potentialAdditions: Array.isArray(plan.potentialAdditions)
          ? (plan.potentialAdditions as AdditionSuggestion[])
          : undefined,
        rebalancingSteps: Array.isArray(plan.rebalancingSteps)
          ? (plan.rebalancingSteps as string[])
          : undefined,
      };
    }
  }

  return {
    id: report.id,
    portfolioId: report.portfolioId,
    status: report.status,
    summary: report.summary,
    strengths: (report.strengths as string[] | null) ?? [],
    risks: (report.risks as string[] | null) ?? [],
    opportunities: (report.opportunities as string[] | null) ?? [],
    suggestedActions: (report.suggestedActions as string[] | null) ?? [],
    followUpQuestions: (report.followUpQuestions as string[] | null) ?? [],
    actionPlan,
    modelUsed: report.modelUsed,
    generatedAt: report.generatedAt,
    createdAt: report.createdAt,
  };
}

function toProfileView(profile: UserInvestmentProfile): InvestorProfileView {
  return {
    id: profile.id,
    riskTolerance: profile.riskTolerance,
    investmentHorizon: profile.investmentHorizon,
    investmentGoal: profile.investmentGoal,
    assetPreference: profile.assetPreference,
    preferredRegions: profile.preferredRegions,
    preferredSectors: profile.preferredSectors,
    avoidedSectors: profile.avoidedSectors,
    notes: profile.notes,
    updatedAt: profile.updatedAt,
  };
}

function portfolioViewToContext(view: PortfolioView): PortfolioContext {
  const holdings: HoldingContext[] = view.holdings.map((h) => ({
    symbol: h.symbol,
    name: h.name,
    type: h.type as HoldingContext["type"],
    sector: h.sector,
    quantity: h.quantity,
    averageCost: h.averageCost,
    currentPrice: h.currentPrice,
    marketValue: h.marketValue,
    costBasis: h.costBasis,
    unrealizedGainLoss: h.unrealizedGainLoss,
    unrealizedGainLossPct: h.unrealizedGainLossPct,
    weight: h.weight,
    isEnriched: h.isEnriched,
  }));

  // Compute sector allocation with weights
  const sectorAllocation = view.sectorAllocation.map((s) => ({
    name: s.name,
    value: s.value,
    weight: view.totalValue && view.totalValue > 0 ? s.value / view.totalValue : 0,
  }));

  // Compute type allocation
  const typeMap = new Map<string, number>();
  for (const h of holdings) {
    typeMap.set(h.type, (typeMap.get(h.type) ?? 0) + (h.marketValue ?? 0));
  }
  const typeAllocation = Array.from(typeMap.entries())
    .map(([type, value]) => ({
      type,
      value,
      weight: view.totalValue && view.totalValue > 0 ? value / view.totalValue : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    id: view.id,
    name: view.name,
    totalValue: view.totalValue,
    totalCost: view.totalCost,
    totalGain: view.totalGain,
    totalGainPct: view.totalGainPct,
    lastEnrichedAt: view.lastEnrichedAt,
    holdingCount: view.holdingCount,
    holdings,
    sectorAllocation,
    typeAllocation,
  };
}

function dbProfileToContext(
  profile: UserInvestmentProfile,
): InvestorProfileContext {
  return {
    riskTolerance: profile.riskTolerance,
    investmentHorizon: profile.investmentHorizon,
    investmentGoal: profile.investmentGoal,
    assetPreference: profile.assetPreference,
    preferredRegions: profile.preferredRegions,
    preferredSectors: profile.preferredSectors,
    avoidedSectors: profile.avoidedSectors,
    notes: profile.notes,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const analysisService = {
  // ─────────────────────────────────────────────────────────────────────────
  // Investor profile
  // ─────────────────────────────────────────────────────────────────────────

  async getInvestorProfile(userId: string): Promise<InvestorProfileView | null> {
    const profile = await investmentProfileRepository.findByUserId(userId);
    return profile ? toProfileView(profile) : null;
  },

  async upsertInvestorProfile(
    userId: string,
    data: {
      riskTolerance?: string;
      investmentHorizon?: string;
      investmentGoal?: string;
      assetPreference?: string;
      preferredRegions?: string[];
      preferredSectors?: string[];
      avoidedSectors?: string[];
      notes?: string | null;
    },
  ): Promise<InvestorProfileView> {
    const profile = await investmentProfileRepository.upsert(userId, {
      riskTolerance: data.riskTolerance as any,
      investmentHorizon: data.investmentHorizon as any,
      investmentGoal: data.investmentGoal as any,
      assetPreference: data.assetPreference as any,
      preferredRegions: data.preferredRegions,
      preferredSectors: data.preferredSectors,
      avoidedSectors: data.avoidedSectors,
      notes: data.notes,
    });
    return toProfileView(profile);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Report generation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a new portfolio analysis report.
   *
   * Flow:
   *   1. Create a PENDING report record
   *   2. Load portfolio view + investor profile
   *   3. Build analysis input context
   *   4. Call the report generator
   *   5. Persist the structured report
   *   6. Return the completed report view
   */
  async generateReport(params: {
    userId: string;
    portfolioId: string;
  }): Promise<ReportView> {
    const { userId, portfolioId } = params;

    // Verify portfolio ownership
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio) {
      throw new NotFoundError("Portfolio not found.");
    }
    if (portfolio.userId !== userId) {
      throw new NotFoundError("Portfolio not found.");
    }

    // Create pending report
    const pendingReport = await aiReportRepository.createPending({
      userId,
      portfolioId,
    });

    try {
      // Mark as generating
      await aiReportRepository.markGenerating(pendingReport.id);

      // Load data in parallel
      const [portfolioView, investorProfile, newsContext, filingsContext, earningsContext] =
        await Promise.all([
          enrichmentService.getPortfolioView(portfolioId),
          investmentProfileRepository.findByUserId(userId),
          newsService.getNewsForPortfolio(portfolioId, {
            maxHoldings: 12,
            articlesPerTicker: 4,
            maxTotalArticles: 32,
            daysBack: 7,
          }),
          filingsService.getFilingsForPortfolio(portfolioId, {
            maxHoldings: 12,
            filingsPerTicker: 3,
            daysBack: 90,
          }),
          earningsService.getEarningsForPortfolio(portfolioId, { maxTickers: 14 }),
        ]);

      // Build input context with source warnings for data quality
      const portfolioContext = portfolioViewToContext(portfolioView);
      const sourceWarnings: string[] = [];

      // Check for unenriched holdings
      const unenrichedHoldings = portfolioContext.holdings.filter((h) => !h.isEnriched);
      if (unenrichedHoldings.length > 0) {
        sourceWarnings.push(
          `${unenrichedHoldings.length} holding(s) are missing market data: ${unenrichedHoldings.map((h) => h.symbol).join(", ")}`,
        );
      }

      // Check for stale data
      if (portfolioContext.lastEnrichedAt) {
        const hoursSinceEnrichment =
          (Date.now() - portfolioContext.lastEnrichedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceEnrichment > 24) {
          sourceWarnings.push(
            `Market data is ${Math.floor(hoursSinceEnrichment)} hours old. Consider refreshing for current prices.`,
          );
        }
      }

      // Add news-related warnings
      if (newsContext.warnings.length > 0) {
        sourceWarnings.push(...newsContext.warnings);
      }
      if (newsContext.items.length === 0 && newsContext.tickersQueried.length > 0) {
        sourceWarnings.push(
          `No recent news found for key holdings (${newsContext.tickersQueried.join(", ")})`,
        );
      }

      // Add filings-related warnings
      if (filingsContext.tickersNotFound.length > 0) {
        sourceWarnings.push(
          `SEC filings not available for: ${filingsContext.tickersNotFound.join(", ")} (may be non-U.S. or ETF)`,
        );
      }
      if (filingsContext.warnings.length > 0) {
        // Only add unique warnings not already included
        for (const warning of filingsContext.warnings) {
          if (!sourceWarnings.includes(warning)) {
            sourceWarnings.push(warning);
          }
        }
      }

      // Convert news context to analysis input format
      const newsItems: NewsItem[] = newsContext.items.map((item) => ({
        ticker: item.ticker,
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        publishedAt: item.publishedAt,
        sentiment: item.sentiment,
      }));

      // Convert filings context to analysis input format
      const filingItems: FilingItem[] = filingsContext.items.map((item) => ({
        ticker: item.ticker,
        filingType: item.filingType,
        summary: item.summary,
        filedAt: item.filedAt,
        source: item.source,
      }));

      // Convert earnings context to analysis input format
      const earningsItems: EarningsItem[] = earningsContext.items.map((e) => ({
        ticker: e.ticker,
        lastReportDate: e.lastReportDate,
        lastReportPeriod: e.lastReportPeriod,
        epsActual: e.epsActual,
        epsEstimate: e.epsEstimate,
        surprisePct: e.surprisePct,
        surpriseLabel: e.surpriseLabel,
        revenueActual: e.revenueActual,
        revenueEstimate: e.revenueEstimate,
        nextReportDate: e.nextReportDate,
        nextReportTiming: e.nextReportTiming,
        source: e.source,
      }));

      if (earningsContext.warnings.length > 0) {
        for (const w of earningsContext.warnings) {
          if (!sourceWarnings.includes(w)) sourceWarnings.push(w);
        }
      }

      console.info(
        `[analysis] Context: ${portfolioContext.holdingCount} holdings, ${newsItems.length} news, ${filingItems.length} filings, ${earningsItems.length} earnings`,
      );

      const input: AnalysisInput = {
        portfolio: portfolioContext,
        investorProfile: investorProfile
          ? dbProfileToContext(investorProfile)
          : null,
        newsContext: newsItems.length > 0 ? newsItems : undefined,
        filingsContext: filingItems.length > 0 ? filingItems : undefined,
        earningsContext: earningsItems.length > 0 ? earningsItems : undefined,
        sourceWarnings: sourceWarnings.length > 0 ? sourceWarnings : undefined,
      };

      // Generate report
      console.info("[analysis] Generating report with provider:", getGeneratorName());
      const generator = getReportGenerator();
      const analysis = await generator.generate(input);

      // Persist completed report
      const completedReport = await aiReportRepository.completeReport(
        pendingReport.id,
        {
          summary: analysis.summary,
          strengths: analysis.strengths,
          risks: analysis.risks,
          opportunities: analysis.opportunities,
          suggestedActions: analysis.suggestedActions,
          followUpQuestions: analysis.followUpQuestions,
          modelUsed: generator.name,
          rawJson: JSON.parse(JSON.stringify(analysis)),
        },
      );

      return toReportView(completedReport);
    } catch (err) {
      // Mark as failed with detailed error info
      let errorMessage: string;
      if (err instanceof AnalysisProviderError) {
        errorMessage = `[${err.code}] ${err.message}`;
        console.error("[analysis] Provider error:", err.code, err.message, err.details);
      } else if (err instanceof Error) {
        errorMessage = err.message;
        console.error("[analysis] Error:", err);
      } else {
        errorMessage = "Unknown error during analysis.";
        console.error("[analysis] Unknown error:", err);
      }

      await aiReportRepository.markFailed(pendingReport.id, errorMessage);

      // Re-throw with a user-friendly message
      if (err instanceof AnalysisProviderError) {
        switch (err.code) {
          case "INVALID_API_KEY":
            throw new AppError({
              message: "AI service configuration error. Please contact support.",
              status: 500,
              code: "AI_CONFIG_ERROR",
            });
          case "RATE_LIMITED":
            throw new AppError({
              message: "AI service is temporarily busy. Please try again in a few minutes.",
              status: 429,
              code: "RATE_LIMITED",
            });
          case "VALIDATION_ERROR":
            throw new AppError({
              message: "Analysis failed to produce valid results. Please try again.",
              status: 500,
              code: "AI_VALIDATION_ERROR",
            });
          default:
            throw new AppError({
              message: "Analysis failed. Please try again later.",
              status: 500,
              code: "AI_ERROR",
            });
        }
      }
      throw err;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Report retrieval
  // ─────────────────────────────────────────────────────────────────────────

  async getLatestReport(portfolioId: string): Promise<ReportView | null> {
    const report = await aiReportRepository.findLatestForPortfolio(portfolioId);
    return report ? toReportView(report) : null;
  },

  async getLatestReportForUser(userId: string): Promise<ReportView | null> {
    const report = await aiReportRepository.findLatestForUser(userId);
    return report ? toReportView(report) : null;
  },

  async getReportById(reportId: string): Promise<ReportView | null> {
    const report = await aiReportRepository.findById(reportId);
    return report ? toReportView(report) : null;
  },

  async listReportsForPortfolio(
    portfolioId: string,
  ): Promise<ReportView[]> {
    const reports = await aiReportRepository.listByPortfolio(portfolioId);
    return reports.map(toReportView);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Analysis readiness check
  // ─────────────────────────────────────────────────────────────────────────

  async checkAnalysisReadiness(params: {
    userId: string;
    portfolioId: string;
  }): Promise<{
    ready: boolean;
    hasProfile: boolean;
    hasPortfolio: boolean;
    isEnriched: boolean;
    holdingCount: number;
    message: string | null;
    provider: string;
    isRealProvider: boolean;
  }> {
    const { userId, portfolioId } = params;

    const [portfolio, profile] = await Promise.all([
      portfolioRepository.findById(portfolioId),
      investmentProfileRepository.findByUserId(userId),
    ]);

    const hasPortfolio = portfolio != null && portfolio.userId === userId;
    const hasProfile = profile != null;
    const isEnriched = hasPortfolio && portfolio.lastEnrichedAt != null;
    const holdingCount = hasPortfolio ? portfolio.holdings.length : 0;

    let message: string | null = null;
    let ready = true;

    if (!hasPortfolio) {
      ready = false;
      message = "Portfolio not found. Please import a portfolio first.";
    } else if (holdingCount === 0) {
      ready = false;
      message = "Portfolio has no holdings to analyze.";
    } else if (!isEnriched) {
      ready = false;
      message =
        "Portfolio has not been enriched with market data. Please refresh market data first.";
    }

    return {
      ready,
      hasProfile,
      hasPortfolio,
      isEnriched,
      holdingCount,
      message,
      provider: getGeneratorName(),
      isRealProvider: isRealGeneratorAvailable(),
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Provider information
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the name of the current analysis provider.
   */
  getProviderName(): string {
    return getGeneratorName();
  },

  /**
   * Check if a real (non-mock) analysis provider is available.
   */
  isRealProviderAvailable(): boolean {
    return isRealGeneratorAvailable();
  },
};
