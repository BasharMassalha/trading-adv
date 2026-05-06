/**
 * OpenAI-powered portfolio analysis report generator.
 *
 * Uses GPT-4 to generate structured portfolio analysis based on:
 * - Portfolio holdings and metrics
 * - Investor profile and preferences
 * - Optional news and filings context (future)
 *
 * CONFIGURATION
 * ─────────────
 * - OPENAI_API_KEY: Required for API access
 * - OPENAI_ANALYSIS_MODEL: Model to use (default: gpt-4o)
 *
 * OUTPUT VALIDATION
 * ─────────────────
 * All model responses are validated with Zod to ensure type safety.
 * Invalid responses are rejected with a typed error.
 */

import OpenAI from "openai";
import { z } from "zod";
import type {
  AnalysisInput,
  AnalysisReport,
  IReportGenerator,
  HoldingContext,
  PortfolioContext,
  InvestorProfileContext,
  NewsItem,
  FilingItem,
  EarningsItem,
} from "./types";
import { AnalysisProviderError } from "./types";

/** Max rows in actionPlan.holdingsToReview (schema + prompt). */
const MAX_HOLDINGS_REVIEW = 14;

// ---------------------------------------------------------------------------
// Response validation schema
// ---------------------------------------------------------------------------

const analysisReportSchema = z.object({
  summary: z.string().min(50).max(1000),
  strengths: z.array(z.string().min(10).max(500)).min(1).max(10),
  risks: z.array(z.string().min(10).max(500)).min(1).max(10),
  opportunities: z.array(z.string().min(10).max(500)).min(1).max(10),
  suggestedActions: z.array(z.string().min(10).max(500)).min(1).max(10),
  followUpQuestions: z.array(z.string().min(10).max(300)).min(1).max(5),
  actionPlan: z.object({
    holdingsToReview: z
      .preprocess(
        (v) => (v === null ? undefined : v),
        z
          .array(
            z.object({
              ticker: z.string().min(1).max(12),
              action: z.enum([
                "CONSIDER_SELLING",
                "CONSIDER_REDUCING",
                "HOLD",
                "CONSIDER_ADDING",
              ]),
              reason: z.string().min(10).max(400),
              verdict: z
                .enum(["BUY", "ACCUMULATE", "HOLD", "TRIM", "SELL", "WATCH"])
                .optional(),
              conviction: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
              thesis: z.string().min(20).max(600).optional(),
              bullCase: z.array(z.string().min(8).max(260)).max(6).optional(),
              bearCase: z.array(z.string().min(8).max(260)).max(6).optional(),
              catalysts: z.array(z.string().min(8).max(220)).max(6).optional(),
              recentDevelopments: z
                .array(z.string().min(10).max(280))
                .max(6)
                .optional(),
              risks: z.array(z.string().min(8).max(260)).max(6).optional(),
              todoItems: z.array(z.string().min(8).max(220)).max(8).optional(),
              earningsHighlight: z
                .object({
                  lastReportDate: z.string().optional(),
                  lastReportPeriod: z.string().max(20).optional(),
                  surpriseLabel: z
                    .enum(["BEAT", "MET", "MISSED", "UNKNOWN"])
                    .optional(),
                  surprisePct: z.number().optional(),
                  story: z.string().min(15).max(500).optional(),
                  nextReportDate: z.string().optional(),
                  nextWatchPoints: z.array(z.string().min(6).max(180)).max(5).optional(),
                })
                .optional(),
            }),
          )
          .max(MAX_HOLDINGS_REVIEW)
          .optional(),
      ),
    potentialAdditions: z
      .array(
        z.object({
          ticker: z.string().min(1).max(12),
          suggestion: z.string().min(3).max(200),
          rationale: z.string().min(10).max(400),
        }),
      )
      .min(2)
      .max(5),
    rebalancingSteps: z.array(z.string().min(10).max(300)).max(6).optional(),
  }),
});

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert portfolio research assistant. Produce SPECIFIC, DIRECT analysis grounded in portfolio data, investor profile, RECENT NEWS (when provided), and SEC filings (when provided).

TONE: Be confident and prioritised — clear "first / next" steps, sharp calls on what to watch, and plain-English verdicts. Still informational only (no guarantees, no "you must buy/sell" absolutes). Prefer decisive framing: "Prioritise…", "First step…", "Main risk:…" while staying within facts supplied.

