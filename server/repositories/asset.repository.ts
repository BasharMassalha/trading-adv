import { prisma } from "@/lib/prisma";
import type { Asset, AssetType, Prisma } from "@prisma/client";
import type { AssetProfile, LatestQuote } from "@/lib/market-data/types";

export const assetRepository = {
  findBySymbol(symbol: string): Promise<Asset | null> {
    return prisma.asset.findUnique({ where: { symbol: symbol.toUpperCase() } });
  },

  findManyBySymbols(symbols: string[]): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { symbol: { in: symbols.map((s) => s.toUpperCase()) } },
    });
  },

  /** Basic upsert used during portfolio import (no enriched fields). */
  upsertBySymbol(input: {
    symbol: string;
    name: string;
    type?: AssetType;
    currency?: string;
  }): Promise<Asset> {
    const symbol = input.symbol.toUpperCase();
    return prisma.asset.upsert({
      where: { symbol },
      update: { name: input.name, currency: input.currency ?? "USD" },
      create: {
        symbol,
        name: input.name,
        type: input.type ?? "STOCK",
        currency: input.currency ?? "USD",
      },
    });
  },

  /**
   * Full enriched upsert — called by the enrichment service with live market data.
   * Merges profile fields AND latest price quote into a single atomic write.
   */
  async upsertEnriched(
    profile: AssetProfile,
    quote: LatestQuote,
  ): Promise<Asset> {
    const symbol = profile.symbol.toUpperCase();
    const now = new Date();

    const data: Prisma.AssetUpdateInput = {
      name: profile.name,
      type: profile.type as AssetType,
      exchange: profile.exchange ?? null,
      currency: profile.currency,
      sector: profile.sector ?? null,
      industry: profile.industry ?? null,
      description: profile.description ?? null,
      latestPrice: quote.price,
      priceChange: quote.change,
      priceChangePercent: quote.changePercent,
      marketCap: profile.marketCap ?? null,
      lastEnrichedAt: now,
    };

    return prisma.asset.upsert({
      where: { symbol },
      update: data,
      create: {
        symbol,
        name: profile.name,
        type: profile.type as AssetType,
        exchange: profile.exchange ?? null,
        currency: profile.currency,
        sector: profile.sector ?? null,
        industry: profile.industry ?? null,
        description: profile.description ?? null,
        latestPrice: quote.price,
        priceChange: quote.change,
        priceChangePercent: quote.changePercent,
        marketCap: profile.marketCap ?? null,
        lastEnrichedAt: now,
      },
    });
  },
};
