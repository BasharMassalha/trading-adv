import type { ConsensusPosition, PositionSide, Superinvestor } from "./types";

function isConcretePosition(ticker: string, concrete?: boolean): boolean {
  if (concrete === false) return false;
  // Real equity tickers — exclude raw CUSIPs (usually 9 alphanumeric)
  if (/^[0-9A-Z]{9}$/.test(ticker)) return false;
  return /^[A-Z][A-Z0-9.]{0,5}$/.test(ticker);
}

/**
 * Stocks held long (or short via disclosed puts) by at least `minHolders` investors.
 */
export function computeConsensus(
  investors: Superinvestor[],
  side: PositionSide,
  minHolders = 3,
): ConsensusPosition[] {
  const map = new Map<
    string,
    {
      name: string;
      holders: { id: string; name: string; weightPct: number }[];
    }
  >();

  for (const inv of investors) {
    const book = side === "long" ? inv.longs : inv.shorts;
    for (const pos of book) {
      if (pos.side !== side) continue;
      if (!isConcretePosition(pos.ticker, pos.concrete)) continue;

      const key = pos.ticker.toUpperCase();
      const existing = map.get(key);
      const holder = {
        id: inv.id,
        name: inv.name,
        weightPct: pos.weightPct,
      };
      if (existing) {
        existing.holders.push(holder);
      } else {
        map.set(key, { name: pos.name, holders: [holder] });
      }
    }
  }

  const rows: ConsensusPosition[] = [];
  for (const [ticker, value] of map) {
    if (value.holders.length < minHolders) continue;
    const avgWeightPct =
      value.holders.reduce((s, h) => s + h.weightPct, 0) / value.holders.length;
    rows.push({
      ticker,
      name: value.name,
      side,
      holderCount: value.holders.length,
      holders: value.holders.sort((a, b) => b.weightPct - a.weightPct),
      avgWeightPct,
    });
  }

  return rows.sort(
    (a, b) => b.holderCount - a.holderCount || b.avgWeightPct - a.avgWeightPct,
  );
}
