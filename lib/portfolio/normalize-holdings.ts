/**
 * Normalisation helpers for raw strings that come from CSV cells or OCR text.
 *
 * These are pure functions — no I/O, no side-effects.
 */

import type { ParsedHolding } from "./parsed-holding";
import { isCashSymbol, normalizeCashHolding } from "./cash";

// ---------------------------------------------------------------------------
// String → Number helpers
// ---------------------------------------------------------------------------

/**
 * Strip currency symbols, thousand-separators, and whitespace, then parse.
 * Returns null when the string is empty or produces NaN.
 *
 * Examples:
 *   "$1,234.56"  →  1234.56
 *   "(500.00)"   →  -500       (accounting parens = negative)
 *   ""           →  null
 */
export function parseNum(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "" || s === "-" || s.toLowerCase() === "n/a") return null;

  // Accounting negative: (1234.56) → -1234.56
  const isAccountingNeg = /^\(.*\)$/.test(s);
  const cleaned = s
    .replace(/[^0-9.\-]/g, "") // keep digits, dot, minus
    .replace(/^\./, "0.");      // leading dot → 0.

  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return isAccountingNeg ? -Math.abs(n) : n;
}

/**
 * Normalise a ticker symbol: trim, uppercase, strip exchange suffixes
 * like ".L", ".PA", " LN" that some brokers append.
 */
export function normalizeTicker(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/\.([A-Z]{1,4})$/, "")  // strip ".L", ".PA", ".TO"
    .replace(/\s+(LN|US|CN|AU|GY)$/i, "") // strip exchange suffixes
    .trim();
}

/**
 * When a brokerage screenshot shows a market price but no average cost,
 * copy currentPrice into averageCost so cost basis / P&L can still be
 * computed. Does not overwrite an existing averageCost.
 */
export function fillMissingAverageCostFromPrice(
  holdings: ParsedHolding[],
): ParsedHolding[] {
  return holdings.map((h) => {
    const cashNormalized = normalizeCashHolding(h);
    if (isCashSymbol(cashNormalized.ticker)) return cashNormalized;
    if (h.averageCost != null || h.currentPrice == null) return h;
    return { ...h, averageCost: h.currentPrice };
  });
}

/**
 * Merge holdings with duplicate tickers by summing shares and computing a
 * weighted-average cost basis. Other fields (price, value, gain/loss) are
 * summed when numeric.
 */
export function deduplicateHoldings(
  holdings: ParsedHolding[],
): ParsedHolding[] {
  const map = new Map<string, ParsedHolding[]>();

  for (const h of holdings) {
    const key = h.ticker.toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(h);
  }

  return Array.from(map.values()).map((group) => {
    if (group.length === 1) return group[0];

    const totalShares = group.reduce((s, h) => s + (h.shares ?? 0), 0);
    const weightedCost =
      totalShares > 0
        ? group.reduce(
            (s, h) => s + (h.shares ?? 0) * (h.averageCost ?? 0),
            0,
          ) / totalShares
        : null;

    const sumNullable = (field: keyof ParsedHolding) => {
      const vals = group.map((h) => h[field] as number | null | undefined);
      if (vals.every((v) => v == null)) return null;
      return vals.reduce<number>((s, v) => s + (v ?? 0), 0);
    };

    const first = group[0];
    return {
      ticker: first.ticker,
      companyName: first.companyName,
      currency: first.currency,
      shares: totalShares,
      averageCost: weightedCost,
      currentPrice: first.currentPrice, // take first price (they should match)
      marketValue: sumNullable("marketValue"),
      gainLoss: sumNullable("gainLoss"),
    } satisfies ParsedHolding;
  });
}
