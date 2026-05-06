"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gauge,
  Lightbulb,
  Mic,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  HoldingRecommendation,
  HoldingVerdict,
  ConvictionLevel,
} from "@/server/services/analysis.service";

type Props = {
  open: boolean;
  onClose: () => void;
  holdings: HoldingRecommendation[];
  onTickerPulse?: (ticker: string) => void;
};

function verdictPalette(v: HoldingVerdict | undefined) {
  switch (v) {
    case "BUY":
    case "ACCUMULATE":
      return {
        ring: "ring-emerald-500/40",
        chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        arrow: TrendingUp,
        glow: "from-emerald-500/15 via-emerald-500/0 to-emerald-500/0",
      };
    case "TRIM":
      return {
        ring: "ring-amber-500/40",
        chip: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
        arrow: TrendingDown,
        glow: "from-amber-500/15 via-amber-500/0 to-amber-500/0",
      };
    case "SELL":
      return {
        ring: "ring-rose-500/40",
        chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        arrow: TrendingDown,
        glow: "from-rose-500/15 via-rose-500/0 to-rose-500/0",
      };
    case "WATCH":
      return {
        ring: "ring-sky-500/40",
        chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
        arrow: Gauge,
        glow: "from-sky-500/15 via-sky-500/0 to-sky-500/0",
      };
    case "HOLD":
    default:
      return {
        ring: "ring-primary/30",
        chip: "bg-primary/10 text-primary border-primary/30",
        arrow: Gauge,
        glow: "from-primary/10 via-primary/0 to-primary/0",
      };
  }
}

function convictionLabel(c: ConvictionLevel | undefined): string {
  switch (c) {
    case "HIGH":
      return "High conviction";
    case "MEDIUM":
      return "Medium conviction";
    case "LOW":
      return "Low conviction";
    default:
      return "Conviction n/a";
  }
}

export function HoldingsSlideshow({
  open,
  onClose,
  holdings,
  onTickerPulse,
}: Props) {
  const valid = useMemo(
    () => holdings.filter((h) => h.ticker && h.ticker !== "BLEND"),
    [holdings],
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight")
        setIdx((i) => (i + 1) % Math.max(1, valid.length));
      else if (e.key === "ArrowLeft")
        setIdx((i) => (i - 1 + valid.length) % Math.max(1, valid.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, valid.length, onClose]);

  if (!open) return null;

  if (valid.length === 0) {
    return (
      <Overlay onClose={onClose}>
        <div className="rounded-2xl border bg-card p-8 text-center shadow-2xl">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="font-semibold">No per-stock analysis yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate (or regenerate) an analysis to unlock the walkthrough.
          </p>
          <Button onClick={onClose} className="mt-5">
            Close
          </Button>
        </div>
      </Overlay>
    );
  }

  const h = valid[idx];
  const palette = verdictPalette(h.verdict);
  const Arrow = palette.arrow;

  return (
    <Overlay onClose={onClose}>
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Per-stock walkthrough</span>
            <span className="mx-2">·</span>
            <span>
              {idx + 1} / {valid.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Slide body */}
        <div
          className={cn(
            "relative grid max-h-[78vh] overflow-y-auto bg-gradient-to-br p-6 sm:p-8",
            palette.glow,
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-from),_transparent_60%)] opacity-60" />

          <div className="relative space-y-6">
            {/* Hero */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border bg-background/70 ring-2 font-mono text-base font-bold tracking-tight backdrop-blur",
                      palette.ring,
                    )}
                  >
                    {h.ticker}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                          palette.chip,
                        )}
                      >
                        <Arrow className="h-3.5 w-3.5" />
                        {h.verdict ?? "HOLD"}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {convictionLabel(h.conviction)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/80">
                      {h.action.replace("CONSIDER_", "Consider ").replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
              {onTickerPulse && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTickerPulse(h.ticker)}
                  className="gap-1.5"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Latest pulse
                </Button>
              )}
            </div>

            {/* Thesis */}
            {h.thesis && (
              <div className="rounded-xl border bg-background/60 p-4 backdrop-blur">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Our thesis right now
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                  {h.thesis}
                </p>
                {h.reason && h.thesis !== h.reason && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {h.reason}
                  </p>
                )}
              </div>
            )}

            {/* Latest earnings call */}
            <EarningsCard data={h.earningsHighlight} ticker={h.ticker} />

            {/* Bull / Bear case */}
            <div className="grid gap-3 sm:grid-cols-2">
              <CaseCard
                tone="bull"
                title="Bull case"
                items={h.bullCase}
                fallback="No explicit bull-case bullets in this report."
              />
              <CaseCard
                tone="bear"
                title="Bear case"
                items={h.bearCase}
                fallback="No explicit bear-case bullets in this report."
              />
            </div>

            {/* Recent developments and catalysts */}
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailList
                icon={Lightbulb}
                title="What we found (filings & news)"
                hint="The AI did this work — you don't have to read filings yourself."
                items={h.recentDevelopments}
                emptyText="No filings/news ingested for this ticker — verdict from portfolio metrics only."
              />
              <DetailList
                icon={Target}
                title="Catalysts to watch"
                hint="Events that would change the verdict above."
                items={h.catalysts}
                emptyText="No specific catalysts identified."
              />
            </div>

            {/* Risks + execution */}
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailList
                icon={ShieldAlert}
                title="Risks specific to this name"
                items={h.risks}
                emptyText="No idiosyncratic risks called out."
              />
              <DetailList
                icon={Gauge}
                title="Your execution checklist"
                hint="Concrete steps you own (alerts, sizing rules)."
                items={h.todoItems}
                emptyText="Nothing to execute right now beyond the verdict above."
              />
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-muted-foreground">
              Informational only — not personal financial advice. Verify against
              your plan, taxes, and risk tolerance before any trade.
            </p>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdx((i) => (i - 1 + valid.length) % valid.length)}
            disabled={valid.length <= 1}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {valid.map((slide, i) => (
              <button
                key={`${slide.ticker}-${i}`}
                aria-label={`Go to ${slide.ticker}`}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setIdx((i) => (i + 1) % valid.length)}
            disabled={valid.length <= 1}
            className="gap-1.5"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl">{children}</div>
    </div>
  );
}

