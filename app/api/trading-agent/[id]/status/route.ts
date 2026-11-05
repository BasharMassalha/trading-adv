import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { setTradingAgentStatusSchema } from "@/server/validators/trading-agent.validator";
import { tradingAgentService } from "@/server/services/trading-agent.service";

export const runtime = "nodejs";

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }
    if (session.isGuest) {
      return fail(401, "TRIAL_SIGNUP_REQUIRED", "Sign up to manage a trading agent.");
    }

    const body = await req.json();
    const input = setTradingAgentStatusSchema.parse(body);
    const agent = await tradingAgentService.setStatus(
      session.userId,
      params.id,
      input.status,
    );
    return ok({ agent });
  },
);
