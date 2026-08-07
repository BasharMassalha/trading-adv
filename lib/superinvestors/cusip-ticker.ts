/**
 * Resolve CUSIP → ticker via OpenFIGI (free, no key required for light use).
 */

type FigiResult = {
  ticker?: string;
  name?: string;
  exchCode?: string;
  securityType?: string;
  marketSector?: string;
};

const cache = new Map<string, string | null>();

const PREFERRED_EXCHANGES = new Set([
  "US",
  "UN",
  "UQ",
  "UW",
  "UA",
  "N",
  "A",
  "P",
]);

function pickTicker(rows: FigiResult[] | undefined): string | null {
  if (!rows?.length) return null;
  const preferred = rows.find(
    (r) =>
      r.ticker &&
      PREFERRED_EXCHANGES.has(r.exchCode ?? "") &&
      !String(r.ticker).includes("*"),
  );
  if (preferred?.ticker) return preferred.ticker.toUpperCase();
  const any = rows.find((r) => r.ticker && !String(r.ticker).includes("*"));
  return any?.ticker ? any.ticker.toUpperCase() : null;
}

async function mapBatch(cusips: string[]): Promise<void> {
  const body = cusips.map((c) => ({ idType: "ID_CUSIP", idValue: c }));
  const res = await fetch("https://api.openfigi.com/v3/mapping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) {
    // Mark as unresolved so we don't hammer on failure
    for (const c of cusips) cache.set(c, null);
    return;
  }
  const json = (await res.json()) as Array<{ data?: FigiResult[] }>;
  cusips.forEach((c, i) => {
    cache.set(c, pickTicker(json[i]?.data));
  });
}

/**
 * Resolve many CUSIPs to tickers (batched). Returns Map cusip → ticker|null.
 */
export async function resolveCusipsToTickers(
  cusips: string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(cusips.map((c) => c.toUpperCase()))];
  const missing = unique.filter((c) => !cache.has(c));

  const BATCH = 10;
  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH);
    try {
      await mapBatch(slice);
    } catch {
      for (const c of slice) cache.set(c, null);
    }
    if (i + BATCH < missing.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  const out = new Map<string, string | null>();
  for (const c of unique) out.set(c, cache.get(c) ?? null);
  return out;
}
