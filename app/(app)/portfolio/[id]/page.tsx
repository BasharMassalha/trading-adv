import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  enrichmentService,
  toPortfolioViewDTO,
} from "@/server/services/enrichment.service";
import { investmentProfileRepository } from "@/server/repositories/investment-profile.repository";
import { getSession } from "@/lib/auth";
import { EmptyPortfolioDetail } from "@/components/empty-states";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { PortfolioDetailClient } from "./portfolio-detail-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioViewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  let view = null;
  try {
    view = await enrichmentService.getPortfolioView(params.id);
  } catch {
    view = null;
  }

  if (!view) {
    return <EmptyPortfolioDetail />;
  }

  const owned = await portfolioRepository.findById(params.id);
  if (!owned || owned.userId !== session.userId) {
    return <EmptyPortfolioDetail />;
  }

  const profile = await investmentProfileRepository.findByUserId(
    session.userId,
  );

  const performance =
    view.lastEnrichedAt != null
      ? await enrichmentService.getPerformanceComparison(params.id, 365)
      : null;

  return (
    <PortfolioDetailClient
      portfolioId={params.id}
      isGuest={session.isGuest === true}
      riskTolerance={profile?.riskTolerance ?? null}
      initialView={toPortfolioViewDTO(view)}
      initialPerformance={performance}
    />
  );
}
