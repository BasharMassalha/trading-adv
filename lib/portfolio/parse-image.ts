/**
 * Screenshot / image parser.
 *
 * Uses the vision provider abstraction to extract portfolio holdings from
 * brokerage screenshots. Supports OpenAI GPT-4 Vision and a mock provider
 * for development/testing.
 *
 * CONFIGURATION
 * ─────────────
 * - VISION_PROVIDER=auto (default): Uses OpenAI if API key is set, else mock
 * - VISION_PROVIDER=openai: Requires OPENAI_API_KEY
 * - VISION_PROVIDER=mock: Always uses mock data
 *
 * See lib/vision/ for provider implementations.
 */

import { getVisionProvider, VisionProviderError, type VisionErrorCode } from "@/lib/vision";
import { fillMissingAverageCostFromPrice } from "./normalize-holdings";
import { normalizeCashHoldings } from "./cash";
import type { ParseResult } from "./parsed-holding";

export type ImageExtractResult = {
  holdings: ParseResult["holdings"];
  warnings: string[];
  status: ParseResult["status"];
  /** Name of the provider that performed extraction */
  provider: string;
  /** Confidence score 0–1 from the underlying model, if available */
  confidence?: number;
  /** Number of rows dropped due to validation errors */
  droppedRows?: number;
  /** Set when extraction failed before parsing (e.g. rate limit, bad API key) */
  errorCode?: VisionErrorCode;
};

/**
 * System prompt template (exported for reference/documentation).
 * The actual prompt is defined in each provider implementation.
 */
export const EXTRACTION_PROMPT = `
You are a financial data extraction assistant. Given a screenshot of a brokerage 
portfolio page, extract all stock/ETF holdings and return a JSON array of objects.

Each object must have these keys:
  - ticker:        stock symbol (string, required)
  - companyName:   full company name (string, optional)
  - shares:        number of shares held (number, optional)
  - averageCost:   average purchase price per share (number, optional)
  - currentPrice:  current market price per share (number, optional)
  - marketValue:   total position value in dollars (number, optional)
  - gainLoss:      unrealised gain or loss in dollars (number, optional)
  - currency:      3-letter ISO currency code, default "USD" (string, optional)

Rules:
- Return ONLY the JSON array, no prose.
- Skip header rows and portfolio totals.
- Include cash / sweep balances as ticker "CASH" with shares = dollar
  amount, currentPrice/averageCost = 1, and marketValue = dollar amount.
- Strip currency symbols and commas from numbers.
- For negative numbers shown in parentheses, use a negative number.
- If a field is not visible or unclear, omit it (do not guess).
- If average cost is not shown but a per-share price is visible, set both
  currentPrice and averageCost to that price (many portfolios omit avg cost).
`.trim();

/**
 * Extract holdings from an image buffer using the configured vision provider.
 *
 * @param imageBuffer - Raw bytes of the uploaded PNG/JPG/WebP
 * @param mimeType    - e.g. "image/png"
 * @param filename    - Original filename, useful for logging
 * @returns Extraction result with holdings, warnings, and status
 */
export async function extractHoldingsFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ImageExtractResult> {
  const provider = getVisionProvider();

  console.info("[parse-image] Extracting holdings from image", {
    filename,
    bytes: imageBuffer.byteLength,
    mimeType,
    provider: provider.name,
  });

  try {
    const result = await provider.extractPortfolioFromImage({
      imageBuffer,
      mimeType,
      filename,
    });

    const holdings = normalizeCashHoldings(
      fillMissingAverageCostFromPrice(result.holdings),
    );
    const filledFromPrice = holdings.filter(
      (h, i) =>
        result.holdings[i]?.averageCost == null &&
        h.averageCost != null &&
        h.currentPrice != null &&
        h.ticker !== "CASH",
    ).length;

    const warnings = [...result.warnings];
    if (filledFromPrice > 0) {
      warnings.push(
        `Used market price as average cost for ${filledFromPrice} holding(s) where avg cost was missing.`,
      );
    }

    return {
      holdings,
      warnings,
      status: result.status,
      provider: result.provider,
      confidence: result.confidence,
      droppedRows: result.droppedRows,
    };
  } catch (err) {
    // Handle known errors gracefully
    if (err instanceof VisionProviderError) {
      console.error("[parse-image] Provider error:", err.code, err.message);

      const errorWarnings: string[] = [];

      switch (err.code) {
        case "INVALID_API_KEY":
          errorWarnings.push(
            "Vision API key is invalid or not configured.",
            "Please check your OPENAI_API_KEY environment variable.",
          );
          break;
        case "RATE_LIMITED":
          errorWarnings.push(
            "Vision API rate limit exceeded.",
            "Please wait a moment and try again.",
          );
          break;
        case "INVALID_IMAGE":
          errorWarnings.push(
            "The image could not be processed.",
            "Please ensure the image is clear and in a supported format (PNG, JPG, or WebP).",
          );
          break;
        case "EMPTY_IMAGE":
          errorWarnings.push("The uploaded file appears to be empty.");
          break;
        case "PARSE_ERROR":
          errorWarnings.push(
            "Could not extract structured data from the image.",
            "The image may not contain a recognizable portfolio layout.",
          );
          break;
        case "NETWORK_ERROR":
          errorWarnings.push(
            "Network error while connecting to the vision service.",
            "Please check your internet connection and try again.",
          );
          break;
        default:
          errorWarnings.push(
            "An error occurred while processing the image.",
            err.message,
          );
      }

      return {
        holdings: [],
        warnings: errorWarnings,
        status: "empty",
        provider: provider.name,
        droppedRows: 0,
        errorCode: err.code,
      };
    }

    // Unexpected errors
    console.error("[parse-image] Unexpected error:", err);

    return {
      holdings: [],
      warnings: [
        "An unexpected error occurred while processing the image.",
        "Please try again or use CSV upload instead.",
      ],
      status: "empty",
      provider: provider.name,
      droppedRows: 0,
    };
  }
}

/**
 * Check if a real (non-mock) vision provider is available.
 * Useful for showing appropriate UI messages.
 */
export function isRealVisionAvailable(): boolean {
  const provider = getVisionProvider();
  return provider.name !== "mock";
}
