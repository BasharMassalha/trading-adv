/**
 * Cash is stored as a normal portfolio holding:
 * ticker CASH, type CASH, price $1, quantity = dollar amount.
 */

import type { ParsedHolding } from "./parsed-holding";

export const CASH_TICKER = "CASH";

export function isCashSymbol(symbol: string | null | undefined): boolean {
  return (symbol ?? "").trim().toUpperCase() === CASH_TICKER;
}

/**
 * Detect cash / sweep / money-market sleeve labels from brokers.
 * Keep this conservative so tickers like CASH.app-style names aren't required —
 * we only match obvious cash rows.
 */
export function looksLikeCashLabel(
  symbol: string | null | undefined,
  companyName?: string | null,
): boolean {
  const s = (symbol ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  const n = (companyName ?? "").trim().toUpperCase().replace(/\s+/g, " ");

  if (!s && !n) return false;
  if (isCashSymbol(s)) return true;

  const cashTickerExact =
    /^(USD|USD CASH|CASH USD|CASH BALANCE|CASH POSITION|SWEEP|SWEEP CASH|MONEY MARKET|MMF|FCASH|CUR:USD)$/;
  if (cashTickerExact.test(s)) return true;
  if (/^CASH(\b|[\s&])/.test(s) || s.includes("CASH EQUIV")) return true;

  if (
    /^(CASH|CASH BALANCE|CASH POSITION|CASH & CASH EQUIVALENTS|CASH AND CASH EQUIVALENTS|MONEY MARKET)$/.test(
      n,
    )
  ) {
    return true;
  }

  return false;
}

/** Build a canonical CASH ParsedHolding from a dollar amount. */
export function toCashHolding(input: {
  amount?: number | null;
  shares?: number | null;
  marketValue?: number | null;
  currency?: string | null;
}): ParsedHolding {
  const amount =
    (input.amount != null && input.amount > 0 ? input.amount : null) ??
    (input.marketValue != null && input.marketValue > 0
      ? input.marketValue
      : null) ??
    (input.shares != null && input.shares > 0 ? input.shares : null) ??
    0;

  return {
    ticker: CASH_TICKER,
    companyName: "Cash",
    shares: amount,
    averageCost: 1,
    currentPrice: 1,
    marketValue: amount,
    gainLoss: 0,
    currency: (input.currency ?? "USD").toUpperCase() || "USD",
  };
}

/** Normalize a single holding if it looks like cash; otherwise return as-is. */
export function normalizeCashHolding(holding: ParsedHolding): ParsedHolding {
  if (!looksLikeCashLabel(holding.ticker, holding.companyName)) return holding;
  return toCashHolding({
    shares: holding.shares,
    marketValue: holding.marketValue,
    currency: holding.currency,
  });
}

/**
 * Normalize cash-like rows to CASH and merge duplicate cash sleeves into one.
 */
export function normalizeCashHoldings(holdings: ParsedHolding[]): ParsedHolding[] {
  const normalized = holdings.map(normalizeCashHolding);
  const cashRows = normalized.filter((h) => isCashSymbol(h.ticker));
  const others = normalized.filter((h) => !isCashSymbol(h.ticker));

  if (cashRows.length === 0) return normalized;

  const amount = cashRows.reduce(
    (sum, h) => sum + (h.marketValue ?? h.shares ?? 0),
    0,
  );
  // Empty cash rows are review placeholders — drop them on normalize/save.
  if (!(amount > 0)) return others;

  const currency = cashRows[0]?.currency ?? "USD";
  return [...others, toCashHolding({ amount, currency })];
}
