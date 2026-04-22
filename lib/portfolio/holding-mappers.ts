/**
 * Mappers that translate ParsedHolding objects into Prisma create-input shapes.
 *
 * Kept separate from the parsing pipeline so the persistence layer is easy
 * to update when the Prisma schema changes without touching parsers.
 */

import type { Prisma } from "@prisma/client";
import type { ParsedHolding } from "./parsed-holding";

/**
 * Build the Prisma `PortfolioHoldingCreateManyPortfolioInput` for a single
 * parsed holding, given the assetId returned after an Asset upsert.
 */
export function holdingToCreateInput(
  holding: ParsedHolding,
  assetId: string,
): Prisma.PortfolioHoldingCreateManyPortfolioInput {
  return {
    assetId,
    quantity: holding.shares ?? 0,
    averageCost:
      holding.averageCost != null ? holding.averageCost : undefined,
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
  return {
    where: { symbol },
    create: {
      symbol,
      name: holding.companyName ?? symbol,
      type: "STOCK",
      currency: holding.currency ?? "USD",
    },
    update: {
      name: holding.companyName ?? undefined,
    },
  };
}
