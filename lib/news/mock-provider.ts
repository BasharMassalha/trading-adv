/**
 * Mock news provider for development and testing.
 *
 * Returns realistic mock news data for common tickers.
 * Useful when no NEWS_API_KEY is configured.
 */

import type {
  INewsProvider,
  NewsItem,
  NewsQueryOptions,
  NewsQueryResult,
} from "./types";

// ---------------------------------------------------------------------------
// Mock news data by ticker
// ---------------------------------------------------------------------------

const MOCK_NEWS: Record<string, NewsItem[]> = {
  AAPL: [
    {
      headline: "Apple Reports Strong iPhone Sales in Latest Quarter",
      summary:
        "Apple Inc. reported better-than-expected iPhone sales, driven by strong demand in emerging markets. Services revenue also grew, offsetting concerns about hardware saturation.",
      source: "Reuters",
      publishedAt: getRecentDate(1),
      category: "earnings",
      sentiment: "positive",
    },
    {
      headline: "Apple Expands AI Features Across Product Line",
      summary:
        "The tech giant announced expanded AI capabilities for its devices, including enhanced Siri and on-device processing. Analysts see this as a competitive response to industry trends.",
      source: "Bloomberg",
      publishedAt: getRecentDate(3),
      category: "product",
      sentiment: "positive",
    },
  ],
  MSFT: [
    {
      headline: "Microsoft Azure Growth Continues to Impress",
      summary:
        "Microsoft's cloud platform Azure showed 29% year-over-year growth, beating analyst estimates. Enterprise adoption of AI services contributed significantly to the results.",
      source: "CNBC",
      publishedAt: getRecentDate(2),
      category: "earnings",
      sentiment: "positive",
    },
    {
      headline: "Microsoft Announces New Enterprise AI Partnerships",
      summary:
        "The company revealed strategic partnerships with major enterprises for AI integration. These deals are expected to drive continued growth in the cloud and AI segments.",
      source: "TechCrunch",
      publishedAt: getRecentDate(5),
      category: "business",
      sentiment: "positive",
    },
  ],
  NVDA: [
    {
      headline: "NVIDIA Data Center Revenue Hits Record High",
      summary:
        "NVIDIA reported record data center revenue driven by AI chip demand. The company continues to dominate the AI accelerator market with its H100 and newer chips.",
      source: "MarketWatch",
      publishedAt: getRecentDate(1),
      category: "earnings",
      sentiment: "positive",
    },
    {
      headline: "Analysts Raise NVIDIA Price Targets on AI Momentum",
      summary:
        "Multiple Wall Street analysts raised price targets for NVIDIA, citing sustained AI infrastructure spending. Some caution that valuations are stretched.",
      source: "Barron's",
      publishedAt: getRecentDate(4),
      category: "analyst",
      sentiment: "positive",
    },
  ],
  TSLA: [
    {
      headline: "Tesla Faces Increased EV Competition in Key Markets",
      summary:
        "Tesla is seeing intensified competition from both legacy automakers and new EV entrants. Price cuts have helped maintain volume but pressured margins.",
      source: "Financial Times",
      publishedAt: getRecentDate(2),
      category: "industry",
      sentiment: "neutral",
    },
    {
      headline: "Tesla Cybertruck Production Ramps Up",
      summary:
        "The company is scaling Cybertruck production at its Texas facility. Delivery timelines are improving but supply chain challenges remain.",
      source: "Electrek",
      publishedAt: getRecentDate(6),
      category: "product",
      sentiment: "positive",
    },
  ],
  GOOGL: [
    {
      headline: "Google Search Revenue Shows Resilience Despite AI Concerns",
      summary:
        "Alphabet reported stable search advertising revenue, alleviating fears that AI chatbots would erode its core business. YouTube also showed strong growth.",
      source: "Wall Street Journal",
      publishedAt: getRecentDate(3),
      category: "earnings",
      sentiment: "positive",
    },
  ],
  AMZN: [
    {
      headline: "Amazon AWS Maintains Cloud Market Leadership",
      summary:
        "Amazon Web Services continues to lead the cloud market despite strong competition. The company is investing heavily in AI capabilities to defend its position.",
      source: "Forbes",
      publishedAt: getRecentDate(2),
      category: "business",
      sentiment: "positive",
    },
  ],
  META: [
    {
      headline: "Meta's AI Investments Show Early Revenue Returns",
      summary:
        "Meta reported that AI-driven content recommendations are improving user engagement and ad performance. The company's efficiency initiatives also continued to pay off.",
      source: "Bloomberg",
      publishedAt: getRecentDate(4),
      category: "earnings",
      sentiment: "positive",
    },
  ],
  VOO: [
    {
      headline: "S&P 500 ETFs See Strong Inflows Amid Market Rally",
      summary:
        "Broad market ETFs like VOO continue to attract investor capital as the index reaches new highs. Passive investing flows remain a dominant market force.",
      source: "ETF.com",
      publishedAt: getRecentDate(1),
      category: "market",
      sentiment: "neutral",
    },
  ],
  SCHD: [
    {
      headline: "Dividend ETFs Gain Attention as Rate Outlook Shifts",
      summary:
        "High-quality dividend ETFs like SCHD are seeing renewed interest as investors seek yield and defensive positioning. The fund's value tilt provides some downside protection.",
      source: "Morningstar",
      publishedAt: getRecentDate(5),
      category: "market",
      sentiment: "neutral",
    },
  ],
  BTC: [
    {
      headline: "Bitcoin Volatility Continues Amid Regulatory Uncertainty",
      summary:
        "Bitcoin prices remain volatile as global regulatory frameworks evolve. Institutional adoption continues but faces headwinds from compliance concerns.",
      source: "CoinDesk",
      publishedAt: getRecentDate(1),
      category: "crypto",
      sentiment: "neutral",
    },
  ],
  ETH: [
    {
      headline: "Ethereum Network Activity Increases on DeFi Revival",
      summary:
        "Ethereum transaction volumes have picked up as DeFi protocols see renewed activity. Gas fees remain manageable following recent protocol upgrades.",
      source: "The Block",
      publishedAt: getRecentDate(2),
      category: "crypto",
      sentiment: "positive",
    },
  ],
};

