import { prisma } from "@/lib/prisma";
import type { AIReport, AIReportStatus, Prisma } from "@prisma/client";

export const aiReportRepository = {
  findById(id: string): Promise<AIReport | null> {
    return prisma.aIReport.findUnique({ where: { id } });
  },

  /**
   * Find the most recent READY report for a portfolio.
   */
  findLatestForPortfolio(portfolioId: string): Promise<AIReport | null> {
    return prisma.aIReport.findFirst({
      where: { portfolioId, status: "READY" },
      orderBy: { generatedAt: "desc" },
    });
  },

  /**
   * Find the most recent report for a portfolio (any status).
   */
  findLatestAnyForPortfolio(portfolioId: string): Promise<AIReport | null> {
    return prisma.aIReport.findFirst({
      where: { portfolioId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Find the most recent READY report for a user (any portfolio).
   */
  findLatestForUser(userId: string): Promise<AIReport | null> {
    return prisma.aIReport.findFirst({
      where: { userId, status: "READY" },
      orderBy: { generatedAt: "desc" },
    });
  },

  listByUser(userId: string, limit = 50): Promise<AIReport[]> {
    return prisma.aIReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  listByPortfolio(portfolioId: string, limit = 20): Promise<AIReport[]> {
    return prisma.aIReport.findMany({
      where: { portfolioId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  create(data: Prisma.AIReportCreateInput): Promise<AIReport> {
    return prisma.aIReport.create({ data });
  },

  update(id: string, data: Prisma.AIReportUpdateInput): Promise<AIReport> {
    return prisma.aIReport.update({ where: { id }, data });
  },

  /**
   * Create a new pending report and return it.
   */
  createPending(params: {
    userId: string;
    portfolioId: string;
  }): Promise<AIReport> {
    return prisma.aIReport.create({
      data: {
        user: { connect: { id: params.userId } },
        portfolio: { connect: { id: params.portfolioId } },
        status: "PENDING",
      },
    });
  },

  /**
   * Mark a report as generating (in progress).
   */
  markGenerating(id: string): Promise<AIReport> {
    return prisma.aIReport.update({
      where: { id },
      data: { status: "GENERATING" },
    });
  },

  /**
   * Complete a report with analysis content.
   */
  completeReport(
    id: string,
    content: {
      summary: string;
      strengths: string[];
      risks: string[];
      opportunities: string[];
      suggestedActions: string[];
      followUpQuestions: string[];
      modelUsed: string;
      rawJson?: Prisma.InputJsonValue;
    },
  ): Promise<AIReport> {
    return prisma.aIReport.update({
      where: { id },
      data: {
        status: "READY",
        summary: content.summary,
        strengths: content.strengths,
        risks: content.risks,
        opportunities: content.opportunities,
        suggestedActions: content.suggestedActions,
        followUpQuestions: content.followUpQuestions,
        modelUsed: content.modelUsed,
        generatedAt: new Date(),
        ...(content.rawJson !== undefined && { rawJson: content.rawJson }),
      },
    });
  },

  /**
   * Mark a report as failed.
   */
  markFailed(id: string, errorMessage?: string): Promise<AIReport> {
    return prisma.aIReport.update({
      where: { id },
      data: {
        status: "FAILED",
        summary: errorMessage ?? "Analysis failed.",
        generatedAt: new Date(),
      },
    });
  },
};
