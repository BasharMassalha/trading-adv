import { ok, withErrorHandling } from "@/lib/api-response";
import { marketRiskService } from "@/server/services/market-risk.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/market-risk/comparisons
 *
 * Similarity profile of today's indicators vs. canonical historical stress
 * periods (Dot-Com, GFC, COVID, 2022 tightening). Returned similarities are
 * a historical-analogy lens, NOT a forecast.
 */
export const GET = withErrorHandling(async () => {
  const comparisons = await marketRiskService.getHistoricalComparisons();
  return ok(comparisons);
});
