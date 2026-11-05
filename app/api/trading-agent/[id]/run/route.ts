import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { tradingAgentService } from "@/server/services/trading-agent.service";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/trading-agent/[id]/run
 * Refresh prices, run analysis, and fill the resulting trades on the agent book.
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

    const agent = await tradingAgentService.runForUser(session.userId, params.id);
    return ok({ agent });
  },
);
