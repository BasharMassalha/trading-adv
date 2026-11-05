import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { armTradingAgentSchema } from "@/server/validators/trading-agent.validator";
import { tradingAgentService } from "@/server/services/trading-agent.service";

export const runtime = "nodejs";

async function requireUser() {
  const session = await getSession();
  if (!session) {
    return { session: null, error: fail(401, "UNAUTHORIZED", "Please sign in to continue.") };
  }
  if (session.isGuest) {
    return {
      session: null,
      error: fail(
        401,
        "TRIAL_SIGNUP_REQUIRED",
        "Sign up to arm a trading agent.",
      ),
    };
  }
  return { session, error: null };
}

export const GET = withErrorHandling(async () => {
  const { session, error } = await requireUser();
  if (!session) return error!;
  const overview = await tradingAgentService.overview(session.userId);
  return ok(overview);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { session, error } = await requireUser();
  if (!session) return error!;
  const body = await req.json();
  const input = armTradingAgentSchema.parse(body);
  const agent = await tradingAgentService.arm(
    session.userId,
    input.sourcePortfolioId,
  );
  return ok({ agent });
});
