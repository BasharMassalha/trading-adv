import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { analysisService } from "@/server/services/analysis.service";

/**
 * GET /api/portfolio/[id]/report
 * Get the latest analysis report for a portfolio.
 */
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }

    const portfolioId = params.id;

    // Verify ownership
    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio || portfolio.userId !== session.userId) {
      return fail(404, "NOT_FOUND", "Portfolio not found.");
    }

    const report = await analysisService.getLatestReport(portfolioId);

    return ok({
      report,
      hasProfile: (await analysisService.getInvestorProfile(session.userId)) !== null,
    });
  },
);
