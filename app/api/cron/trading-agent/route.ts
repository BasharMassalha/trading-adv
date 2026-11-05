import { timingSafeEqual } from "crypto";
import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { tradingAgentService } from "@/server/services/trading-agent.service";
import { quoteRefreshService } from "@/server/services/quote-refresh.service";

export const runtime = "nodejs";
export const maxDuration = 300;

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const actual = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

/**
 * GET /api/cron/trading-agent
 * Vercel calls this every 15 minutes. No user session. Agents already run
 * inside that window are skipped.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  if (!process.env.CRON_SECRET) {
    return fail(
      503,
      "CRON_NOT_CONFIGURED",
      "Set CRON_SECRET before the scheduled agent run can execute.",
    );
  }
  if (!cronAuthorized(req)) {
    return fail(401, "UNAUTHORIZED", "Invalid cron secret.");
  }

  const quotes = await quoteRefreshService.refresh();
  const tick = await tradingAgentService.tick({ limitMs: 200_000 });
  return ok({ quotes, ...tick });
});
