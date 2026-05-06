/**
 * Earnings provider factory.
 *
 * Currently only Yahoo is wired up (free, no key). Add new providers here
 * (e.g. Finnhub, Alpha Vantage) and switch via env when needed.
 */

import { YahooEarningsProvider } from "./yahoo-provider";
import type { IEarningsProvider } from "./types";

let _instance: IEarningsProvider | null = null;

export function getEarningsProvider(): IEarningsProvider {
  if (_instance) return _instance;
  _instance = new YahooEarningsProvider();
  return _instance;
}

export function getEarningsProviderName(): string {
  return getEarningsProvider().name;
}
