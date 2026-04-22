import type { NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { assetRepository } from "@/server/repositories/asset.repository";
import { priceHistoryRepository } from "@/server/repositories/price-history.repository";
import { getMarketDataProvider } from "@/lib/market-data/provider";
import { toNum } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * GET /api/assets/:ticker
 *
 * Returns:
 *  - asset profile (from DB if enriched, else freshly fetched from provider)
 *  - latest quote
 *  - up to 1 year of price history (from DB if available, else from provider)
 */
export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { ticker: string } }) => {
    const symbol = params.ticker.toUpperCase();
    const provider = getMarketDataProvider();

    // Fetch in parallel — always get a fresh quote
    const [dbAsset, profile, quote] = await Promise.all([
      assetRepository.findBySymbol(symbol),
      provider.getAssetProfile(symbol),
      provider.getLatestQuote(symbol),
    ]);

    // If we have DB history use it; otherwise ask the provider
    let history;
    if (dbAsset) {
      const dbHistory = await priceHistoryRepository.findLatest(dbAsset.id, 365);
      if (dbHistory.length > 0) {
        history = dbHistory
          .map((r) => ({
            date: r.date.toISOString().slice(0, 10),
            close: toNum(r.close) ?? 0,
            open: toNum(r.open),
            high: toNum(r.high),
            low: toNum(r.low),
            volume: r.volume != null ? Number(r.volume) : undefined,
          }))
          .reverse(); // oldest → newest
      }
    }

    if (!history) {
      history = await provider.getHistoricalPrices(symbol, "1Y");
    }

    return ok({
      profile,
      quote,
      history,
      enrichedAt: dbAsset?.lastEnrichedAt ?? null,
    });
  },
);
