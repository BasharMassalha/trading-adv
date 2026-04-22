import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { analysisService } from "@/server/services/analysis.service";

/**
 * POST /api/portfolio/[id]/analyze
 * Trigger a new portfolio analysis and generate a report.
 */
export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }

    const portfolioId = params.id;

    // Check readiness
    const readiness = await analysisService.checkAnalysisReadiness({
      userId: session.userId,
      portfolioId,
    });

    if (!readiness.ready) {
      return fail(
        400,
        "NOT_READY",
        readiness.message ?? "Portfolio is not ready for analysis.",
        { readiness },
      );
    }

    // Generate report
    const report = await analysisService.generateReport({
      userId: session.userId,
      portfolioId,
    });

    return ok(report);
  },
);

/**
 * GET /api/portfolio/[id]/analyze
 * Check if portfolio is ready for analysis.
 */
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }

    const readiness = await analysisService.checkAnalysisReadiness({
      userId: session.userId,
      portfolioId: params.id,
    });

    return ok(readiness);
  },
);
