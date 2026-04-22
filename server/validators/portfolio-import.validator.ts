import { z } from "zod";
import { parsedHoldingSchema } from "@/lib/portfolio/parsed-holding";

/** Allowed MIME types for each upload channel. */
export const CSV_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "text/x-csv",
];

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

// ---------------------------------------------------------------------------
// Confirm-import request body
// ---------------------------------------------------------------------------

export const confirmImportSchema = z.object({
  /**
   * Optional: if provided, replace holdings in this existing portfolio.
   * If absent, a brand-new portfolio is created.
   */
  portfolioId: z.string().cuid().optional(),

  /** Human-readable portfolio name (defaults to "My Portfolio") */
  portfolioName: z
    .string()
    .trim()
    .min(1, "Portfolio name is required")
    .max(80, "Name is too long")
    .default("My Portfolio"),

  /** Upload channel — determines the `source` field on the Portfolio model */
  source: z.enum(["CSV", "IMAGE"]),

  /** ISO 4217 base currency */
  baseCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Must be a 3-letter currency code")
    .default("USD"),

  /** User-reviewed and confirmed holdings to persist */
  holdings: z
    .array(parsedHoldingSchema)
    .min(1, "At least one holding is required"),
});

export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;
