import { z } from "zod";

// ---------------------------------------------------------------------------
// Canonical holding type used for BOTH CSV and image parsing pipelines.
// Every upstream parser must produce this shape; every downstream consumer
// (review UI, confirm API, DB mapper) depends only on this shape.
// ---------------------------------------------------------------------------

/**
 * Preprocessor: coerce "" / null / undefined → null, everything else → Number.
 * Zod's built-in `coerce.number()` returns NaN for empty strings which causes
 * confusing validation messages.
 */
const numericField = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined
      ? null
      : typeof v === "number"
        ? v
        : Number(String(v).replace(/[^0-9.\-]/g, "") || ""),
  z.number().nullable().optional(),
);

const nonnegNumericField = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined
      ? null
      : typeof v === "number"
        ? v
        : Number(String(v).replace(/[^0-9.]/g, "") || ""),
  z.number().nonnegative().nullable().optional(),
);

export const parsedHoldingSchema = z.object({
  /** Stock / ETF / crypto ticker, e.g. "AAPL" */
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Ticker is required")
    .max(20, "Ticker too long"),

  /** Human-readable name, e.g. "Apple Inc." */
  companyName: z
    .string()
    .trim()
    .max(120, "Name too long")
    .nullable()
    .optional(),

  /** Number of shares / units held */
  shares: nonnegNumericField,

  /** Cost per share at time of purchase */
  averageCost: nonnegNumericField,

  /** Last known market price */
  currentPrice: nonnegNumericField,

  /** Total position value (quantity × current price) */
  marketValue: numericField,

  /** Unrealised gain or loss in currency units */
  gainLoss: numericField,

  /** ISO 4217 currency code, e.g. "USD" */
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Must be a 3-letter currency code")
    .nullable()
    .optional()
    .default("USD"),
});

export type ParsedHolding = z.infer<typeof parsedHoldingSchema>;

// ---------------------------------------------------------------------------
// Parse result envelope — returned by every importer.
// ---------------------------------------------------------------------------

export const parseResultSchema = z.object({
  sourceType: z.enum(["CSV", "IMAGE"]),
  filename: z.string(),
  holdings: z.array(parsedHoldingSchema),
  warnings: z.array(z.string()),
  /**
   * ok       — at least one valid holding found
   * partial  — some rows were skipped; rest are valid
   * empty    — nothing usable was extracted
   */
  status: z.enum(["ok", "partial", "empty"]),
});

export type ParseResult = z.infer<typeof parseResultSchema>;
