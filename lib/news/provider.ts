/**
 * News provider factory.
 *
 * Returns the configured news provider based on NEWS_PROVIDER env var:
 * - "mock": Uses static mock news data (default)
 * - "finnhub": Uses Finnhub API (requires NEWS_API_KEY)
 *
 * CONFIGURATION
 * ─────────────
 * - NEWS_PROVIDER: "mock" | "finnhub" (default: "mock")
 * - NEWS_API_KEY: Required for Finnhub provider
 */

import type { INewsProvider } from "./types";
import { MockNewsProvider } from "./mock-provider";
import { FinnhubNewsProvider } from "./finnhub-provider";
import { serverEnv } from "@/lib/env";

let _instance: INewsProvider | null = null;

/**
 * Get the configured news provider.
 * Instance is cached for the lifetime of the process.
 */
export function getNewsProvider(): INewsProvider {
  if (_instance) return _instance;

  const env = serverEnv();
  const provider = env.NEWS_PROVIDER?.toLowerCase().trim() ?? "mock";

  console.info("[news] Initializing news provider:", provider);

  switch (provider) {
    case "finnhub": {
      const apiKey = env.NEWS_API_KEY;
      if (!apiKey) {
        console.warn(
          "[news] NEWS_PROVIDER=finnhub but NEWS_API_KEY is not set. Falling back to mock.",
        );
        _instance = new MockNewsProvider();
        break;
      }

      try {
        _instance = new FinnhubNewsProvider(apiKey);
        console.info("[news] Finnhub provider initialized");
      } catch (err) {
        console.error("[news] Failed to initialize Finnhub provider:", err);
        console.warn("[news] Falling back to mock provider.");
        _instance = new MockNewsProvider();
      }
      break;
    }

    case "mock":
    default:
      _instance = new MockNewsProvider();
      console.info("[news] Using mock provider");
      break;
  }

  return _instance;
}

/**
 * Reset the cached provider instance.
 * Useful for testing or reconfiguration.
 */
export function resetNewsProvider(): void {
  _instance = null;
}

/**
 * Get the name of the current provider.
 */
export function getNewsProviderName(): string {
  return getNewsProvider().name;
}

/**
 * Check if a real (non-mock) provider is available.
 */
export function isRealNewsProviderAvailable(): boolean {
  const env = serverEnv();
  return env.NEWS_PROVIDER === "finnhub" && !!env.NEWS_API_KEY;
}
