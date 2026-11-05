import { z } from "zod";

export const armTradingAgentSchema = z.object({
  sourcePortfolioId: z.string().trim().min(1, "Choose a portfolio."),
});

export const setTradingAgentStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED"]),
});
