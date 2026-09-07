import { z } from "zod";

export const portfolioTransactionSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1, "Ticker is required")
    .max(12)
    .transform((t) => t.toUpperCase()),
  side: z.enum(["BUY", "SELL"]),
  shares: z.coerce.number().positive("Shares must be greater than zero"),
  price: z.coerce.number().nonnegative("Price cannot be negative"),
});

export const applyPortfolioTransactionsSchema = z.object({
  transactions: z
    .array(portfolioTransactionSchema)
    .min(1, "Add at least one buy or sell"),
});

export type PortfolioTransactionInput = z.infer<
  typeof portfolioTransactionSchema
>;
export type ApplyPortfolioTransactionsInput = z.infer<
  typeof applyPortfolioTransactionsSchema
>;
