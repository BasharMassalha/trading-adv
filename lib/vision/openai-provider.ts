/**
 * OpenAI Vision provider.
 *
 * Uses GPT-4 Vision (gpt-4o) to extract portfolio holdings from screenshots.
 * Requires OPENAI_API_KEY environment variable.
 *
 * Features:
 *   - Structured JSON extraction from brokerage screenshots
 *   - Handles various portfolio layouts (tables, lists, grids)
 *   - Validation with Zod for type safety
 *   - Graceful handling of partial/unclear data
 *
 * Limitations:
 *   - Requires a paid OpenAI API key
 *   - Token-based pricing (images count toward context)
 *   - May struggle with very low-resolution images
 */

import OpenAI from "openai";
import { z } from "zod";
import { parsedHoldingSchema, type ParsedHolding } from "@/lib/portfolio/parsed-holding";
import type {
  IVisionProvider,
  VisionExtractionInput,
  VisionExtractionResult,
  RawHoldingFromModel,
  SupportedMimeType,
} from "./types";
import { VisionProviderError } from "./types";

// ---------------------------------------------------------------------------
// Extraction prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a precise financial data extraction assistant. Your task is to extract portfolio holdings from brokerage account screenshots.

IMPORTANT RULES:
1. Extract ONLY actual stock/ETF/fund holdings - rows representing individual positions
2. IGNORE: totals, subtotals, summaries, cash balances, headers, footers, menus, ads, UI elements
3. For each holding, extract ONLY values that are clearly visible and readable
4. NEVER invent, estimate, or guess values - if a field is unclear or not visible, omit it
5. Preserve exact decimal precision as shown in the image
6. Handle negative numbers (losses) correctly - they may appear in parentheses or with minus signs
7. Strip currency symbols ($, €, etc.) and commas from numbers
8. Return ONLY valid JSON matching the exact schema - no markdown, no prose`;

const USER_PROMPT = `Extract all portfolio holdings from this brokerage screenshot.

Return a JSON object with this exact structure:
{
  "holdings": [
    {
      "ticker": "AAPL",
      "companyName": "Apple Inc.",
      "shares": 100,
      "averageCost": 150.25,
      "currentPrice": 189.50,
      "marketValue": 18950.00,
      "gainLoss": 3925.00,
      "currency": "USD"
    }
  ],
  "notes": "Any relevant extraction notes"
}

Field requirements:
- ticker: Stock symbol (REQUIRED - skip row if not visible)
- companyName: Full company/fund name (optional)
- shares: Number of shares/units held (optional)
- averageCost: Average cost per share (optional)
- currentPrice: Current market price per share (optional)
- marketValue: Total position value (optional)
- gainLoss: Unrealized gain/loss (negative for losses) (optional)
- currency: 3-letter ISO code, default "USD" (optional)

