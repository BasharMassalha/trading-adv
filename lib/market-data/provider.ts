/**
 * Market-data provider factory.
 *
 * Returns the configured provider instance based on environment configuration.
 * The system automatically selects the best available provider:
 *
 *   1. If MARKET_DATA_PROVIDER is explicitly set, use that provider
 *   2. If no provider is specified, default to "auto"
 *   3. In "auto" mode:
 *      - Use Yahoo Finance (no API key required for basic usage)
 *      - Fall back to mock provider on initialization errors
 *
 * AVAILABLE PROVIDERS
 * ───────────────────
 * - "yahoo" or "auto": Yahoo Finance via yahoo-finance2 npm package (free)
 * - "mock": Static mock data for development/testing/demo
 *
 * ADDING A NEW PROVIDER
 * ─────────────────────
 * 1. Create `lib/market-data/{vendor}-provider.ts` implementing IMarketDataProvider
 * 2. Add the provider to the switch statement below
 * 3. Add any required API keys to lib/env.ts and .env.example
 * 4. Document rate limits and usage notes in the provider file
 */

import type { IMarketDataProvider } from "./types";
import { MockMarketDataProvider } from "./mock-provider";
import { YahooFinanceProvider } from "./yahoo-provider";

let _instance: IMarketDataProvider | null = null;

export function getMarketDataProvider(): IMarketDataProvider {
  if (_instance) return _instance;

  const configuredProvider = (
    process.env.MARKET_DATA_PROVIDER ?? "auto"
  ).toLowerCase().trim();

  const isDev = process.env.NODE_ENV === "development";

  switch (configuredProvider) {
    case "mock":
      _instance = new MockMarketDataProvider();
      if (isDev) {
        console.log("[market-data] Using mock provider (explicit configuration)");
      }
      break;

    case "yahoo":
    case "yahoo-finance":
    case "auto":
    default:
      try {
        _instance = new YahooFinanceProvider();
        if (isDev) {
          console.log("[market-data] Using Yahoo Finance provider");
        }
      } catch (err) {
        console.warn(
          "[market-data] Failed to initialize Yahoo Finance provider, falling back to mock:",
          err,
        );
        _instance = new MockMarketDataProvider();
      }
      break;

    // Future providers can be added here:
    // case "polygon":
    //   const apiKey = process.env.MARKET_DATA_API_KEY;
    //   if (!apiKey) {
    //     console.warn("[market-data] MARKET_DATA_API_KEY not set, falling back to mock");
    //     _instance = new MockMarketDataProvider();
    //   } else {
    //     _instance = new PolygonProvider(apiKey);
    //   }
    //   break;
    //
    // case "alpha-vantage":
    //   ...
    //   break;
  }

  return _instance;
}

/**
 * Reset the provider instance. Useful for testing or when switching providers.
 */
export function resetMarketDataProvider(): void {
  _instance = null;
}

/**
 * Get the name of the currently active provider.
 */
export function getProviderName(): string {
  return getMarketDataProvider().name;
}
