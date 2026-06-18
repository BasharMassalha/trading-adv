/**
 * Briefing builder.
 *
 * Converts a finished portfolio analysis report into a short, ordered set of
 * "scenes" that can be played back like a narrated video. Each scene carries
 * the on-screen visuals (title / bullets / badge) and a `narration` string that
 * is spoken aloud by the briefing player.
 *
 * This is fully deterministic and runs client-side from data the advisor page
 * already has, so it needs no extra API calls, storage, or dependencies.
 */

import type { ReportView, HoldingRecommendation } from "@/server/services/analysis.service";

export type BriefingTone =
  | "neutral"
  | "positive"
  | "negative"
  | "warning"
  | "info";

export type BriefingSceneKind =
  | "intro"
  | "strengths"
  | "risks"
  | "opportunities"
  | "holding"
  | "additions"
  | "rebalance"
  | "outro";

export type BriefingScene = {
  id: string;
  kind: BriefingSceneKind;
  title: string;
  subtitle?: string;
  /** Text spoken aloud while the scene is on screen. */
  narration: string;
  /** Visual bullet points shown on the scene. */
  bullets?: string[];
  /** Short label badge (e.g. a verdict or action). */
  badge?: string;
  tone?: BriefingTone;
};

export type Briefing = {
  title: string;
  generatedAt?: string | null;
  scenes: BriefingScene[];
};

/** Minimal shape of a news article the briefing can reference. */
export type BriefingNewsItem = {
  ticker?: string;
  headline: string;
  summary?: string;
  source?: string;
  publishedAt?: string;
};

const MAX_HOLDINGS = 12;
const MAX_BULLETS = 4;

function actionLabel(action: HoldingRecommendation["action"]): string {
  switch (action) {
    case "CONSIDER_SELLING":
      return "Consider selling";
    case "CONSIDER_REDUCING":
      return "Consider trimming";
    case "CONSIDER_ADDING":
      return "Consider adding";
    case "HOLD":
    default:
      return "Hold";
  }
}