CRITICAL RULES:
1. NEVER fabricate values, prices, or statistics not in the input
2. NEVER assume market events unless they appear in newsContext or filingsContext
3. NEVER guarantee returns or promise outcomes
4. Be explicit when data is incomplete
5. Avoid generic filler — every bullet should tie to tickers, weights, news, or filings when possible

NEWS — GIVE IT STRONG WEIGHT WHEN PRESENT:
- When "Recent News Context" is non-empty, treat it as a FIRST-CLASS input alongside portfolio weights and performance (not an afterthought).
- The executive summary MUST weave in at least one concrete theme from the news (e.g., earnings, guidance, regulatory, M&A, product) tied to named tickers when articles support it.
- At least TWO of (strengths, risks, opportunities, suggestedActions) should explicitly reference news themes or specific headlines when news data exists.
- In actionPlan.holdingsToReview, include at least one row where the reason clearly cites a news-related concern or opportunity when the news section supports it.
- If sentiment is provided for an article, factor it in qualitatively (still no guarantees).
- If NO news is provided, state that the view is based on portfolio data only and do not invent headlines.

FILINGS:
- When filingsContext exists, SEC disclosures outrank news for the same company; still use both.

EARNINGS — REQUIRED WHEN earningsContext IS NON-EMPTY:
- For every ticker that appears in earningsContext, fill the holding's "earningsHighlight" object so the user understands the latest earnings call without doing the work themselves.
- Required fields (when data is present): lastReportDate, lastReportPeriod, surpriseLabel ("BEAT" | "MET" | "MISSED" | "UNKNOWN"), surprisePct (rounded to 1 decimal when known).
- "story": 1-2 sentence plain-English explanation. Use the actual EPS / revenue numbers and surprise %. Tie the result to the verdict where it makes sense (e.g. "EPS beat by 4.2% on AI-driven services revenue, supporting our HOLD with upward bias").
- "nextReportDate": echo Yahoo's next date verbatim if provided.
- "nextWatchPoints": 2-4 SHORT items (each <= 12 words) about what investors should listen for in the upcoming call (margins, guide, segment growth, capex).
- If a ticker has earnings data with surpriseLabel === "UNKNOWN" or no actuals, set surpriseLabel: "UNKNOWN" and put a one-line story explaining that the latest report didn't have actuals yet — do not invent numbers.

ACTIONABLE OUTPUT:
- Name SPECIFIC TICKERS; connect news and filings to named holdings and to actionPlan reasons.

BUY / RESEARCH IDEAS (REQUIRED):
- actionPlan.potentialAdditions MUST have between 2 and 5 items.
- Each item MUST include: ticker (real US-listed symbol), suggestion (short name of the security), rationale (why it could fit this portfolio and profile).
- Every ticker in potentialAdditions MUST NOT appear in the current portfolio holdings list.
- Prefer diversified ETFs and established names that align with the investor profile (risk, horizon, goal, sector prefs). Frame as research/watchlist ideas, not promises.
- If the portfolio is already broad, suggest complementary sleeves (e.g. international, bonds, sector balance) with appropriate symbols.

PER-HOLDING DEEP RESEARCH (REQUIRED when portfolio has holdings):
You — not the user — are responsible for the underlying research. The user should not be told to "review the 10-Q", "evaluate concentration risk", or "consider sector developments". YOU do that work in this report and present the findings.

The user message includes a numbered list **Mandatory holdingsToReview tickers** — you MUST return exactly that many rows (same tickers, same order). Do not stop after a few large positions. If you are tight on length, shorten thesis to 2 sentences and use 2 bullets per array, but do not omit a mandatory ticker.

