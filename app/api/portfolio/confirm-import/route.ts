import { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { confirmImportSchema } from "@/server/validators/portfolio-import.validator";
import { portfolioService } from "@/server/services/portfolio.service";
import { guestTrialService } from "@/server/services/guest-trial.service";
import { userRepository } from "@/server/repositories/user.repository";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return fail(
      401,
      "UNAUTHORIZED",
      "You must be signed in to import a portfolio.",
    );
  }

  if (session.isGuest) {
    const active = await userRepository.isGuestActive(session.userId);
    if (!active) {
      return fail(
        401,
        "TRIAL_EXPIRED",
        "Your free trial has expired. Sign up to continue.",
      );
    }
  }

  const body = await req.json();
  const input = confirmImportSchema.parse(body);

  let portfolioId = input.portfolioId;

  if (session.isGuest) {
    const trial = await guestTrialService.assertCanImport(
      session.userId,
      input.holdings.length,
    );
    // Guests may only keep one book — always replace the existing one
    if (trial?.existingPortfolioId) {
      portfolioId = trial.existingPortfolioId;
    }
  }

  const portfolio = await portfolioService.confirmImport({
    userId: session.userId,
    portfolioId,
    portfolioName: input.portfolioName,
    source: input.source,
    baseCurrency: input.baseCurrency,
    holdings: input.holdings,
  });

  return ok({ portfolioId: portfolio.id, name: portfolio.name }, { status: 201 });
});
