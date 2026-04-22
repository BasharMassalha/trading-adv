/**
 * Mock market-data provider.
 *
 * Serves realistic static profiles + deterministic seeded price histories for
 * well-known tickers. Falls back gracefully for unknown symbols.
 *
 * HOW TO ADD A REAL PROVIDER
 * ──────────────────────────
 * 1. Create `lib/market-data/polygon-provider.ts` (or similar).
 * 2. Implement `IMarketDataProvider`.
 * 3. In `lib/market-data/provider.ts`, import it and return it when the
 *    `MARKET_DATA_PROVIDER` env-var is set to "polygon".
 */

import type {
  AssetProfile,
  HistoricalPricePoint,
  HistoricalRange,
  IMarketDataProvider,
  LatestQuote,
} from "./types";

// ---------------------------------------------------------------------------
// Ticker catalogue
// ---------------------------------------------------------------------------

type TickerEntry = AssetProfile & {
  price: number;
  change: number;
  changePercent: number;
  dailyVolatility: number; // fraction, e.g. 0.02 = 2 %
};

const CATALOGUE: Record<string, TickerEntry> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    type: "STOCK",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Technology",
    industry: "Consumer Electronics",
    marketCap: 2_900_000_000_000,
    description: "Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories.",
    price: 189.45,
    change: 1.85,
    changePercent: 0.99,
    dailyVolatility: 0.018,
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    type: "STOCK",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Technology",
    industry: "Software—Infrastructure",
    marketCap: 3_100_000_000_000,
    description: "Microsoft develops, licenses, and supports a wide range of software products, services, and devices.",
    price: 415.70,
    change: 3.22,
    changePercent: 0.78,
    dailyVolatility: 0.016,
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    type: "STOCK",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Technology",
    industry: "Semiconductors",
    marketCap: 2_150_000_000_000,
    description: "NVIDIA designs graphics processing units (GPUs) for the gaming and professional markets, as well as system-on-chip units.",
    price: 875.30,
    change: 18.40,
    changePercent: 2.15,
    dailyVolatility: 0.032,
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    type: "STOCK",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Consumer Discretionary",
    industry: "Auto Manufacturers",
    marketCap: 570_000_000_000,
    description: "Tesla designs, develops, manufactures, and sells electric vehicles and energy generation and storage systems.",
    price: 178.20,
    change: -4.80,
    changePercent: -2.62,
    dailyVolatility: 0.035,
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc. Class A",
    type: "STOCK",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Communication Services",
    industry: "Internet Content & Information",
    marketCap: 2_050_000_000_000,
    description: "Alphabet is a holding company whose subsidiaries include Google, which provides internet-related services and products.",
    price: 165.10,
    change: 1.20,
    changePercent: 0.73,
    dailyVolatility: 0.019,
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com, Inc.",
    type: "STOCK",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Consumer Discretionary",
    industry: "Internet Retail",
    marketCap: 1_920_000_000_000,
    description: "Amazon engages in the retail sale of consumer products, online marketplace, AWS cloud services, and advertising.",
    price: 185.90,
    change: 2.35,
    changePercent: 1.28,
    dailyVolatility: 0.022,
  },
  JPM: {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    type: "STOCK",
    exchange: "NYSE",
    currency: "USD",
    sector: "Financials",
    industry: "Banks—Diversified",
    marketCap: 575_000_000_000,
    description: "JPMorgan Chase provides financial and banking services globally, including investment banking and asset management.",
    price: 198.80,
    change: 1.40,
    changePercent: 0.71,
    dailyVolatility: 0.014,
  },
  V: {
    symbol: "V",
    name: "Visa Inc.",
    type: "STOCK",
    exchange: "NYSE",
    currency: "USD",
    sector: "Financials",
    industry: "Credit Services",
    marketCap: 575_000_000_000,
    description: "Visa operates the world's largest retail electronic payments network, facilitating payment transactions globally.",
    price: 275.40,
    change: 0.80,
    changePercent: 0.29,
    dailyVolatility: 0.012,
  },
  VOO: {
    symbol: "VOO",
    name: "Vanguard S&P 500 ETF",
    type: "ETF",
    exchange: "NYSE Arca",
    currency: "USD",
    sector: "Broad Market",
    industry: "Large Blend ETF",
    marketCap: undefined,
    description: "Tracks the S&P 500 Index, providing broad exposure to U.S. large-cap equities.",
    price: 475.20,
    change: 2.10,
    changePercent: 0.44,
    dailyVolatility: 0.011,
  },
  SCHD: {
    symbol: "SCHD",
    name: "Schwab U.S. Dividend Equity ETF",
    type: "ETF",
    exchange: "NYSE Arca",
    currency: "USD",
    sector: "Dividend",
    industry: "Large Value ETF",
    marketCap: undefined,
    description: "Tracks an index of high-dividend-yielding U.S. equities selected for consistent dividend payments.",
    price: 78.35,
    change: 0.20,
    changePercent: 0.26,
    dailyVolatility: 0.009,
  },
  SPY: {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    type: "ETF",
    exchange: "NYSE Arca",
    currency: "USD",
    sector: "Broad Market",
    industry: "Large Blend ETF",
    marketCap: undefined,
    description: "One of the most heavily traded ETFs, designed to track the S&P 500.",
    price: 516.20,
    change: 2.30,
    changePercent: 0.45,
    dailyVolatility: 0.011,
  },
  QQQ: {
    symbol: "QQQ",
    name: "Invesco QQQ Trust Series 1",
    type: "ETF",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Technology",
    industry: "Large Growth ETF",
    marketCap: undefined,
    description: "Tracks the Nasdaq-100 Index, heavily weighted toward large-cap technology companies.",
    price: 434.80,
    change: 5.10,
    changePercent: 1.19,
    dailyVolatility: 0.018,
  },
  "BTC-USD": {
    symbol: "BTC-USD",
    name: "Bitcoin USD",
    type: "CRYPTO",
    exchange: "CRYPTO",
    currency: "USD",
    sector: "Cryptocurrency",
    industry: "Digital Assets",
    marketCap: 1_320_000_000_000,
    description: "Bitcoin is a decentralized digital currency, created in 2009 by the pseudonymous Satoshi Nakamoto.",
    price: 67_200,
    change: -1_240,
    changePercent: -1.81,
    dailyVolatility: 0.045,
  },
  "ETH-USD": {
    symbol: "ETH-USD",
    name: "Ethereum USD",
    type: "CRYPTO",
    exchange: "CRYPTO",
    currency: "USD",
    sector: "Cryptocurrency",
    industry: "Digital Assets",
    marketCap: 415_000_000_000,
    description: "Ethereum is a decentralized platform enabling smart contracts and decentralized applications.",
    price: 3_450,
    change: -85,
    changePercent: -2.41,
    dailyVolatility: 0.05,
  },
};

