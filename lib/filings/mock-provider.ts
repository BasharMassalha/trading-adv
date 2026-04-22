/**
 * Mock filings provider for development and testing.
 *
 * Returns realistic mock SEC filing data for common tickers.
 * Useful when SEC API is unavailable or for development.
 */

import type {
  IFilingsProvider,
  FilingItem,
  FilingsQueryOptions,
  FilingsQueryResult,
} from "./types";

// ---------------------------------------------------------------------------
// Mock filings data by ticker
// ---------------------------------------------------------------------------

const MOCK_FILINGS: Record<string, FilingItem[]> = {
  AAPL: [
    {
      filingType: "10-K",
      summary:
        "Apple's FY2024 annual report showed record services revenue of $85B, iPhone revenue stable at $200B. Management highlighted AI integration across products and ongoing supply chain diversification. R&D spending increased 8% YoY.",
      filedAt: getRecentDate(30),
      periodOfReport: "2024-09-28",
      source: "SEC EDGAR",
      cik: "0000320193",
    },
    {
      filingType: "10-Q",
      summary:
        "Q3 2024 quarterly report indicated strong performance in Greater China (+12% YoY). Gross margins improved to 46.2%. Company announced accelerated stock buyback program of $110B.",
      filedAt: getRecentDate(45),
      periodOfReport: "2024-06-29",
      source: "SEC EDGAR",
      cik: "0000320193",
    },
    {
      filingType: "8-K",
      summary:
        "Apple disclosed CFO transition, with new CFO appointment effective January 2025. Board approved quarterly dividend of $0.25 per share.",
      filedAt: getRecentDate(15),
      source: "SEC EDGAR",
      cik: "0000320193",
    },
  ],
  MSFT: [
    {
      filingType: "10-K",
      summary:
        "Microsoft's FY2024 annual report highlighted 29% Azure revenue growth. Total revenue reached $245B. Company increased AI infrastructure investment by $15B. Enterprise cloud adoption accelerating.",
      filedAt: getRecentDate(25),
      periodOfReport: "2024-06-30",
      source: "SEC EDGAR",
      cik: "0000789019",
    },
    {
      filingType: "10-Q",
      summary:
        "Q1 FY2025 showed continued Copilot momentum with 1M+ enterprise subscribers. Gaming revenue up 20% following Activision integration. Operating margins expanded to 44%.",
      filedAt: getRecentDate(50),
      periodOfReport: "2024-09-30",
      source: "SEC EDGAR",
      cik: "0000789019",
    },
  ],
  NVDA: [
    {
      filingType: "10-K",
      summary:
        "NVIDIA's FY2024 annual report showed data center revenue up 217% to $47B. Gaming revenue stable at $10B. Company disclosed supply constraints easing for H100 chips.",
      filedAt: getRecentDate(35),
      periodOfReport: "2024-01-28",
      source: "SEC EDGAR",
      cik: "0001045810",
    },
    {
      filingType: "8-K",
      summary:
        "NVIDIA announced next-generation Blackwell architecture availability. Initial production shipments began Q3 2024. Demand significantly exceeds supply projections.",
      filedAt: getRecentDate(10),
      source: "SEC EDGAR",
      cik: "0001045810",
    },
  ],
  TSLA: [
    {
      filingType: "10-Q",
      summary:
        "Tesla's Q3 2024 report showed vehicle deliveries of 462K units, below guidance. Energy storage deployments reached record 6.9 GWh. Automotive gross margins declined to 17.9%.",
      filedAt: getRecentDate(40),
      periodOfReport: "2024-09-30",
      source: "SEC EDGAR",
      cik: "0001318605",
    },
    {
      filingType: "8-K",
      summary:
        "Tesla disclosed Cybertruck production ramp update. Targeting 125K annual production rate by year-end. Disclosed potential regulatory investigation in Europe.",
      filedAt: getRecentDate(20),
      source: "SEC EDGAR",
      cik: "0001318605",
    },
  ],
  GOOGL: [
    {
      filingType: "10-K",
      summary:
        "Alphabet's 2024 annual report showed Search revenue up 8%. YouTube ads grew 12%. Google Cloud achieved profitability with $1.9B operating income. Company disclosed EU regulatory reserves.",
      filedAt: getRecentDate(28),
      periodOfReport: "2024-12-31",
      source: "SEC EDGAR",
      cik: "0001652044",
    },
    {
      filingType: "10-Q",
      summary:
        "Q3 2024 quarterly results beat estimates. Cloud revenue grew 28% to $11.4B. Company announced $70B buyback authorization. AI search features rolled out to 1B+ users.",
      filedAt: getRecentDate(55),
      periodOfReport: "2024-09-30",
      source: "SEC EDGAR",
      cik: "0001652044",
    },
  ],
  AMZN: [
    {
      filingType: "10-K",
      summary:
        "Amazon's FY2024 report showed AWS revenue growth of 13% to $105B. E-commerce operating margins improved significantly. Company disclosed ongoing FTC antitrust investigation.",
      filedAt: getRecentDate(32),
      periodOfReport: "2024-12-31",
      source: "SEC EDGAR",
      cik: "0001018724",
    },
    {
      filingType: "8-K",
      summary:
        "Amazon announced leadership transition in retail division. Company disclosed $2B investment in AI startup Anthropic. AWS launched new AI services in 12 additional regions.",
      filedAt: getRecentDate(8),
      source: "SEC EDGAR",
      cik: "0001018724",
    },
  ],
  META: [
    {
      filingType: "10-K",
      summary:
        "Meta's 2024 annual report showed family of apps revenue up 21%. Reality Labs losses totaled $16B. Company disclosed AI infrastructure capex of $35B for FY2025.",
      filedAt: getRecentDate(30),
      periodOfReport: "2024-12-31",
      source: "SEC EDGAR",
      cik: "0001326801",
    },
    {
      filingType: "10-Q",
      summary:
        "Q3 2024 results showed Reels engagement up 40%. Ad impressions grew 7%. Company announced 'year of efficiency' delivered $4B in cost savings.",
      filedAt: getRecentDate(48),
      periodOfReport: "2024-09-30",
      source: "SEC EDGAR",
      cik: "0001326801",
    },
  ],
};