For every position in that mandatory list (and the same rules for field quality), produce one entry in actionPlan.holdingsToReview with all of the following:
  - ticker: string (real symbol; for grouped tiny positions you may use "BLEND")
  - action: one of "CONSIDER_SELLING" | "CONSIDER_REDUCING" | "HOLD" | "CONSIDER_ADDING"
  - reason: ONE sentence summary of why
  - verdict: one of "BUY" | "ACCUMULATE" | "HOLD" | "TRIM" | "SELL" | "WATCH"
  - conviction: "HIGH" | "MEDIUM" | "LOW" — your honest confidence in the verdict given available data
  - thesis: 2-3 sentence investment thesis as you see it RIGHT NOW (cite weight, recent news, or filings where applicable)
  - bullCase: 2-4 short bullet points (positive drivers, durable advantages, growth, valuation if applicable)
  - bearCase: 2-4 short bullet points (concrete risks, deteriorating signals, headwinds)
  - catalysts: 2-4 upcoming events / signals that would CHANGE the verdict ("Q3 earnings", "AI capex guidance", "regulatory ruling")
  - recentDevelopments: 2-5 specific findings from the news/filings provided (e.g. "10-Q reported margin compression in Cloud", "8-K disclosed CFO change"). If filings/news for that ticker were not provided, write a short item like "Limited recent disclosures in input — verdict uses portfolio metrics + general profile only" instead of inventing items.
  - risks: 2-4 risks specific to THIS holding (not generic investing risks)
  - todoItems: 0-5 EXECUTION steps the USER still owns, e.g. "Set price alert at $X", "Decide trim size if weight > 12%". DO NOT include research tasks like "review 10-Q" — that is OUR job and should be in recentDevelopments.

Holdings under 2% weight may be combined as one "BLEND" row with action/reason/verdict (no per-name thesis required).

OUTPUT FORMAT:
Return ONLY valid JSON matching the schema. No markdown, no prose, no code blocks.`;

/**
 * Tickers the model must include in holdingsToReview, in display order.
 * Heavier names first; reserves one row for BLEND when sub-2% stubs exist.
 */
function buildRequiredHoldingsReviewTickers(portfolio: PortfolioContext): string[] {
  const positive = portfolio.holdings.filter((h) => (h.weight ?? 0) > 0);
  const sorted = [...positive].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  const main = sorted.filter((h) => (h.weight ?? 0) >= 0.02);
  const tiny = sorted.filter((h) => (h.weight ?? 0) > 0 && (h.weight ?? 0) < 0.02);

  const maxMain = tiny.length > 0 ? MAX_HOLDINGS_REVIEW - 1 : MAX_HOLDINGS_REVIEW;
  const selectedMain = main.slice(0, maxMain);

  const tickers = selectedMain
    .map((h) => h.symbol.trim().toUpperCase())
    .filter((s) => s.length > 0);

  if (tiny.length > 0 && tickers.length < MAX_HOLDINGS_REVIEW) {
    tickers.push("BLEND");
  }

  if (tickers.length === 0 && sorted.length > 0) {
    return ["BLEND"];
  }

  return tickers;
}

function buildUserPromptBundle(input: AnalysisInput): {
  text: string;
  requiredHoldingsTickers: string[];
} {
  const { portfolio, investorProfile, newsContext, filingsContext, sourceWarnings } = input;

  const requiredHoldingsTickers = buildRequiredHoldingsReviewTickers(portfolio);

  const sections: string[] = [];

  // Portfolio summary
  sections.push(`## Portfolio Overview
- Name: ${portfolio.name}
- Total Value: ${formatCurrency(portfolio.totalValue)}
- Total Cost Basis: ${formatCurrency(portfolio.totalCost)}
- Unrealized Gain/Loss: ${formatCurrency(portfolio.totalGain)} (${formatPercent(portfolio.totalGainPct)})
- Number of Holdings: ${portfolio.holdingCount}
- Last Enriched: ${portfolio.lastEnrichedAt ? portfolio.lastEnrichedAt.toISOString() : "Not enriched"}`);

  // Recent news — placed early so the model weights it heavily (same articles as the in-app News tab)
  const MAX_NEWS_IN_PROMPT = 32;
  if (newsContext && newsContext.length > 0) {
    sections.push(`\n## Recent News Context (HIGH PRIORITY — use throughout your analysis)
These articles were retrieved for key portfolio positions. Integrate them into the summary, risks, opportunities, suggested actions, and actionPlan. Name tickers. Do not ignore this section.
`);
    for (const news of newsContext.slice(0, MAX_NEWS_IN_PROMPT)) {
      const dateStr = news.publishedAt
        ? formatRelativeDate(news.publishedAt)
        : "Date unknown";
      const sentimentStr = news.sentiment ? ` [sentiment: ${news.sentiment}]` : "";
      sections.push(`### [${news.ticker ?? "—"}] ${news.headline}${sentimentStr}
Summary: ${news.summary}
Source: ${news.source ?? "Unknown"} | ${dateStr}
`);
    }
  } else {
    sections.push(`\n## Recent News Context
