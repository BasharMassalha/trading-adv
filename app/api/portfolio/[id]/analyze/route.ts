import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { analysisService } from "@/server/services/analysis.service";
import { guestTrialService } from "@/server/services/guest-trial.service";
import { userRepository } from "@/server/repositories/user.repository";

/** GPT-5 analysis can take 2+ minutes — allow up to 5 min on Vercel Pro. */
export const maxDuration = 300;

/**
 * POST /api/portfolio/[id]/analyze
 * Trigger a new portfolio analysis and generate a report.
 *
 * On Vercel, returns 202 immediately and runs the LLM call in the background
 * (via waitUntil) so the request does not hit the gateway timeout. The client
 * polls GET ?reportId=… until status is READY or FAILED.
 */
export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }

    if (session.isGuest) {
      const active = await userRepository.isGuestActive(session.userId);
      if (!active) {
        return fail(
          401,
          "TRIAL_EXPIRED",
          "Your free trial has expired. Sign up to continue.",
        );
      }
      await guestTrialService.assertCanAnalyze(session.userId);
    }

    const portfolioId = params.id;

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

    const { reportId, status } = await analysisService.startReportGeneration({
      userId: session.userId,
      portfolioId,
    });

    const run = () =>
      analysisService.executeReportGeneration({
        reportId,
        userId: session.userId,
        portfolioId,
      });

    // On Vercel: respond immediately, finish analysis in the background.
    if (process.env.VERCEL === "1") {
      const { waitUntil } = await import("@vercel/functions");
      waitUntil(
        run().catch((err) => {
          console.error("[analysis] Background generation failed:", err);
        }),
      );
      return ok(
        {
          reportId,
          status,
          message:
            "Analysis started. This may take a few minutes with GPT-5.",
        },
        { status: 202 },
      );
    }

    // Local dev: block until complete (no gateway timeout).
    const report = await run();
    return ok(report);
  },
);

/**
 * GET /api/portfolio/[id]/analyze
 * Check readiness, or poll an in-flight report via ?reportId=…
 */
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }

    const portfolioId = params.id;
    const reportId = req.nextUrl.searchParams.get("reportId");

    if (reportId) {
      const report = await analysisService.getReportForUser({
        userId: session.userId,
        portfolioId,
        reportId,
      });
      if (!report) {
        return fail(404, "NOT_FOUND", "Report not found.");
      }
      return ok({ report, status: report.status });
    }

    const readiness = await analysisService.checkAnalysisReadiness({
      userId: session.userId,
      portfolioId,
    });

    return ok(readiness);
  },
);
