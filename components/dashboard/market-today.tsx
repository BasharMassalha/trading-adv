import { cn } from "@/lib/utils";
import type {
  HeadlineTheme,
  MarketTodaySnapshot,
} from "@/server/services/market-snapshot.service";

type Props = {
  snapshot: MarketTodaySnapshot;
};

function headlineThemeLabel(t: HeadlineTheme): string {
  const labels: Record<HeadlineTheme, string> = {
    macro: "Macro",
    tech: "Tech",
    earnings: "Earnings",
    energy: "Energy",
    finance: "Financials",
    general: "Markets",
  };
  return labels[t];
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

const THEME_ORDER: HeadlineTheme[] = [
  "macro",
  "tech",
  "earnings",
  "energy",
  "finance",
  "general",
];

export function MarketToday({ snapshot }: Props) {
  const {
    tiles,
    blendChangePct,
    mood,
    moodLabel,
    vix,
    narrativeLines,
    drivers,
  } = snapshot;

  const driversByTheme = drivers.reduce<
    Partial<Record<HeadlineTheme, typeof drivers>>
  >((acc, d) => {
    const list = acc[d.theme] ?? [];
    list.push(d);
    acc[d.theme] = list;
    return acc;
  }, {});

  return (
    <div className="border bg-surface">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="live-pulse h-1.5 w-1.5 rounded-full bg-success" />
          <h2 className="text-[13.5px] font-semibold tracking-tight">
            Market pulse
          </h2>
          <span className="hidden text-[11.5px] text-faint sm:inline">
            Index proxies, rotation, and what the headlines imply
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {vix != null && (
            <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px]">
              <span className="text-faint">VIX</span>
              <span>{vix.price.toFixed(2)}</span>
              <span
                className={
                  vix.changePct >= 0 ? "text-destructive" : "text-success"
                }
              >
                {formatPct(vix.changePct)}
              </span>
            </span>
          )}

          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
              mood === "up" && "bg-success-soft text-success",
              mood === "down" && "bg-destructive-soft text-destructive",
              mood === "mixed" && "bg-warning-soft text-warning",
            )}
          >
            {!Number.isNaN(blendChangePct) ? (
              <span className="font-mono">{formatPct(blendChangePct)} avg</span>
            ) : (
              <span>No live quotes</span>
            )}
            <span className="opacity-50">·</span>
            {moodLabel}
          </span>
        </div>
      </div>

      {/* Index tiles */}
      {tiles.length === 0 ? (
        <div className="border-b px-5 py-8 text-center text-[12px] text-muted-foreground">
          Quotes unavailable. Check market data settings.
        </div>
      ) : (
        <div className="hairline-grid grid border-x-0 border-t-0 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => {
            const up = t.changePct >= 0;
            return (
              <div key={t.symbol} className="px-[18px] py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-semibold">
                    {t.symbol}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[12px] font-semibold",
                      up ? "text-success" : "text-destructive",
                    )}
                  >
                    {formatPct(t.changePct)}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {t.shortLabel}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-faint">
                  {t.label}
                </div>
                <div className="mt-2.5 h-1 w-full bg-border">
                  <div
                    className={cn("h-full", up ? "bg-success" : "bg-destructive")}
                    style={{
                      width: `${Math.min(100, Math.abs(t.changePct) * 8 + 12)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Why it's moving */}
      {narrativeLines.length > 0 && (
        <div className="border-t px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-faint">
            Why it&rsquo;s moving
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {narrativeLines.map((line) => (
              <div key={line.id} className="border bg-background p-3">
                <div className="text-[12.5px] font-semibold leading-tight">
                  {line.title}
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  {line.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Headline map */}
      {drivers.length > 0 && (
        <div className="border-t px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-faint">
            Headline map
          </div>
          <div className="mt-3 space-y-3">
            {THEME_ORDER.map((theme) => {
              const list = driversByTheme[theme];
              if (!list?.length) return null;
              return (
                <div
                  key={theme}
                  className="grid gap-2 sm:grid-cols-[92px_1fr] sm:items-start"
                >
                  <div className="pt-1 text-[11px] text-faint">
                    {headlineThemeLabel(theme)}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((d) => (
                      <span
                        key={d.id}
                        className="max-w-full truncate rounded-md border bg-background px-2 py-1 text-[11px] leading-snug text-muted-foreground sm:max-w-[340px]"
                        title={d.label}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
