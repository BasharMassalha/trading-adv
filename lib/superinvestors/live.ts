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
/** Per-filer budget for prior XML + FIGI so QoQ never blocks the page. */
const PRIOR_BUDGET_MS = 6_000;

export const SUPERINVESTORS_DISCLAIMER =
  "All positions shown are parsed from the latest SEC Form 13F-HR on EDGAR for each filer’s CIK. 13F covers reported long U.S. equities and listed options only, with roughly a 45-day lag. Put options disclosed in the filing appear under shorts; most hedge-fund short books are not in 13F. No fabricated holdings, strategies, or market statements are shown. Not investment advice.";

type Cached13F = Sec13FLatestBundle & {
  fetchedAt: string;
};

type HydrateContext = {
  profile: SuperinvestorProfile;
  investor: Superinvestor;
  filing?: Sec13FFiling;
  previous?: Sec13FFilingRef | null;
  tickers?: Map<string, string | null>;
};

const cachedFetch13F = unstable_cache(
  async (cik: string): Promise<Cached13F> => {
    const bundle = await fetchLatest13FBundle(cik);
    return { ...bundle, fetchedAt: new Date().toISOString() };
  },
  ["superinvestor-13f-v5"],
  { revalidate: 60 * 60 * 12 },
);

const cachedFetchPrior13F = unstable_cache(
  async (
    cik: string,
    accessionNumber: string,
    filingDate: string,
    reportDate: string,
    form: string,
  ) => {
    const ref: Sec13FFilingRef = {
      accessionNumber,
      filingDate,
      reportDate,
      form,
    };
    return fetch13FByRef(cik, ref);
  },
  ["superinvestor-13f-prior-v2"],
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

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => value),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildDataNotes(
  base: Superinvestor,
  filing: Sec13FFiling,
  previous: Sec13FFilingRef | null | undefined,
  equityCount: number,
  putCount: number,
): string[] {
  const freshness = base.freshness;
  return [
    `Source: SEC EDGAR ${filing.form}, accession ${filing.accessionNumber}.`,
    `Period of report ${filing.reportDate}; filed ${filing.filingDate}.`,
    freshness
      ? freshness.label +
        (freshness.status === "behind"
          ? ` (deadline for ${freshness.expectedQuarterLabel} was ${freshness.expectedDeadline}).`
          : freshness.nextDeadline
            ? ` Next period filings are due around ${freshness.nextDeadline}.`
            : ".")
      : null,
    previous
      ? `Prior published period ${format13FQuarter(previous.reportDate)} (filed ${previous.filingDate}).`
      : "No prior 13F period found in recent EDGAR submissions.",
    base.holdingsChange
      ? `Vs prior period: ${base.holdingsChange.added.length} long name(s) added, ${base.holdingsChange.removed.length} exited.`
      : null,
    `Filing contains ${filing.holdings.length} aggregated line(s); showing top ${Math.min(TOP_LONGS, equityCount)} equity longs by value` +
      (putCount
        ? ` and ${Math.min(TOP_LONGS, putCount)} disclosed put(s).`
        : "."),
    "Weights are % of this 13F table total (not the firm’s full AUM).",
  ].filter((n): n is string => Boolean(n));
}

/** Current filing only — keeps the list page responsive. */
async function hydrateCurrent(
  profile: SuperinvestorProfile,
): Promise<HydrateContext> {
  const investor: Superinvestor = {
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
    investor.holdingsSource = "none";
    investor.dataNotes = [
      "No SEC Form 13F CIK for this person — positions are not available.",
    ];
    return { profile, investor };
  }

  try {
    const { filing, previous, fetchedAt } = await cachedFetch13F(profile.cik);
    const { selected, equity, puts } = selectHoldingsForDisplay(filing);
    const tickers = await resolveCusipsToTickers(selected.map((h) => h.cusip));
    const { longs, shorts } = filingToPositions(filing, tickers);
    const freshness = assessFilingFreshness(filing.reportDate);

    investor.longs = longs;
    investor.shorts = shorts;
    investor.holdingsSource = "sec-13f";
    investor.asOfQuarter = format13FQuarter(filing.reportDate);
    investor.filingDate = filing.filingDate;
    investor.reportDate = filing.reportDate;
    investor.fetchedAt = fetchedAt;
    investor.freshness = freshness;
    investor.sourceUrl = filing.sourceUrl;
    investor.bookValueUsdM = filing.totalValueUsd / 1_000_000;
    investor.reportingEntity = `${profile.reportingEntity} · ${filing.form}`;

    if (previous) {
      investor.previousReportDate = previous.reportDate;
      investor.previousFilingDate = previous.filingDate;
      investor.previousQuarter = format13FQuarter(previous.reportDate);
    }

    investor.dataNotes = buildDataNotes(
      investor,
      filing,
      previous,
      equity.length,
      puts.length,
    );

    return { profile, investor, filing, previous, tickers };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown 13F error";
    console.error(`[superinvestors] 13F failed for ${profile.id}:`, message);
    investor.holdingsSource = "unavailable";
    investor.holdingsError = message;
    investor.dataNotes = [`Live 13F fetch failed: ${message}`];
    return { profile, investor };
  }
}

type PriorPatch = {
  priorLongs: SuperinvestorPosition[];
  priorShorts: SuperinvestorPosition[];
  longs: SuperinvestorPosition[];
  holdingsChange?: HoldingsChangeSummary;
};

