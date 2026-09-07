import { NextRequest } from "next/server";
import { ok, withErrorHandling, fail } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { portfolioService } from "@/server/services/portfolio.service";
import { guestTrialService } from "@/server/services/guest-trial.service";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return fail(401, "UNAUTHORIZED", "Not authenticated");

  const portfolios = await portfolioService.listForUser(session.userId);
  return ok(portfolios);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return fail(401, "UNAUTHORIZED", "Not authenticated");

  const body = await req.json();
  const holdings = body.holdings ?? [];

  let portfolioId: string | undefined = body.portfolioId;
  if (session.isGuest) {
    const trial = await guestTrialService.assertCanImport(
      session.userId,
      Array.isArray(holdings) ? holdings.length : 0,
    );
    if (trial?.existingPortfolioId) {
      portfolioId = trial.existingPortfolioId;
    }
  }

  const portfolio = await portfolioService.confirmImport({
    userId: session.userId,
    portfolioId,
    portfolioName: body.name ?? "My portfolio",
    source: body.source ?? "MANUAL",
    baseCurrency: body.baseCurrency ?? "USD",
    holdings,
  });
  return ok(portfolio, { status: 201 });
});