Rules:
- Include ONLY rows that represent actual holdings
- Omit any field that is not clearly visible
- Use null for fields you cannot read
- If average cost is not shown but a per-share price column is visible, set BOTH currentPrice and averageCost to that price (many portfolios omit avg cost)
- Return {"holdings": [], "notes": "reason"} if no holdings found`;

// ---------------------------------------------------------------------------
// Response validation schema
// ---------------------------------------------------------------------------

const modelResponseSchema = z.object({
  holdings: z.array(
    z.object({
      ticker: z.string().nullable().optional(),
      companyName: z.string().nullable().optional(),
      shares: z.union([z.number(), z.string()]).nullable().optional(),
      averageCost: z.union([z.number(), z.string()]).nullable().optional(),
      currentPrice: z.union([z.number(), z.string()]).nullable().optional(),
      marketValue: z.union([z.number(), z.string()]).nullable().optional(),
      gainLoss: z.union([z.number(), z.string()]).nullable().optional(),
      currency: z.string().nullable().optional(),
    }),
  ),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getMimeTypeForApi(mimeType: string): "image/png" | "image/jpeg" | "image/webp" | "image/gif" {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/png") return "image/png";
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "image/jpeg";
  if (normalized === "image/webp") return "image/webp";
  // Default to PNG if unknown
  return "image/png";
}

function parseNumericField(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  if (typeof value === "string") {
    // Handle accounting notation: (1234.56) -> -1234.56
    let cleaned = value.trim();
    const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
    if (isNegative) {
      cleaned = cleaned.slice(1, -1);
    }
    // Remove currency symbols and commas
    cleaned = cleaned.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return isNegative ? -num : num;
  }
  return null;
}

function normalizeRawHolding(raw: RawHoldingFromModel): ParsedHolding | null {
  // ticker is required
  if (!raw.ticker || typeof raw.ticker !== "string" || raw.ticker.trim() === "") {
    return null;
  }

  const currentPrice = parseNumericField(raw.currentPrice);
  let averageCost = parseNumericField(raw.averageCost);
  // Many broker UIs show only a price column — treat it as cost basis too.
  if (averageCost == null && currentPrice != null) {
    averageCost = currentPrice;
  }

  const holding: ParsedHolding = {
    ticker: raw.ticker.trim().toUpperCase(),
    companyName: raw.companyName?.trim() || null,
    shares: parseNumericField(raw.shares),
    averageCost,
    currentPrice,
    marketValue: parseNumericField(raw.marketValue),
    gainLoss: parseNumericField(raw.gainLoss),
    currency: raw.currency?.trim().toUpperCase() || "USD",
  };

  return holding;
}

function extractJsonFromResponse(text: string): string {
  // Try to find JSON object in the response
  // Sometimes the model wraps it in markdown code blocks
  let cleaned = text.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Try to find the JSON object
  const startIdx = cleaned.indexOf("{");
  const endIdx = cleaned.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  return cleaned;
}

const MAX_RATE_LIMIT_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(err: InstanceType<typeof OpenAI.APIError>, attempt: number): number {
  const retryAfter = err.headers?.get?.("retry-after");
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return INITIAL_RETRY_DELAY_MS * 2 ** attempt;
}

function isRetryableApiError(err: InstanceType<typeof OpenAI.APIError>): boolean {
  return err.status === 429 || err.status === 503;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class OpenAIVisionProvider implements IVisionProvider {
  readonly name = "openai-vision";
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new VisionProviderError(
        "OpenAI API key is required",
        "INVALID_API_KEY",
      );
    }
    this.client = new OpenAI({ apiKey });
  }

  async extractPortfolioFromImage(
    input: VisionExtractionInput,
  ): Promise<VisionExtractionResult> {
    const { imageBuffer, mimeType, filename } = input;

    // Validate image size
    if (imageBuffer.byteLength === 0) {
      throw new VisionProviderError("Image file is empty", "EMPTY_IMAGE");
    }
    if (imageBuffer.byteLength > 20 * 1024 * 1024) {
      throw new VisionProviderError(
        "Image exceeds 20MB limit",
        "INVALID_IMAGE",
      );
    }

    const base64Image = imageBuffer.toString("base64");
    const apiMimeType = getMimeTypeForApi(mimeType);

    console.info("[vision:openai] Starting extraction for", {
      filename,
      bytes: imageBuffer.byteLength,
      mimeType: apiMimeType,
    });

    try {
      const rawContent = await this.callVisionApi(base64Image, apiMimeType);
      if (!rawContent) {
        return {
          holdings: [],
          warnings: ["Model returned empty response"],
          status: "empty",
          provider: this.name,
          droppedRows: 0,
        };
      }

      console.info("[vision:openai] Raw response length:", rawContent.length);

      return this.parseModelResponse(rawContent, filename);
    } catch (err) {
      this.handleApiError(err);
    }
  }

  private async callVisionApi(
    base64Image: string,
    apiMimeType: ReturnType<typeof getMimeTypeForApi>,
  ): Promise<string | null> {
    let lastRateLimitError: InstanceType<typeof OpenAI.APIError> | null = null;

    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 4096,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${apiMimeType};base64,${base64Image}`,
                    detail: "high",
                  },
                },
                {
                  type: "text",
                  text: USER_PROMPT,
                },
              ],
            },
          ],
        });

        return response.choices[0]?.message?.content ?? null;
      } catch (err) {
        if (
          err instanceof OpenAI.APIError &&
          isRetryableApiError(err) &&
          attempt < MAX_RATE_LIMIT_RETRIES
        ) {
          lastRateLimitError = err;
          const waitMs = getRetryDelayMs(err, attempt);
          console.warn(
            `[vision:openai] Rate limited (${err.status}), retry ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES} in ${waitMs}ms`,
          );
          await delay(waitMs);
          continue;
        }

        this.handleApiError(err);
      }
    }

    if (lastRateLimitError) {
      this.handleApiError(lastRateLimitError);
    }

    throw new VisionProviderError(
      "OpenAI rate limit exceeded. Please try again later.",
      "RATE_LIMITED",
    );
  }

  private parseModelResponse(
    rawContent: string,
    filename: string,
  ): VisionExtractionResult {
    const warnings: string[] = [];
    let droppedRows = 0;

    // Extract JSON from response
    const jsonStr = extractJsonFromResponse(rawContent);

    let parsed: z.infer<typeof modelResponseSchema>;
    try {
      const json = JSON.parse(jsonStr);
      parsed = modelResponseSchema.parse(json);
    } catch (err) {
      console.warn("[vision:openai] Failed to parse model response:", err);
      console.warn("[vision:openai] Raw content:", rawContent.slice(0, 500));

      return {
        holdings: [],
        warnings: [
          "Failed to parse model response as valid JSON",
          "The image may not contain a recognizable portfolio layout",
        ],
        status: "empty",
        provider: this.name,
        rawText: rawContent.slice(0, 1000),
        droppedRows: 0,
      };
    }

    if (parsed.notes) {
      warnings.push(`Model note: ${parsed.notes}`);
    }

    // Normalize and validate each holding
    const validHoldings: ParsedHolding[] = [];

    for (const raw of parsed.holdings) {
      const normalized = normalizeRawHolding(raw);

      if (!normalized) {
        droppedRows++;
        continue;
      }

      // Validate with Zod schema
      const result = parsedHoldingSchema.safeParse(normalized);
      if (result.success) {
        validHoldings.push(result.data);
      } else {
        droppedRows++;
        console.warn(
          "[vision:openai] Dropped invalid holding:",
          raw,
          result.error.flatten(),
        );
      }
    }

    // Determine status
    let status: VisionExtractionResult["status"] = "ok";
    if (validHoldings.length === 0) {
      status = "empty";
      warnings.push("No valid holdings could be extracted from the image");
    } else if (droppedRows > 0) {
      status = "partial";
      warnings.push(
        `${droppedRows} row(s) were skipped due to missing or invalid data`,
      );
    }

    console.info("[vision:openai] Extraction complete:", {
      filename,
      validHoldings: validHoldings.length,
      droppedRows,
      status,
    });

    return {
      holdings: validHoldings,
      warnings,
      status,
      provider: this.name,
      droppedRows,
    };
  }

  private handleApiError(err: unknown): never {
    if (err instanceof OpenAI.APIError) {
      console.error("[vision:openai] API error:", err.status, err.message);

      if (err.status === 401) {
        throw new VisionProviderError(
          "Invalid OpenAI API key",
          "INVALID_API_KEY",
          err,
        );
      }
      if (err.status === 429) {
        throw new VisionProviderError(
          "OpenAI rate limit exceeded. Please try again later.",
          "RATE_LIMITED",
          err,
        );
      }
      if (err.status === 400 && err.message.includes("image")) {
        throw new VisionProviderError(
          "Invalid image format or content",
          "INVALID_IMAGE",
          err,
        );
      }

      throw new VisionProviderError(
        `OpenAI API error: ${err.message}`,
        "PROVIDER_ERROR",
        err,
      );
    }

    if (err instanceof Error && err.message.includes("fetch")) {
      throw new VisionProviderError(
        "Network error connecting to OpenAI",
        "NETWORK_ERROR",
        err,
      );
    }

    throw new VisionProviderError(
      "Unexpected error during extraction",
      "PROVIDER_ERROR",
      err,
    );
  }
}
