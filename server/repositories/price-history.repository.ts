import { prisma } from "@/lib/prisma";
import type { HistoricalPricePoint } from "@/lib/market-data/types";

export const priceHistoryRepository = {
  /**
   * Bulk-upsert daily candles for one asset.
   * Uses `skipDuplicates` so re-running enrichment is idempotent.
   */
  async upsertMany(
    assetId: string,
    points: HistoricalPricePoint[],
  ): Promise<{ count: number }> {
    return prisma.assetPriceHistory.createMany({
      data: points.map((p) => ({
        assetId,
        date: new Date(p.date + "T00:00:00.000Z"),
        close: p.close,
        open: p.open ?? null,
        high: p.high ?? null,
        low: p.low ?? null,
        volume: p.volume != null ? BigInt(p.volume) : null,
      })),
      skipDuplicates: true,
    });
  },

  /**
   * Fetch the most recent N candles for a single asset, newest first.
   */
  findLatest(assetId: string, limit = 365) {
    return prisma.assetPriceHistory.findMany({
      where: { assetId },
      orderBy: { date: "desc" },
      take: limit,
    });
  },

  /**
   * Fetch candles for multiple assets within a date range, sorted oldest→newest.
   * Used by the portfolio performance endpoint to build an aggregated time series.
   */
  findByAssetIdsInRange(
    assetIds: string[],
    from: Date,
    to: Date = new Date(),
  ) {
    return prisma.assetPriceHistory.findMany({
      where: {
        assetId: { in: assetIds },
        date: { gte: from, lte: to },
      },
      orderBy: { date: "asc" },
    });
  },
};
