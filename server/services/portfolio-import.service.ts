/**
 * Portfolio import service.
 *
 * Orchestrates file validation → parsing → normalisation.
 * Does NOT write to the database — that happens only after the user reviews
 * and confirms the import via `portfolioService.confirmImport()`.
 */

import { ValidationError } from "@/lib/errors";
import { parseCsvText } from "@/lib/portfolio/parse-csv";
import { extractHoldingsFromImage, type ImageExtractResult } from "@/lib/portfolio/parse-image";
import type { ParseResult } from "@/lib/portfolio/parsed-holding";
import {
  CSV_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/server/validators/portfolio-import.validator";

/** Extended ParseResult with provider info for image imports */
export type ImageParseResult = ParseResult & {
  provider?: string;
  droppedRows?: number;
};

export const portfolioImportService = {
  /**
   * Parse a CSV file and return the normalised holdings.
   * No database interaction — returns a ParseResult for the review UI.
   */
  async importCsv(file: File): Promise<ParseResult> {
    assertFile(file, CSV_MIME_TYPES);

    const text = await file.text();
    const result = parseCsvText(text, file.name);

    console.info("[portfolio-import] csv parsed", {
      filename: file.name,
      rows: result.holdings.length,
      status: result.status,
    });

    return result;
  },

  /**
   * Extract holdings from a broker screenshot using a vision model (or the
   * mock extractor during development).
   * No database interaction — returns a ParseResult for the review UI.
   */
  async importImage(file: File): Promise<ImageParseResult> {
    assertFile(file, IMAGE_MIME_TYPES);

    // Convert the Web API File to a Node.js Buffer for the image parser.
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const result = await extractHoldingsFromImage(
      buffer,
      file.type || "image/png",
      file.name,
    );

    console.info("[portfolio-import] image parsed", {
      filename: file.name,
      rows: result.holdings.length,
      status: result.status,
      provider: result.provider,
    });

    return {
      sourceType: "IMAGE",
      filename: file.name,
      holdings: result.holdings,
      warnings: result.warnings,
      status: result.status,
      provider: result.provider,
      droppedRows: result.droppedRows,
    };
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertFile(file: File | null | undefined, allowedMime: string[]) {
  if (!file) {
    throw new ValidationError("No file was provided.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError(
      `File exceeds the ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit.`,
    );
  }
  // Only reject when the browser explicitly sends a disallowed MIME type.
  // Some environments send an empty type string — we let those through.
  if (file.type && !allowedMime.includes(file.type)) {
    throw new ValidationError(
      `Unsupported file type "${file.type}". Allowed: ${allowedMime.join(", ")}`,
    );
  }
}
