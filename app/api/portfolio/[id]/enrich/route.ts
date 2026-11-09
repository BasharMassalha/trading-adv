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

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "You must be signed in.");
    }

    const portfolio = await portfolioRepository.findById(params.id);
    if (!portfolio) return fail(404, "NOT_FOUND", "Portfolio not found.");
    if (portfolio.userId !== session.userId) {
      return fail(403, "FORBIDDEN", "Access denied.");
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("force") === "true";

    const result = await enrichmentService.enrich(params.id, { forceRefresh });
    const view = await enrichmentService.getPortfolioView(params.id);

    return ok({
      ...result,
      provider: getProviderName(),
      portfolio: toPortfolioViewDTO(view),
    });
  },
);