/**
 * Prior-period work stays cheap: full-book CUSIP diff (no FIGI), and ticker
 * resolution only for the same top-N slice used in the UI / consensus.
 */
async function buildPriorPatch(
  ctx: HydrateContext,
  options?: { includeHoldingsChange?: boolean },
): Promise<PriorPatch | null> {
  const { profile, investor, filing, previous, tickers } = ctx;
  if (!profile.cik || !filing || !previous || !tickers) return null;

  const priorFiling = await cachedFetchPrior13F(
    profile.cik,
    previous.accessionNumber,
    previous.filingDate,
    previous.reportDate,
    previous.form,
  );

  const priorSelected = selectHoldingsForDisplay(priorFiling).selected;
  const needResolve = priorSelected
    .map((h) => h.cusip)
    .filter((c) => !tickers.has(c));
  const resolved = await resolveCusipsToTickers(needResolve);
  const merged = new Map([...tickers, ...resolved]);

  const priorPositions = filingToPositions(priorFiling, merged);
  const curKeys = longBookKeys(filing);
  const prevKeys = longBookKeys(priorFiling);
  const addedCusips = new Set<string>();
  for (const cusip of curKeys.keys()) {
    if (!prevKeys.has(cusip)) addedCusips.add(cusip);
  }

  const longs: SuperinvestorPosition[] = investor.longs.map((p) => ({
    ...p,
    change: p.cusip && addedCusips.has(p.cusip) ? "added" : "held",
  }));

  let holdingsChange: HoldingsChangeSummary | undefined;
  if (options?.includeHoldingsChange) {
    holdingsChange = summarizeHoldingsChange(filing, priorFiling, merged);
    const priorTopCusips = new Set(priorSelected.map((h) => h.cusip));
    const shownCusips = new Set(
      longs.map((p) => p.cusip).filter((c): c is string => Boolean(c)),
    );
    for (const row of holdingsChange.removed) {
      if (!priorTopCusips.has(row.cusip) || shownCusips.has(row.cusip)) continue;
      longs.push({
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

  return {
    priorLongs: priorPositions.longs,
    priorShorts: priorPositions.shorts,
    longs,
    holdingsChange,
  };
}

function applyPriorPatch(
  ctx: HydrateContext,
  patch: PriorPatch,
): void {
  const { investor, filing, previous } = ctx;
  investor.priorLongs = patch.priorLongs;
  investor.priorShorts = patch.priorShorts;
  investor.longs = patch.longs;
  if (patch.holdingsChange) {
    investor.holdingsChange = patch.holdingsChange;
  }
  if (filing) {
    const { equity, puts } = selectHoldingsForDisplay(filing);
    investor.dataNotes = buildDataNotes(
      investor,
      filing,
      previous,
      equity.length,
      puts.length,
    );
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

function stripPriorBooks(inv: Superinvestor): Superinvestor {
  const { priorLongs: _l, priorShorts: _s, ...rest } = inv;
  return rest;
}

async function attachPriorsWithBudget(
  contexts: HydrateContext[],
  options?: { includeHoldingsChange?: boolean },
): Promise<void> {
  await mapPool(contexts, 3, async (ctx) => {
    if (!ctx.previous || !ctx.filing) return;
    const patch = await withTimeout(
      buildPriorPatch(ctx, options),
      PRIOR_BUDGET_MS,
    );
    if (!patch) {
      console.warn(
        `[superinvestors] Prior 13F timed out for ${ctx.profile.id} — serving current filing without QoQ badges.`,
      );
      return;
    }
    applyPriorPatch(ctx, patch);
  });
}

async function buildSuperinvestorsSnapshot(
  minHolders: number,
): Promise<SuperinvestorsSnapshot> {
  const contexts = await mapPool(SUPERINVESTOR_PROFILES, 3, hydrateCurrent);
  await attachPriorsWithBudget(contexts);

  const investors = contexts.map((c) => c.investor);

  const liveCount = investors.filter((i) => i.holdingsSource === "sec-13f")
    .length;
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
    investors: investors.map(stripPriorBooks),
    consensusLongs,
    consensusShorts,
    disclaimer: SUPERINVESTORS_DISCLAIMER,
    liveCount,
    failedCount,
  };
}

export async function loadSuperinvestorsSnapshot(
  minHolders = 3,
): Promise<SuperinvestorsSnapshot> {
  const cached = unstable_cache(
    async () => buildSuperinvestorsSnapshot(minHolders),
    ["superinvestors-snapshot-v6", String(minHolders)],
    { revalidate: 60 * 60 * 12 },
  );
  return cached();
}

export async function loadSuperinvestorById(
  id: string,
): Promise<Superinvestor | null> {
  const profile = getProfileById(id);
  if (!profile) return null;

  const ctx = await hydrateCurrent(profile);
  if (ctx.previous && ctx.filing) {
    const patch = await withTimeout(
      buildPriorPatch(ctx, { includeHoldingsChange: true }),
      PRIOR_BUDGET_MS * 2,
    );
    if (patch) applyPriorPatch(ctx, patch);
    else {
      console.warn(
        `[superinvestors] Prior 13F timed out for ${profile.id} — detail page without QoQ.`,
      );
    }
  }
  return stripPriorBooks(ctx.investor);
}
