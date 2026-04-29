import { Activity, Layers, Radio, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeadlineTheme, MarketTodaySnapshot } from "@/server/services/market-snapshot.service";

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

  const driversByTheme = drivers.reduce<Partial<Record<HeadlineTheme, typeof drivers>>>(
    (acc, d) => {
      const list = acc[d.theme] ?? [];
      list.push(d);
      acc[d.theme] = list;
      return acc;
    },
    {},
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Market pulse</h2>
              <p className="text-[11px] text-muted-foreground">
                Proxies + rotation + what headlines imply
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {vix != null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  vix.changePct >= 0.3
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    : "border-muted bg-muted/40 text-muted-foreground",
                )}
              >
                <Shield className="h-3 w-3" />
                <span className="font-mono">VIX</span>
                <span className="text-foreground">{vix.price.toFixed(2)}</span>
                <span
                  className={cn(
                    vix.changePct >= 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {formatPct(vix.changePct)}
                </span>
              </div>
            )}

            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                mood === "up" &&
                  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                mood === "down" && "bg-rose-500/15 text-rose-700 dark:text-rose-400",
                mood === "mixed" && "bg-amber-500/15 text-amber-800 dark:text-amber-400",
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              {!Number.isNaN(blendChangePct) ? (
                <span>{formatPct(blendChangePct)} avg</span>
              ) : (
                <span>No live quotes</span>
              )}
              <span className="text-muted-foreground">·</span>
              <span>{moodLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
              Quotes unavailable — check market data settings.
            </div>
          ) : (
            tiles.map((t) => {
              const up = t.changePct >= 0;
              return (
                <div
                  key={t.symbol}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border px-3 py-3 transition-colors",
                    up
                      ? "border-emerald-500/20 bg-emerald-500/[0.06] hover:border-emerald-500/35"
                      : "border-rose-500/20 bg-rose-500/[0.06] hover:border-rose-500/35",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{t.symbol}</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold",
                        up ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/20 text-rose-700 dark:text-rose-300",
                      )}
                    >
                      {formatPct(t.changePct)}
                    </span>
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t.shortLabel}
                  </div>
                  <div className="mt-0.5 text-xs text-foreground/80">{t.label}</div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-background/60">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        up ? "bg-emerald-500/70" : "bg-rose-500/70",
                      )}
                      style={{
                        width: `${Math.min(100, Math.abs(t.changePct) * 8 + 12)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Why the tape — structured explanations */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Why it’s moving (read)
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {narrativeLines.map((line) => (
              <div
                key={line.id}
                className="rounded-lg border bg-background/70 p-3 shadow-sm"
              >
                <div className="text-xs font-semibold leading-tight text-foreground">
                  {line.title}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {line.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Zap className="h-3 w-3" />
            Headline map (auto-tagged)
          </div>
          <div className="space-y-3">
            {THEME_ORDER.map((theme) => {
              const list = driversByTheme[theme];
              if (!list?.length) return null;
              return (
                <div key={theme}>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                    {headlineThemeLabel(theme)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {list.map((d) => (
                      <span
                        key={d.id}
                        className="max-w-full sm:max-w-[340px] truncate rounded-lg border bg-background/85 px-2.5 py-1.5 text-[11px] leading-snug text-foreground/90 shadow-sm backdrop-blur-sm"
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
      </div>
    </div>
  );
}
