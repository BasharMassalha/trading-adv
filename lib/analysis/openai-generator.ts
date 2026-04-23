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
} from "./types";
import { AnalysisProviderError } from "./types";

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
      .array(
        z.object({
          ticker: z.string().min(1).max(10),
          action: z.enum([
            "CONSIDER_SELLING",
            "CONSIDER_REDUCING",
            "HOLD",
            "CONSIDER_ADDING",
          ]),
          reason: z.string().min(10).max(300),
        }),
      )
      .max(7)
      .optional(),
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

const SYSTEM_PROMPT = `You are an expert portfolio research assistant. Produce SPECIFIC, ACTIONABLE analysis grounded in portfolio data, investor profile, RECENT NEWS (when provided), and SEC filings (when provided).

CRITICAL RULES:
1. NEVER fabricate values, prices, or statistics not in the input
2. NEVER assume market events unless they appear in newsContext or filingsContext
3. NEVER guarantee returns or give definitive financial advice
4. Use cautious language: "consider", "may want to review", "based on available data"
5. Be explicit when data is incomplete

NEWS — GIVE IT STRONG WEIGHT WHEN PRESENT:
- When "Recent News Context" is non-empty, treat it as a FIRST-CLASS input alongside portfolio weights and performance (not an afterthought).
- The executive summary MUST weave in at least one concrete theme from the news (e.g., earnings, guidance, regulatory, M&A, product) tied to named tickers when articles support it.
- At least TWO of (strengths, risks, opportunities, suggestedActions) should explicitly reference news themes or specific headlines when news data exists.
- In actionPlan.holdingsToReview, include at least one row where the reason clearly cites a news-related concern or opportunity when the news section supports it.
- If sentiment is provided for an article, factor it in qualitatively (still no guarantees).
- If NO news is provided, state that the view is based on portfolio data only and do not invent headlines.

FILINGS:
- When filingsContext exists, SEC disclosures outrank news for the same company; still use both.

ACTIONABLE OUTPUT:
- Name SPECIFIC TICKERS; connect news and filings to named holdings and to actionPlan reasons.

BUY / RESEARCH IDEAS (REQUIRED):
- actionPlan.potentialAdditions MUST have between 2 and 5 items.
- Each item MUST include: ticker (real US-listed symbol), suggestion (short name of the security), rationale (why it could fit this portfolio and profile).
- Every ticker in potentialAdditions MUST NOT appear in the current portfolio holdings list.
- Prefer diversified ETFs and established names that align with the investor profile (risk, horizon, goal, sector prefs). Use cautious framing: "consider", "may want to research", not guarantees.
- If the portfolio is already broad, suggest complementary sleeves (e.g. international, bonds, sector balance) with appropriate symbols.

OUTPUT FORMAT:
Return ONLY valid JSON matching the schema. No markdown, no prose, no code blocks.`;

function buildUserPrompt(input: AnalysisInput): string {
  const { portfolio, investorProfile, newsContext, filingsContext, sourceWarnings } = input;

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
  const MAX_NEWS_IN_PROMPT = 16;
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
        "reason": "Specific reason based on data (concentration, performance, news, filings)"
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
- holdingsToReview: Optional; 0-7 rows for existing positions that need attention (overweight, underperforming, news concerns)
- potentialAdditions: REQUIRED — 2-5 tickers the user could consider buying or researching next. Each row must have ticker + suggestion + rationale; no ticker may duplicate a symbol already in the portfolio.
- rebalancingSteps: Optional; 2-4 concrete steps in order of priority when useful
- holdingsToReview must reference tickers that appear in the portfolio
- Connect recommendations to the data (concentration %, performance, news, filings)

If Recent News Context above is non-empty:
- "summary" must mention at least one news-driven theme with ticker(s)
- At least two array fields among strengths, risks, opportunities, suggestedActions must cite news where relevant

Return ONLY the JSON object, no other text.`);

  return sections.join("\n");
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
    const userPrompt = buildUserPrompt(input);

    console.info("[analysis:openai] Starting analysis for portfolio:", input.portfolio.name);
    console.info("[analysis:openai] Model:", this.model);
    console.info("[analysis:openai] Holdings:", input.portfolio.holdingCount);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 3500,
        temperature: 0.3, // Lower temperature for more consistent output
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new AnalysisProviderError(
          "Model returned empty response",
          "INVALID_RESPONSE",
        );
      }

      console.info("[analysis:openai] Response length:", rawContent.length);

      // Parse and validate
      return this.parseAndValidate(rawContent);
    } catch (err) {
      return this.handleApiError(err);
    }
  }

  private parseAndValidate(rawContent: string): AnalysisReport {
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

    console.info("[analysis:openai] Analysis completed successfully");
    return result.data;
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
