import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { newsService } from "@/server/services/news.service";
import { getMarketDataProvider } from "@/lib/market-data/provider";

export const runtime = "nodejs";

/**
 * GET /api/ticker-pulse?ticker=AAPL
 * Recent headlines + optional quote for advisor "what's going on" sheet.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return fail(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const raw = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  if (!raw || raw.length > 12 || raw === "BLEND") {
    return fail(400, "BAD_REQUEST", "Invalid ticker.");
  }

  const pulse = await newsService.getPulseForTicker(raw, {
    limit: 7,
    daysBack: 14,
  });

  let quote: { changePct: number; price: number } | null = null;
  try {
    const q = await getMarketDataProvider().getLatestQuote(raw);
    quote = { changePct: q.changePercent, price: q.price };
  } catch {
    quote = null;
  }

  return ok({
    ticker: raw,
    quote,
    articles: pulse.items,
    warnings: pulse.warnings,
    provider: pulse.provider,
  });
});
