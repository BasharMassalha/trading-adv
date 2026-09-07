import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { enrichmentService } from "@/server/services/enrichment.service";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { EmptyPortfolioDetail } from "@/components/empty-states";
import { EditHoldingsClient } from "./edit-holdings-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Record trades" };

export default async function EditPortfolioHoldingsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.isGuest) {
    redirect(`/portfolio/${params.id}`);
  }

  const owned = await portfolioRepository.findById(params.id);
  if (!owned || owned.userId !== session.userId) {
    return <EmptyPortfolioDetail />;
  }

  let view;
  try {
    view = await enrichmentService.getPortfolioView(params.id);
  } catch {
    return <EmptyPortfolioDetail />;
  }

  return (
    <EditHoldingsClient
      portfolioId={params.id}
      portfolioName={view.name}
      holdings={view.holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity ?? 0,
        averageCost: h.averageCost,
        currentPrice: h.currentPrice,
        marketValue: h.marketValue,
        unrealizedGainLoss: h.unrealizedGainLoss,
        unrealizedGainLossPct: h.unrealizedGainLossPct,
      }))}
    />
  );
}
