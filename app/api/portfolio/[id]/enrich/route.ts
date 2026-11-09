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
 * Refresh prices (and later, history) for a portfolio.
 *
 * On Vercel the Yahoo/history pass takes longer than the gateway allows, so
 * this returns 202 and finishes in the background. The client polls GET.
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
    const startedAt = new Date().toISOString();

    const run = () =>
      enrichmentService.enrich(params.id, { forceRefresh });

    if (process.env.VERCEL === "1") {
      const { waitUntil } = await import("@vercel/functions");
      waitUntil(
        run().catch((err) => {
          console.error("[enrichment] Background refresh failed:", err);
        }),
      );
      return ok(
        {
          started: true,
          startedAt,
          provider: getProviderName(),
          message: "Price refresh started.",
        },
        { status: 202 },
      );
    }

    const result = await run();
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
