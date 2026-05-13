import { type NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { marketRiskService } from "@/server/services/market-risk.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/market-risk/history?days=180
 *
 * Trailing risk-score history aligned with today's snapshot.
 *
 * This data drives the Risk Trend Chart. It is not a forecast.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const raw = req.nextUrl.searchParams.get("days");
  const parsed = raw ? Number.parseInt(raw, 10) : 180;
  const days = Number.isFinite(parsed) ? parsed : 180;
  const history = await marketRiskService.getRiskHistory(days);
  return ok(history);
});
