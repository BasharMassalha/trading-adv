/**
 * Quote/history fetches that work on Vercel.
 *
 * yahoo-finance2 talks to Yahoo with a cookie/crumb dance and Node-only
 * shims. Datacenter IPs often get nothing back. These are plain HTTPS
 * calls: Yahoo's chart v8 endpoint first, then Finnhub when NEWS_API_KEY
 * or MARKET_DATA_API_KEY is set.
 */

import type { HistoricalPricePoint, HistoricalRange, LatestQuote } from "./types";

const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function round4(n: number | undefined | null): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  return Math.round(n * 10000) / 10000;
}

function finnhubKey(): string | null {
  const key =
    process.env.MARKET_DATA_API_KEY?.trim() ||
    process.env.NEWS_API_KEY?.trim() ||
    "";
  return key.length > 0 ? key : null;
}

async function getJson(
  url: string,
  headers?: Record<string, string>,
): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn(`[quotes] HTTP ${res.status} for ${url.split("?")[0]}`);
      return null;
    }
    return (await res.json()) as unknown;
  } catch (err) {
    console.warn(
      `[quotes] fetch failed for ${url.split("?")[0]}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

type YahooChartResult = {
  meta?: {
    regularMarketPrice?: number;
    previousClose?: number;
    chartPreviousClose?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    shortName?: string;
  };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

function yahooChartUrl(host: string, symbol: string, range: string): string {
  return `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
}

function quoteFromYahooMeta(
  symbol: string,
  meta: NonNullable<YahooChartResult["meta"]>,
): LatestQuote | null {
  const price = meta.regularMarketPrice;
  if (typeof price !== "number" || !(price > 0)) return null;
  const prev =
    meta.previousClose ??
    meta.chartPreviousClose ??
    undefined;
  const change = prev != null ? price - prev : 0;
  const changePercent =
    prev != null && prev > 0 ? ((price - prev) / prev) * 100 : 0;
  return {
    symbol,
    price: round4(price) ?? price,
    change: round4(change) ?? 0,
    changePercent: round4(changePercent) ?? 0,
    previousClose: round4(prev),
    high: round4(meta.regularMarketDayHigh),
    low: round4(meta.regularMarketDayLow),
    volume: meta.regularMarketVolume,
    timestamp: new Date(),
  };
}

export async function fetchYahooHttpQuote(
  symbol: string,
): Promise<LatestQuote | null> {
  const json = (await getJson(
    yahooChartUrl("query1.finance.yahoo.com", symbol, "5d"),
    { "User-Agent": YAHOO_UA },
  )) as { chart?: { result?: YahooChartResult[] } } | null;
  const result = json?.chart?.result?.[0];
  if (!result?.meta) return null;
  return quoteFromYahooMeta(symbol, result.meta);
}

export async function fetchFinnhubQuote(
  symbol: string,
): Promise<LatestQuote | null> {
  const key = finnhubKey();
  if (!key) return null;
  const json = (await getJson(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`,
  )) as {
    c?: number;
    d?: number;
    dp?: number;
    h?: number;
    l?: number;
    o?: number;
    pc?: number;
    t?: number;
  } | null;
  if (!json || typeof json.c !== "number" || !(json.c > 0)) return null;
  return {
    symbol,
    price: round4(json.c) ?? json.c,
    change: round4(json.d) ?? 0,
    changePercent: round4(json.dp) ?? 0,
    previousClose: round4(json.pc),
    open: round4(json.o),
    high: round4(json.h),
    low: round4(json.l),
    timestamp: json.t ? new Date(json.t * 1000) : new Date(),
  };
}

export async function fetchHttpQuote(symbol: string): Promise<LatestQuote | null> {
  const yahoo = await fetchYahooHttpQuote(symbol);
  if (yahoo && yahoo.price > 0) return yahoo;
  return fetchFinnhubQuote(symbol);
}

const RANGE_TO_YAHOO: Record<HistoricalRange, string> = {
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "2Y": "2y",
  "5Y": "5y",
};

export async function fetchYahooHttpHistory(
  symbol: string,
  range: HistoricalRange,
): Promise<HistoricalPricePoint[]> {
  const json = (await getJson(
    yahooChartUrl("query1.finance.yahoo.com", symbol, RANGE_TO_YAHOO[range]),
    {
      "User-Agent": YAHOO_UA,
    },
  )) as { chart?: { result?: YahooChartResult[] } } | null;
  const result = json?.chart?.result?.[0];
  const stamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];
  if (!stamps || !quote?.close) return [];

  const points: HistoricalPricePoint[] = [];
  for (let i = 0; i < stamps.length; i += 1) {
    const close = quote.close[i];
    if (close == null || !Number.isFinite(close)) continue;
    const date = new Date(stamps[i] * 1000).toISOString().slice(0, 10);
    points.push({
      date,
      close: round4(close) ?? close,
      open: round4(quote.open?.[i] ?? undefined),
      high: round4(quote.high?.[i] ?? undefined),
      low: round4(quote.low?.[i] ?? undefined),
      volume: quote.volume?.[i] ?? undefined,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchHttpHistory(
  symbol: string,
  range: HistoricalRange,
): Promise<HistoricalPricePoint[]> {
  return fetchYahooHttpHistory(symbol, range);
}
