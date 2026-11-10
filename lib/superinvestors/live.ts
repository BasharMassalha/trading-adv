import { unstable_cache } from "next/cache";
import { resolveCusipsToTickers } from "./cusip-ticker";
import {
  fetch13FByRef,
  fetchLatest13FBundle,
  format13FQuarter,
  type Sec13FFiling,
  type Sec13FFilingRef,
  type Sec13FLatestBundle,
} from "./sec-13f";
import {
  SUPERINVESTOR_PROFILES,
  getProfileById,
  type SuperinvestorProfile,
} from "./profiles";
import {
  annotateConsensusChanges,
  computeConsensus,
  investorsWithPriorBooks,
} from "./consensus";
import { assessFilingFreshness } from "./freshness";
import type {
  HoldingsChangeSummary,
  Superinvestor,
  SuperinvestorPosition,
  SuperinvestorsSnapshot,
} from "./types";

const TOP_LONGS = 40;

export const SUPERINVESTORS_DISCLAIMER =
  "All positions shown are parsed from the latest SEC Form 13F-HR on EDGAR for each filer’s CIK. 13F covers reported long U.S. equities and listed options only, with roughly a 45-day lag. Put options disclosed in the filing appear under shorts; most hedge-fund short books are not in 13F. No fabricated holdings, strategies, or market statements are shown. Not investment advice.";

type Cached13F = Sec13FLatestBundle & {
  fetchedAt: string;
};

const cachedFetch13F = unstable_cache(
  async (cik: string): Promise<Cached13F> => {
    const bundle = await fetchLatest13FBundle(cik);
    return { ...bundle, fetchedAt: new Date().toISOString() };
  },
  ["superinvestor-13f-v4"],
  { revalidate: 60 * 60 * 12 },
);

const cachedFetchPrior13F = unstable_cache(
  async (cik: string, accessionNumber: string, filingDate: string, reportDate: string, form: string) => {
    const ref: Sec13FFilingRef = {
      accessionNumber,
      filingDate,
      reportDate,
      form,
    };
    return fetch13FByRef(cik, ref);
  },
  ["superinvestor-13f-prior-v1"],
  { revalidate: 60 * 60 * 12 },
);

function selectHoldingsForDisplay(filing: Sec13FFiling) {
  const puts = filing.holdings.filter((h) => h.putCall === "Put");
  const calls = filing.holdings.filter((h) => h.putCall === "Call");
  const equity = filing.holdings.filter((h) => h.putCall == null);

  return {
    selected: [
      ...equity.slice(0, TOP_LONGS),
      ...calls.slice(0, 15),
      ...puts.slice(0, TOP_LONGS),
    ],
    puts,
    calls,
    equity,
  };
}

function filingToPositions(
  filing: Sec13FFiling,
  tickers: Map<string, string | null>,
): { longs: SuperinvestorPosition[]; shorts: SuperinvestorPosition[] } {
  const total = filing.totalValueUsd || 1;
  const { equity, calls, puts } = selectHoldingsForDisplay(filing);
  const longs: SuperinvestorPosition[] = [];
  const shorts: SuperinvestorPosition[] = [];

  const toPos = (
    h: (typeof filing.holdings)[number],
    side: "long" | "short",
    note?: string,
  ): SuperinvestorPosition => {
    const ticker = tickers.get(h.cusip) ?? null;
    return {
      ticker: ticker ?? h.cusip,
      name: h.issuerName,
      weightPct: (h.valueUsd / total) * 100,
      side,
      note,
      concrete: Boolean(ticker),
      cusip: h.cusip,
      valueUsd: h.valueUsd,
      shares: h.shares,
    };
  };

  for (const h of equity.slice(0, TOP_LONGS)) {
    longs.push(toPos(h, "long"));
  }
  for (const h of calls.slice(0, 15)) {
    longs.push(toPos(h, "long", "13F Call option"));
  }
  for (const h of puts.slice(0, TOP_LONGS)) {
    shorts.push(toPos(h, "short", "13F Put option"));
  }

  longs.sort((a, b) => b.weightPct - a.weightPct);
  shorts.sort((a, b) => b.weightPct - a.weightPct);
  return { longs, shorts };
}

