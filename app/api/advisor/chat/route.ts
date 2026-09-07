import { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { requireRegisteredSession } from "@/lib/auth";
import { advisorChatSchema } from "@/server/validators/advisor.validator";
import { advisorService } from "@/server/services/advisor.service";

/**
 * POST /api/advisor/chat
 * Send a message to the AI advisor and receive a context-aware response.
 *
 * Guests must convert to a registered account before chatting.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireRegisteredSession();

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
  await requireRegisteredSession();

  return ok({
    provider: advisorService.getChatProviderName(),
    isRealProvider: advisorService.isRealChatAvailable(),
  });
});
