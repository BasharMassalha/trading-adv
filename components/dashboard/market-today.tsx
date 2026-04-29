import { Activity, Radio, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketTodaySnapshot } from "@/server/services/market-snapshot.service";

type Props = {
  snapshot: MarketTodaySnapshot;
};

function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function MarketToday({ snapshot }: Props) {
  const { tiles, blendChangePct, mood, moodLabel, drivers } = snapshot;

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
              <p className="text-[11px] text-muted-foreground">Session proxies · now</p>
            </div>
          </div>

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

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Zap className="h-3 w-3" />
            Signal stack
          </div>
          <div className="flex flex-wrap gap-2">
            {drivers.map((d) => (
              <span
                key={d.id}
                className="max-w-[340px] truncate rounded-lg border bg-background/80 px-2.5 py-1.5 text-[11px] leading-snug text-foreground/90 shadow-sm backdrop-blur-sm"
                title={d.label}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
