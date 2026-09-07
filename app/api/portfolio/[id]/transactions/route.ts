import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { applyPortfolioTransactionsSchema } from "@/server/validators/portfolio-transaction.validator";
import { portfolioService } from "@/server/services/portfolio.service";

export const runtime = "nodejs";

/**
 * POST /api/portfolio/[id]/transactions
 * Apply one or more buy/sell lots to update quantity and average cost.
 */
export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getSession();
    if (!session) {
      return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
    }
    if (session.isGuest) {
      return fail(
        401,
        "TRIAL_SIGNUP_REQUIRED",
        "Sign up to edit and save portfolio transactions.",
      );
    }

    const body = await req.json();
    const input = applyPortfolioTransactionsSchema.parse(body);

    const portfolio = await portfolioService.applyTransactions({
      userId: session.userId,
      portfolioId: params.id,
      transactions: input.transactions,
    });

    return ok({
      portfolioId: portfolio?.id ?? params.id,
      holdingCount: portfolio?.holdings.length ?? 0,
    });
  },
);
