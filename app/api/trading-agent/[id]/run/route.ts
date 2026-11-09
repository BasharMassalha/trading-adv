import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { tradingAgentService } from "@/server/services/trading-agent.service";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/trading-agent/[id]/run
 * Refresh prices, run analysis, and fill the resulting trades on the agent book.
 *
 * On Vercel the analysis takes longer than the gateway allows, so this returns
 * 202 as soon as the pass is opened and finishes in the background. The page
 * already polls for live notes.
 */
export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }
    if (session.isGuest) {
      return fail(401, "TRIAL_SIGNUP_REQUIRED", "Sign up to run a trading agent.");
    }

    const started = await tradingAgentService.beginRunForUser(
      session.userId,
      params.id,
    );

    const finish = () => tradingAgentService.executeRun(started);

    if (process.env.VERCEL === "1") {
      const { waitUntil } = await import("@vercel/functions");
      waitUntil(
        finish().catch((err: unknown) => {
          console.error("[trading-agent] Background run failed:", err);
        }),
      );
      return ok(
        {
          agent: started.view,
          started: true,
          message: "Pass started. Notes update while analysis runs.",
        },
        { status: 202 },
      );
    }

    const agent = await finish();
    return ok({ agent });
  },
);
