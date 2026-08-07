/**
 * Fetch and parse SEC Form 13F-HR information tables from EDGAR.
 * Public data — no API key. Requires a descriptive User-Agent (SEC policy).
 */

import {
  secHeaders,
  describeSecFailure,
  isLikelyUserAgentRejection,
} from "@/lib/sec/user-agent";

export type Raw13FHolding = {
  cusip: string;
  issuerName: string;
  valueUsd: number;
  shares: number;
  putCall: "Put" | "Call" | null;
};

export type Sec13FFiling = {
  cik: string;
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  sourceUrl: string;
  holdings: Raw13FHolding[];
  totalValueUsd: number;
};

const SEC_DATA = "https://data.sec.gov";
const SEC_WWW = "https://www.sec.gov";

const MIN_INTERVAL_MS = 120;
const MAX_ATTEMPTS = 3;
let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/**
 * Fetch from EDGAR with SEC-compliant headers and backoff.
 *
 * A 403 means the User-Agent was refused and retrying will not help, so we
 * fail fast with an actionable message. Throttling (429) and transient 5xx
 * responses are retried.
 */
async function secFetch(url: string): Promise<Response> {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await throttle();
    const res = await fetch(url, {
      headers: secHeaders(),
      next: { revalidate: 60 * 60 * 12 },
    });

    if (res.ok) return res;
    lastStatus = res.status;

    if (isLikelyUserAgentRejection(res.status)) {
      throw new Error(describeSecFailure(res.status, url));
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;

    await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
  }

  throw new Error(describeSecFailure(lastStatus, url));
}

function padCik(cik: string): string {
  const digits = cik.replace(/\D/g, "");
  return digits.padStart(10, "0");
}

function stripCikLeadingZeros(cik: string): string {
  return String(Number(cik.replace(/\D/g, "")));
}

function quarterLabel(reportDate: string): string {
  const d = new Date(`${reportDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return reportDate;
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()} Q${q}`;
}

export function format13FQuarter(reportDate: string): string {
  return quarterLabel(reportDate);
}

type SubmissionsJson = {
  cik?: string;
  name?: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
};

type IndexJson = {
  directory: {
    item: Array<{ name: string; type?: string; size?: string | number }>;
  };
};

function pickInfoTableFile(items: IndexJson["directory"]["item"]): string | null {
  const names = items.map((i) => i.name);
  const preferred = names.find(
    (n) =>
      /infotable\.xml$/i.test(n) ||
      /form13fInfoTable\.xml$/i.test(n) ||
      /informationtable\.xml$/i.test(n),
  );
  if (preferred) return preferred;

  // Berkshire-style numeric XML (not primary_doc)
  const candidates = names.filter(
    (n) =>
      n.toLowerCase().endsWith(".xml") &&
      !/primary_doc/i.test(n) &&
      !/xsl/i.test(n),
  );
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    // Prefer largest non-primary XML when sizes exist
    const withSize = items
      .filter((i) => candidates.includes(i.name))
      .map((i) => ({ name: i.name, size: Number(i.size) || 0 }))
      .sort((a, b) => b.size - a.size);
    return withSize[0]?.name ?? candidates[0];
  }
  return null;
}

function parseInfoTableXml(xml: string): Raw13FHolding[] {
  // Namespace-agnostic tag extraction
  const blocks = xml.match(/<infoTable\b[\s\S]*?<\/infoTable>/gi) ?? [];
  const holdings: Raw13FHolding[] = [];

  for (const block of blocks) {
    const issuerName = textBetween(block, "nameOfIssuer")?.trim();
    const cusip = textBetween(block, "cusip")?.trim().toUpperCase();
    const valueRaw = textBetween(block, "value");
    const sharesRaw = textBetween(block, "sshPrnamt");
    const putCallRaw = textBetween(block, "putCall")?.trim();

    if (!issuerName || !cusip || !valueRaw) continue;

    let valueUsd = Number(valueRaw.replace(/,/g, ""));
    if (!Number.isFinite(valueUsd)) continue;

    // Pre-2023 13F values were reported in thousands. Heuristic: if total
    // looks tiny for a known mega filer we still treat as-is; modern filings
    // use dollars. Keep raw number as USD dollars for post-2023 filings.
    const shares = Number((sharesRaw ?? "0").replace(/,/g, "")) || 0;

    let putCall: "Put" | "Call" | null = null;
    if (/^put$/i.test(putCallRaw ?? "")) putCall = "Put";
    if (/^call$/i.test(putCallRaw ?? "")) putCall = "Call";

    holdings.push({
      cusip,
      issuerName,
      valueUsd,
      shares,
      putCall,
    });
  }

  return holdings;
}

function textBetween(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : null;
}

/**
 * Aggregate duplicate CUSIP+putCall rows (common in multi-manager 13Fs).
 */
export function aggregateHoldings(raw: Raw13FHolding[]): Raw13FHolding[] {
  const map = new Map<string, Raw13FHolding>();
  for (const h of raw) {
    const key = `${h.cusip}|${h.putCall ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.valueUsd += h.valueUsd;
      existing.shares += h.shares;
    } else {
      map.set(key, { ...h });
    }
  }
  return [...map.values()].sort((a, b) => b.valueUsd - a.valueUsd);
}

export async function fetchLatest13F(cik: string): Promise<Sec13FFiling> {
  const padded = padCik(cik);
  const submissionsUrl = `${SEC_DATA}/submissions/CIK${padded}.json`;
  const submissions = (await (
    await secFetch(submissionsUrl)
  ).json()) as SubmissionsJson;

  const recent = submissions.filings.recent;
  let idx = -1;
  for (let i = 0; i < recent.form.length; i++) {
    const form = recent.form[i];
    // Prefer amendments when they appear first (most recent)
    if (form === "13F-HR" || form === "13F-HR/A") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    throw new Error(`No 13F-HR filing found for CIK ${padded}`);
  }

  const accessionNumber = recent.accessionNumber[idx];
  const filingDate = recent.filingDate[idx];
  const reportDate = recent.reportDate[idx];
  const form = recent.form[idx];
  const accessionPath = accessionNumber.replace(/-/g, "");
  const cikNum = stripCikLeadingZeros(padded);

  const indexUrl = `${SEC_WWW}/Archives/edgar/data/${cikNum}/${accessionPath}/index.json`;
  const index = (await (await secFetch(indexUrl)).json()) as IndexJson;
  const infoFile = pickInfoTableFile(index.directory.item ?? []);
  if (!infoFile) {
    throw new Error(
      `No information table XML in filing ${accessionNumber} for CIK ${padded}`,
    );
  }

  const infoUrl = `${SEC_WWW}/Archives/edgar/data/${cikNum}/${accessionPath}/${infoFile}`;
  const xml = await (await secFetch(infoUrl)).text();
  const holdings = aggregateHoldings(parseInfoTableXml(xml));
  const totalValueUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);

  return {
    cik: padded,
    accessionNumber,
    filingDate,
    reportDate,
    form,
    sourceUrl: infoUrl,
    holdings,
    totalValueUsd,
  };
}
