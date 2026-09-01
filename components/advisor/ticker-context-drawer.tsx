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
          "fixed inset-0 z-50 bg-foreground/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l bg-surface shadow-pop transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-[15px] font-semibold tracking-tight">
              {ticker}
            </span>
            {data?.quote != null && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold",
                  data.quote.changePct >= 0
                    ? "bg-success-soft text-success"
                    : "bg-destructive-soft text-destructive",
                )}
              >
                {data.quote.changePct >= 0 ? (
                  <TrendingUp className="h-3 w-3 stroke-[1.6]" />
                ) : (
                  <TrendingDown className="h-3 w-3 stroke-[1.6]" />
                )}
                {formatPercent(data.quote.changePct, 2)}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4 stroke-[1.6]" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin stroke-[1.6]" />
              <span className="text-[12.5px]">Loading quote and headlines…</span>
            </div>
          )}

          {error && (
            <p className="border bg-destructive-soft px-3 py-2 text-[12.5px] leading-relaxed text-destructive">
              {error}
            </p>
          )}

          {!loading && data && (
            <div className="space-y-5">
              <div className="border bg-background p-3">
                <div className="text-[11px] uppercase tracking-wide text-faint">
                  Lately
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed">
                  {data.articles[0]
                    ? data.articles[0].summary.slice(0, 280) +
                      (data.articles[0].summary.length > 280 ? "…" : "")
                    : "No recent headlines in the feed for this symbol. Check the News tab or your data provider."}
                </p>
              </div>

              {data.articles.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Newspaper className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
                    <span className="text-[13px] font-semibold">Headlines</span>
                  </div>
                  <ul className="border">
                    {data.articles.map((a, i) => (
                      <li
                        key={`${a.headline}-${i}`}
                        className="border-b bg-surface px-3 py-2.5 last:border-b-0"
                      >
                        <div className="text-[12.5px] font-medium leading-snug">
                          {a.headline}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-faint">
                          {a.source && <span>{a.source}</span>}
                          {a.publishedAt && (
                            <span className="font-mono">
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