// Default mock filing for unknown tickers that are likely U.S. stocks
const DEFAULT_FILING: FilingItem[] = [
  {
    filingType: "10-K",
    summary:
      "Company's annual report disclosed stable operating performance with revenue in line with prior year guidance. Management highlighted focus on operational efficiency and margin improvement.",
    filedAt: getRecentDate(45),
    source: "SEC EDGAR",
  },
];

// Tickers that should return empty (non-U.S. or non-equity)
const UNSUPPORTED_TICKERS = new Set([
  "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", // Crypto
  "VOO", "SPY", "QQQ", "IWM", "SCHD", "VTI", // ETFs (they have different filings)
]);

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getRecentDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Mock provider implementation
// ---------------------------------------------------------------------------

export class MockFilingsProvider implements IFilingsProvider {
  readonly name = "mock-filings-v1";

  async getRecentFilingsForTicker(
    ticker: string,
    options?: FilingsQueryOptions,
  ): Promise<FilingsQueryResult> {
    // Simulate API delay
    await delay(80 + Math.random() * 120);

    const normalizedTicker = ticker.toUpperCase().trim();
    const limit = options?.limit ?? 5;

    // Handle unsupported tickers
    if (UNSUPPORTED_TICKERS.has(normalizedTicker)) {
      return {
        ticker: normalizedTicker,
        filings: [],
        warnings: [`${normalizedTicker} is not a U.S. equity with SEC filings`],
        success: true,
        provider: this.name,
      };
    }

    // Get mock filings or default
    let filings = MOCK_FILINGS[normalizedTicker] ?? DEFAULT_FILING;

    // Add ticker to each filing
    filings = filings.map((f) => ({
      ...f,
      ticker: normalizedTicker,
      companyName: getCompanyName(normalizedTicker),
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${f.cik ?? "0000000000"}&type=${f.filingType}`,
    }));

    // Apply limit
    filings = filings.slice(0, limit);

    const warnings: string[] = [];
    if (!MOCK_FILINGS[normalizedTicker]) {
      warnings.push(`Using generic filing data for ${normalizedTicker}`);
    }

    console.info(`[filings:mock] Fetched ${filings.length} filings for ${normalizedTicker}`);

    return {
      ticker: normalizedTicker,
      filings,
      warnings,
      success: true,
      provider: this.name,
    };
  }

  async getRecentFilingsForTickers(
    tickers: string[],
    options?: FilingsQueryOptions,
  ): Promise<FilingsQueryResult[]> {
    const results: FilingsQueryResult[] = [];

    for (const ticker of tickers) {
      const result = await this.getRecentFilingsForTicker(ticker, options);
      results.push(result);
    }

    return results;
  }
}

function getCompanyName(ticker: string): string {
  const names: Record<string, string> = {
    AAPL: "Apple Inc.",
    MSFT: "Microsoft Corporation",
    NVDA: "NVIDIA Corporation",
    TSLA: "Tesla, Inc.",
    GOOGL: "Alphabet Inc.",
    AMZN: "Amazon.com, Inc.",
    META: "Meta Platforms, Inc.",
  };
  return names[ticker] ?? `${ticker} Inc.`;
}
