/**
 * Real CSV parser for portfolio holdings.
 *
 * Powered by papaparse.  Column detection is alias-based so we can accept
 * exports from Schwab, Fidelity, IBKR, Robinhood, etc. without up-front
 * configuration.
 */

import Papa from "papaparse";
import type { ParsedHolding, ParseResult } from "./parsed-holding";
import { parseNum, normalizeTicker, deduplicateHoldings } from "./normalize-holdings";

// ---------------------------------------------------------------------------
// Column alias map
// lowercase(header.trim()) → canonical ParsedHolding field
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, keyof ParsedHolding> = {
  // ticker / symbol
  ticker: "ticker",
  symbol: "ticker",
  stock: "ticker",
  "stock symbol": "ticker",
  "security symbol": "ticker",
  cusip: "ticker",

  // company name
  name: "companyName",
  "company name": "companyName",
  "security name": "companyName",
  "investment name": "companyName",
  company: "companyName",
  description: "companyName",
  security: "companyName",
  issue: "companyName",

  // shares / quantity
  shares: "shares",
  qty: "shares",
  quantity: "shares",
  units: "shares",
  "# shares": "shares",
  "number of shares": "shares",
  "shares/units": "shares",
  "quantity held": "shares",

  // average cost
  "avg cost": "averageCost",
  "average cost": "averageCost",
  "avg price": "averageCost",
  "average price": "averageCost",
  "cost basis": "averageCost",
  "cost per share": "averageCost",
  "purchase price": "averageCost",
  "book value per share": "averageCost",
  "unit cost": "averageCost",
  avgcost: "averageCost",

  // current price
  price: "currentPrice",
  "current price": "currentPrice",
  "last price": "currentPrice",
  "market price": "currentPrice",
  "closing price": "currentPrice",
  close: "currentPrice",
  "last traded price": "currentPrice",
  "price/share": "currentPrice",

  // market value
  "market value": "marketValue",
  value: "marketValue",
  "total value": "marketValue",
  "mkt value": "marketValue",
  "current value": "marketValue",
  "account value": "marketValue",
  "total market value": "marketValue",
  marketvalue: "marketValue",

  // gain/loss
  "gain/loss": "gainLoss",
  "gain loss": "gainLoss",
  "unrealized gain/loss": "gainLoss",
  "unrealized gain": "gainLoss",
  "unrealised gain/loss": "gainLoss",
  pnl: "gainLoss",
  "profit/loss": "gainLoss",
  "total gain/loss": "gainLoss",
  "dollar gain/loss": "gainLoss",
  "$ gain/loss": "gainLoss",
  "gain/loss $": "gainLoss",
  "unrealized p&l": "gainLoss",
  gainloss: "gainLoss",

  // currency
  currency: "currency",
  curr: "currency",
  ccy: "currency",
};

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseCsvText(csvText: string, filename = ""): ParseResult {
  // Strip UTF-8 BOM if present
  const text = csvText.replace(/^\uFEFF/, "").trim();
  if (!text) {
    return {
      sourceType: "CSV",
      filename,
      holdings: [],
      warnings: ["The file appears to be empty."],
      status: "empty",
    };
  }

  const { data, errors, meta } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    // Keep raw headers — we'll lowercase ourselves for matching
    transformHeader: (h: string) => h.trim(),
  });

  const parseWarnings: string[] = [];

  if (errors.length > 0) {
    // papaparse error types: "Quotes" | "Delimiter" | "FieldMismatch"
  // A completely broken file will have many errors — treat that as fatal
  const fatal = errors.length > 20 ? errors[0] : null;
    if (fatal) {
      return {
        sourceType: "CSV",
        filename,
        holdings: [],
        warnings: [`CSV appears to be malformed (${errors.length} parse errors). Check the file format.`],
        status: "empty",
      };
    }
    parseWarnings.push(
      ...errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`),
    );
  }

  if (!meta.fields || meta.fields.length === 0) {
    return {
      sourceType: "CSV",
      filename,
      holdings: [],
      warnings: ["Could not detect column headers."],
      status: "empty",
    };
  }

  // Build a mapping: original header → canonical field name
  const fieldMap = buildFieldMap(meta.fields);

  if (!fieldMap.has("ticker")) {
    return {
      sourceType: "CSV",
      filename,
      holdings: [],
      warnings: [
        `Could not find a ticker/symbol column. Detected headers: ${meta.fields.join(", ")}`,
      ],
      status: "empty",
    };
  }

  const holdings: ParsedHolding[] = [];
  let skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 because row 1 is headers

    const get = (field: keyof ParsedHolding): string | undefined =>
      fieldMap.has(field)
        ? (row[fieldMap.get(field)!] ?? "").trim()
        : undefined;

    const rawTicker = get("ticker");
    const ticker = normalizeTicker(rawTicker);

    if (!ticker) {
      parseWarnings.push(`Row ${rowNum}: skipped — empty ticker`);
      skipped++;
      continue;
    }

    // Skip subtotal / summary rows that brokers sometimes include
    if (/^(total|subtotal|cash|account total|--)/i.test(ticker)) {
      parseWarnings.push(`Row ${rowNum}: skipped — looks like a summary row ("${ticker}")`);
      skipped++;
      continue;
    }

    const holding: ParsedHolding = {
      ticker,
      companyName: get("companyName") || null,
      shares: parseNum(get("shares")),
      averageCost: parseNum(get("averageCost")),
      currentPrice: parseNum(get("currentPrice")),
      marketValue: parseNum(get("marketValue")),
      gainLoss: parseNum(get("gainLoss")),
      currency: (get("currency") ?? "").toUpperCase() || "USD",
    };

    holdings.push(holding);
  }

  const deduped = deduplicateHoldings(holdings);

  const status =
    deduped.length === 0
      ? "empty"
      : skipped > 0
        ? "partial"
        : "ok";

  return {
    sourceType: "CSV",
    filename,
    holdings: deduped,
    warnings: parseWarnings,
    status,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map canonical field name → the original CSV header that best matches it.
 * Returns a Map so lookup is O(1).
 */
function buildFieldMap(
  headers: string[],
): Map<keyof ParsedHolding, string> {
  const map = new Map<keyof ParsedHolding, string>();

  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    const canonical = HEADER_ALIASES[lower];
    if (canonical && !map.has(canonical)) {
      map.set(canonical, header);
    }
  }

  // Fallback: first unmatched column might be ticker if nothing matched yet
  if (!map.has("ticker") && headers.length > 0) {
    const firstUnused = headers.find(
      (h) => !Array.from(map.values()).includes(h),
    );
    if (firstUnused) {
      map.set("ticker", firstUnused);
    }
  }

  return map;
}
