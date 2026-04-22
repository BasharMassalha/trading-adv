import { NextRequest } from "next/server";
import { ok, withErrorHandling, fail } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { portfolioService } from "@/server/services/portfolio.service";

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
  const portfolio = await portfolioService.confirmImport({
    userId: session.userId,
    portfolioName: body.name ?? "My portfolio",
    source: body.source ?? "MANUAL",
    baseCurrency: body.baseCurrency ?? "USD",
    holdings: body.holdings ?? [],
  });
  return ok(portfolio, { status: 201 });
});
