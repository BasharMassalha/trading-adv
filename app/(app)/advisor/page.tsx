import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { analysisService } from "@/server/services/analysis.service";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { newsService } from "@/server/services/news.service";
import { AdvisorDashboard } from "./advisor-dashboard";

export const metadata: Metadata = { title: "AI Advisor" };
export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  // Load user's most recent portfolio
  const portfolios = await portfolioRepository.listByUserWithHoldings(
    session.userId,
    1,
  );
  const portfolio = portfolios[0] ?? null;

  // Load investor profile
  const investorProfile = await analysisService.getInvestorProfile(
    session.userId,
  );

  // Load latest report if we have a portfolio
  let latestReport = null;
  let readiness = null;
  let newsBundle = null;
  if (portfolio) {
    latestReport = await analysisService.getLatestReport(portfolio.id);
    readiness = await analysisService.checkAnalysisReadiness({
      userId: session.userId,
      portfolioId: portfolio.id,
    });

    const ctx = await newsService.getNewsForPortfolio(portfolio.id, {
      maxHoldings: 5,
      articlesPerTicker: 4,
      maxTotalArticles: 16,
      daysBack: 7,
    });
    newsBundle = {
      items: ctx.items.map((item) => ({
        ticker: item.ticker,
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sentiment: item.sentiment,
      })),
      tickersQueried: ctx.tickersQueried,
      warnings: ctx.warnings,
      provider: ctx.provider,
      retrievedAt: ctx.retrievedAt.toISOString(),
    };
  }

  return (
    <AdvisorDashboard
      portfolio={
        portfolio
          ? {
              id: portfolio.id,
              name: portfolio.name,
              holdingCount: portfolio.holdings.length,
              lastEnrichedAt: portfolio.lastEnrichedAt?.toISOString() ?? null,
            }
          : null
      }
      investorProfile={investorProfile}
      latestReport={latestReport}
      readiness={readiness}
      newsBundle={newsBundle}
    />
  );
}