// ---------------------------------------------------------------------------
// Deterministic seeded price-history generator
// ---------------------------------------------------------------------------

/** Deterministic hash of a string → positive 32-bit integer. */
function hashString(s: string): number {
  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Returns a function that yields pseudo-random numbers in [0, 1). */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4_294_967_296;
  };
}

/** Build a date string "YYYY-MM-DD" for `daysAgo` days before today. */
function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Total calendar days for each range. */
const RANGE_DAYS: Record<HistoricalRange, number> = {
  "1M": 31,
  "3M": 92,
  "6M": 182,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
};

/**
 * Generate a synthetic but deterministic daily price history.
 *
 * We generate going *backwards* from `currentPrice` so the last point always
 * lands at approximately the correct current price.
 */
function generateHistory(
  symbol: string,
  currentPrice: number,
  days: number,
  dailyVolatility: number,
): HistoricalPricePoint[] {
  const rng = seededRng(hashString(symbol));
  const points: HistoricalPricePoint[] = [];
  let close = currentPrice;

  for (let i = 0; i < days; i++) {
    // Reverse random walk: work backwards from today
    const dailyReturn = (rng() - 0.48) * 2 * dailyVolatility; // slight upward drift
    const prevClose = close / (1 + dailyReturn);

    const open = prevClose * (1 + (rng() - 0.5) * dailyVolatility * 0.5);
    const noise = rng() * dailyVolatility * 0.8;
    const high = Math.max(open, close) * (1 + noise);
    const low = Math.min(open, close) * (1 - noise);
    const volume = Math.round(500_000 + rng() * 80_000_000);

    points.unshift({
      date: isoDateDaysAgo(i),
      close: round4(close),
      open: round4(open),
      high: round4(high),
      low: round4(low),
      volume,
    });

    close = prevClose;
  }

  return points;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Build a fallback profile for unknown tickers. */
function buildFallbackProfile(symbol: string): TickerEntry {
  const seedPrice = 50 + (hashString(symbol) % 200);
  return {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
    type: "STOCK",
    exchange: "UNKNOWN",
    currency: "USD",
    sector: "Unknown",
    industry: "Unknown",
    marketCap: undefined,
    description: undefined,
    price: seedPrice,
    change: 0,
    changePercent: 0,
    dailyVolatility: 0.02,
  };
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class MockMarketDataProvider implements IMarketDataProvider {
  readonly name = "mock";

  private getEntry(symbol: string): TickerEntry {
    const upper = symbol.toUpperCase();
    return CATALOGUE[upper] ?? buildFallbackProfile(upper);
  }

  async getAssetProfile(symbol: string): Promise<AssetProfile> {
    const { price: _p, change: _c, changePercent: _cp, dailyVolatility: _dv, ...profile } =
      this.getEntry(symbol);
    return profile;
  }

  async getLatestQuote(symbol: string): Promise<LatestQuote> {
    const entry = this.getEntry(symbol);
    return {
      symbol: entry.symbol,
      price: entry.price,
      change: entry.change,
      changePercent: entry.changePercent,
      previousClose: round4(entry.price - entry.change),
      open: round4(entry.price * (1 + (Math.random() - 0.5) * 0.005)),
      high: round4(entry.price * 1.008),
      low: round4(entry.price * 0.993),
      volume: Math.round(5_000_000 + Math.random() * 50_000_000),
      timestamp: new Date(),
    };
  }

  async getHistoricalPrices(
    symbol: string,
    range: HistoricalRange,
  ): Promise<HistoricalPricePoint[]> {
    const entry = this.getEntry(symbol);
    const days = RANGE_DAYS[range];
    return generateHistory(symbol, entry.price, days, entry.dailyVolatility);
  }
}
