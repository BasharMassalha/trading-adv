/**
 * Yahoo Finance market data provider.
 *
 * Uses the `yahoo-finance2` npm package to fetch real market data.
 * No API key is required for basic usage, but Yahoo may rate-limit heavy use.
 *
 * Features:
 *   - Company/ETF profiles with sector, industry, exchange info
 *   - Real-time quotes with price, change, volume
 *   - Historical daily OHLCV data up to 5 years
 *
 * Limitations:
 *   - Informal rate limits (approx 2000 requests/hour)
 *   - Some tickers may not be available (e.g. certain OTC stocks)
 *   - Crypto symbols use format like "BTC-USD" instead of "BTC"
 *
 * ERROR HANDLING
 * ─────────────
 * - Invalid tickers: Returns a fallback profile with "Unknown" fields
 * - Rate limits: Logged and re-thrown (caller should handle gracefully)
 * - Network errors: Logged and re-thrown
 * - Partial data: Missing fields are filled with sensible defaults
 */

import type {
  AssetProfile,
  AssetKind,
  HistoricalPricePoint,
  HistoricalRange,
  IMarketDataProvider,
  LatestQuote,
} from "./types";
import { profileCache, quoteCache, historyCache } from "./cache";
import { fetchHttpHistory, fetchHttpQuote } from "./http-quotes";

// ---------------------------------------------------------------------------
// Type definitions for yahoo-finance2 responses
// We define minimal types here to avoid issues with the library's complex types
// ---------------------------------------------------------------------------

interface YFPrice {
  shortName?: string;
  longName?: string;
  quoteType?: string;
  exchange?: string;
  exchangeName?: string;
  currency?: string;
  marketCap?: number;
}

interface YFProfile {
  sector?: string;
  industry?: string;
  longBusinessSummary?: string;
}

interface YFQuoteSummaryResult {
  price?: YFPrice;
  assetProfile?: YFProfile;
  summaryProfile?: YFProfile;
}

interface YFQuote {
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  previousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketTime?: Date;
}

interface YFChartQuote {
  date?: Date;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

interface YFChartResult {
  quotes?: YFChartQuote[];
}

// ---------------------------------------------------------------------------
// Type mapping helpers
// ---------------------------------------------------------------------------

function mapQuoteType(quoteType?: string): AssetKind {
  if (!quoteType) return "STOCK";
  const upper = quoteType.toUpperCase();
  if (upper === "ETF") return "ETF";
  if (upper === "CRYPTOCURRENCY") return "CRYPTO";
  if (upper === "MUTUALFUND") return "ETF";
  if (upper === "INDEX") return "OTHER";
  if (upper === "FUTURE" || upper === "OPTION") return "OTHER";
  return "STOCK";
}

function rangeToDays(range: HistoricalRange): number {
  switch (range) {
    case "1M": return 31;
    case "3M": return 92;
    case "6M": return 182;
    case "1Y": return 365;
    case "2Y": return 730;
    case "5Y": return 1825;
    default: return 365;
  }
}

function round4(n: number | undefined | null): number | undefined {
  if (n == null) return undefined;
  return Math.round(n * 10000) / 10000;
}

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().trim();
}

// ---------------------------------------------------------------------------
// Fallback builders for invalid/unknown tickers
// ---------------------------------------------------------------------------

function buildFallbackProfile(symbol: string): AssetProfile {
  return {
    symbol: normalizeSymbol(symbol),
    name: symbol.toUpperCase(),
    type: "STOCK",
    exchange: undefined,
    currency: "USD",
    sector: undefined,
    industry: undefined,
    marketCap: undefined,
    description: undefined,
  };
}

function buildFallbackQuote(symbol: string): LatestQuote {
  return {
    symbol: normalizeSymbol(symbol),
    price: 0,
    change: 0,
    changePercent: 0,
    previousClose: undefined,
    open: undefined,
    high: undefined,
    low: undefined,
    volume: undefined,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

function isNotFoundError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("not found") ||
      msg.includes("no data") ||
      msg.includes("symbol") ||
      msg.includes("404")
    );
  }
  return false;
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("rate") || msg.includes("429") || msg.includes("too many");
  }
  return false;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

// Yahoo Finance client type - we define a minimal interface for what we use
interface YahooFinanceClient {
  quoteSummary(symbol: string, options: { modules: string[] }): Promise<YFQuoteSummaryResult>;
  quote(symbol: string): Promise<YFQuote | null>;
  chart(symbol: string, options: { period1: Date; period2: Date; interval: string }): Promise<YFChartResult>;
}

export class YahooFinanceProvider implements IMarketDataProvider {
  readonly name = "yahoo-finance";

  private _yf: YahooFinanceClient | null = null;

  private async getYF(): Promise<YahooFinanceClient> {
    if (!this._yf) {
      // webpackIgnore: leave for Node require(); bundling pulls in `net` via @deno/shim-deno
      const yfModule = await import(/* webpackIgnore: true */ "yahoo-finance2");
      // yahoo-finance2 v2.x requires instantiation with new YahooFinance()
      // Check if it's the new API (class-based) or old API (direct default export)
      const YahooFinance = yfModule.default;
      if (typeof YahooFinance === "function" && YahooFinance.prototype) {
        // New API: instantiate the class
        this._yf = new (YahooFinance as new () => YahooFinanceClient)();
      } else {
        // Old API: use default export directly
        this._yf = YahooFinance as unknown as YahooFinanceClient;
      }
    }
    return this._yf;
  }

