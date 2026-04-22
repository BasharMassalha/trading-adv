/**
 * Vision module exports.
 *
 * This module provides a vendor-agnostic interface for extracting portfolio
 * holdings from brokerage screenshots using vision-capable AI models.
 *
 * USAGE
 * ─────
 * import { getVisionProvider, getVisionProviderName } from "@/lib/vision";
 *
 * const provider = getVisionProvider();
 * const result = await provider.extractPortfolioFromImage({
 *   imageBuffer,
 *   mimeType: "image/png",
 *   filename: "portfolio.png",
 * });
 *
 * CONFIGURATION
 * ─────────────
 * Set VISION_PROVIDER in .env to one of:
 *   - "auto" (default) — Uses OpenAI if API key is set, otherwise mock
 *   - "openai" — Use OpenAI GPT-4 Vision (requires OPENAI_API_KEY)
 *   - "mock" — Use static mock data
 *
 * See .env.example for full documentation.
 */

export * from "./types";
export {
  getVisionProvider,
  getVisionProviderName,
  resetVisionProvider,
  isRealVisionProviderAvailable,
} from "./provider";
export { MockVisionProvider } from "./mock-provider";
export { OpenAIVisionProvider } from "./openai-provider";
