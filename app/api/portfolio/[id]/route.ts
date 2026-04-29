import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { portfolioService } from "@/server/services/portfolio.service";

export const runtime = "nodejs";

/**
 * DELETE /api/portfolio/[id] — remove a portfolio owned by the current user.
 */
export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Not authenticated.");
    }

    await portfolioService.deleteForUser(session.userId, params.id);
    return ok({ deleted: true });
  },
);
