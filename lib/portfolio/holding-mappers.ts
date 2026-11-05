/**
 * Mappers that translate ParsedHolding objects into Prisma create-input shapes.
 *
 * Kept separate from the parsing pipeline so the persistence layer is easy
 * to update when the Prisma schema changes without touching parsers.
 */

import type { Prisma } from "@prisma/client";
import type { ParsedHolding } from "./parsed-holding";
import { isCashSymbol } from "./cash";

/**
 * Build the Prisma `PortfolioHoldingCreateManyPortfolioInput` for a single
 * parsed holding, given the assetId returned after an Asset upsert.
 */
export function holdingToCreateInput(
  holding: ParsedHolding,
  assetId: string,
): Prisma.PortfolioHoldingCreateManyPortfolioInput {
  const cash = isCashSymbol(holding.ticker);
  const quantity = cash
    ? (holding.shares ?? holding.marketValue ?? 0)
    : (holding.shares ?? 0);

  return {
    assetId,
    quantity,
    averageCost: cash ? 1 : holding.averageCost != null ? holding.averageCost : undefined,
    marketValue: cash
      ? quantity
      : holding.marketValue != null
        ? holding.marketValue
        : undefined,
    currency: holding.currency ?? "USD",
  };
}

/**
 * Build the Prisma `AssetUpsertArgs` (create + update payload) for a
 * ParsedHolding so Assets can be seeded / updated as part of the import.
 */
export function holdingToAssetUpsert(holding: ParsedHolding): {
  where: Prisma.AssetWhereUniqueInput;
  create: Prisma.AssetCreateInput;
  update: Prisma.AssetUpdateInput;
} {
  const symbol = holding.ticker.toUpperCase();
  const cash = isCashSymbol(symbol);
  return {
    where: { symbol },
    create: {
      symbol,
      name: cash ? "Cash" : (holding.companyName ?? symbol),
      type: cash ? "CASH" : "STOCK",
      currency: holding.currency ?? "USD",
      ...(cash
        ? {
            latestPrice: 1,
            priceChange: 0,
            priceChangePercent: 0,
          }
        : {}),
    },
    update: {
      name: cash ? "Cash" : (holding.companyName ?? undefined),
      ...(cash
        ? {
            type: "CASH" as const,
            latestPrice: 1,
            priceChange: 0,
            priceChangePercent: 0,
          }
        : {}),
    },
  };
}
