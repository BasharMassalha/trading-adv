import { ok, withErrorHandling } from "@/lib/api-response";
import { marketRiskService } from "@/server/services/market-risk.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/market-risk/current
 *
 * Returns today's Market Risk Regime snapshot:
 *   - aggregated 0–100 risk score
 *   - qualitative regime label
 *   - per-indicator breakdown
 *   - long-form explanation
 *   - historical similarity profile
 *
 * This is a *risk indicator*, not a forecast or guaranteed prediction.
 */
export const GET = withErrorHandling(async () => {
  const snapshot = await marketRiskService.getCurrentSnapshot();
  return ok(snapshot);
});
