import { z } from "zod";

export const investorProfileSchema = z.object({
  riskTolerance: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]).optional(),
  investmentHorizon: z.enum(["SHORT", "MEDIUM", "LONG"]).optional(),
  investmentGoal: z
    .enum(["GROWTH", "INCOME", "BALANCED", "CAPITAL_PRESERVATION"])
    .optional(),
  assetPreference: z
    .enum(["ETF_ONLY", "MOSTLY_ETFS", "MIXED", "MOSTLY_STOCKS"])
    .optional(),
  preferredRegions: z.array(z.string().trim().max(50)).max(20).optional(),
  preferredSectors: z.array(z.string().trim().max(50)).max(20).optional(),
  avoidedSectors: z.array(z.string().trim().max(50)).max(20).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export type InvestorProfileInput = z.infer<typeof investorProfileSchema>;
