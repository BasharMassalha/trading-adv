import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { holdingToAssetUpsert, holdingToCreateInput } from "@/lib/portfolio/holding-mappers";
import {
  applyLotTransaction,
  CostBasisError,
  unrealizedGainLoss,
} from "@/lib/portfolio/cost-basis";
import type { ParsedHolding } from "@/lib/portfolio/parsed-holding";
import type { PortfolioSource } from "@prisma/client";
import type { PortfolioTransactionInput } from "@/server/validators/portfolio-transaction.validator";

function toNum(v: { toNumber?: () => number } | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v.toNumber === "function") return v.toNumber();
  return Number(v);
}

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

    // Upsert assets outside the interactive transaction. Neon (and other
    // remote Postgres) round-trips make sequential upserts exceed the
    // default 5s interactive-tx timeout even for small portfolios.
    const assetIdMap = new Map<string, string>();
    for (const holding of holdings) {
      const upsertArgs = holdingToAssetUpsert(holding);
      const asset = await prisma.asset.upsert(upsertArgs);
      assetIdMap.set(holding.ticker.toUpperCase(), asset.id);
    }

    return prisma.$transaction(
      async (tx) => {
        // ── Create or update the portfolio record ──────────────────────
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

        // ── Insert new holdings ────────────────────────────────────────
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

        // ── Update total value snapshot ───────────────────────────────
        const totalValue = holdings.reduce(
          (sum, h) =>
            sum +
            (h.marketValue ??
              (h.shares ?? 0) * (h.currentPrice ?? h.averageCost ?? 0)),
          0,
        );

        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: {
            totalValue: totalValue > 0 ? totalValue : null,
            // Holdings were replaced — clear enriched totals until refresh.
            ...(portfolioId
              ? {
                  totalCost: null,
                  totalGain: null,
                  lastEnrichedAt: null,
                }
              : {}),
          },
        });

        return tx.portfolio.findUniqueOrThrow({
          where: { id: portfolio.id },
          include: { holdings: { include: { asset: true } } },
        });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
  },

  async deleteForUser(userId: string, portfolioId: string) {
    const existing = await portfolioRepository.findById(portfolioId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Portfolio not found.");
    }
    await portfolioRepository.delete(portfolioId);
  },

  async renameForUser(userId: string, portfolioId: string, name: string) {
    const existing = await portfolioRepository.findById(portfolioId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Portfolio not found.");
    }
    return portfolioRepository.update(portfolioId, { name });
  },

  /**
   * Apply buy/sell transactions to a portfolio, updating quantity and
   * average cost with weighted-average cost basis. Then refresh market
   * value / unrealized gain snapshots from known asset prices.
   */
  async applyTransactions(params: {
    userId: string;
    portfolioId: string;
    transactions: PortfolioTransactionInput[];
  }) {
    const { userId, portfolioId, transactions } = params;

    const portfolio = await portfolioRepository.findById(portfolioId);
    if (!portfolio || portfolio.userId !== userId) {
      throw new NotFoundError("Portfolio not found.");
    }

    // Ensure assets exist for every ticker (outside interactive tx)
    const assetBySymbol = new Map<string, string>();
    for (const tx of transactions) {
      const symbol = tx.ticker.toUpperCase();
      if (assetBySymbol.has(symbol)) continue;
      const asset = await prisma.asset.upsert({
        where: { symbol },
        create: {
          symbol,
          name: symbol,
          type: "STOCK",
          currency: portfolio.baseCurrency || "USD",
        },
        update: {},
      });
      assetBySymbol.set(symbol, asset.id);
    }

    // Working copy of positions keyed by symbol
    type Lot = {
      holdingId?: string;
      assetId: string;
      quantity: number;
      averageCost: number | null;
      currency: string;
      latestPrice: number | null;
    };

    const lots = new Map<string, Lot>();
    for (const h of portfolio.holdings) {
      const symbol = h.asset.symbol.toUpperCase();
      lots.set(symbol, {
        holdingId: h.id,
        assetId: h.assetId,
        quantity: toNum(h.quantity) ?? 0,
        averageCost: toNum(h.averageCost),
        currency: h.currency || "USD",
        latestPrice: toNum(h.asset.latestPrice),
      });
    }

    for (const tx of transactions) {
      const symbol = tx.ticker.toUpperCase();
      const existing = lots.get(symbol) ?? {
        assetId: assetBySymbol.get(symbol)!,
        quantity: 0,
        averageCost: null,
        currency: portfolio.baseCurrency || "USD",
        latestPrice: null,
      };

      try {
        const next = applyLotTransaction(
          { quantity: existing.quantity, averageCost: existing.averageCost },
          { side: tx.side, shares: tx.shares, price: tx.price },
        );
        const latestPrice =
          existing.latestPrice ?? (tx.price > 0 ? tx.price : null);
        if (next.quantity <= 0) {
          lots.delete(symbol);
        } else {
          lots.set(symbol, {
            ...existing,
            quantity: next.quantity,
            averageCost: next.averageCost,
            assetId: existing.assetId || assetBySymbol.get(symbol)!,
            latestPrice,
          });
        }
      } catch (err) {
        if (err instanceof CostBasisError) {
          throw new ValidationError(`${symbol}: ${err.message}`);
        }
        throw err;
      }
    }

    await prisma.$transaction(
      async (txClient) => {
        // Remove holdings that were fully sold or no longer present
        const keepAssetIds = new Set(
          [...lots.values()].map((l) => l.assetId),
        );
        for (const h of portfolio.holdings) {
          if (!keepAssetIds.has(h.assetId)) {
            await txClient.portfolioHolding.delete({ where: { id: h.id } });
          }
        }

        let totalValue = 0;
        let totalCost = 0;
        let totalGain = 0;

        for (const lot of lots.values()) {
          const { marketValue, unrealized } = unrealizedGainLoss(
            lot.quantity,
            lot.averageCost,
            lot.latestPrice,
          );
          const cost =
            lot.averageCost != null ? lot.quantity * lot.averageCost : null;

          if (marketValue != null) totalValue += marketValue;
          if (cost != null) totalCost += cost;
          if (unrealized != null) totalGain += unrealized;

          const existingHolding = portfolio.holdings.find(
            (h) => h.assetId === lot.assetId,
          );

          if (existingHolding) {
            await txClient.portfolioHolding.update({
              where: { id: existingHolding.id },
              data: {
                quantity: lot.quantity,
                averageCost: lot.averageCost,
                marketValue: marketValue,
                unrealizedGainLoss: unrealized,
              },
            });
          } else {
            await txClient.portfolioHolding.create({
              data: {
                portfolioId,
                assetId: lot.assetId,
                quantity: lot.quantity,
                averageCost: lot.averageCost,
                currency: lot.currency,
                marketValue: marketValue,
                unrealizedGainLoss: unrealized,
              },
            });
          }
        }

        // Recompute weights from market values when we have prices
        if (totalValue > 0) {
          for (const lot of lots.values()) {
            const { marketValue } = unrealizedGainLoss(
              lot.quantity,
              lot.averageCost,
              lot.latestPrice,
            );
            if (marketValue == null) continue;
            const holding = await txClient.portfolioHolding.findUnique({
              where: {
                portfolioId_assetId: {
                  portfolioId,
                  assetId: lot.assetId,
                },
              },
            });
            if (holding) {
              await txClient.portfolioHolding.update({
                where: { id: holding.id },
                data: { weight: marketValue / totalValue },
              });
            }
          }
        }

        await txClient.portfolio.update({
          where: { id: portfolioId },
          data: {
            totalValue: totalValue > 0 ? totalValue : null,
            totalCost: totalCost > 0 ? totalCost : null,
            totalGain: lots.size > 0 ? totalGain : null,
            updatedAt: new Date(),
          },
        });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    return portfolioRepository.findById(portfolioId);
  },
};
