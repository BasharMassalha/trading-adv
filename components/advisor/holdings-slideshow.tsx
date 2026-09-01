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

/**
 * Verdict keys map to semantic tokens: `glow` tints the ticker tile, `ring`
 * sets its text colour, `chip` styles the verdict badge.
 */
function verdictPalette(v: HoldingVerdict | undefined) {
  switch (v) {
    case "BUY":
    case "ACCUMULATE":
      return {
        ring: "text-success",
        chip: "border-transparent bg-success-soft text-success",
        arrow: TrendingUp,
        glow: "bg-success-soft",
      };
    case "TRIM":
      return {
        ring: "text-warning",
        chip: "border-transparent bg-warning-soft text-warning",
        arrow: TrendingDown,
        glow: "bg-warning-soft",
      };
    case "SELL":
      return {
        ring: "text-destructive",
        chip: "border-transparent bg-destructive-soft text-destructive",
        arrow: TrendingDown,
        glow: "bg-destructive-soft",
      };
    case "WATCH":
      return {
        ring: "text-primary",
        chip: "border-transparent bg-primary-soft text-primary",
        arrow: Gauge,
        glow: "bg-primary-soft",
      };
    case "HOLD":
    default:
      return {
        ring: "text-muted-foreground",
        chip: "border-border bg-background text-muted-foreground",
        arrow: Gauge,
        glow: "bg-muted",
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
        <div className="border bg-surface p-8 text-center shadow-pop">
          <Sparkles className="mx-auto mb-3 h-5 w-5 stroke-[1.6] text-faint" />
          <p className="text-[14px] font-semibold">No per-stock analysis yet</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Generate or regenerate an analysis to unlock the walkthrough.
          </p>
          <Button onClick={onClose} variant="outline" className="mt-5">
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
      <div className="flex w-full max-w-4xl flex-col overflow-hidden border bg-surface shadow-pop">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b px-5 py-2.5">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
            <span>Per-stock walkthrough</span>
            <span className="text-faint">·</span>
            <span className="font-mono">
              {idx + 1} / {valid.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 stroke-[1.6]" />
          </Button>
        </div>

        {/* Slide body */}
        <div className="relative grid max-h-[78vh] overflow-y-auto bg-surface p-6 sm:p-8">
          <div className="relative space-y-5">
            {/* Hero */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center border font-mono text-[15px] font-semibold tracking-tight",
                      palette.glow,
                      palette.ring,
                    )}
                  >
                    {h.ticker}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          palette.chip,
                        )}
                      >
                        <Arrow className="h-3.5 w-3.5 stroke-[1.6]" />
                        {h.verdict ?? "HOLD"}
                      </span>
                      <span className="text-[11px] text-faint">
                        {convictionLabel(h.conviction)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
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
                  <Flame className="h-3.5 w-3.5 stroke-[1.6]" />
                  Latest pulse
                </Button>
              )}
            </div>

            {/* Thesis */}
            {h.thesis && (
              <div className="border bg-background p-4">
                <div className="text-[11px] uppercase tracking-wide text-faint">
                  Current thesis
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed">
                  {h.thesis}
                </p>
                {h.reason && h.thesis !== h.reason && (
                  <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                    {h.reason}
                  </p>
                )}
              </div>
            )}

            {/* Latest earnings call */}
            <EarningsCard data={h.earningsHighlight} ticker={h.ticker} />

            {/* Bull / Bear case */}
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailList
                icon={Lightbulb}
                title="From filings and news"
                hint="Sourced automatically for this name."
                items={h.recentDevelopments}
                emptyText="No filings or news ingested for this ticker. Verdict from portfolio metrics only."
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
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailList
                icon={ShieldAlert}
                title="Risks specific to this name"
                items={h.risks}
                emptyText="No idiosyncratic risks called out."
              />
              <DetailList
                icon={Gauge}
                title="Execution checklist"
                hint="Steps you own: alerts, sizing rules."
                items={h.todoItems}
                emptyText="Nothing to execute right now beyond the verdict above."
              />
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-faint">
              Informational only, not personal financial advice. Verify against
              your plan, taxes, and risk tolerance before any trade.
            </p>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdx((i) => (i - 1 + valid.length) % valid.length)}
            disabled={valid.length <= 1}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.6]" />
            Prev
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {valid.map((slide, i) => (
              <button
                key={`${slide.ticker}-${i}`}
                aria-label={`Go to ${slide.ticker}`}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-1 transition-all",
                  i === idx ? "w-6 bg-primary" : "w-2 bg-border-strong hover:bg-faint",
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
            <ChevronRight className="h-4 w-4 stroke-[1.6]" />
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
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

/**
 * Surprise keys map to semantic tokens: `bg` styles the result badge, `accent`
 * sets the card's border colour.
 */
function surprisePalette(label: string | undefined) {
  switch (label) {
    case "BEAT":
      return {
        bg: "border-transparent bg-success-soft text-success",
        accent: "border-success/40",
        icon: TrendingUp,
        word: "Beat",
      };
    case "MISSED":
      return {
        bg: "border-transparent bg-destructive-soft text-destructive",
        accent: "border-destructive/40",
        icon: TrendingDown,
        word: "Missed",
      };
    case "MET":
      return {
        bg: "border-transparent bg-warning-soft text-warning",
        accent: "border-warning/40",
        icon: Gauge,
        word: "Met",
      };
    default:
      return {
        bg: "border-border bg-muted text-muted-foreground",
        accent: "border-border",
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
    <div className={cn("border bg-background p-4", palette.accent)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Mic className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
        <div className="text-[11px] uppercase tracking-wide text-faint">
          Latest earnings call: {ticker}
        </div>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
            palette.bg,
          )}
        >
          <Icon className="h-3 w-3 stroke-[1.6]" />
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
        <p className="font-mono text-[11px] text-faint">
          {data.lastReportPeriod ?? "Most recent"}
          {lastDate ? ` · reported ${lastDate}` : ""}
        </p>
      )}

      {data.story && (
        <p className="mt-2 text-[13px] leading-relaxed">{data.story}</p>
      )}

      {(nextDate ||
        (data.nextWatchPoints && data.nextWatchPoints.length > 0)) && (
        <div className="mt-3 flex flex-wrap items-start gap-3 border bg-surface p-3">
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            <CalendarClock className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
            <span>Next call</span>
            {nextDate && (
              <span className="ml-1 rounded-md border bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                {nextDate}
              </span>
            )}
          </div>
          {data.nextWatchPoints && data.nextWatchPoints.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {data.nextWatchPoints.map((p, i) => (
                <li
                  key={i}
                  className="rounded-md border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
        "border bg-background p-4",
        isBull ? "border-success/30" : "border-destructive/30",
      )}
    >
      <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold">
        {isBull ? (
          <TrendingUp className="h-4 w-4 shrink-0 stroke-[1.6] text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 shrink-0 stroke-[1.6] text-destructive" />
        )}
        <span>{title}</span>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-2 text-[12.5px] leading-relaxed">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <span
                className={cn(
                  "mt-[7px] h-1 w-1 shrink-0",
                  isBull ? "bg-success" : "bg-destructive",
                )}
              />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-faint">{fallback}</p>
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
    <div className="border bg-background p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
        <Icon className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
        <span>{title}</span>
      </div>
      {hint && <p className="-mt-1 mb-2.5 text-[11px] text-faint">{hint}</p>}
      {items && items.length > 0 ? (
        <ul className="border">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex gap-2.5 border-b bg-surface px-2.5 py-2 text-[12.5px] leading-relaxed last:border-b-0"
            >
              <span className="shrink-0 font-mono text-[11px] font-semibold text-faint">
                {i + 1}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-faint">{emptyText}</p>
      )}
    </div>
  );
}