  async getAssetProfile(symbol: string): Promise<AssetProfile> {
    const normalized = normalizeSymbol(symbol);
    const cacheKey = `profile:${normalized}`;

    return profileCache.getOrSet(cacheKey, async () => {
      try {
        const yf = await this.getYF();
        const result: YFQuoteSummaryResult = await yf.quoteSummary(normalized, {
          modules: ["price", "summaryProfile", "assetProfile"],
        });

        const price = result.price;
        const profile = result.assetProfile ?? result.summaryProfile;

        return {
          symbol: normalized,
          name: price?.shortName ?? price?.longName ?? normalized,
          type: mapQuoteType(price?.quoteType),
          exchange: price?.exchange ?? price?.exchangeName,
          currency: price?.currency ?? "USD",
          sector: profile?.sector,
          industry: profile?.industry,
          marketCap: price?.marketCap,
          description: profile?.longBusinessSummary?.slice(0, 500),
        };
      } catch (err) {
        if (isNotFoundError(err)) {
          console.warn(`[yahoo] Ticker not found: ${normalized}, using fallback`);
          return buildFallbackProfile(normalized);
        }
        if (isRateLimitError(err)) {
          console.error(`[yahoo] Rate limit hit for ${normalized}`);
          throw err;
        }
        console.warn(`[yahoo] Profile fetch failed for ${normalized}:`, err);
        return buildFallbackProfile(normalized);
      }
    });
  }

  async getLatestQuote(symbol: string): Promise<LatestQuote> {
    const normalized = normalizeSymbol(symbol);
    const cacheKey = `quote:${normalized}`;
    const cached = quoteCache.get(cacheKey);
    if (cached && cached.price > 0) return cached;

    const quote = await this.resolveQuote(normalized);
    if (quote.price > 0) {
      quoteCache.set(cacheKey, quote, 2 * 60 * 1000);
    }
    return quote;
  }

  private async resolveQuote(normalized: string): Promise<LatestQuote> {
    // On Vercel, yahoo-finance2 is often blocked or too slow. Hit HTTP first.
    if (process.env.VERCEL === "1") {
      const http = await fetchHttpQuote(normalized);
      if (http && http.price > 0) return http;
    }

    const fromLib = await this.quoteFromYahooLib(normalized);
    if (fromLib && fromLib.price > 0) return fromLib;

    const http = await fetchHttpQuote(normalized);
    if (http && http.price > 0) return http;

    console.warn(`[yahoo] No quote data for ${normalized}, using fallback`);
    return buildFallbackQuote(normalized);
  }

  private async quoteFromYahooLib(normalized: string): Promise<LatestQuote | null> {
    try {
      const yf = await this.getYF();
      const quote: YFQuote | null = await yf.quote(normalized);
      if (!quote || quote.regularMarketPrice == null) return null;

      const price = quote.regularMarketPrice;
      if (!(price > 0)) return null;
      const prevClose = quote.regularMarketPreviousClose ?? quote.previousClose;
      const change = quote.regularMarketChange ?? (prevClose ? price - prevClose : 0);
      const changePercent =
        quote.regularMarketChangePercent ??
        (prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0);

      return {
        symbol: normalized,
        price: round4(price) ?? 0,
        change: round4(change) ?? 0,
        changePercent: round4(changePercent) ?? 0,
        previousClose: round4(prevClose),
        open: round4(quote.regularMarketOpen),
        high: round4(quote.regularMarketDayHigh),
        low: round4(quote.regularMarketDayLow),
        volume: quote.regularMarketVolume,
        timestamp: quote.regularMarketTime ?? new Date(),
      };
    } catch (err) {
      if (isRateLimitError(err)) {
        console.error(`[yahoo] Rate limit hit for ${normalized}`);
        throw err;
      }
      console.warn(
        `[yahoo] Library quote failed for ${normalized}:`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async getHistoricalPrices(
    symbol: string,
    range: HistoricalRange,
  ): Promise<HistoricalPricePoint[]> {
    const normalized = normalizeSymbol(symbol);
    const cacheKey = `history:${normalized}:${range}`;

    return historyCache.getOrSet(cacheKey, async () => {
      if (process.env.VERCEL === "1") {
        const http = await fetchHttpHistory(normalized, range);
        if (http.length > 0) return http;
      }

      try {
        const yf = await this.getYF();
        const days = rangeToDays(range);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const result: YFChartResult = await yf.chart(normalized, {
          period1: startDate,
          period2: new Date(),
          interval: "1d",
        });

        if (result.quotes && result.quotes.length > 0) {
          return result.quotes
            .filter((q) => q.close != null && q.date != null)
            .map((q) => ({
              date: q.date!.toISOString().slice(0, 10),
              close: round4(q.close!) ?? 0,
              open: round4(q.open),
              high: round4(q.high),
              low: round4(q.low),
              volume: q.volume,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }
      } catch (err) {
        if (isRateLimitError(err)) {
          console.error(`[yahoo] Rate limit hit for ${normalized}`);
          throw err;
        }
        console.warn(
          `[yahoo] Library history failed for ${normalized}:`,
          err instanceof Error ? err.message : err,
        );
      }

      const http = await fetchHttpHistory(normalized, range);
      if (http.length > 0) return http;
      console.warn(`[yahoo] No historical data for ${normalized}`);
      return [];
    });
  }
}