No recent news was retrieved. Base analysis on portfolio and profile data only. Do not invent headlines.`);
  }

  // Holdings detail
  sections.push(`\n## Holdings (${portfolio.holdings.length} positions)`);
  for (const h of portfolio.holdings) {
    sections.push(formatHolding(h));
  }

  const heldTickers = [
    ...new Set(
      portfolio.holdings.map((h) => h.symbol).filter((s) => s && s.trim().length > 0),
    ),
  ];
  if (heldTickers.length > 0) {
    sections.push(
      `\n## Symbols already in this portfolio (do NOT repeat these in actionPlan.potentialAdditions; suggest different tickers only)\n${heldTickers.join(", ")}`,
    );
  }

  // Sector allocation
  if (portfolio.sectorAllocation.length > 0) {
    sections.push(`\n## Sector Allocation`);
    for (const s of portfolio.sectorAllocation.slice(0, 10)) {
      sections.push(`- ${s.name}: ${(s.weight * 100).toFixed(1)}% (${formatCurrency(s.value)})`);
    }
  }

  // Asset type breakdown
  if (portfolio.typeAllocation.length > 0) {
    sections.push(`\n## Asset Type Breakdown`);
    for (const t of portfolio.typeAllocation) {
      sections.push(`- ${t.type}: ${(t.weight * 100).toFixed(1)}% (${formatCurrency(t.value)})`);
    }
  }

  // Investor profile
  if (investorProfile) {
    sections.push(`\n## Investor Profile
- Risk Tolerance: ${investorProfile.riskTolerance}
- Investment Horizon: ${investorProfile.investmentHorizon}
- Investment Goal: ${investorProfile.investmentGoal.replace("_", " ")}
- Asset Preference: ${investorProfile.assetPreference.replace("_", " ")}
- Preferred Regions: ${investorProfile.preferredRegions.join(", ") || "Not specified"}
- Preferred Sectors: ${investorProfile.preferredSectors.join(", ") || "Not specified"}
- Avoided Sectors: ${investorProfile.avoidedSectors.join(", ") || "None specified"}
${investorProfile.notes ? `- Notes: ${investorProfile.notes}` : ""}`);
  } else {
    sections.push(`\n## Investor Profile
No investor profile has been configured. Analysis will be general without personalization.`);
  }

  // Earnings context — last actual + next date so the model can write a per-stock earnings story
  if (input.earningsContext && input.earningsContext.length > 0) {
    sections.push(`\n## Earnings Context (HIGH PRIORITY for per-holding earningsHighlight)
Yahoo-derived data per ticker. Use this to fill earningsHighlight for each holding row. Numbers below are real — do not invent figures, but you may interpret what they mean.`);
    for (const e of input.earningsContext.slice(0, MAX_HOLDINGS_REVIEW)) {
      sections.push(formatEarningsEvent(e));
    }
  } else {
    sections.push(`\n## Earnings Context
No earnings data was retrieved. earningsHighlight may be omitted on holdings, but if a ticker has highly relevant earnings news in the news context, you may still write a 1-sentence story (with surpriseLabel set to "UNKNOWN").`);
  }

  // SEC Filings context - primary source company disclosures
  if (filingsContext && filingsContext.length > 0) {
    sections.push(`\n## SEC Filings Context
The following official SEC filings are provided as PRIMARY-SOURCE company information. This is authoritative data that should be weighted more heavily than news reports.`);
    for (const filing of filingsContext.slice(0, 10)) {
      const dateStr = filing.filedAt
        ? formatRelativeDate(filing.filedAt)
        : "Date unknown";
      sections.push(`- [${filing.ticker ?? "Unknown"}] ${filing.filingType} (${dateStr})
  ${filing.summary}
  Source: ${filing.source ?? "SEC EDGAR"}`);
    }
  } else {
    sections.push(`\n## SEC Filings Context
No recent SEC filings have been retrieved for this portfolio's holdings. This may be because:
- Holdings include non-U.S. equities, ETFs, or crypto (no SEC filings)
- No recent filings in the past 90 days
Do NOT assume or infer company disclosure information not provided.`);
  }

  // Source warnings
  if (sourceWarnings && sourceWarnings.length > 0) {
    sections.push(`\n## Data Warnings`);
    for (const warning of sourceWarnings) {
      sections.push(`- ${warning}`);
    }
  }

  // Check for unenriched holdings
  const unenrichedCount = portfolio.holdings.filter((h) => !h.isEnriched).length;
  if (unenrichedCount > 0) {
    sections.push(`\n## Data Quality Note
${unenrichedCount} holding(s) are missing market data. Analysis may be incomplete for these positions.`);
  }

  if (requiredHoldingsTickers.length > 0) {
    const lines = requiredHoldingsTickers
      .map((t, i) => `${i + 1}. ${t}`)
      .join("\n");
    sections.push(`\n## MANDATORY holdingsToReview coverage (non-negotiable)
actionPlan.holdingsToReview MUST contain **exactly ${requiredHoldingsTickers.length}** rows with these tickers **in this order** (copy symbols exactly, including BLEND if listed):

${lines}

- One JSON object per line above; do not merge or skip any.
- If BLEND appears, one row only: aggregate all positions under 2% weight (name them briefly in thesis or recentDevelopments).
- To fit the response, shorten text fields rather than dropping rows.`);

    if (portfolio.holdingCount > requiredHoldingsTickers.length) {
      sections.push(
        `\nNote: Portfolio has ${portfolio.holdingCount} positions; only names above need full rows (smallest slots rolled into BLEND when applicable).`,
      );
    }
  }

  sections.push(`\n## Task
Analyze this portfolio and return a JSON object with the following structure:
{
  "summary": "One-paragraph executive summary (50-200 words)",
  "strengths": ["Array of 2-5 portfolio strengths"],
  "risks": ["Array of 2-5 potential risks or concerns - BE SPECIFIC about which holdings"],
  "opportunities": ["Array of 2-5 potential improvements - BE SPECIFIC"],
  "suggestedActions": ["Array of 2-5 concrete next steps with SPECIFIC TICKERS"],
  "followUpQuestions": ["Array of 2-4 questions to deepen analysis"],
  "actionPlan": {
    "holdingsToReview": [
      {
        "ticker": "AAPL",
        "action": "CONSIDER_SELLING" | "CONSIDER_REDUCING" | "HOLD" | "CONSIDER_ADDING",
        "reason": "Specific reason based on data (concentration, performance, news, filings)",
        "verdict": "BUY" | "ACCUMULATE" | "HOLD" | "TRIM" | "SELL" | "WATCH",
        "conviction": "HIGH" | "MEDIUM" | "LOW",
        "thesis": "Two to three sentence investment thesis as we see it now.",
        "bullCase": ["…", "…"],
        "bearCase": ["…", "…"],
        "catalysts": ["…", "…"],
        "recentDevelopments": [
          "Findings extracted from the news/filings supplied above (NOT a task for the user)."
        ],
        "risks": ["…"],
        "todoItems": ["Set price alert at $X", "Decide trim size if weight > 12%"],
        "earningsHighlight": {
          "lastReportDate": "2025-08-01",
          "lastReportPeriod": "Q2 2025",
          "surpriseLabel": "BEAT",
          "surprisePct": 4.2,
          "story": "Reported Q2 EPS of $1.32 vs $1.27 estimate (+4.2%) on services strength; gross margin held at 46%.",
          "nextReportDate": "2025-10-30",
          "nextWatchPoints": ["AI capex guide", "China revenue", "Services growth durability"]
        }
      }
    ],
    "potentialAdditions": [
      {
        "ticker": "VXUS",
        "suggestion": "Vanguard Total International Stock ETF",
        "rationale": "Adds non-US exposure if the book is mostly domestic; aligns with diversification goals."
      },
      {
        "ticker": "XLV",
        "suggestion": "Health Care Select Sector SPDR Fund",
        "rationale": "Defensive sector sleeve if tech/consumer weights are high; match risk tolerance before sizing."
      }
    ],
    "rebalancingSteps": [
      "Step 1: Consider trimming NVDA from 30% to 15% to reduce concentration",
      "Step 2: Use proceeds to add healthcare and consumer staples exposure"
    ]
  }
}

IMPORTANT RULES FOR actionPlan:
- holdingsToReview: REQUIRED — must match **Mandatory holdingsToReview tickers** exactly (count, symbols, order). Max 14 rows.
- Every holdingsToReview row MUST include verdict, conviction, thesis, bullCase, bearCase, catalysts, recentDevelopments, and risks.
- recentDevelopments must be the ANALYST's findings extracted from the news/filings sections above. Never use it to ask the user to read filings or news themselves.
- todoItems are EXECUTION steps for the user (alerts, sizing rules, decision triggers); do NOT put research tasks there.
- potentialAdditions: REQUIRED — 2-5 tickers the user could consider buying or researching next. Each row must have ticker + suggestion + rationale; no ticker may duplicate a symbol already in the portfolio.
- rebalancingSteps: Optional; 2-4 concrete steps in order of priority when useful
- holdingsToReview tickers must match portfolio except allowed "BLEND" grouping for tiny positions
- Connect recommendations to the data (concentration %, performance, news, filings)

If Recent News Context above is non-empty:
- "summary" must mention at least one news-driven theme with ticker(s)
- At least two array fields among strengths, risks, opportunities, suggestedActions must cite news where relevant

Return ONLY the JSON object, no other text.`);

  return { text: sections.join("\n"), requiredHoldingsTickers };
}