function actionTone(action: HoldingRecommendation["action"]): BriefingTone {
  switch (action) {
    case "CONSIDER_SELLING":
      return "negative";
    case "CONSIDER_REDUCING":
      return "warning";
    case "CONSIDER_ADDING":
      return "positive";
    case "HOLD":
    default:
      return "neutral";
  }
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Ensure a spoken line ends with sentence punctuation for natural pacing. */
function asSentence(text: string): string {
  const t = clean(text);
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Build a plain-English financial line from a holding's earnings highlight. */
function earningsLine(h: HoldingRecommendation): string | null {
  const e = h.earningsHighlight;
  if (!e) return null;
  const story = clean(e.story);
  if (story) return story;
  const parts: string[] = [];
  if (e.lastReportPeriod) parts.push(`In ${clean(e.lastReportPeriod)}`);
  if (e.surpriseLabel && e.surpriseLabel !== "UNKNOWN") {
    const verb =
      e.surpriseLabel === "BEAT"
        ? "beat expectations"
        : e.surpriseLabel === "MISSED"
          ? "missed expectations"
          : "met expectations";
    const pct =
      typeof e.surprisePct === "number"
        ? ` by ${Math.abs(e.surprisePct).toFixed(1)}%`
        : "";
    parts.push(
      `${parts.length ? "it " : `${h.ticker} `}${verb}${pct}`,
    );
  }
  return parts.length ? parts.join(", ") : null;
}

/** Find the most relevant recent headline for a ticker. */
function latestHeadlineFor(
  ticker: string,
  news: BriefingNewsItem[] | undefined,
): BriefingNewsItem | null {
  if (!news || news.length === 0) return null;
  const t = ticker.toUpperCase();
  const matches = news.filter(
    (n) => (n.ticker ?? "").toUpperCase() === t && clean(n.headline),
  );
  if (matches.length === 0) return null;
  const sorted = [...matches].sort((a, b) => {
    const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return db - da;
  });
  return sorted[0] ?? null;
}

/**
 * Build an ordered briefing from a finished report.
 * Returns `null` when there isn't enough content to narrate.
 */
export function buildBriefing(
  report: ReportView | null | undefined,
  portfolioName: string,
  news?: BriefingNewsItem[],
): Briefing | null {
  if (!report) return null;

  const scenes: BriefingScene[] = [];
  const name = clean(portfolioName) || "your portfolio";

  // ── Intro ────────────────────────────────────────────────────────────────
  const summary = clean(report.summary);
  scenes.push({
    id: "intro",
    kind: "intro",
    title: "Your portfolio briefing",
    subtitle: name,
    tone: "info",
    narration: summary
      ? `Hey — let's take a few minutes to walk through ${name} together. ${asSentence(
          summary,
        )} Here's what stood out, and what I'd think about next.`
      : `Hey — let's take a few minutes to walk through ${name} together. I'll show you what stood out in the analysis, and what might be worth doing next.`,
    bullets: summary ? [summary] : undefined,
  });

  // ── Strengths ──────────────────────────────────────────────────────────────
  const strengths = (report.strengths ?? []).map(clean).filter(Boolean);
  if (strengths.length > 0) {
    const top = strengths.slice(0, MAX_BULLETS);
    scenes.push({
      id: "strengths",
      kind: "strengths",
      title: "What's working",
      tone: "positive",
      bullets: top,
      narration: `Let's start with the good news — there's real strength here. ${top
        .map(asSentence)
        .join(" ")} That's a solid foundation to build on.`,
    });
  }

  // ── Risks ──────────────────────────────────────────────────────────────────
  const risks = (report.risks ?? []).map(clean).filter(Boolean);
  if (risks.length > 0) {
    const top = risks.slice(0, MAX_BULLETS);
    scenes.push({
      id: "risks",
      kind: "risks",
      title: "What to watch",
      tone: "warning",
      bullets: top,
      narration: `Now, a few things worth keeping an eye on — nothing to panic about, just worth knowing. ${top
        .map(asSentence)
        .join(" ")}`,
    });
  }

  // ── Per-holding action plan (the "reasons for the action plan") ─────────────
  const holdings = (report.actionPlan?.holdingsToReview ?? []).filter(
    (h) => h.ticker && h.ticker !== "BLEND",
  );
  const reviewable = holdings.slice(0, MAX_HOLDINGS);
  reviewable.forEach((h, i) => {
    const label = actionLabel(h.action);
    const reason = clean(h.reason) || clean(h.thesis);
    const opener =
      i === 0
        ? "Let's talk about your positions."
        : i === reviewable.length - 1
          ? "And finally,"
          : "Next up,";

    // Financial snapshot (earnings) + latest news for this specific stock.
    const financials = earningsLine(h);
    const development =
      (h.recentDevelopments ?? []).map(clean).filter(Boolean)[0] ?? null;
    const headline = latestHeadlineFor(h.ticker, news);

    const bullets: string[] = [];
    if (reason) bullets.push(reason);
    if (financials) bullets.push(`Financials: ${financials}`);
    if (headline) {
      bullets.push(
        `Latest news: ${clean(headline.headline)}${
          headline.source ? ` (${clean(headline.source)})` : ""
        }`,
      );
    } else if (development) {
      bullets.push(`Recently: ${development}`);
    }

    const narrationParts: string[] = [
      `${opener} ${h.ticker}.`,
      `My read here is to ${label.toLowerCase()}.`,
    ];
    if (reason) narrationParts.push(asSentence(reason));
    if (financials)
      narrationParts.push(`On the numbers, ${asSentence(financials)}`);
    if (headline) {
      narrationParts.push(
        `And in the latest news, ${asSentence(clean(headline.headline))}`,
      );
    } else if (development) {
      narrationParts.push(`Recently, ${asSentence(development)}`);
    }

    scenes.push({
      id: `holding-${h.ticker}-${i}`,
      kind: "holding",
      title: h.ticker,
      subtitle: label,
      badge: h.verdict ?? label,
      tone: actionTone(h.action),
      bullets: bullets.length > 0 ? bullets : undefined,
      narration: narrationParts.join(" "),
    });
  });

  // ── Ideas to research ──────────────────────────────────────────────────────
  const additions = (report.actionPlan?.potentialAdditions ?? [])
    .map((a) => ({
      ticker: clean(a.ticker),
      suggestion: clean(a.suggestion),
      rationale: clean(a.rationale),
    }))
    .filter((a) => a.suggestion || a.ticker)
    .slice(0, MAX_BULLETS);
  if (additions.length > 0) {
    scenes.push({
      id: "additions",
      kind: "additions",
      title: "Stocks & ideas to research",
      tone: "info",
      bullets: additions.map((a) =>
        [a.ticker, a.suggestion].filter(Boolean).join(" — ") +
        (a.rationale ? `: ${a.rationale}` : ""),
      ),
      narration: `If you're looking to put new money to work, here are a few names worth researching — including specific stocks, not just funds. ${additions
        .map((a) =>
          asSentence(
            [a.ticker || a.suggestion, a.rationale].filter(Boolean).join(", "),
          ),
        )
        .join(" ")} Do your own homework on these, of course.`,
    });
  }

  // ── Rebalancing steps ──────────────────────────────────────────────────────
  const steps = (report.actionPlan?.rebalancingSteps ?? [])
    .map(clean)
    .filter(Boolean)
    .slice(0, MAX_BULLETS);
  if (steps.length > 0) {
    scenes.push({
      id: "rebalance",
      kind: "rebalance",
      title: "Your action plan",
      tone: "info",
      bullets: steps,
      narration: `So, putting it all together — here's where I'd focus, in order. ${steps
        .map((s, i) => asSentence(`Step ${i + 1}. ${s}`))
        .join(" ")}`,
    });
  }

  // ── Outro / disclaimer ─────────────────────────────────────────────────────
  scenes.push({
    id: "outro",
    kind: "outro",
    title: "That's your briefing",
    tone: "neutral",
    bullets: [
      "Informational only — not personal financial advice.",
      "Verify against your plan, taxes, and risk tolerance before any trade.",
    ],
    narration:
      "And that's the picture. Quick reminder before you go — this is informational only, not personal financial advice. Take a moment to check it against your own plan, your taxes, and how much risk you're comfortable with before making any move. Thanks for spending a few minutes with me.",
  });

  // Need more than just intro + outro to be worth playing.
  if (scenes.length <= 2 && !summary) return null;

  return {
    title: name,
    generatedAt: report.generatedAt ? String(report.generatedAt) : null,
    scenes,
  };
}

/** Estimate how long (ms) a narration line should stay on screen if no TTS. */
export function estimateSceneDurationMs(scene: BriefingScene): number {
  const words = clean(scene.narration).split(/\s+/).filter(Boolean).length;
  // ~165 words/min reading pace, with a sensible floor/ceiling.
  const ms = (words / 165) * 60_000;
  return Math.min(16_000, Math.max(3_500, ms));
}
