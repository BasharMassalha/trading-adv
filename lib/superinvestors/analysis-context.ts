/**
 * Compact superinvestor consensus signal for the portfolio analysis pipeline.
 *
 * The full snapshot (20 filers × up to 40 positions) is far too large to put in
 * a prompt, so this module reduces it to the names that several superinvestors
 * agree on and caches that small payload separately.
 *
 * Building the snapshot from scratch hits SEC EDGAR + OpenFIGI and can take a
 * minute on a cold cache. Analysis therefore calls this behind a timeout: a
 * miss degrades the report (no consensus section) instead of stalling it, and
 * the in-flight work still warms the cache for the next run.
 */

import { unstable_cache } from "next/cache";
import { loadSuperinvestorsSnapshot } from "./live";
import type { ConsensusPosition, PositionSide } from "./types";

export type ConsensusSignal = {
  ticker: string;
  name: string;
  side: PositionSide;
  /** Number of tracked superinvestors reporting the position. */
  holderCount: number;
  /** Investor names, heaviest weight first. */
  holders: string[];
  /** Average weight of the position across those investors' 13F books. */
  avgWeightPct: number;
};

export type SuperinvestorConsensusContext = {
  asOfLabel: string;
  liveFilerCount: number;
  minHolders: number;
  longs: ConsensusSignal[];
  shorts: ConsensusSignal[];
};

const MIN_HOLDERS = 3;
const MAX_LONGS = 25;
const MAX_SHORTS = 10;
/** Cold build measures ~30s (SEC + OpenFIGI); warm rebuilds are sub-second. */
const DEFAULT_TIMEOUT_MS = 25_000;

function toSignal(row: ConsensusPosition): ConsensusSignal {
  return {
    ticker: row.ticker,
    name: row.name,
    side: row.side,
    holderCount: row.holderCount,
    holders: row.holders.map((h) => h.name),
    avgWeightPct: Number(row.avgWeightPct.toFixed(2)),
  };
}

const cachedConsensus = unstable_cache(
  async (): Promise<SuperinvestorConsensusContext> => {
    const snapshot = await loadSuperinvestorsSnapshot(MIN_HOLDERS);
    return {
      asOfLabel: snapshot.asOfLabel,
      liveFilerCount: snapshot.liveCount,
      minHolders: MIN_HOLDERS,
      longs: snapshot.consensusLongs
        .filter((row) => row.change !== "removed")
        .slice(0, MAX_LONGS)
        .map(toSignal),
      shorts: snapshot.consensusShorts
        .filter((row) => row.change !== "removed")
        .slice(0, MAX_SHORTS)
        .map(toSignal),
    };
  },
  ["superinvestor-consensus-analysis-v2"],
  { revalidate: 60 * 60 * 12 },
);

/**
 * Consensus positions for the analysis prompt, or `null` when the data could
 * not be produced in time. Never throws — analysis must survive SEC downtime.
 */
export async function getSuperinvestorConsensusContext(options?: {
  timeoutMs?: number;
}): Promise<SuperinvestorConsensusContext | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    const result = await Promise.race([cachedConsensus(), timeout]);
    if (result == null) {
      console.warn(
        `[superinvestors] Consensus unavailable within ${timeoutMs}ms — analysis will run without it.`,
      );
      return null;
    }
    if (result.longs.length === 0 && result.shorts.length === 0) return null;
    return result;
  } catch (err) {
    console.error("[superinvestors] Consensus load failed:", err);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
