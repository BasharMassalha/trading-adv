"use client";

import { useEffect, useState } from "react";
import { X, Loader2, TrendingDown, TrendingUp, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPercent } from "@/lib/utils";

type Article = {
  headline: string;
  summary: string;
  source?: string;
  publishedAt?: string;
};

type PulsePayload = {
  ticker: string;
  quote: { changePct: number; price: number } | null;
  articles: Article[];
};

type Props = {
  ticker: string | null;
  onClose: () => void;
};

export function TickerContextDrawer({ ticker, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PulsePayload | null>(null);

  useEffect(() => {
    if (!ticker) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(
          `/api/ticker-pulse?ticker=${encodeURIComponent(ticker)}`,
        );
        const json = await res.json();
        if (!json.ok) {
          if (!cancelled) setError(json.error?.message ?? "Could not load pulse.");
          return;
        }
        if (!cancelled) setData(json.data as PulsePayload);
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (!ticker) return null;

  const open = true;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className={cn(
          "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-tight">{ticker}</span>
            {data?.quote != null && (
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
                  data.quote.changePct >= 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                )}
              >
                {data.quote.changePct >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercent(data.quote.changePct, 2)}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Pulling tape & headlines…</span>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {!loading && data && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Lately
                </div>
                <p className="mt-1 text-sm leading-snug text-foreground/90">
                  {data.articles[0]
                    ? data.articles[0].summary.slice(0, 280) +
                      (data.articles[0].summary.length > 280 ? "…" : "")
                    : "No recent headlines in our feed for this symbol — check the News tab or your data provider."}
                </p>
              </div>

              {data.articles.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Newspaper className="h-3.5 w-3.5" />
                    Headline stack
                  </div>
                  <ul className="space-y-2">
                    {data.articles.map((a, i) => (
                      <li
                        key={`${a.headline}-${i}`}
                        className="rounded-lg border bg-background/50 px-3 py-2"
                      >
                        <div className="text-xs font-medium leading-snug">{a.headline}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                          {a.source && (
                            <span className="rounded bg-muted px-1.5 py-0.5">{a.source}</span>
                          )}
                          {a.publishedAt && (
                            <span>
                              {new Date(a.publishedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
