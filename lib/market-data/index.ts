/**
 * Market data module exports.
 *
 * This module provides a vendor-agnostic interface for fetching market data.
 * The default provider is Yahoo Finance (free, no API key required).
 * A mock provider is also available for testing and demos.
 *
 * USAGE
 * ─────
 * import { getMarketDataProvider, getProviderName } from "@/lib/market-data";
 *
 * const provider = getMarketDataProvider();
 * const profile = await provider.getAssetProfile("AAPL");
 * const quote = await provider.getLatestQuote("AAPL");
 * const history = await provider.getHistoricalPrices("AAPL", "1Y");
 *
 * CONFIGURATION
 * ─────────────
 * Set MARKET_DATA_PROVIDER in .env to one of:
 *   - "auto" (default) — Uses Yahoo Finance
 *   - "yahoo" — Explicitly use Yahoo Finance
 *   - "mock" — Use static mock data
 *
 * See .env.example for full documentation.
 */

export * from "./types";
export { getMarketDataProvider, getProviderName, resetMarketDataProvider } from "./provider";
export { TTLCache, profileCache, quoteCache, historyCache } from "./cache";
export { MockMarketDataProvider } from "./mock-provider";
export { YahooFinanceProvider } from "./yahoo-provider";
