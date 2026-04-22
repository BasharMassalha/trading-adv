import { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { advisorChatSchema } from "@/server/validators/advisor.validator";
import { advisorService } from "@/server/services/advisor.service";

/**
 * POST /api/advisor/chat
 * Send a message to the AI advisor and receive a context-aware response.
 *
 * The response is grounded in:
 * - User's investment profile
 * - Latest portfolio report
 * - Current portfolio data
 *
 * Provider: Configured via ANALYSIS_PROVIDER env var
 * - "mock": Rule-based responses (default)
 * - "openai": GPT-4 powered intelligent chat
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
  }

  const body = await req.json();
  const { messages, portfolioId } = advisorChatSchema.parse(body);

  const reply = await advisorService.chat(messages, {
    userId: session.userId,
    portfolioId: portfolioId ?? undefined,
  });

  return ok({
    message: {
      role: reply.role,
      content: reply.content,
    },
    provider: reply.provider,
  });
});

/**
 * GET /api/advisor/chat
 * Get information about the chat provider configuration.
 */
export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) {
    return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
  }

  return ok({
    provider: advisorService.getChatProviderName(),
    isRealProvider: advisorService.isRealChatAvailable(),
  });
});
