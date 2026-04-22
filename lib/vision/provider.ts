/**
 * Vision provider factory.
 *
 * Returns the configured provider instance based on environment configuration.
 * The system automatically selects the best available provider:
 *
 *   1. If VISION_PROVIDER is explicitly set, use that provider
 *   2. In "auto" mode:
 *      - Use OpenAI if OPENAI_API_KEY is set
 *      - Fall back to mock provider otherwise
 *
 * AVAILABLE PROVIDERS
 * ───────────────────
 * - "openai": OpenAI GPT-4 Vision (requires OPENAI_API_KEY)
 * - "mock": Static mock data for development/testing/demo
 * - "auto" (default): Auto-select based on available credentials
 *
 * ADDING A NEW PROVIDER
 * ─────────────────────
 * 1. Create `lib/vision/{vendor}-provider.ts` implementing IVisionProvider
 * 2. Add the provider to the switch statement below
 * 3. Add any required API keys to lib/env.ts and .env.example
 * 4. Document rate limits and usage notes in the provider file
 */

import type { IVisionProvider } from "./types";
import { MockVisionProvider } from "./mock-provider";
import { OpenAIVisionProvider } from "./openai-provider";

let _instance: IVisionProvider | null = null;

/**
 * Get the configured vision provider instance.
 * Creates a singleton on first call.
 */
export function getVisionProvider(): IVisionProvider {
  if (_instance) return _instance;

  const configuredProvider = (
    process.env.VISION_PROVIDER ?? "auto"
  ).toLowerCase().trim();

  const openaiKey = process.env.OPENAI_API_KEY;
  const isDev = process.env.NODE_ENV === "development";

  switch (configuredProvider) {
    case "mock":
      _instance = new MockVisionProvider();
      if (isDev) {
        console.log("[vision] Using mock provider (explicit configuration)");
      }
      break;

    case "openai":
      if (!openaiKey) {
        console.warn(
          "[vision] VISION_PROVIDER=openai but OPENAI_API_KEY not set, falling back to mock",
        );
        _instance = new MockVisionProvider();
      } else {
        _instance = new OpenAIVisionProvider(openaiKey);
        if (isDev) {
          console.log("[vision] Using OpenAI Vision provider");
        }
      }
      break;

    case "auto":
    default:
      // Auto-detect: use OpenAI if key is available, otherwise mock
      if (openaiKey) {
        _instance = new OpenAIVisionProvider(openaiKey);
        if (isDev) {
          console.log("[vision] Auto-selected OpenAI Vision provider");
        }
      } else {
        _instance = new MockVisionProvider();
        if (isDev) {
          console.log(
            "[vision] Auto-selected mock provider (no OPENAI_API_KEY found)",
          );
        }
      }
      break;

    // Future providers can be added here:
    // case "anthropic":
    //   const anthropicKey = process.env.ANTHROPIC_API_KEY;
    //   if (!anthropicKey) {
    //     console.warn("[vision] ANTHROPIC_API_KEY not set, falling back to mock");
    //     _instance = new MockVisionProvider();
    //   } else {
    //     _instance = new AnthropicVisionProvider(anthropicKey);
    //   }
    //   break;
  }

  return _instance;
}

/**
 * Reset the provider instance. Useful for testing or when switching providers.
 */
export function resetVisionProvider(): void {
  _instance = null;
}

/**
 * Get the name of the currently active provider.
 */
export function getVisionProviderName(): string {
  return getVisionProvider().name;
}

/**
 * Check if a real (non-mock) vision provider is available.
 */
export function isRealVisionProviderAvailable(): boolean {
  const provider = getVisionProvider();
  return provider.name !== "mock";
}
