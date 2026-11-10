import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import {
  enrichmentService,
  toPortfolioViewDTO,
} from "@/server/services/enrichment.service";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { getProviderName } from "@/lib/market-data/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function loadOwnedPortfolio(userId: string, portfolioId: string) {
  const portfolio = await portfolioRepository.findById(portfolioId);
  if (!portfolio) return { error: fail(404, "NOT_FOUND", "Portfolio not found.") };
  if (portfolio.userId !== userId) {
    return { error: fail(403, "FORBIDDEN", "Access denied.") };
  }
  return { portfolio };
}

/**
 * POST /api/portfolio/[id]/enrich
 * Refresh prices for a portfolio.
 *
 * Quotes are awaited in-request (HTTP/Finnhub — fast enough for the gateway).
 * On Vercel, 1Y history is filled after the response via waitUntil so candles
 * cannot starve the price write that the UI needs.
 */
export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "You must be signed in.");
    }

    const owned = await loadOwnedPortfolio(session.userId, params.id);
    if (owned.error) return owned.error;

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("force") === "true";
    const deferHistory = process.env.VERCEL === "1";

    const result = await enrichmentService.enrich(params.id, {
      forceRefresh,
      skipHistory: deferHistory,
    });

    if (deferHistory) {
      const { waitUntil } = await import("@vercel/functions");
      waitUntil(
        enrichmentService.fillHistoryForPortfolio(params.id).catch((err) => {
          console.error("[enrichment] Background history failed:", err);
        }),
      );
    }

    const view = await enrichmentService.getPortfolioView(params.id);
    return ok({
      ...result,
      provider: getProviderName(),
      portfolio: toPortfolioViewDTO(view),
    });
  },
);

/**
 * GET /api/portfolio/[id]/enrich
 * Poll the latest portfolio snapshot while a refresh is running.
 */
export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "You must be signed in.");
    }

    const owned = await loadOwnedPortfolio(session.userId, params.id);
    if (owned.error) return owned.error;

    const view = await enrichmentService.getPortfolioView(params.id);
    const priced = view.holdings.filter(
      (h) => h.symbol.toUpperCase() !== "CASH" && h.currentPrice != null && h.currentPrice > 0,
    ).length;
    return ok({
      provider: getProviderName(),
      portfolio: toPortfolioViewDTO(view),
      pricedCount: priced,
      lastEnrichedAt: view.lastEnrichedAt
        ? view.lastEnrichedAt.toISOString()
        : null,
    });
  },
);
