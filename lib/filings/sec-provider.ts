/**
 * SEC EDGAR filings provider.
 *
 * Uses the SEC's public EDGAR API to retrieve recent company filings.
 * No API key required - this is public data.
 *
 * API Documentation:
 * - https://www.sec.gov/edgar/sec-api-documentation
 * - https://data.sec.gov/submissions/
 *
 * RATE LIMITS
 * ───────────
 * SEC requests max 10 requests/second. We add delays between requests.
 */

import type {
  IFilingsProvider,
  FilingItem,
  FilingsQueryOptions,
  FilingsQueryResult,
} from "./types";
import { FilingsProviderError, RELEVANT_FILING_TYPES } from "./types";
import { secHeaders } from "@/lib/sec/user-agent";

// ---------------------------------------------------------------------------
// SEC API response types (vendor-specific, isolated here)
// ---------------------------------------------------------------------------

interface SECCompanySubmissions {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

interface SECTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEC_BASE_URL = "https://data.sec.gov";
const MIN_REQUEST_INTERVAL = 150; // ms between requests
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for ticker-to-CIK map

// Filing type summaries based on type
const FILING_TYPE_DESCRIPTIONS: Record<string, string> = {
  "10-K": "Annual report containing comprehensive business and financial information",
  "10-Q": "Quarterly report with unaudited financial statements and operations update",
  "8-K": "Current report disclosing material events or corporate changes",
  "6-K": "Foreign private issuer report on material information",
  "20-F": "Annual report for foreign private issuers",
  "S-1": "Registration statement for new securities offerings",
  "DEF 14A": "Definitive proxy statement for shareholder meetings",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function padCik(cik: string | number): string {
  return String(cik).padStart(10, "0");
}

function formatFilingDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

function createFilingSummary(
  form: string,
  companyName: string,
  filingDate: string,
  reportDate?: string,
  primaryDocDescription?: string,
): string {
  const baseDescription = FILING_TYPE_DESCRIPTIONS[form] ?? `${form} filing`;
  const periodInfo = reportDate ? ` for period ending ${reportDate}` : "";
  const docInfo = primaryDocDescription ? ` (${primaryDocDescription})` : "";

  return `${companyName} filed ${form}${periodInfo}. ${baseDescription}${docInfo}.`;
}

function isRelevantFilingType(form: string): boolean {
  const normalizedForm = form.toUpperCase().trim();
  return RELEVANT_FILING_TYPES.some(
    (type) => normalizedForm === type || normalizedForm.startsWith(type + "/"),
  );
}

// ---------------------------------------------------------------------------
// Ticker to CIK mapping cache
// ---------------------------------------------------------------------------

let tickerToCikMap: Map<string, { cik: string; name: string }> | null = null;
let tickerMapLastFetched = 0;

async function getTickerToCikMap(): Promise<Map<string, { cik: string; name: string }>> {
  const now = Date.now();

  // Return cached map if still valid
  if (tickerToCikMap && now - tickerMapLastFetched < CACHE_TTL) {
    return tickerToCikMap;
  }

  console.info("[filings:sec] Fetching ticker-to-CIK mapping from SEC...");

  try {
    const response = await fetch(
      "https://www.sec.gov/files/company_tickers.json",
      { headers: secHeaders("application/json") },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ticker map: ${response.status}`);
    }

    const data: Record<string, SECTickerEntry> = await response.json();

    tickerToCikMap = new Map();
    for (const entry of Object.values(data)) {
      const ticker = entry.ticker.toUpperCase();
      tickerToCikMap.set(ticker, {
        cik: padCik(entry.cik_str),
        name: entry.title,
      });
    }

    tickerMapLastFetched = now;
    console.info(`[filings:sec] Loaded ${tickerToCikMap.size} ticker mappings`);

    return tickerToCikMap;
  } catch (err) {
    console.error("[filings:sec] Failed to fetch ticker map:", err);

    // Return existing cache if available, even if stale
    if (tickerToCikMap) {
      console.warn("[filings:sec] Using stale ticker cache");
      return tickerToCikMap;
    }

    throw new FilingsProviderError(
      "Failed to load SEC ticker mappings",
      "NETWORK_ERROR",
      err,
    );
  }
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class SECFilingsProvider implements IFilingsProvider {
  readonly name = "sec-edgar";
  private lastRequestTime = 0;

  async getRecentFilingsForTicker(
    ticker: string,
    options?: FilingsQueryOptions,
  ): Promise<FilingsQueryResult> {
    const normalizedTicker = ticker.toUpperCase().trim();
    const limit = options?.limit ?? 5;
    const daysBack = options?.daysBack ?? 90;

    console.info(`[filings:sec] Fetching filings for ${normalizedTicker}`);

    try {
      // Get ticker to CIK mapping
      const tickerMap = await getTickerToCikMap();
      const companyInfo = tickerMap.get(normalizedTicker);

      if (!companyInfo) {
        console.warn(`[filings:sec] Ticker ${normalizedTicker} not found in SEC database`);
        return {
          ticker: normalizedTicker,
          filings: [],
          warnings: [`${normalizedTicker} not found in SEC EDGAR database`],
          success: true,
          provider: this.name,
        };
      }

      // Rate limit protection
      await this.throttle();

      // Fetch company submissions
      const submissionsUrl = `${SEC_BASE_URL}/submissions/CIK${companyInfo.cik}.json`;
      const response = await fetch(submissionsUrl, {
        headers: secHeaders("application/json"),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            ticker: normalizedTicker,
            filings: [],
            warnings: [`No SEC filings found for ${normalizedTicker}`],
            success: true,
            provider: this.name,
          };
        }
        throw new FilingsProviderError(
          `SEC API error: ${response.status}`,
          "PROVIDER_ERROR",
        );
      }

      const submissions: SECCompanySubmissions = await response.json();

      // Filter and process filings
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const filings: FilingItem[] = [];
      const recent = submissions.filings.recent;

      for (let i = 0; i < recent.form.length && filings.length < limit; i++) {
        const form = recent.form[i];
        const filingDate = recent.filingDate[i];
        const reportDate = recent.reportDate[i];

        // Skip non-relevant filing types
        if (!isRelevantFilingType(form)) {
          continue;
        }

        // Skip filings outside date range
        const filingDateObj = new Date(filingDate);
        if (filingDateObj < cutoffDate) {
          continue;
        }

        // Build filing URL
        const accessionNumber = recent.accessionNumber[i].replace(/-/g, "");
        const primaryDoc = recent.primaryDocument[i];
        const filingUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(companyInfo.cik)}/${accessionNumber}/${primaryDoc}`;

        filings.push({
          ticker: normalizedTicker,
          companyName: submissions.name,
          filingType: form,
          summary: createFilingSummary(
            form,
            submissions.name,
            filingDate,
            reportDate,
            recent.primaryDocDescription[i],
          ),
          filedAt: formatFilingDate(filingDate),
          periodOfReport: reportDate || undefined,
          source: "SEC EDGAR",
          url: filingUrl,
          cik: companyInfo.cik,
        });
      }

      const warnings: string[] = [];
      if (filings.length === 0) {
        warnings.push(`No recent filings (last ${daysBack} days) for ${normalizedTicker}`);
      }

      console.info(`[filings:sec] Retrieved ${filings.length} filings for ${normalizedTicker}`);

      return {
        ticker: normalizedTicker,
        filings,
        warnings,
        success: true,
        provider: this.name,
      };
    } catch (err) {
      return this.handleError(err, normalizedTicker);
    }
  }

  async getRecentFilingsForTickers(
    tickers: string[],
    options?: FilingsQueryOptions,
  ): Promise<FilingsQueryResult[]> {
    const results: FilingsQueryResult[] = [];

    for (const ticker of tickers) {
      const result = await this.getRecentFilingsForTicker(ticker, options);
      results.push(result);

      // Extra delay between tickers
      await delay(200);
    }

    return results;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await delay(MIN_REQUEST_INTERVAL - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  private handleError(err: unknown, ticker: string): FilingsQueryResult {
    if (err instanceof FilingsProviderError) {
      console.error(`[filings:sec] Provider error for ${ticker}:`, err.code, err.message);
    } else {
      console.error(`[filings:sec] Error fetching filings for ${ticker}:`, err);
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ticker,
      filings: [],
      warnings: [`Failed to fetch filings for ${ticker}: ${message}`],
      success: false,
      provider: this.name,
    };
  }
}
