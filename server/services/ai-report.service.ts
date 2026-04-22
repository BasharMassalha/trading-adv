import { aiReportRepository } from "@/server/repositories/ai-report.repository";

/**
 * AI report service.
 *
 * Reports are generated asynchronously: a background job picks them up,
 * calls the LLM, and patches the status from PENDING → READY | FAILED.
 *
 * For now, creation is synchronous and returns a PENDING report.
 */
export const aiReportService = {
  listForUser(userId: string) {
    return aiReportRepository.listByUser(userId);
  },

  async create(params: { userId: string; portfolioId?: string }) {
    return aiReportRepository.create({
      user: { connect: { id: params.userId } },
      ...(params.portfolioId
        ? { portfolio: { connect: { id: params.portfolioId } } }
        : {}),
      status: "PENDING",
    });
  },
};