function formatEarningsEvent(e: EarningsItem): string {
  const parts: string[] = [];
  parts.push(`### [${e.ticker}] Latest earnings`);
  if (e.lastReportPeriod || e.lastReportDate) {
    parts.push(
      `- Period: ${e.lastReportPeriod ?? "Unknown"}${e.lastReportDate ? ` (reported ${e.lastReportDate.slice(0, 10)})` : ""}`,
    );
  }
  if (e.epsActual != null || e.epsEstimate != null) {
    parts.push(
      `- EPS: actual ${e.epsActual?.toFixed?.(2) ?? "n/a"} vs estimate ${e.epsEstimate?.toFixed?.(2) ?? "n/a"}${
        e.surprisePct != null ? ` (surprise ${e.surprisePct >= 0 ? "+" : ""}${e.surprisePct.toFixed(1)}%)` : ""
      }${e.surpriseLabel ? ` — ${e.surpriseLabel}` : ""}`,
    );
  }
  if (e.revenueActual != null || e.revenueEstimate != null) {
    parts.push(
      `- Revenue: actual ${formatCurrency(e.revenueActual ?? null)} vs estimate ${formatCurrency(e.revenueEstimate ?? null)}`,
    );
  }
  if (e.nextReportDate) {
    parts.push(`- Next report: ${e.nextReportDate.slice(0, 10)}${e.nextReportTiming ? ` (${e.nextReportTiming})` : ""}`);
  }
  return parts.join("\n");
}

