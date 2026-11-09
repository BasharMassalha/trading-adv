/**
 * Turn an analysis into sized paper trades.
 *
 * Mandate: maximize return by moving capital out of names the analysis wants
 * gone and into the highest-conviction ideas that still fit under a position
 * cap. The model does not choose share counts. Low-conviction ideas are
 * skipped so one noisy report cannot churn the book.
 */

import { explainBuyTrade, explainSellTrade } from "./why";

export const CASH_TICKER = "CASH";

const MIN_NOTIONAL = 25;
const TICKER_RE = /^[A-Z][A-Z0-9.]{0,7}$/;

export type TradeSide = "BUY" | "SELL";

export type BookPosition = {
  ticker: string;
  quantity: number;
  price: number;
};

export type HoldingSignal = {
  ticker: string;
  action?:
    | "CONSIDER_SELLING"
    | "CONSIDER_REDUCING"
    | "HOLD"
    | "CONSIDER_ADDING";
  verdict?: "BUY" | "ACCUMULATE" | "HOLD" | "TRIM" | "SELL" | "WATCH";
  conviction?: "HIGH" | "MEDIUM" | "LOW";
  reason?: string;
};

export type AdditionIdea = {
  ticker: string;
  rationale?: string;
};

export type PolicyInput = {
  positions: BookPosition[];
  signals: HoldingSignal[];
  additions: AdditionIdea[];
  /** Latest prices for tickers that are not already in the book. */
  quotes: Record<string, number>;
  /** Max fraction of book value in one name, e.g. 0.12. */
  maxPositionWeight: number;
};

export type PlannedTrade = {
  ticker: string;
  side: TradeSide;
  shares: number;
  price: number;
  reason: string;
};

type Intent = "SELL" | "TRIM" | "BUY" | "HOLD";

type BuySlot = {
  ticker: string;
  price: number;
  value: number;
  score: number;
  reason: string;
  shares: number;
};

export function maxPositionWeightForProfile(
  profile: {
    riskTolerance?: string | null;
    investmentGoal?: string | null;
  } | null,
): number {
  const risk = profile?.riskTolerance;
  const goal = profile?.investmentGoal;
  if (risk === "CONSERVATIVE") return 0.08;
  if (risk === "AGGRESSIVE" && goal === "GROWTH") return 0.25;
  if (risk === "AGGRESSIVE" || goal === "GROWTH") return 0.2;
  return 0.12;
}

function roundShares(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n * 10_000 + 1e-6) / 10_000;
}

function intent(signal: HoldingSignal): Intent {
  const verdict = signal.verdict;
  if (verdict === "SELL") return "SELL";
  if (verdict === "TRIM") return "TRIM";
  if (verdict === "BUY" || verdict === "ACCUMULATE") return "BUY";
  if (verdict === "HOLD" || verdict === "WATCH") return "HOLD";
  if (signal.action === "CONSIDER_SELLING") return "SELL";
  if (signal.action === "CONSIDER_REDUCING") return "TRIM";
  if (signal.action === "CONSIDER_ADDING") return "BUY";
  return "HOLD";
}

/** Fraction of the position to sell. Null means leave it alone. */
function sellFraction(signal: HoldingSignal): number | null {
  const conviction = signal.conviction ?? "MEDIUM";
  if (conviction === "LOW") return null;
  const kind = intent(signal);
  if (kind === "SELL") return conviction === "HIGH" ? 1 : 0.5;
  if (kind === "TRIM") return conviction === "HIGH" ? 0.25 : 0.1;
  return null;
}

function buyScore(signal: HoldingSignal): number {
  const conviction = signal.conviction ?? "MEDIUM";
  if (conviction === "LOW") return 0;
  if (intent(signal) !== "BUY") return 0;
  if (signal.verdict === "BUY" && conviction === "HIGH") return 4;
  if (conviction === "HIGH") return 3;
  if (signal.verdict === "BUY") return 3;
  return 2;
}

function placeBuy(slot: BuySlot, spend: number, remaining: number): number {
  const shares = roundShares(spend / slot.price);
  const notional = shares * slot.price;
  if (shares <= 0 || notional < MIN_NOTIONAL || notional > remaining + 1e-6) {
    return remaining;
  }
  slot.shares += shares;
  slot.value += notional;
  return remaining - notional;
}

function allocateBuys(
  candidates: BuySlot[],
  budget: number,
  cap: number,
): BuySlot[] {
  let remaining = budget;
  const order = [...candidates].sort(
    (a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker),
  );

  for (let guard = 0; guard < 12 && remaining >= MIN_NOTIONAL; guard += 1) {
    const open = order.filter((c) => cap - c.value >= MIN_NOTIONAL);
    if (open.length === 0) break;
    const top = open[0].score;
    const group = open.filter((c) => c.score === top);
    const slice = remaining / group.length;

    if (slice < MIN_NOTIONAL) {
      const next = group.find((c) => cap - c.value >= MIN_NOTIONAL);
      if (!next) break;
      const before = remaining;
      remaining = placeBuy(
        next,
        Math.min(remaining, cap - next.value),
        remaining,
      );
      if (remaining === before) break;
      continue;
    }

    let placed = false;
    for (const slot of group) {
      const room = cap - slot.value;
      const spend = Math.min(slice, room, remaining);
      if (spend < MIN_NOTIONAL) continue;
      const before = remaining;
      remaining = placeBuy(slot, spend, remaining);
      if (remaining < before) placed = true;
    }
    if (!placed) break;
  }

  return order.filter((slot) => slot.shares > 0);
}

