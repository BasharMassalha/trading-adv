/**
 * Mock report generator.
 *
 * Produces realistic structured analysis based on rule-based heuristics.
 * This serves as:
 *   1. A working implementation while we're not calling a real LLM
 *   2. A reference for what the real LLM should produce
 *   3. A fallback if the LLM API is unavailable
 *
 * HOW TO PLUG IN A REAL LLM
 * ─────────────────────────
 * 1. Create `lib/analysis/openai-generator.ts` (or anthropic-generator.ts).
 * 2. Implement `IReportGenerator`.
 * 3. In `lib/analysis/generator.ts`, return the real one when API keys exist.
 */

import type {
  AnalysisInput,
  AnalysisReport,
  HoldingContext,
  IReportGenerator,
  PortfolioContext,
  InvestorProfileContext,
} from "./types";

// ---------------------------------------------------------------------------
// Thresholds for rule-based analysis
// ---------------------------------------------------------------------------

const CONCENTRATION_THRESHOLD = 0.35; // > 35% in one holding = concentration risk
const HIGH_CONCENTRATION_THRESHOLD = 0.25; // > 25% for moderate concern
const SECTOR_CONCENTRATION_THRESHOLD = 0.50; // > 50% in one sector
const DIVERSIFICATION_MIN_HOLDINGS = 5;
const CRYPTO_AGGRESSIVE_THRESHOLD = 0.20; // > 20% crypto for non-aggressive

// ---------------------------------------------------------------------------
// Helper: format numbers nicely
// ---------------------------------------------------------------------------

function pct(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function usd(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Analysis helpers
// ---------------------------------------------------------------------------

function getTopHoldings(holdings: HoldingContext[], n = 3): HoldingContext[] {
  return [...holdings]
    .filter((h) => h.weight != null)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, n);
}

function getTopSector(
  allocation: PortfolioContext["sectorAllocation"],
): { name: string; weight: number } | null {
  if (allocation.length === 0) return null;
  return allocation.sort((a, b) => b.weight - a.weight)[0];
}

function countByType(holdings: HoldingContext[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const h of holdings) {
    counts[h.type] = (counts[h.type] ?? 0) + 1;
  }
  return counts;
}

function sumWeightByType(holdings: HoldingContext[]): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const h of holdings) {
    weights[h.type] = (weights[h.type] ?? 0) + (h.weight ?? 0);
  }
  return weights;
}

function hasUnenrichedHoldings(holdings: HoldingContext[]): boolean {
  return holdings.some((h) => !h.isEnriched);
}

function getBiggestWinner(holdings: HoldingContext[]): HoldingContext | null {
  const sorted = [...holdings]
    .filter((h) => h.unrealizedGainLossPct != null)
    .sort((a, b) => (b.unrealizedGainLossPct ?? 0) - (a.unrealizedGainLossPct ?? 0));
  return sorted[0] ?? null;
}

function getBiggestLoser(holdings: HoldingContext[]): HoldingContext | null {
  const sorted = [...holdings]
    .filter((h) => h.unrealizedGainLossPct != null)
    .sort((a, b) => (a.unrealizedGainLossPct ?? 0) - (b.unrealizedGainLossPct ?? 0));
  return sorted[0] ?? null;
}

// ---------------------------------------------------------------------------
// Rule-based generator
// ---------------------------------------------------------------------------

export class MockReportGenerator implements IReportGenerator {
  readonly name = "mock-v1";

