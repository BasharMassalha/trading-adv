import { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { confirmImportSchema } from "@/server/validators/portfolio-import.validator";
import { portfolioService } from "@/server/services/portfolio.service";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return fail(401, "UNAUTHORIZED", "You must be signed in to import a portfolio.");
  }

  const body = await req.json();
  const input = confirmImportSchema.parse(body);

  const portfolio = await portfolioService.confirmImport({
    userId: session.userId,
    portfolioId: input.portfolioId,
    portfolioName: input.portfolioName,
    source: input.source,
    baseCurrency: input.baseCurrency,
    holdings: input.holdings,
  });

  return ok({ portfolioId: portfolio.id, name: portfolio.name }, { status: 201 });
});
