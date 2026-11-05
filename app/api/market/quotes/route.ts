import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { quoteRefreshService } from "@/server/services/quote-refresh.service";

export const runtime = "nodejs";

/**
 * POST /api/market/quotes
 * Refresh prices for the signed-in account. The open app calls this on a timer.
 */
export const POST = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) {
    return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
  }
  const result = await quoteRefreshService.refresh({ userId: session.userId });
  return ok(result);
});
