/**
 * Portfolio validators (legacy entry-point).
 *
 * The canonical ParsedHolding type and its Zod schema have moved to
 * `lib/portfolio/parsed-holding.ts` so they are accessible from both server
 * and client code without circular imports.
 *
 * This file re-exports what other parts of the codebase still import from
 * here, and adds the createPortfolio schema.
 */

export {
  parsedHoldingSchema,
  type ParsedHolding,
  type ParseResult,
} from "@/lib/portfolio/parsed-holding";

export {
  CSV_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/server/validators/portfolio-import.validator";

import { z } from "zod";
import { parsedHoldingSchema } from "@/lib/portfolio/parsed-holding";

export const createPortfolioSchema = z.object({
  name: z.string().trim().min(1).max(80).default("My portfolio"),
  baseCurrency: z.string().trim().length(3).toUpperCase().default("USD"),
  source: z.enum(["MANUAL", "CSV", "IMAGE", "BROKER_SYNC"]).default("MANUAL"),
  holdings: z.array(parsedHoldingSchema).default([]),
});
export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
