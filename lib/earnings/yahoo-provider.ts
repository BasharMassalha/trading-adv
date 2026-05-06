/**
 * Yahoo-finance2 backed earnings provider.
 *
 * Pulls the most recent earnings result and the next scheduled earnings date
 * from Yahoo's `quoteSummary` modules:
 *   - `earningsHistory`: past EPS actual + estimate
 *   - `calendarEvents`: next scheduled earnings date
 *   - `earnings`: revenue + EPS chart data, period labels
 *
 * Data is best-effort: every field is optional. Missing data is not an error
 * — we just leave the field undefined and let the AI / UI handle it.
 */

import { TTLCache } from "@/lib/market-data/cache";
import type { EarningsEvent, IEarningsProvider } from "./types";

const earningsCache = new TTLCache<EarningsEvent | null>(60 * 60 * 1000);

interface YFEarningsHistoryItem {
  epsActual?: { raw?: number } | null;
  epsEstimate?: { raw?: number } | null;
  epsDifference?: { raw?: number } | null;
  surprisePercent?: { raw?: number } | null;
  quarter?: { raw?: number; fmt?: string } | null;
  period?: string;
}

interface YFEarningsHistoryModule {
  history?: YFEarningsHistoryItem[];
}

interface YFCalendarEvents {
  earnings?: {
    earningsDate?: { raw?: number; fmt?: string }[];
    earningsAverage?: { raw?: number };
    earningsLow?: { raw?: number };
    earningsHigh?: { raw?: number };
    revenueAverage?: { raw?: number };
    revenueLow?: { raw?: number };
    revenueHigh?: { raw?: number };
  };
}

interface YFEarningsChartQuarterly {
  date?: string;
  actual?: { raw?: number; fmt?: string };
  estimate?: { raw?: number; fmt?: string };
}

interface YFEarningsModule {
  earningsChart?: {
    quarterly?: YFEarningsChartQuarterly[];
    currentQuarterEstimate?: { raw?: number };
    currentQuarterEstimateDate?: string;
    currentQuarterEstimateYear?: number;
  };
  financialsChart?: {
    quarterly?: { date?: string; revenue?: { raw?: number }; earnings?: { raw?: number } }[];
    yearly?: { date?: number | string; revenue?: { raw?: number }; earnings?: { raw?: number } }[];
  };
}

interface YFEarningsSummary {
  earnings?: YFEarningsModule;
  earningsHistory?: YFEarningsHistoryModule;
  calendarEvents?: YFCalendarEvents;
}

interface YahooFinanceClient {
  quoteSummary(
    symbol: string,
    options: { modules: string[] },
  ): Promise<YFEarningsSummary>;
}

function toIso(epoch?: number): string | undefined {
  if (!epoch || !Number.isFinite(epoch)) return undefined;
  // yahoo-finance2 returns seconds; convert to ms when small, else assume ms.
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  try {
    return new Date(ms).toISOString();
  } catch {
    return undefined;
  }
}

function classifySurprise(
  actual?: number,
  estimate?: number,
): { surprisePct?: number; label?: "BEAT" | "MET" | "MISSED" } {
  if (actual == null || estimate == null) return {};
  if (Math.abs(estimate) < 1e-9) {
    return { surprisePct: undefined, label: actual >= 0 ? "MET" : "MISSED" };
  }
  const pct = ((actual - estimate) / Math.abs(estimate)) * 100;
  let label: "BEAT" | "MET" | "MISSED";
  if (pct > 1.5) label = "BEAT";
  else if (pct < -1.5) label = "MISSED";
  else label = "MET";
  return { surprisePct: Math.round(pct * 10) / 10, label };
}

function periodLabel(d?: string): string | undefined {
  if (!d) return undefined;
  try {
    const date = new Date(d);
    const m = date.getUTCMonth();
    const y = date.getUTCFullYear();
    const q = Math.floor(m / 3) + 1;
    return `Q${q} ${y}`;
  } catch {
    return undefined;
  }
}

export class YahooEarningsProvider implements IEarningsProvider {
  readonly name = "yahoo-earnings";
  private _yf: YahooFinanceClient | null = null;

  private async getYF(): Promise<YahooFinanceClient> {
    if (!this._yf) {
      const yfModule = await import("yahoo-finance2");
      const YahooFinance = yfModule.default;
      if (typeof YahooFinance === "function" && (YahooFinance as { prototype?: unknown }).prototype) {
        this._yf = new (YahooFinance as new () => YahooFinanceClient)();
      } else {
        this._yf = YahooFinance as unknown as YahooFinanceClient;
      }
    }
    return this._yf;
  }

  async getEarningsForTicker(ticker: string): Promise<EarningsEvent | null> {
    const t = ticker.toUpperCase().trim();
    if (!t) return null;
    const cacheKey = `earnings:${t}`;

    return earningsCache.getOrSet(cacheKey, async () => {
      try {
        const yf = await this.getYF();
        const result: YFEarningsSummary = await yf.quoteSummary(t, {
          modules: ["earnings", "earningsHistory", "calendarEvents"],
        });

        const warnings: string[] = [];

        const historyItems = result.earningsHistory?.history ?? [];
        const last = historyItems[historyItems.length - 1];
        const epsActual = last?.epsActual?.raw;
        const epsEstimate = last?.epsEstimate?.raw;
        const surprise = classifySurprise(epsActual, epsEstimate);

        const quarterly = result.earnings?.earningsChart?.quarterly ?? [];
        const lastQuarter = quarterly[quarterly.length - 1];
        const lastReportDate = lastQuarter?.date
          ? `${lastQuarter.date}T00:00:00Z`
          : undefined;
        const lastReportPeriod =
          (typeof lastQuarter?.date === "string" && /^\d{4}/.test(lastQuarter.date)
            ? lastQuarter.date
            : undefined) ?? periodLabel(lastReportDate);

        const calEarnings = result.calendarEvents?.earnings;
        const calDates = calEarnings?.earningsDate ?? [];
        const nextReportDate = toIso(calDates[0]?.raw);
        const epsEstimateNext = calEarnings?.earningsAverage?.raw;
        const revenueEstimateNext = calEarnings?.revenueAverage?.raw;

        const financials = result.earnings?.financialsChart?.quarterly ?? [];
        const lastFin = financials[financials.length - 1];
        const revenueActual = lastFin?.revenue?.raw;

        if (epsActual == null && nextReportDate == null) {
          warnings.push("No earnings data available from Yahoo for this symbol.");
        }

        const event: EarningsEvent = {
          ticker: t,
          lastReportDate,
          lastReportPeriod: lastReportPeriod ?? periodLabel(lastReportDate),
          epsActual,
          epsEstimate,
          surprisePct: surprise.surprisePct,
          surpriseLabel: surprise.label ?? (epsActual == null ? "UNKNOWN" : undefined),
          revenueActual,
          revenueEstimate: revenueEstimateNext,
          nextReportDate,
          source: this.name,
          warnings: warnings.length > 0 ? warnings : undefined,
        };

        return event;
      } catch (err) {
        console.warn(`[earnings:yahoo] Failed for ${t}:`, err instanceof Error ? err.message : err);
        return null;
      }
    });
  }
}
