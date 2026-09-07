import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { analysisService } from "@/server/services/analysis.service";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { newsService } from "@/server/services/news.service";
import { AdvisorDashboard } from "./advisor-dashboard";

export const metadata: Metadata = { title: "AI Advisor" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { portfolio?: string };
};

export default async function AdvisorPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const allPortfolios = await portfolioRepository.listByUserWithHoldings(
    session.userId,
  );

  const portfolioOptions = allPortfolios.map((p) => ({
    id: p.id,
    name: p.name,
    holdingCount: p.holdings.length,
  }));

  const requestedId = searchParams?.portfolio?.trim();
  const portfolio =
    (requestedId
      ? allPortfolios.find((p) => p.id === requestedId)
      : undefined) ??
    allPortfolios[0] ??
    null;

  const investorProfile = await analysisService.getInvestorProfile(
    session.userId,
  );

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
      portfolios={portfolioOptions}
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
      isGuest={session.isGuest === true}
    />
  );
}