/** Equity + call CUSIPs only — puts are tracked separately as shorts. */
function longBookKeys(filing: Sec13FFiling): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of filing.holdings) {
    if (h.putCall === "Put") continue;
    map.set(h.cusip, h.issuerName);
  }
  return map;
}

function summarizeHoldingsChange(
  current: Sec13FFiling,
  previous: Sec13FFiling,
  tickers: Map<string, string | null>,
): HoldingsChangeSummary {
  const cur = longBookKeys(current);
  const prev = longBookKeys(previous);

  const added: HoldingsChangeSummary["added"] = [];
  const removed: HoldingsChangeSummary["removed"] = [];

  for (const [cusip, name] of cur) {
    if (!prev.has(cusip)) {
      added.push({
        ticker: tickers.get(cusip) ?? cusip,
        name,
        cusip,
      });
    }
  }
  for (const [cusip, name] of prev) {
    if (!cur.has(cusip)) {
      removed.push({
        ticker: tickers.get(cusip) ?? cusip,
        name,
        cusip,
      });
    }
  }

  added.sort((a, b) => a.ticker.localeCompare(b.ticker));
  removed.sort((a, b) => a.ticker.localeCompare(b.ticker));

  return {
    previousQuarter: format13FQuarter(previous.reportDate),
    previousReportDate: previous.reportDate,
    previousFilingDate: previous.filingDate,
    added,
    removed,
    comparedCount: new Set([...cur.keys(), ...prev.keys()]).size,
  };
}

