import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { enrichmentService } from "@/server/services/enrichment.service";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";

export const runtime = "nodejs";

export const GET = withErrorHandling(
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

    const rawDays = req.nextUrl.searchParams.get("days");
    const days = rawDays ? Math.min(Math.max(parseInt(rawDays, 10) || 365, 30), 1825) : 365;

    const series = await enrichmentService.getPerformanceComparison(params.id, days);
    return ok(series);
  },
);