function formatHolding(h: HoldingContext): string {
  const parts = [
    `- ${h.symbol} (${h.name})`,
    `  Type: ${h.type} | Sector: ${h.sector ?? "Unknown"}`,
    `  Shares: ${h.quantity} @ Avg Cost: ${formatCurrency(h.averageCost)}`,
    `  Current Price: ${formatCurrency(h.currentPrice)} | Market Value: ${formatCurrency(h.marketValue)}`,
    `  Unrealized: ${formatCurrency(h.unrealizedGainLoss)} (${formatPercent(h.unrealizedGainLossPct)})`,
    `  Weight: ${h.weight != null ? (h.weight * 100).toFixed(1) + "%" : "N/A"} | Enriched: ${h.isEnriched ? "Yes" : "No"}`,
  ];
  return parts.join("\n");
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatRelativeDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Date unknown";
  }
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function extractJsonFromResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Find JSON object boundaries
  const startIdx = cleaned.indexOf("{");
  const endIdx = cleaned.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  return cleaned;
}

/** Pull missing ticker list from a coverage validation error for retry UX. */
function extractMissingHoldingsError(err: unknown): string[] | null {
  if (!(err instanceof AnalysisProviderError)) return null;
  const d = err.details;
  if (!d || typeof d !== "object") return null;
  const m = (d as Record<string, unknown>).missingHoldingsTickers;
  if (!Array.isArray(m)) return null;
  return m.filter((x): x is string => typeof x === "string");
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class OpenAIReportGenerator implements IReportGenerator {
  readonly name: string;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new AnalysisProviderError(
        "OpenAI API key is required",
        "INVALID_API_KEY",
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = model ?? "gpt-4o";
    this.name = `openai-${this.model}`;
  }

  async generate(input: AnalysisInput): Promise<AnalysisReport> {
    const bundle = buildUserPromptBundle(input);

    console.info("[analysis:openai] Starting analysis for portfolio:", input.portfolio.name);
    console.info("[analysis:openai] Model:", this.model);
    console.info("[analysis:openai] Holdings:", input.portfolio.holdingCount);
    console.info(
      "[analysis:openai] Required holdingsToReview tickers:",
      bundle.requiredHoldingsTickers.length,
    );

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: bundle.text },
    ];

    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await this.client.chat.completions.create({
          model: this.model,
          max_tokens: 16384,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages,
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new AnalysisProviderError(
            "Model returned empty response",
            "INVALID_RESPONSE",
          );
        }

        console.info("[analysis:openai] Response length:", rawContent.length);

        try {
          return this.parseAndValidate(rawContent, bundle.requiredHoldingsTickers);
        } catch (err) {
          const missing = extractMissingHoldingsError(err);
          if (
            attempt === 0 &&
            missing != null &&
            missing.length > 0 &&
            bundle.requiredHoldingsTickers.length > 0
          ) {
            console.warn(
              "[analysis:openai] Retrying — incomplete holdingsToReview:",
              missing.join(", "),
            );
            messages.push({ role: "assistant", content: rawContent });
            messages.push({
              role: "user",
              content: `Your JSON omitted required actionPlan.holdingsToReview rows. Missing ticker(s): ${missing.join(", ")}.

Return the **full** JSON object again from scratch. actionPlan.holdingsToReview MUST have exactly ${bundle.requiredHoldingsTickers.length} rows in this order: ${bundle.requiredHoldingsTickers.join(", ")}.

Keep thesis to at most 2 sentences and bullCase/bearCase/catalysts to 2 bullets each if needed — do not omit any mandatory ticker.`,
            });
            continue;
          }
          throw err;
        }
      }

      throw new AnalysisProviderError(
        "Analysis failed after retry due to incomplete holdings coverage",
        "VALIDATION_ERROR",
      );
    } catch (err) {
      return this.handleApiError(err);
    }
  }

  private parseAndValidate(
    rawContent: string,
    requiredHoldingsTickers: string[] = [],
  ): AnalysisReport {
    const jsonStr = extractJsonFromResponse(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.error("[analysis:openai] Failed to parse JSON:", jsonStr.slice(0, 500));
      throw new AnalysisProviderError(
        "Model response was not valid JSON",
        "VALIDATION_ERROR",
        { rawContent: rawContent.slice(0, 500) },
      );
    }

    const result = analysisReportSchema.safeParse(parsed);
    if (!result.success) {
      console.error("[analysis:openai] Validation failed:", result.error.flatten());
      throw new AnalysisProviderError(
        "Model response did not match expected schema",
        "VALIDATION_ERROR",
        { errors: result.error.flatten(), raw: parsed },
      );
    }

    const data = result.data;
    if (requiredHoldingsTickers.length > 0) {
      const rows = data.actionPlan.holdingsToReview ?? [];
      const got = new Set(
        rows.map((r) => r.ticker.trim().toUpperCase()),
      );
      const missing = requiredHoldingsTickers.filter(
        (t) => !got.has(t.trim().toUpperCase()),
      );
      if (missing.length > 0) {
        throw new AnalysisProviderError(
          `holdingsToReview missing ${missing.length} required ticker(s)`,
          "VALIDATION_ERROR",
          { missingHoldingsTickers: missing },
        );
      }
    }

    console.info("[analysis:openai] Analysis completed successfully");
    return data;
  }

  private handleApiError(err: unknown): never {
    if (err instanceof AnalysisProviderError) {
      throw err;
    }

    if (err instanceof OpenAI.APIError) {
      console.error("[analysis:openai] API error:", err.status, err.message);

      if (err.status === 401) {
        throw new AnalysisProviderError(
          "Invalid OpenAI API key",
          "INVALID_API_KEY",
          err,
        );
      }
      if (err.status === 429) {
        throw new AnalysisProviderError(
          "OpenAI rate limit exceeded. Please try again later.",
          "RATE_LIMITED",
          err,
        );
      }

      throw new AnalysisProviderError(
        `OpenAI API error: ${err.message}`,
        "PROVIDER_ERROR",
        err,
      );
    }

    if (err instanceof Error && err.message.includes("fetch")) {
      throw new AnalysisProviderError(
        "Network error connecting to OpenAI",
        "NETWORK_ERROR",
        err,
      );
    }

    throw new AnalysisProviderError(
      "Unexpected error during analysis",
      "PROVIDER_ERROR",
      err,
    );
  }
}
