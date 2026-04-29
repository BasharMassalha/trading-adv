/**
 * Intraday-style snapshot: major US proxies, optional VIX, rotation math,
 * and headline themes merged from SPY / QQQ / IWM with plain-English "why" lines.
 */

import { getMarketDataProvider } from "@/lib/market-data/provider";
import { newsService } from "@/server/services/news.service";
import type { NewsItem } from "@/lib/news/types";

export type IndexTile = {
  symbol: string;
  label: string;
  shortLabel: string;
  changePct: number;
  price: number;
};

export type HeadlineTheme =
  | "macro"
  | "tech"
  | "earnings"
  | "energy"
  | "finance"
  | "general";

export type MarketDriverChip = {
  id: string;
  label: string;
  theme: HeadlineTheme;
};

export type MarketInsightLine = {
  id: string;
  title: string;
  /** Single scannable line — ties price action to likely drivers */
  detail: string;
};

export type MarketTodaySnapshot = {
  tiles: IndexTile[];
  /** Average of SPY/QQQ/IWM change %; NaN if none */
  blendChangePct: number;
  mood: "up" | "down" | "mixed";
  moodLabel: string;
  /** Fear gauge when available */
  vix: { changePct: number; price: number } | null;
  /** Plain-language read on rotation + vol + news themes */
  narrativeLines: MarketInsightLine[];
  drivers: MarketDriverChip[];
  fetchedAt: string;
};

const PROXIES: { symbol: string; label: string; shortLabel: string }[] = [
  { symbol: "SPY", label: "Large cap core", shortLabel: "S&P" },
  { symbol: "QQQ", label: "Growth & tech-heavy", shortLabel: "Nasdaq" },
  { symbol: "IWM", label: "US small caps", shortLabel: "Russell" },
];

const VIX_SYMBOL = "^VIX";

const THEME_LABELS: Record<HeadlineTheme, string> = {
  macro: "Macro",
  tech: "Tech",
  earnings: "Earnings",
  energy: "Energy",
  finance: "Financials",
  general: "Markets",
};

function themeFromText(text: string): HeadlineTheme {
  const s = text.toLowerCase();
  if (
    /\b(fed|treasury|yield|bonds?|inflation|cpi|pce|jobs report|nfp|unemployment|rate cut|rate hike|fomc|powell|stimulus|recession)\b/.test(
      s,
    )
  ) {
    return "macro";
  }
  if (
    /\b(apple|microsoft|nvidia|google|alphabet|meta|amazon|tesla|ai chip|semiconductor|software|megacap|magnificent)\b/.test(
      s,
    )
  ) {
    return "tech";
  }
  if (
    /\b(earnings|revenue|eps|guidance|beats?|miss(es)?|quarter(e)?|dividend|buyback)\b/.test(s)
  ) {
    return "earnings";
  }
  if (/\b(oil|opec|crude|gasoline|energy|wti|brent|chevron|exxon)\b/.test(s)) {
    return "energy";
  }
  if (
    /\b(bank|banks|lending|credit|loan|default|regional bank|jpmorgan|goldman)\b/.test(s)
  ) {
    return "finance";
  }
  return "general";
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const a of items) {
    const k = `${(a.headline ?? "").toLowerCase().trim()}|${(a.source ?? "").toLowerCase()}`;
    if (!k.startsWith("|") && k.length > 2 && !seen.has(k)) {
      seen.add(k);
      out.push(a);
    }
  }
  return out;
}

function tileBySymbol(tiles: IndexTile[], sym: string): IndexTile | undefined {
  return tiles.find((t) => t.symbol === sym);
}

