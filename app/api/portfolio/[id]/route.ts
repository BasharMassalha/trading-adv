import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { portfolioService } from "@/server/services/portfolio.service";
import { renamePortfolioSchema } from "@/server/validators/portfolio.validator";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

/**
 * PATCH /api/portfolio/[id] — rename a portfolio owned by the current user.
 */
export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Not authenticated.");
    }

    const body = await req.json().catch(() => null);
    const parsed = renamePortfolioSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors[0]?.message ?? "Invalid portfolio name.",
      );
    }

    const portfolio = await portfolioService.renameForUser(
      session.userId,
      params.id,
      parsed.data.name,
    );

    return ok({ id: portfolio.id, name: portfolio.name });
  },
);

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
