"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Verdict = "Accumulate" | "Hold" | "Recycle";

type Segment = { text: string; cite?: number };

type Slide = {
  ticker: string;
  company: string;
  sector: string;
  verdict: Verdict;
  conviction: number;
  chips: { k: string; v: string }[];
  excerpt: Segment[];
  sources: string[];
  holders: string[];
  holdersLabel: string;
};

const SLIDES: Slide[] = [
  {
    ticker: "MSFT",
    company: "Microsoft Corporation",
    sector: "Technology",
    verdict: "Accumulate",
    conviction: 92,
    chips: [
      { k: "Latest filing", v: "10-K, Jul 2026" },
      { k: "13F consensus", v: "6 funds hold" },
      { k: "90-day price", v: "+14.2%" },
      { k: "Analyst view", v: "Buy, 41 of 52" },
    ],
    excerpt: [
      { text: "Revenue growth in the latest 10-K", cite: 1 },
      {
        text: " was driven by cloud infrastructure demand, corroborated by consistent accumulation across six tracked superinvestor filings",
        cite: 2,
      },
      { text: ". Current pricing sits below the analyst consensus target", cite: 3 },
      { text: "." },
    ],
    sources: [
      "SEC EDGAR, 10-K filed Jul 28 2026.",
      "13F consensus, Q2 2026.",
      "Aggregated analyst estimates, updated daily.",
    ],
    holders: ["BC", "SW", "TR", "MK", "+2"],
    holdersLabel: "Held by 6 tracked funds",
  },
  {
    ticker: "NVDA",
    company: "NVIDIA Corporation",
    sector: "Technology",
    verdict: "Hold",
    conviction: 78,
    chips: [
      { k: "Latest filing", v: "10-Q, Aug 2026" },
      { k: "13F consensus", v: "10 funds hold" },
      { k: "90-day price", v: "+9.7%" },
      { k: "Hedge signal", v: "3 disclosed puts" },
    ],
    excerpt: [
      { text: "Ten tracked superinvestors hold this position", cite: 1 },
      {
        text: ", but three have disclosed protective put activity in the same quarter",
        cite: 2,
      },
      {
        text: ", a hedge, not necessarily a reversal, though worth watching against the next earnings print",
        cite: 3,
      },
      { text: "." },
    ],
    sources: [
      "13F consensus, Q2 2026.",
      "13F options disclosures, Q2 2026.",
      "Company earnings calendar.",
    ],
    holders: ["DP", "KL", "JH", "RN", "+6"],
    holdersLabel: "Held by 10 tracked funds",
  },
  {
    ticker: "ORCL",
    company: "Oracle Corporation",
    sector: "Technology",
    verdict: "Recycle",
    conviction: 41,
    chips: [
      { k: "Latest filing", v: "10-K, Jun 2026" },
      { k: "13F consensus", v: "1 fund holds" },
      { k: "90-day price", v: "-13.0%" },
      { k: "Analyst view", v: "Hold, 22 of 52" },
    ],
    excerpt: [
      {
        text: "Institutional conviction has thinned to a single tracked fund this quarter",
        cite: 1,
      },
      { text: ", well below the sector average", cite: 2 },
      {
        text: ". Price action has lagged every other position in the same sector over 90 days",
        cite: 3,
      },
      { text: "." },
    ],
    sources: [
      "13F consensus, Q2 2026.",
      "Sector-wide 13F benchmark.",
      "90-day price history.",
    ],
    holders: ["GT"],
    holdersLabel: "Held by 1 tracked fund",
  },
];

const VERDICT_TONE: Record<Verdict, string> = {
  Accumulate: "bg-success-soft text-success",
  Hold: "bg-warning-soft text-warning",
  Recycle: "bg-destructive-soft text-destructive",
};

const ROTATE_MS = 5200;

export function LandingAnalysisFrame() {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  const goTo = useCallback(
    (next: number) => {
      if (next === index) return;
      setFading(true);
      fadeTimer.current = setTimeout(() => {
        setIndex(next);
        setFading(false);
      }, 200);
    },
    [index],
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => goTo((index + 1) % SLIDES.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [index, paused, goTo]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const slide = SLIDES[index];

  return (
    <div
      className="w-full overflow-hidden border bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-1.5 border-b px-3.5 py-2.5">
        <span className="h-2 w-2 rounded-full bg-border-strong" />
        <span className="h-2 w-2 rounded-full bg-border-strong" />
        <span className="h-2 w-2 rounded-full bg-border-strong" />
        <span className="ml-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="live-pulse h-1.5 w-1.5 rounded-full bg-success" />
          Position analysis
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-faint">
          {index + 1} / {SLIDES.length}
        </span>
      </div>

      <div className="p-5">
        <div
          className={cn(
            "transition-opacity duration-200",
            fading ? "opacity-0" : "opacity-100",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[19px] font-semibold leading-none">
                {slide.ticker}
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted-foreground">
                {slide.company}
                <span className="mx-1.5 text-faint">·</span>
                {slide.sector}
              </div>
            </div>
            <div className="text-right">
              <span
                className={cn(
                  "inline-block rounded-[5px] px-2.5 py-1 text-[11px] font-medium",
                  VERDICT_TONE[slide.verdict],
                )}
              >
                {slide.verdict}
              </span>
              <div className="mt-1.5 font-mono text-[11px] text-faint">
                conviction {slide.conviction}/100
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {slide.chips.map((chip) => (
              <div
                key={chip.k}
                className="rounded-md border bg-background px-2.5 py-1.5"
              >
                <span className="block text-[10px] text-faint">{chip.k}</span>
                <span className="mt-px block text-[11.5px] font-medium">
                  {chip.v}
                </span>
              </div>
            ))}
          </div>

          <p className="mb-3 text-[12px] leading-relaxed">
            {slide.excerpt.map((seg, i) => (
              <span key={i}>
                {seg.text}
                {seg.cite ? (
                  <sup className="ml-px text-[9px] text-primary">{seg.cite}</sup>
                ) : null}
              </span>
            ))}
          </p>

          <div className="mb-4 border-t pt-2.5 text-[10px] leading-relaxed text-faint">
            {slide.sources.map((source, i) => (
              <span key={source}>
                {i + 1}. {source}
                {i < slide.sources.length - 1 ? "  " : ""}
              </span>
            ))}
          </div>

          <div className="flex items-center">
            {slide.holders.map((h, i) => (
              <span
                key={h}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary-soft text-[9.5px] font-semibold text-primary",
                  i > 0 && "-ml-1.5",
                )}
              >
                {h}
              </span>
            ))}
            <span className="ml-2.5 text-[11px] text-muted-foreground">
              {slide.holdersLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-1.5 pb-4">
        {SLIDES.map((s, i) => (
          <button
            key={s.ticker}
            type="button"
            aria-label={`Show ${s.ticker} analysis`}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-4 bg-primary" : "w-1.5 bg-border-strong",
            )}
          />
        ))}
      </div>
    </div>
  );
}