function fmt(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function buildRotationAndVolInsights(
  tiles: IndexTile[],
  blendChangePct: number,
  vix: { changePct: number; price: number } | null,
): MarketInsightLine[] {
  const lines: MarketInsightLine[] = [];
  const spy = tileBySymbol(tiles, "SPY");
  const qqq = tileBySymbol(tiles, "QQQ");
  const iwm = tileBySymbol(tiles, "IWM");

  if (spy && qqq) {
    const spread = qqq.changePct - spy.changePct;
    if (spread > 0.12) {
      lines.push({
        id: "rot-growth",
        title: "Growth leading",
        detail: `Nasdaq-heavy sleeve (QQQ ${fmt(qqq.changePct)}) is outperforming the broad S&P sleeve (SPY ${fmt(spy.changePct)}) — the tape is tilted toward megacap / duration-sensitive tech, not a purely equal-weight rally.`,
      });
    } else if (spread < -0.12) {
      lines.push({
        id: "rot-value",
        title: "Broad market vs. tech",
        detail: `SPY ${fmt(spy.changePct)}% vs QQQ ${fmt(qqq.changePct)}% — large-cap breadth is relatively firmer than the growth cohort; rotation may be away from prior tech leaders or into more cyclical/value-line support.`,
      });
    }
  }

  if (spy && iwm) {
    const sp = iwm.changePct - spy.changePct;
    if (sp > 0.1) {
      lines.push({
        id: "rot-small-strong",
        title: "Small caps participating",
        detail: `Russell (IWM ${fmt(iwm.changePct)}%) is ahead of SPY ${fmt(spy.changePct)}% — risk appetite may be broadening beyond the very largest names (often a risk-on tell when it holds).`,
      });
    } else if (sp < -0.1) {
      lines.push({
        id: "rot-small-lag",
        title: "Small-cap caution",
        detail: `IWM ${fmt(iwm.changePct)}% lags SPY ${fmt(spy.changePct)}% — liquidity and quality tend to trade ahead of the Russell; worth watching if “flight to quality” persists.`,
      });
    }
  }

  if (vix != null && !Number.isNaN(blendChangePct)) {
    const volUp = vix.changePct > 0.5;
    const volDown = vix.changePct < -0.5;
    if (volUp && blendChangePct < -0.05) {
      lines.push({
        id: "vol-risk-off",
        title: "Volatility bid",
        detail: `VIX ${fmt(vix.changePct)}% with red index proxies — options demand for hedges is rising alongside softer cash equity; often tied to macro headlines or event risk.`,
      });
    } else if (volDown && blendChangePct > 0.05) {
      lines.push({
        id: "vol-compress",
        title: "Volatility softer",
        detail: `VIX ${fmt(vix.changePct)}% while benchmarks lift — implied vol is coming in as buyers step in; can accompany carry / dip-buying when fear is not spiking.`,
      });
    } else if (Math.abs(vix.changePct) > 1) {
      lines.push({
        id: "vol-neutral",
        title: "Fear gauge moving",
        detail: `VIX ${fmt(vix.changePct)}% (~${vix.price.toFixed(2)}) — watch whether options stress confirms or fights the cash tape into the close.`,
      });
    }
  }

  return lines.slice(0, 4);
}

function headlineToChip(
  item: NewsItem,
  idx: number,
): MarketDriverChip | null {
  const h = item.headline?.trim();
  if (!h) return null;
  const label = h.length > 76 ? `${h.slice(0, 73).trim()}…` : h;
  const theme = themeFromText(`${h} ${item.summary ?? ""}`);
  return { id: `n-${idx}-${theme}`, label, theme };
}

function newsThemeInsight(
  chips: MarketDriverChip[],
  mood: MarketTodaySnapshot["mood"],
): MarketInsightLine | null {
  if (chips.length === 0) return null;
  const counts: Partial<Record<HeadlineTheme, number>> = {};
  for (const c of chips) {
    counts[c.theme] = (counts[c.theme] ?? 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const top = ranked[0]?.[0] as HeadlineTheme | undefined;
  if (!top || top === "general") {
    const first = chips[0];
    return {
      id: "news-mix",
      title: "Headline mix",
      detail: `Lead stories: “${first.label}” — cross-check with your tape (currently ${mood === "up" ? "firmer" : mood === "down" ? "softer" : "mixed"} averages).`,
    };
  }
  const themeWord = THEME_LABELS[top];
  const themeDetail: Record<HeadlineTheme, string> = {
    macro: "rates, inflation, or central-bank path",
    tech: "megacap tech, AI, or semiconductors",
    earnings: "results, guidance, or revisions",
    energy: "commodities or energy complex",
    finance: "banks, credit, or lending",
    general: "cross-asset drivers",
  };
  const moodPhrase =
    mood === "up"
      ? "supportive for risk assets if it holds"
      : mood === "down"
        ? "weighing on risk appetite in parallel with the softer tape"
        : "pulling the narrative in both directions";
  return {
    id: `news-${top}`,
    title: `${themeWord}-leaning headlines`,
    detail: `Several items cluster around ${themeWord.toLowerCase()} topics (${themeDetail[top]}) — that cluster is ${moodPhrase} today; confirm with primary sources on the Advisor News tab.`,
  };
}

export async function getMarketTodaySnapshot(): Promise<MarketTodaySnapshot> {
  const provider = getMarketDataProvider();
  const tiles: IndexTile[] = [];

  for (const p of PROXIES) {
    try {
      const q = await provider.getLatestQuote(p.symbol);
      tiles.push({
        symbol: p.symbol,
        label: p.label,
        shortLabel: p.shortLabel,
        changePct: q.changePercent,
        price: q.price,
      });
    } catch {
      /* skip */
    }
  }

  let vix: { changePct: number; price: number } | null = null;
  try {
    const vq = await provider.getLatestQuote(VIX_SYMBOL);
    vix = { changePct: vq.changePercent, price: vq.price };
  } catch {
    vix = null;
  }

  const blendChangePct =
    tiles.length > 0
      ? tiles.reduce((s, t) => s + t.changePct, 0) / tiles.length
      : NaN;

  let mood: MarketTodaySnapshot["mood"] = "mixed";
  if (!Number.isNaN(blendChangePct)) {
    if (blendChangePct > 0.12) mood = "up";
    else if (blendChangePct < -0.12) mood = "down";
    else mood = "mixed";
  }

  const moodLabel =
    mood === "up"
      ? "Risk-on tape"
      : mood === "down"
        ? "Defensive / soft tape"
        : "Two-way / chop";

  const allArticles: NewsItem[] = [];
  try {
    const [spyN, qqqN, iwmN] = await Promise.all([
      newsService.getPulseForTicker("SPY", { limit: 6, daysBack: 3 }),
      newsService.getPulseForTicker("QQQ", { limit: 5, daysBack: 3 }),
      newsService.getPulseForTicker("IWM", { limit: 4, daysBack: 3 }),
    ]);
    allArticles.push(...spyN.items, ...qqqN.items, ...iwmN.items);
  } catch {
    /* ignore */
  }

  const unique = dedupeNews(allArticles);
  unique.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  const drivers: MarketDriverChip[] = [];
  for (let i = 0; i < unique.length; i++) {
    const chip = headlineToChip(unique[i], i);
    if (chip) drivers.push(chip);
    if (drivers.length >= 10) break;
  }

  const rotationLines = buildRotationAndVolInsights(
    tiles,
    blendChangePct,
    vix,
  );
  const newsLine = newsThemeInsight(drivers, mood);
  const narrativeLines = [
    ...rotationLines,
    ...(newsLine ? [newsLine] : []),
  ].slice(0, 5);

  if (narrativeLines.length === 0) {
    if (!Number.isNaN(blendChangePct)) {
      narrativeLines.push({
        id: "fallback-tape",
        title: "Proxy snapshot",
        detail:
          blendChangePct >= 0
            ? "ETF proxies are green on average — without strong headline clusters, drivers may be microstructure, flows, or overseas sessions carrying over."
            : "ETF proxies are red on average — use the headline tags below and your macro calendar to explain continuation or mean-reversion.",
      });
    } else {
      narrativeLines.push({
        id: "fallback-data",
        title: "Connect data",
        detail:
          "Live quotes did not load — check MARKET_DATA_PROVIDER and network; headline tags may still reflect your news provider.",
      });
    }
  }

  if (drivers.length === 0 && !Number.isNaN(blendChangePct)) {
    drivers.push({
      id: "synthetic-1",
      label:
        blendChangePct >= 0
          ? "Few SPY/QQQ/IWM headlines in feed — focus on rates, USD, and mega-cap flow"
          : "Few headlines in feed — watch volatility, credit, and large-cap earnings revisions",
      theme: "general",
    });
  }

  return {
    tiles,
    blendChangePct,
    mood,
    moodLabel,
    vix,
    narrativeLines,
    drivers,
    fetchedAt: new Date().toISOString(),
  };
}
