/**
 * Vision provider contract.
 *
 * All concrete providers (mock, OpenAI, Anthropic, etc.) must implement
 * `IVisionProvider`. The rest of the app only depends on this interface,
 * so switching vendors is a one-line change in provider.ts.
 */

import type { ParsedHolding } from "@/lib/portfolio/parsed-holding";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type SupportedMimeType = "image/png" | "image/jpeg" | "image/webp";

export interface VisionExtractionInput {
  /** Raw image bytes */
  imageBuffer: Buffer;
  /** MIME type of the image */
  mimeType: SupportedMimeType | string;
  /** Original filename (for logging) */
  filename: string;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface VisionExtractionResult {
  /** Successfully parsed holdings */
  holdings: ParsedHolding[];

  /** Warnings about parsing issues (dropped rows, missing fields, etc.) */
  warnings: string[];

  /**
   * Extraction status:
   * - "ok": At least one valid holding found, no significant issues
   * - "partial": Some holdings found but with notable issues/dropped rows
   * - "empty": No holdings could be extracted
   */
  status: "ok" | "partial" | "empty";

  /** Raw text extracted from the image, if available (for debugging) */
  rawText?: string;

  /** Name of the provider that performed extraction */
  provider: string;

  /** Confidence score 0–1 from the underlying model, if available */
  confidence?: number;

  /** Number of rows that were dropped due to validation errors */
  droppedRows?: number;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class VisionProviderError extends Error {
  constructor(
    message: string,
    public readonly code: VisionErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "VisionProviderError";
  }
}

export type VisionErrorCode =
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "INVALID_IMAGE"
  | "EMPTY_IMAGE"
  | "PARSE_ERROR"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "UNSUPPORTED_FORMAT";

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface IVisionProvider {
  /** Human-readable name of this provider */
  readonly name: string;

  /**
   * Extract portfolio holdings from an image.
   *
   * @param input - Image buffer and metadata
   * @returns Extraction result with holdings, warnings, and status
   * @throws VisionProviderError on unrecoverable errors
   */
  extractPortfolioFromImage(
    input: VisionExtractionInput,
  ): Promise<VisionExtractionResult>;
}

// ---------------------------------------------------------------------------
// Raw model response type (internal to providers)
// ---------------------------------------------------------------------------

/**
 * Shape expected from the vision model's JSON response.
 * Used internally by providers to parse model output before validation.
 */
export interface RawHoldingFromModel {
  ticker?: string | null;
  companyName?: string | null;
  shares?: number | string | null;
  averageCost?: number | string | null;
  currentPrice?: number | string | null;
  marketValue?: number | string | null;
  gainLoss?: number | string | null;
  currency?: string | null;
}