export function planTrades(input: PolicyInput): PlannedTrade[] {
  // Profile caps top out at 25%. Keep a hard ceiling in case a stored weight is wrong.
  const maxWeight = Math.min(Math.max(input.maxPositionWeight, 0.02), 0.35);
  const positions = input.positions
    .filter((p) => p.quantity > 0 && p.price > 0 && Number.isFinite(p.price))
    .map((p) => ({ ...p, ticker: p.ticker.toUpperCase() }));

  const bookValue = positions.reduce((sum, p) => sum + p.quantity * p.price, 0);
  if (!(bookValue > 0)) return [];

  const byTicker = new Map(positions.map((p) => [p.ticker, p]));
  const signals = new Map<string, HoldingSignal>();
  for (const signal of input.signals) {
    const ticker = signal.ticker.trim().toUpperCase();
    if (!TICKER_RE.test(ticker) || ticker === CASH_TICKER) continue;
    if (!signals.has(ticker)) signals.set(ticker, { ...signal, ticker });
  }

  const sells: PlannedTrade[] = [];
  const sold = new Set<string>();

  for (const position of positions) {
    if (position.ticker === CASH_TICKER) continue;
    const signal = signals.get(position.ticker);
    if (!signal) continue;
    const fraction = sellFraction(signal);
    if (fraction == null || fraction <= 0) continue;

    const shares =
      fraction >= 0.999
        ? position.quantity
        : Math.min(position.quantity, roundShares(position.quantity * fraction));
    if (!(shares > 0)) continue;
    const notional = shares * position.price;
    if (fraction < 0.999 && notional < MIN_NOTIONAL) continue;

    sells.push({
      ticker: position.ticker,
      side: "SELL",
      shares,
      price: position.price,
      reason: explainSellTrade(signal, fraction),
    });
    sold.add(position.ticker);
  }

  const sellProceeds = sells.reduce((sum, trade) => sum + trade.shares * trade.price, 0);
  const cash = byTicker.get(CASH_TICKER);
  const cashValue = cash ? cash.quantity * cash.price : 0;
  const capValue = maxWeight * bookValue;

  const candidates: BuySlot[] = [];
  for (const position of positions) {
    if (position.ticker === CASH_TICKER || sold.has(position.ticker)) continue;
    const signal = signals.get(position.ticker);
    if (!signal) continue;
    const score = buyScore(signal);
    if (score <= 0) continue;
    candidates.push({
      ticker: position.ticker,
      price: position.price,
      value: position.quantity * position.price,
      score,
      reason: explainBuyTrade({
        kind: "add",
        analysis: signal.reason,
        conviction: signal.conviction,
      }),
      shares: 0,
    });
  }

  const seen = new Set(candidates.map((c) => c.ticker));
  for (const idea of input.additions) {
    const ticker = idea.ticker.trim().toUpperCase();
    if (!TICKER_RE.test(ticker) || ticker === CASH_TICKER) continue;
    if (byTicker.has(ticker) || sold.has(ticker) || seen.has(ticker)) continue;
    const price = input.quotes[ticker];
    if (!(price > 0) || !Number.isFinite(price)) continue;
    seen.add(ticker);
    candidates.push({
      ticker,
      price,
      value: 0,
      score: 2,
      reason: explainBuyTrade({ kind: "open", analysis: idea.rationale }),
      shares: 0,
    });
  }

  const filled = allocateBuys(candidates, sellProceeds + cashValue, capValue);
  const buys: PlannedTrade[] = filled.map((slot) => ({
    ticker: slot.ticker,
    side: "BUY" as const,
    shares: slot.shares,
    price: slot.price,
    reason: slot.reason,
  }));

  const stockBuyNotional = buys.reduce(
    (sum, trade) => sum + trade.shares * trade.price,
    0,
  );
  const endCash = cashValue + sellProceeds - stockBuyNotional;
  const trades: PlannedTrade[] = [...sells, ...buys];

  if (endCash > cashValue + 0.01) {
    const dollars = endCash - cashValue;
    const shares = roundShares(dollars);
    if (shares > 0) {
      trades.push({
        ticker: CASH_TICKER,
        side: "BUY",
        shares,
        price: 1,
        reason: "Parked sale proceeds that did not fit under the position cap.",
      });
    }
  } else if (cash && endCash < cashValue - 0.01) {
    const dollars = cashValue - endCash;
    const shares = Math.min(cash.quantity, roundShares(dollars / cash.price));
    if (shares > 0) {
      trades.push({
        ticker: CASH_TICKER,
        side: "SELL",
        shares,
        price: cash.price > 0 ? cash.price : 1,
        reason: "Deployed cash into higher-conviction ideas.",
      });
    }
  }

  return trades;
}
