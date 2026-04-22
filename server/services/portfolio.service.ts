import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { holdingToAssetUpsert, holdingToCreateInput } from "@/lib/portfolio/holding-mappers";
import type { ParsedHolding } from "@/lib/portfolio/parsed-holding";
import type { PortfolioSource } from "@prisma/client";

export const portfolioService = {
  async getById(id: string) {
    const portfolio = await portfolioRepository.findById(id);
    if (!portfolio) throw new NotFoundError("Portfolio not found.");
    return portfolio;
  },

  listForUser(userId: string) {
    return portfolioRepository.listByUser(userId);
  },

  /**
   * Persist a user-reviewed set of holdings in a single Prisma transaction.
   *
   * Behaviour:
   * - If `portfolioId` is supplied → deletes all existing holdings, then
   *   inserts the new ones (replace strategy).
   * - If `portfolioId` is absent   → creates a brand-new Portfolio record.
   *
   * Assets are upserted by ticker symbol so the Asset reference-data table
   * is always in sync.
   */
  async confirmImport(params: {
    userId: string;
    portfolioId?: string;
    portfolioName: string;
    source: PortfolioSource;
    baseCurrency: string;
    holdings: ParsedHolding[];
  }) {
    const {
      userId,
      portfolioId,
      portfolioName,
      source,
      baseCurrency,
      holdings,
    } = params;

    return prisma.$transaction(async (tx) => {
      // ── 1. Upsert every asset so FK constraints are satisfied ──────────
      const assetIdMap = new Map<string, string>();

      for (const holding of holdings) {
        const upsertArgs = holdingToAssetUpsert(holding);
        const asset = await tx.asset.upsert(upsertArgs);
        assetIdMap.set(holding.ticker.toUpperCase(), asset.id);
      }

      // ── 2. Create or update the portfolio record ──────────────────────
      let portfolio;

      if (portfolioId) {
        // Verify the portfolio belongs to this user before mutating it.
        const existing = await tx.portfolio.findFirst({
          where: { id: portfolioId, userId },
        });
        if (!existing) {
          throw new NotFoundError(
            "Portfolio not found or does not belong to this user.",
          );
        }

        // Delete all existing holdings so we can replace them.
        await tx.portfolioHolding.deleteMany({
          where: { portfolioId },
        });

        portfolio = await tx.portfolio.update({
          where: { id: portfolioId },
          data: {
            name: portfolioName,
            source,
            baseCurrency,
            updatedAt: new Date(),
          },
        });
      } else {
        portfolio = await tx.portfolio.create({
          data: {
            user: { connect: { id: userId } },
            name: portfolioName,
            source,
            baseCurrency,
          },
        });
      }

      // ── 3. Insert new holdings ────────────────────────────────────────
      const holdingInputs = holdings
        .filter((h) => assetIdMap.has(h.ticker.toUpperCase()))
        .map((h) =>
          holdingToCreateInput(h, assetIdMap.get(h.ticker.toUpperCase())!),
        );

      if (holdingInputs.length > 0) {
        await tx.portfolioHolding.createMany({
          data: holdingInputs.map((input) => ({
            ...input,
            portfolioId: portfolio.id,
          })),
          skipDuplicates: true,
        });
      }

      // ── 4. Update total value snapshot ───────────────────────────────
      const totalValue = holdings.reduce(
        (sum, h) => sum + (h.marketValue ?? (h.shares ?? 0) * (h.currentPrice ?? h.averageCost ?? 0)),
        0,
      );

      await tx.portfolio.update({
        where: { id: portfolio.id },
        data: { totalValue: totalValue > 0 ? totalValue : undefined },
      });

      return tx.portfolio.findUniqueOrThrow({
        where: { id: portfolio.id },
        include: { holdings: { include: { asset: true } } },
      });
    });
  },
};
