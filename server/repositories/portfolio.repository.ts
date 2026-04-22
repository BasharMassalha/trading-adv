import { prisma } from "@/lib/prisma";
import type { Portfolio, Prisma } from "@prisma/client";

/** Full portfolio include — used everywhere we need enriched holdings. */
const WITH_ENRICHED_HOLDINGS = {
  holdings: {
    include: { asset: true },
    orderBy: { marketValue: "desc" as const },
  },
} satisfies Prisma.PortfolioInclude;

export const portfolioRepository = {
  findById(id: string) {
    return prisma.portfolio.findUnique({
      where: { id },
      include: WITH_ENRICHED_HOLDINGS,
    });
  },

  listByUser(userId: string) {
    return prisma.portfolio.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { holdings: true } },
      },
    });
  },

  listByUserWithHoldings(userId: string, limit?: number) {
    return prisma.portfolio.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: WITH_ENRICHED_HOLDINGS,
      ...(limit != null ? { take: limit } : {}),
    });
  },

  create(data: Prisma.PortfolioCreateInput): Promise<Portfolio> {
    return prisma.portfolio.create({ data });
  },

  update(id: string, data: Prisma.PortfolioUpdateInput): Promise<Portfolio> {
    return prisma.portfolio.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.portfolio.delete({ where: { id } });
  },
};
