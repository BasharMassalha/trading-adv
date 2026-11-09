import { timingSafeEqual } from "crypto";
import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { tradingAgentService } from "@/server/services/trading-agent.service";

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
 * Vercel Hobby-safe schedule: once per day (14:00 UTC). No user session.
 * Active agents due for a pass are run; others are skipped.
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

  const runTick = () => tradingAgentService.tick({ limitMs: 240_000 });

  if (process.env.VERCEL === "1") {
    const { waitUntil } = await import("@vercel/functions");
    waitUntil(
      runTick().catch((err) => {
        console.error("[trading-agent] Cron tick failed:", err);
      }),
    );
    return ok({ started: true, message: "Scheduled pass started." }, { status: 202 });
  }

  const tick = await runTick();
  return ok(tick);
});
