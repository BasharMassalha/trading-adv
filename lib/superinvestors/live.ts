import { unstable_cache } from "next/cache";
import { resolveCusipsToTickers } from "./cusip-ticker";
import {
  fetchLatest13F,
  format13FQuarter,
  type Sec13FFiling,
} from "./sec-13f";
import {
  SUPERINVESTOR_PROFILES,
  getProfileById,
  type SuperinvestorProfile,
} from "./profiles";
import { computeConsensus } from "./consensus";
import type {
  Superinvestor,
  SuperinvestorPosition,
  SuperinvestorsSnapshot,
} from "./types";

const TOP_LONGS = 40;

export const SUPERINVESTORS_DISCLAIMER =
  "All positions shown are parsed from the latest SEC Form 13F-HR on EDGAR for each filer’s CIK. 13F covers reported long U.S. equities and listed options only, with roughly a 45-day lag. Put options disclosed in the filing appear under shorts; most hedge-fund short books are not in 13F. No fabricated holdings, strategies, or market statements are shown. Not investment advice.";

const cachedFetch13F = unstable_cache(
  async (cik: string) => fetchLatest13F(cik),
  ["superinvestor-13f-v2"],
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

async function hydrateProfile(
  profile: SuperinvestorProfile,
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
    const filing = await cachedFetch13F(profile.cik);
    const { selected, equity, puts } = selectHoldingsForDisplay(filing);
    const tickers = await resolveCusipsToTickers(selected.map((h) => h.cusip));
    const { longs, shorts } = filingToPositions(filing, tickers);

    base.longs = longs;
    base.shorts = shorts;
    base.holdingsSource = "sec-13f";
    base.asOfQuarter = format13FQuarter(filing.reportDate);
    base.filingDate = filing.filingDate;
    base.reportDate = filing.reportDate;
    base.sourceUrl = filing.sourceUrl;
    base.bookValueUsdM = filing.totalValueUsd / 1_000_000;
    base.reportingEntity = `${profile.reportingEntity} · ${filing.form}`;
    base.dataNotes = [
      `Source: SEC EDGAR ${filing.form}, accession ${filing.accessionNumber}.`,
      `Period of report ${filing.reportDate}; filed ${filing.filingDate}.`,
      `Filing contains ${filing.holdings.length} aggregated line(s); showing top ${Math.min(TOP_LONGS, equity.length)} equity longs by value` +
        (puts.length ? ` and ${Math.min(TOP_LONGS, puts.length)} disclosed put(s).` : "."),
      "Weights are % of this 13F table total (not the firm’s full AUM).",
    ];
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

  return {
    asOfLabel,
    investors,
    consensusLongs: computeConsensus(investors, "long", minHolders),
    consensusShorts: computeConsensus(investors, "short", minHolders),
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
  return hydrateProfile(profile);
}