// Default mock news for unknown tickers
const DEFAULT_NEWS: NewsItem[] = [
  {
    headline: "Markets React to Economic Data",
    summary:
      "Equity markets showed mixed performance as investors digested recent economic indicators. Analysts remain cautiously optimistic about near-term prospects.",
    source: "Reuters",
    publishedAt: getRecentDate(1),
    category: "market",
    sentiment: "neutral",
  },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getRecentDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Mock provider implementation
// ---------------------------------------------------------------------------

export class MockNewsProvider implements INewsProvider {
  readonly name = "mock-news-v1";

  async getRecentNewsForTicker(
    ticker: string,
    options?: NewsQueryOptions,
  ): Promise<NewsQueryResult> {
    // Simulate API delay
    await delay(100 + Math.random() * 200);

    const normalizedTicker = ticker.toUpperCase().trim();
    const limit = options?.limit ?? 5;

    // Get mock news or default
    let articles = MOCK_NEWS[normalizedTicker] ?? DEFAULT_NEWS;

    // Add ticker to each article
    articles = articles.map((a) => ({
      ...a,
      ticker: normalizedTicker,
    }));

    // Apply limit
    articles = articles.slice(0, limit);

    const warnings: string[] = [];
    if (!MOCK_NEWS[normalizedTicker]) {
      warnings.push(`No specific news available for ${normalizedTicker} (using general market news)`);
    }

    console.info(`[news:mock] Fetched ${articles.length} articles for ${normalizedTicker}`);

    return {
      ticker: normalizedTicker,
      articles,
      warnings,
      success: true,
      provider: this.name,
    };
  }

  async getRecentNewsForTickers(
    tickers: string[],
    options?: NewsQueryOptions,
  ): Promise<NewsQueryResult[]> {
    const results: NewsQueryResult[] = [];

    for (const ticker of tickers) {
      const result = await this.getRecentNewsForTicker(ticker, options);
      results.push(result);
    }

    return results;
  }
}
