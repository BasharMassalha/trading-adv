/**
 * Filings provider factory.
 *
 * Returns the configured filings provider based on FILINGS_PROVIDER env var:
 * - "mock": Uses static mock filings data (default)
 * - "sec": Uses SEC EDGAR public API (no API key required)
 *
 * CONFIGURATION
 * ─────────────
 * - FILINGS_PROVIDER: "mock" | "sec" (default: "mock")
 */

import type { IFilingsProvider } from "./types";
import { MockFilingsProvider } from "./mock-provider";
import { SECFilingsProvider } from "./sec-provider";
import { serverEnv } from "@/lib/env";

let _instance: IFilingsProvider | null = null;

/**
 * Get the configured filings provider.
 * Instance is cached for the lifetime of the process.
 */
export function getFilingsProvider(): IFilingsProvider {
  if (_instance) return _instance;

  const env = serverEnv();
  const provider = env.FILINGS_PROVIDER?.toLowerCase().trim() ?? "mock";

  console.info("[filings] Initializing filings provider:", provider);

  switch (provider) {
    case "sec":
    case "sec-edgar":
    case "edgar": {
      try {
        _instance = new SECFilingsProvider();
        console.info("[filings] SEC EDGAR provider initialized");
      } catch (err) {
        console.error("[filings] Failed to initialize SEC provider:", err);
        console.warn("[filings] Falling back to mock provider.");
        _instance = new MockFilingsProvider();
      }
      break;
    }

    case "mock":
    default:
      _instance = new MockFilingsProvider();
      console.info("[filings] Using mock provider");
      break;
  }

  return _instance;
}

/**
 * Reset the cached provider instance.
 * Useful for testing or reconfiguration.
 */
export function resetFilingsProvider(): void {
  _instance = null;
}

/**
 * Get the name of the current provider.
 */
export function getFilingsProviderName(): string {
  return getFilingsProvider().name;
}

/**
 * Check if a real (non-mock) provider is available.
 */
export function isRealFilingsProviderAvailable(): boolean {
  const env = serverEnv();
  const provider = env.FILINGS_PROVIDER?.toLowerCase().trim() ?? "mock";
  return provider === "sec" || provider === "sec-edgar" || provider === "edgar";
}