async function hydrateProfile(
  profile: SuperinvestorProfile,
  options?: { includeHoldingsChange?: boolean },
): Promise<Superinvestor> {
  const base: Superinvestor = {
    id: profile.id,
    name: profile.name,
    firm: profile.firm,
    style: profile.style,
    cik: profile.cik,
    reportingEntity: profile.reportingEntity,
    asOfQuarter: "—",
    bio: profile.bio,
    longs: [],
    shorts: [],
    dataNotes: [],
    holdingsSource: "none",
  };

  if (!profile.cik) {
    base.holdingsSource = "none";
    base.dataNotes.push(
      "No SEC Form 13F CIK for this person — positions are not available.",
    );
    return base;
  }

  try {
    const { filing, previous, fetchedAt } = await cachedFetch13F(profile.cik);
    const { selected, equity, puts } = selectHoldingsForDisplay(filing);
    const tickers = await resolveCusipsToTickers(selected.map((h) => h.cusip));
    const { longs, shorts } = filingToPositions(filing, tickers);
    const freshness = assessFilingFreshness(filing.reportDate);

    base.longs = longs;
    base.shorts = shorts;
    base.holdingsSource = "sec-13f";
    base.asOfQuarter = format13FQuarter(filing.reportDate);
    base.filingDate = filing.filingDate;
    base.reportDate = filing.reportDate;
    base.fetchedAt = fetchedAt;
    base.freshness = freshness;
    base.sourceUrl = filing.sourceUrl;
    base.bookValueUsdM = filing.totalValueUsd / 1_000_000;
    base.reportingEntity = `${profile.reportingEntity} · ${filing.form}`;

    if (previous) {
      base.previousReportDate = previous.reportDate;
      base.previousFilingDate = previous.filingDate;
      base.previousQuarter = format13FQuarter(previous.reportDate);

      try {
        const priorFiling = await cachedFetchPrior13F(
          profile.cik,
          previous.accessionNumber,
          previous.filingDate,
          previous.reportDate,
          previous.form,
        );
        const changeCusips = [
          ...longBookKeys(filing).keys(),
          ...longBookKeys(priorFiling).keys(),
        ];
        const changeTickers = await resolveCusipsToTickers(changeCusips);
        const priorPositions = filingToPositions(priorFiling, changeTickers);
        base.priorLongs = priorPositions.longs;
        base.priorShorts = priorPositions.shorts;

        const holdingsChange = summarizeHoldingsChange(
          filing,
          priorFiling,
          changeTickers,
        );
        const addedCusips = new Set(holdingsChange.added.map((r) => r.cusip));
        base.longs = base.longs.map((p) => ({
          ...p,
          change: p.cusip && addedCusips.has(p.cusip) ? "added" : "held",
        }));

        if (options?.includeHoldingsChange) {
          base.holdingsChange = holdingsChange;

          // Surface full exits in the detail longs table.
          const shownCusips = new Set(
            base.longs
              .map((p) => p.cusip)
              .filter((c): c is string => Boolean(c)),
          );
          for (const row of holdingsChange.removed) {
            if (shownCusips.has(row.cusip)) continue;
            base.longs.push({
              ticker: row.ticker,
              name: row.name,
              weightPct: 0,
              side: "long",
              note: `Exited since ${holdingsChange.previousQuarter}`,
              concrete: row.ticker !== row.cusip,
              cusip: row.cusip,
              change: "removed",
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(
          `[superinvestors] Prior 13F failed for ${profile.id}:`,
          message,
        );
      }
    }

    base.dataNotes = [
      `Source: SEC EDGAR ${filing.form}, accession ${filing.accessionNumber}.`,
      `Period of report ${filing.reportDate}; filed ${filing.filingDate}.`,
      freshness.label +
        (freshness.status === "behind"
          ? ` (deadline for ${freshness.expectedQuarterLabel} was ${freshness.expectedDeadline}).`
          : freshness.nextDeadline
            ? ` Next period filings are due around ${freshness.nextDeadline}.`
            : "."),
      previous
        ? `Prior published period ${format13FQuarter(previous.reportDate)} (filed ${previous.filingDate}).`
        : "No prior 13F period found in recent EDGAR submissions.",
      base.holdingsChange
        ? `Vs prior period: ${base.holdingsChange.added.length} long name(s) added, ${base.holdingsChange.removed.length} exited.`
        : null,
      `Filing contains ${filing.holdings.length} aggregated line(s); showing top ${Math.min(TOP_LONGS, equity.length)} equity longs by value` +
        (puts.length
          ? ` and ${Math.min(TOP_LONGS, puts.length)} disclosed put(s).`
          : "."),
      "Weights are % of this 13F table total (not the firm’s full AUM).",
    ].filter((n): n is string => Boolean(n));
    return base;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown 13F error";
    console.error(`[superinvestors] 13F failed for ${profile.id}:`, message);
    base.holdingsSource = "unavailable";
    base.holdingsError = message;
    base.dataNotes = [`Live 13F fetch failed: ${message}`];
    return base;
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function loadSuperinvestorsSnapshot(
  minHolders = 3,
): Promise<SuperinvestorsSnapshot> {
  const investors = await mapPool(SUPERINVESTOR_PROFILES, 2, hydrateProfile);

  const liveCount = investors.filter((i) => i.holdingsSource === "sec-13f").length;
  const failedCount = investors.filter(
    (i) => i.holdingsSource === "unavailable",
  ).length;

  const liveQuarters = investors
    .filter((i) => i.reportDate)
    .map((i) => i.asOfQuarter);
  const asOfLabel =
    liveQuarters.sort().at(-1) ?? "SEC 13F (latest available per filer)";

  const currentCount = investors.filter(
    (i) => i.freshness?.status === "current" || i.freshness?.status === "early",
  ).length;
  const behindCount = investors.filter(
    (i) => i.freshness?.status === "behind",
  ).length;
  const expectedQuarterLabel =
    investors.find((i) => i.freshness)?.freshness?.expectedQuarterLabel ??
    asOfLabel;

  const fetchTimes = investors
    .map((i) => i.fetchedAt)
    .filter((t): t is string => Boolean(t))
    .sort();
  const fetchedAt = fetchTimes.at(-1) ?? new Date().toISOString();

  const priorInvestors = investorsWithPriorBooks(investors);
  const consensusLongs = annotateConsensusChanges(
    computeConsensus(investors, "long", minHolders),
    computeConsensus(priorInvestors, "long", minHolders),
  );
  const consensusShorts = annotateConsensusChanges(
    computeConsensus(investors, "short", minHolders),
    computeConsensus(priorInvestors, "short", minHolders),
  );

  return {
    asOfLabel,
    expectedQuarterLabel,
    currentCount,
    behindCount,
    fetchedAt,
    investors,
    consensusLongs,
    consensusShorts,
    disclaimer: SUPERINVESTORS_DISCLAIMER,
    liveCount,
    failedCount,
  };
}

export async function loadSuperinvestorById(
  id: string,
): Promise<Superinvestor | null> {
  const profile = getProfileById(id);
  if (!profile) return null;
  return hydrateProfile(profile, { includeHoldingsChange: true });
}