function formatDateShort(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function surprisePalette(label: string | undefined) {
  switch (label) {
    case "BEAT":
      return {
        bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        accent: "from-emerald-500/20 via-emerald-500/0 to-emerald-500/0",
        icon: TrendingUp,
        word: "Beat",
      };
    case "MISSED":
      return {
        bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        accent: "from-rose-500/20 via-rose-500/0 to-rose-500/0",
        icon: TrendingDown,
        word: "Missed",
      };
    case "MET":
      return {
        bg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
        accent: "from-amber-500/20 via-amber-500/0 to-amber-500/0",
        icon: Gauge,
        word: "Met",
      };
    default:
      return {
        bg: "bg-muted text-muted-foreground border-border",
        accent: "from-primary/10 via-primary/0 to-primary/0",
        icon: Mic,
        word: "Awaiting print",
      };
  }
}

function EarningsCard({
  data,
  ticker,
}: {
  data?: HoldingRecommendation["earningsHighlight"];
  ticker: string;
}) {
  if (!data) return null;
  const has =
    data.story ||
    data.surpriseLabel ||
    data.lastReportPeriod ||
    data.nextReportDate ||
    (data.nextWatchPoints && data.nextWatchPoints.length > 0);
  if (!has) return null;

  const palette = surprisePalette(data.surpriseLabel);
  const Icon = palette.icon;
  const lastDate = formatDateShort(data.lastReportDate);
  const nextDate = formatDateShort(data.nextReportDate);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-background/60 p-4 backdrop-blur",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70",
          palette.accent,
        )}
      />
      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-primary" />
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Latest earnings call — {ticker}
          </div>
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              palette.bg,
            )}
          >
            <Icon className="h-3 w-3" />
            {palette.word}
            {data.surprisePct != null && data.surpriseLabel !== "UNKNOWN" && (
              <span className="font-mono">
                {" "}
                {data.surprisePct >= 0 ? "+" : ""}
                {data.surprisePct.toFixed(1)}%
              </span>
            )}
          </span>
        </div>

        {(data.lastReportPeriod || lastDate) && (
          <p className="text-[11px] text-muted-foreground">
            {data.lastReportPeriod ?? "Most recent"}
            {lastDate ? ` · reported ${lastDate}` : ""}
          </p>
        )}

        {data.story && (
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {data.story}
          </p>
        )}

        {(nextDate ||
          (data.nextWatchPoints && data.nextWatchPoints.length > 0)) && (
          <div className="mt-3 flex flex-wrap items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span>Next call</span>
              {nextDate && (
                <span className="ml-1 rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  {nextDate}
                </span>
              )}
            </div>
            {data.nextWatchPoints && data.nextWatchPoints.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {data.nextWatchPoints.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-full border bg-background/70 px-2 py-0.5 text-[11px] text-foreground/80"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CaseCard({
  tone,
  title,
  items,
  fallback,
}: {
  tone: "bull" | "bear";
  title: string;
  items?: string[];
  fallback: string;
}) {
  const isBull = tone === "bull";
  return (
    <div
      className={cn(
        "rounded-xl border bg-background/60 p-4 backdrop-blur",
        isBull ? "border-emerald-500/25" : "border-rose-500/25",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        {isBull ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
        )}
        <span>{title}</span>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-1.5 text-sm leading-snug">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-foreground/85">
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  isBull ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-muted-foreground">{fallback}</p>
      )}
    </div>
  );
}

function DetailList({
  icon: Icon,
  title,
  hint,
  items,
  emptyText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  items?: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-4 backdrop-blur">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span>{title}</span>
      </div>
      {hint && <p className="-mt-1 mb-2 text-[11px] text-muted-foreground">{hint}</p>}
      {items && items.length > 0 ? (
        <ul className="space-y-1.5 text-sm leading-snug">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-foreground/85"
            >
              <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                {i + 1}
              </Badge>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