  async generate(input: AnalysisInput): Promise<AnalysisReport> {
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 500));

    const { portfolio, investorProfile } = input;
    const { holdings, sectorAllocation } = portfolio;

    const strengths: string[] = [];
    const risks: string[] = [];
    const opportunities: string[] = [];
    const suggestedActions: string[] = [];
    const followUpQuestions: string[] = [];

    const typeCounts = countByType(holdings);
    const typeWeights = sumWeightByType(holdings);
    const topHoldings = getTopHoldings(holdings, 3);
    const topSector = getTopSector(sectorAllocation);
    const winner = getBiggestWinner(holdings);
    const loser = getBiggestLoser(holdings);
    const etfCount = typeCounts["ETF"] ?? 0;
    const cryptoWeight = typeWeights["CRYPTO"] ?? 0;

    // ── Data completeness check ───────────────────────────────────────────
    if (hasUnenrichedHoldings(holdings)) {
      risks.push(
        "Some holdings are missing market data — the analysis may be incomplete. Consider refreshing market data for a more accurate picture.",
      );
    }

    // ── Concentration risk ────────────────────────────────────────────────
    for (const h of topHoldings) {
      if ((h.weight ?? 0) > CONCENTRATION_THRESHOLD) {
        risks.push(
          `${h.symbol} represents ${((h.weight ?? 0) * 100).toFixed(1)}% of your portfolio — this concentration may expose you to significant single-stock risk.`,
        );
        suggestedActions.push(
          `Consider whether trimming ${h.symbol} to below 25% would better match your diversification goals.`,
        );
      } else if ((h.weight ?? 0) > HIGH_CONCENTRATION_THRESHOLD) {
        opportunities.push(
          `${h.symbol} is a large position at ${((h.weight ?? 0) * 100).toFixed(1)}%. If it continues to outperform, you may want to review your target allocation.`,
        );
      }
    }

    // ── Sector concentration ──────────────────────────────────────────────
    if (topSector && topSector.weight > SECTOR_CONCENTRATION_THRESHOLD) {
      risks.push(
        `${topSector.name} accounts for ${(topSector.weight * 100).toFixed(0)}% of your portfolio — sector downturns could significantly impact your returns.`,
      );
      suggestedActions.push(
        `Review exposure to ${topSector.name} and consider adding positions in defensive sectors like Healthcare or Consumer Staples.`,
      );
    } else if (sectorAllocation.length >= 4) {
      strengths.push(
        `Your portfolio spans ${sectorAllocation.length} sectors — good diversification across industries.`,
      );
    }

    // ── Diversification ───────────────────────────────────────────────────
    if (holdings.length < DIVERSIFICATION_MIN_HOLDINGS) {
      risks.push(
        `With only ${holdings.length} holding${holdings.length === 1 ? "" : "s"}, your portfolio may lack sufficient diversification to weather sector-specific downturns.`,
      );
      suggestedActions.push(
        "Consider adding broad-market ETFs or positions in underrepresented sectors to improve diversification.",
      );
    } else if (holdings.length >= 10) {
      strengths.push(
        `${holdings.length} positions provide meaningful diversification — no single company failure would dominate your returns.`,
      );
    }

    // ── ETF exposure ──────────────────────────────────────────────────────
    if (etfCount >= 3) {
      strengths.push(
        `${etfCount} ETF positions give you low-cost, diversified exposure across many underlying companies.`,
      );
    }

    if ((typeWeights["ETF"] ?? 0) > 0.6) {
      strengths.push(
        "Your portfolio is primarily ETF-based, which typically means lower fees and broad diversification.",
      );
    }

    // ── Crypto exposure ───────────────────────────────────────────────────
    if (cryptoWeight > CRYPTO_AGGRESSIVE_THRESHOLD) {
      if (
        investorProfile &&
        investorProfile.riskTolerance !== "AGGRESSIVE"
      ) {
        risks.push(
          `Cryptocurrency represents ${(cryptoWeight * 100).toFixed(0)}% of your portfolio, which may not align with your ${investorProfile.riskTolerance.toLowerCase()} risk tolerance.`,
        );
        suggestedActions.push(
          "Consider whether your crypto allocation matches your comfort with high volatility.",
        );
      } else {
        opportunities.push(
          `Your ${(cryptoWeight * 100).toFixed(0)}% crypto allocation provides growth potential but comes with significant volatility.`,
        );
      }
    }

    // ── Risk tolerance alignment ──────────────────────────────────────────
    if (investorProfile) {
      if (
        investorProfile.riskTolerance === "CONSERVATIVE" &&
        (typeWeights["CRYPTO"] ?? 0) > 0.05
      ) {
        risks.push(
          "Your portfolio contains cryptocurrency, which may not suit a conservative risk profile.",
        );
      }

      if (
        investorProfile.riskTolerance === "CONSERVATIVE" &&
        etfCount < holdings.length * 0.5 &&
        holdings.length >= 3
      ) {
        opportunities.push(
          "As a conservative investor, shifting more towards broad-market ETFs may reduce volatility while maintaining market exposure.",
        );
      }

      if (
        investorProfile.investmentGoal === "INCOME" &&
        (typeWeights["ETF"] ?? 0) < 0.3
      ) {
        suggestedActions.push(
          "For income-focused goals, consider adding dividend-focused ETFs like SCHD or VYM.",
        );
      }

      // Check avoided sectors
      for (const avoidedSector of investorProfile.avoidedSectors) {
        const match = sectorAllocation.find(
          (s) => s.name.toLowerCase().includes(avoidedSector.toLowerCase()),
        );
        if (match && match.weight > 0.01) {
          risks.push(
            `Your portfolio has exposure to ${match.name}, which you've indicated you prefer to avoid.`,
          );
        }
      }

      // Investment horizon considerations
      if (
        investorProfile.investmentHorizon === "SHORT" &&
        cryptoWeight > 0.1
      ) {
        risks.push(
          "With a short investment horizon, high crypto exposure may not give you enough time to recover from volatility.",
        );
      }

      if (
        investorProfile.investmentHorizon === "LONG" &&
        (typeWeights["BOND"] ?? 0) > 0.4
      ) {
        opportunities.push(
          "With a long time horizon, you may benefit from a higher equity allocation to capture growth potential.",
        );
      }
    }

    // ── Performance insights ──────────────────────────────────────────────
    if (portfolio.totalGainPct != null && portfolio.totalGainPct > 20) {
      strengths.push(
        `Your portfolio is up ${pct(portfolio.totalGainPct)} overall — strong performance against your cost basis.`,
      );
    } else if (portfolio.totalGainPct != null && portfolio.totalGainPct < -10) {
      opportunities.push(
        `Your portfolio is down ${pct(portfolio.totalGainPct)}. If you believe in your holdings, this could be an opportunity to add to positions at lower prices.`,
      );
    }

    if (winner && (winner.unrealizedGainLossPct ?? 0) > 50) {
      strengths.push(
        `${winner.symbol} has gained ${pct(winner.unrealizedGainLossPct)} — your best performer.`,
      );
    }

    if (loser && (loser.unrealizedGainLossPct ?? 0) < -20) {
      risks.push(
        `${loser.symbol} is down ${pct(loser.unrealizedGainLossPct)}. Consider whether your investment thesis still holds.`,
      );
      suggestedActions.push(
        `Review ${loser.symbol} — if fundamentals have changed, tax-loss harvesting may be an option.`,
      );
    }

    // ── General opportunities ─────────────────────────────────────────────
    if (opportunities.length === 0) {
      opportunities.push(
        "Markets are dynamic — consider reviewing your allocation quarterly to ensure it still matches your goals.",
      );
    }

    // ── Follow-up questions ───────────────────────────────────────────────
    if (!investorProfile) {
      followUpQuestions.push(
        "Would you like to set up your investor profile so I can provide more personalised recommendations?",
      );
    }

    followUpQuestions.push(
      "Are there any specific sectors or themes you'd like to increase or decrease exposure to?",
      "Do you have a target asset allocation in mind (e.g. 60% stocks / 40% bonds)?",
      "Are you planning any major purchases or life changes that might affect your investment timeline?",
    );

    // ── Generate summary ──────────────────────────────────────────────────
    const summary = this.generateSummary(
      portfolio,
      investorProfile,
      strengths,
      risks,
    );

    return {
      summary,
      strengths: strengths.length > 0 ? strengths : ["Analysis in progress."],
      risks: risks.length > 0 ? risks : ["No significant risks identified."],
      opportunities,
      suggestedActions:
        suggestedActions.length > 0
          ? suggestedActions
          : ["Continue monitoring your portfolio performance."],
      followUpQuestions,
    };
  }

  private generateSummary(
    portfolio: PortfolioContext,
    profile: InvestorProfileContext | null,
    strengths: string[],
    risks: string[],
  ): string {
    const { holdings, totalValue, totalGainPct } = portfolio;
    const holdingCount = holdings.length;

    let profileContext = "";
    if (profile) {
      profileContext = ` Based on your ${profile.riskTolerance.toLowerCase()} risk tolerance and ${profile.investmentGoal.toLowerCase().replace("_", " ")} objective,`;
    }

    const performanceNote =
      totalGainPct != null
        ? ` with an overall unrealized ${totalGainPct >= 0 ? "gain" : "loss"} of ${pct(totalGainPct)}`
        : "";

    const riskNote =
      risks.length > 0 && !risks[0].includes("missing market data")
        ? ` Key considerations include ${risks[0].toLowerCase().slice(0, 80)}...`
        : "";

    const strengthNote =
      strengths.length > 0
        ? ` On the positive side, ${strengths[0].toLowerCase()}`
        : "";

    return `Your portfolio contains ${holdingCount} holding${holdingCount === 1 ? "" : "s"} with a total value of ${usd(totalValue)}${performanceNote}.${profileContext} the analysis identified ${risks.length} potential risk area${risks.length === 1 ? "" : "s"} and ${strengths.length} strength${strengths.length === 1 ? "" : "s"}.${riskNote}${strengthNote}`.trim();
  }
}
