/**
 * Intraday-style snapshot of major US proxies + light narrative chips from news.
 */

import { getMarketDataProvider } from "@/lib/market-data/provider";
import { newsService } from "@/server/services/news.service";

export type IndexTile = {
  symbol: string;
  label: string;
  shortLabel: string;
  changePct: number;
  price: number;
};

export type MarketDriverChip = {
  id: string;
  label: string;
};

export type MarketTodaySnapshot = {
  tiles: IndexTile[];
  /** Average of tile change %; NaN if none */
  blendChangePct: number;
  mood: "up" | "down" | "mixed";
  moodLabel: string;
  drivers: MarketDriverChip[];
  fetchedAt: string;
};

const PROXIES: { symbol: string; label: string; shortLabel: string }[] = [
  { symbol: "SPY", label: "Large cap core", shortLabel: "S&P" },
  { symbol: "QQQ", label: "Growth & tech-heavy", shortLabel: "Nasdaq" },
  { symbol: "IWM", label: "US small caps", shortLabel: "Russell" },
];

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
      // skip failed proxy
    }
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
        ? "Defensive bid"
        : "Two-way / chop";

  const drivers: MarketDriverChip[] = [];
  try {
    const pulse = await newsService.getPulseForTicker("SPY", {
      limit: 5,
      daysBack: 3,
    });
    for (let i = 0; i < pulse.items.length; i++) {
      const h = pulse.items[i].headline?.trim();
      if (!h) continue;
      const label =
        h.length > 72 ? `${h.slice(0, 69).trim()}…` : h;
      drivers.push({ id: `n-${i}`, label });
      if (drivers.length >= 4) break;
    }
  } catch {
    /* ignore */
  }

  if (drivers.length === 0) {
    if (!Number.isNaN(blendChangePct)) {
      drivers.push({
        id: "synthetic-1",
        label:
          blendChangePct >= 0
            ? "Proxies green — check yields & mega-cap flow"
            : "Proxies red — watch rates & credit headlines",
      });
    } else {
      drivers.push({
        id: "synthetic-1",
        label: "Connect market data to unlock live quotes",
      });
    }
  }

  return {
    tiles,
    blendChangePct,
    mood,
    moodLabel,
    drivers,
    fetchedAt: new Date().toISOString(),
  };
}
