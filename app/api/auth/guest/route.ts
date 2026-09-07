import { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { guestTrialService } from "@/server/services/guest-trial.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * POST /api/auth/guest
 * Start (or resume) a free-trial guest session without signing in.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const result = await guestTrialService.startTrial(clientIp(req));
  return ok(result, { status: result.alreadyRegistered ? 200 : 201 });
});
