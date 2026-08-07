/**
 * AI advisor chat (OpenAI only; no mock fallback).
 * Requires OPENAI_API_KEY. Context includes profile, latest report, full holdings, news, filings.
 *
 * - OPENAI_CHAT_MODEL: optional (default: gpt-4o)
 */

import OpenAI from "openai";
import { AppError } from "@/lib/errors";
import { investmentProfileRepository } from "@/server/repositories/investment-profile.repository";
import { aiReportRepository } from "@/server/repositories/ai-report.repository";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { newsService } from "./news.service";
import { filingsService } from "./filings.service";
import { serverEnv } from "@/lib/env";
import type { UserInvestmentProfile, AIReport, Portfolio } from "@prisma/client";
import type { NewsItem } from "@/lib/news/types";
import type { FilingItem } from "@/lib/filings/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatContext = {
  userId: string;
  portfolioId?: string;
};

export type ChatResponse = ChatMessage & {
  provider: string;
};

/** Every holding row passed to the model so "list all stocks" is grounded in real data. */
type HoldingForPrompt = {
  symbol: string;
  name: string;
  /** Portfolio weight 0–1 when known */
  weight: number | undefined;
};

type InternalContext = {
  profile: UserInvestmentProfile | null;
  report: AIReport | null;
  portfolio: Portfolio | null;
  portfolioName: string | null;
  /** Full list of tickers; news/filings only cover a subset */
  holdingsForPrompt: HoldingForPrompt[] | null;
  newsContext?: NewsItem[];
  filingsContext?: FilingItem[];
};

function mapPortfolioToHoldingsForPrompt(
  full: Awaited<ReturnType<typeof portfolioRepository.findById>>,
): HoldingForPrompt[] | null {
  if (!full?.holdings?.length) return null;
  return [...full.holdings]
    .map((h) => ({
      symbol: h.asset.symbol,
      name: h.asset.name,
      weight: h.weight != null ? Number(h.weight) : undefined,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT = `You are an AI portfolio advisor helping users understand and improve their investment portfolio.

CRITICAL RULES:
1. Be helpful, clear, and educational
2. Use careful language like "consider", "may want to review", "based on the available data"
3. NEVER give guarantees or absolute recommendations
4. NEVER fabricate values, statistics, or current market conditions
5. Remind users this is informational analysis, not financial advice
6. Be explicit when data is incomplete or unavailable
7. Stay grounded in the portfolio data provided
8. Avoid hype and sensationalized language

RESPONSE STYLE:
- Concise but informative (2-4 paragraphs for complex questions)
- Educational without being condescending
- Transparent about uncertainty
- Direct answers to questions asked
- Specific to the user's portfolio when relevant`;

function buildSystemPrompt(ctx: InternalContext): string {
  const parts: string[] = [BASE_SYSTEM_PROMPT];

  if (ctx.profile) {
    parts.push(
      `\n## User Investment Profile`,
      `- Risk tolerance: ${ctx.profile.riskTolerance.toLowerCase()}`,
      `- Investment horizon: ${ctx.profile.investmentHorizon.toLowerCase()}`,
      `- Goal: ${ctx.profile.investmentGoal.toLowerCase().replace("_", " ")}`,
      `- Asset preference: ${ctx.profile.assetPreference.toLowerCase().replace(/_/g, " ")}`,
    );
    if (ctx.profile.preferredSectors.length > 0) {
      parts.push(`- Preferred sectors: ${ctx.profile.preferredSectors.join(", ")}`);
    }
    if (ctx.profile.avoidedSectors.length > 0) {
      parts.push(`- Avoided sectors: ${ctx.profile.avoidedSectors.join(", ")}`);
    }
    if (ctx.profile.notes) {
      parts.push(`- Additional notes: ${ctx.profile.notes}`);
    }
    if (ctx.profile.strategyMessage) {
      parts.push(
        `\n### The investor's own words (goals, preferences, strategy) — weight this heavily`,
        ctx.profile.strategyMessage,
        `Treat the message above as the investor's stated intent. When it conflicts with the generic enum settings, ask a clarifying question rather than silently overriding it.`,
      );
    }
  } else {
    parts.push(
      `\n## User Profile`,
      `No investment profile has been configured. Provide general guidance and encourage them to set up their profile for more personalized advice.`,
    );
  }

  if (ctx.report && ctx.report.status === "READY") {
    parts.push(`\n## Latest Portfolio Analysis (${ctx.portfolioName ?? "portfolio"})`);

    if (ctx.report.summary) {
      parts.push(`Summary: ${ctx.report.summary}`);
    }

    const strengths = ctx.report.strengths as string[] | null;
    const risks = ctx.report.risks as string[] | null;
    const opportunities = ctx.report.opportunities as string[] | null;
    const actions = ctx.report.suggestedActions as string[] | null;

    if (strengths?.length) {
      parts.push(`\nStrengths:`);
      strengths.forEach((s) => parts.push(`- ${s}`));
    }
    if (risks?.length) {
      parts.push(`\nRisks:`);
      risks.forEach((r) => parts.push(`- ${r}`));
    }
    if (opportunities?.length) {
      parts.push(`\nOpportunities:`);
      opportunities.forEach((o) => parts.push(`- ${o}`));
    }
    if (actions?.length) {
      parts.push(`\nSuggested Actions:`);
      actions.forEach((a) => parts.push(`- ${a}`));
    }

    if (ctx.report.modelUsed) {
      parts.push(`\n(Analysis generated by: ${ctx.report.modelUsed})`);
    }
  } else {
    parts.push(
      `\n## Portfolio Analysis`,
      `No portfolio analysis report is available. Encourage the user to generate an analysis for more detailed insights.`,
    );
  }

  if (ctx.portfolio) {
    const totalValue = Number(ctx.portfolio.totalValue) || 0;
    const totalGain = Number(ctx.portfolio.totalGain) || 0;
    const costBasis = Number(ctx.portfolio.totalCost) || 0;
    const gainPct = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;

    parts.push(`\n## Portfolio Summary`);
    parts.push(`- Portfolio: ${ctx.portfolio.name}`);
    if (totalValue > 0) {
      parts.push(`- Total Value: $${totalValue.toLocaleString()}`);
      parts.push(
        `- Unrealized Gain/Loss: $${totalGain.toLocaleString()} (${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}%)`,
      );
    }
    if (ctx.portfolio.lastEnrichedAt) {
      parts.push(`- Last Market Data Update: ${ctx.portfolio.lastEnrichedAt.toISOString()}`);
    }
  }

  if (ctx.holdingsForPrompt && ctx.holdingsForPrompt.length > 0) {
    parts.push(
      `\n## Complete holdings (authoritative)`,
      `The user has **${ctx.holdingsForPrompt.length}** positions in this portfolio. This block is the full list — it is not limited to news or filings above.`,
      `When the user asks for all stocks, every ticker, a complete list, or "what do I own", you must enumerate **every** position below. Do not stop after a few names; do not infer from the analysis report only.`,
    );
    for (const h of ctx.holdingsForPrompt) {
      const w =
        h.weight != null
          ? ` — weight ≈ ${(h.weight * 100).toFixed(1)}% of portfolio`
          : "";
      parts.push(`- **${h.symbol}** — ${h.name}${w}`);
    }
  } else if (ctx.portfolio) {
    parts.push(
      `\n## Holdings`,
      `No line-level holding details were loaded. If the user asks for a full list of tickers, say you cannot see individual positions in this context and they should check the portfolio screen.`,
    );
  }

  // Add news context for grounding
  if (ctx.newsContext && ctx.newsContext.length > 0) {
    parts.push(`\n## Recent News Context (prioritize in answers when it helps)`);
    parts.push(
      `The following is recent market/company news for key holdings. Give it substantial weight: cite tickers, connect stories to user questions, and distinguish facts from the portfolio from narrative in articles.`,
    );
    for (const news of ctx.newsContext.slice(0, 8)) {
      const dateStr = news.publishedAt ? formatRelativeDate(news.publishedAt) : "";
      parts.push(`- [${news.ticker ?? "General"}] ${news.headline}`);
      parts.push(`  ${news.summary}`);
      if (news.source || dateStr) {
        parts.push(`  (${news.source ?? "Unknown"}${dateStr ? `, ${dateStr}` : ""})`);
      }
    }
    parts.push(`\nNote: If the user asks about "news" or a symbol, use this section. Do not invent articles not listed here.`);
  }

  // Add filings context for grounding (primary source data)
  if (ctx.filingsContext && ctx.filingsContext.length > 0) {
    parts.push(`\n## SEC Filings Context (Primary Source)`);
    parts.push(`Official company filings - treat as authoritative information:`);
    for (const filing of ctx.filingsContext.slice(0, 5)) {
      const dateStr = filing.filedAt ? formatRelativeDate(filing.filedAt) : "";
      parts.push(`- [${filing.ticker ?? "Unknown"}] ${filing.filingType}${dateStr ? ` (${dateStr})` : ""}`);
      parts.push(`  ${filing.summary}`);
    }
    parts.push(`\nNote: Filings are official disclosures. Weight them higher than news when relevant.`);
  }

  return parts.join("\n");
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
    return "";
  }
}

// ---------------------------------------------------------------------------
// OpenAI chat provider
// ---------------------------------------------------------------------------

let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (_openaiClient) return _openaiClient;

  const env = serverEnv();
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  _openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openaiClient;
}

async function generateOpenAIResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string,
): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI client not configured");
  }

  // Build conversation history for context
  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  // Include recent conversation history (last 10 messages for context)
  const recentMessages = messages.slice(-10);
  for (const msg of recentMessages) {
    apiMessages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  console.info("[advisor:openai] Generating response");
  console.info("[advisor:openai] Model:", model);
  console.info("[advisor:openai] Message count:", recentMessages.length);

  const response = await client.chat.completions.create({
    model,
    max_tokens: 1000,
    temperature: 0.7, // Slightly more creative for conversational responses
    messages: apiMessages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  console.info("[advisor:openai] Response length:", content.length);
  return content;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const advisorService = {
  /**
   * Generate a chat response, optionally grounded in the user's context.
   */
  async chat(
    messages: ChatMessage[],
    context?: ChatContext,
  ): Promise<ChatResponse> {
    // Load context if userId is provided
    let internalContext: InternalContext = {
      profile: null,
      report: null,
      portfolio: null,
      portfolioName: null,
      holdingsForPrompt: null,
      newsContext: undefined,
      filingsContext: undefined,
    };

    if (context?.userId) {
      const [profile, report, portfolios] = await Promise.all([
        investmentProfileRepository.findByUserId(context.userId),
        context.portfolioId
          ? aiReportRepository.findLatestForPortfolio(context.portfolioId)
          : aiReportRepository.findLatestForUser(context.userId),
        portfolioRepository.listByUser(context.userId),
      ]);

      const portfolio = context.portfolioId
        ? portfolios.find((p) => p.id === context.portfolioId) ?? portfolios[0]
        : portfolios[0];

      // Fetch full holdings + news + filings for the portfolio if available
      let newsContext: NewsItem[] | undefined;
      let filingsContext: FilingItem[] | undefined;
      let holdingsForPrompt: HoldingForPrompt[] | null = null;

      if (portfolio) {
        const [fullPortfolio, newsResult, filingsResult] = await Promise.all([
          portfolioRepository.findById(portfolio.id),
          newsService.getNewsForPortfolio(portfolio.id, {
            maxHoldings: 5,
            articlesPerTicker: 3,
            maxTotalArticles: 12,
            daysBack: 7,
          }).catch((err) => {
            console.warn("[advisor] Failed to fetch news context:", err);
            return null;
          }),
          filingsService.getFilingsForPortfolio(portfolio.id, {
            maxHoldings: 3, // Fewer for chat to keep context lean
            filingsPerTicker: 2,
            daysBack: 90,
          }).catch((err) => {
            console.warn("[advisor] Failed to fetch filings context:", err);
            return null;
          }),
        ]);

        holdingsForPrompt = mapPortfolioToHoldingsForPrompt(fullPortfolio);

        if (newsResult && newsResult.items.length > 0) {
          newsContext = newsResult.items;
        }
        if (filingsResult && filingsResult.items.length > 0) {
          filingsContext = filingsResult.items;
        }
      }

      internalContext = {
        profile,
        report,
        portfolio: portfolio ?? null,
        portfolioName: portfolio?.name ?? null,
        holdingsForPrompt,
        newsContext,
        filingsContext,
      };
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userMessage = lastUserMsg?.content ?? "";

    const env = serverEnv();
    if (!env.OPENAI_API_KEY?.trim()) {
      throw new AppError({
        message:
          "The AI advisor is not configured. Set OPENAI_API_KEY in your environment.",
        status: 503,
        code: "AI_NOT_CONFIGURED",
      });
    }

    console.info(
      "[advisor] Processing message:",
      userMessage.slice(0, 60),
      "| hasProfile:",
      !!internalContext.profile,
      "| hasReport:",
      !!internalContext.report,
      "| provider: openai",
    );

    try {
      const systemPrompt = buildSystemPrompt(internalContext);
      const model = env.OPENAI_CHAT_MODEL ?? "gpt-4o";
      const content = await generateOpenAIResponse(messages, systemPrompt, model);
      return { role: "assistant", content, provider: `openai-${model}` };
    } catch (err) {
      console.error("[advisor:openai] Error:", err);
      if (err instanceof AppError) throw err;
      throw new AppError({
        message: "The advisor could not reach the AI service. Please try again.",
        status: 502,
        code: "AI_CHAT_ERROR",
      });
    }
  },

  /**
   * Build a system prompt for LLM integration.
   * Call this when setting up the conversation with an actual LLM.
   */
  async buildSystemPromptForUser(userId: string): Promise<string> {
    const [profile, report, portfolios] = await Promise.all([
      investmentProfileRepository.findByUserId(userId),
      aiReportRepository.findLatestForUser(userId),
      portfolioRepository.listByUser(userId),
    ]);

    const first = portfolios[0] ?? null;
    const full = first
      ? await portfolioRepository.findById(first.id)
      : null;

    return buildSystemPrompt({
      profile,
      report,
      portfolio: first,
      portfolioName: first?.name ?? null,
      holdingsForPrompt: mapPortfolioToHoldingsForPrompt(full),
    });
  },

  /**
   * Check if real AI chat is available.
   */
  isRealChatAvailable(): boolean {
    return Boolean(serverEnv().OPENAI_API_KEY?.trim());
  },

  /**
   * Get the current chat provider name.
   */
  getChatProviderName(): string {
    const env = serverEnv();
    if (env.OPENAI_API_KEY?.trim()) {
      return `openai-${env.OPENAI_CHAT_MODEL ?? "gpt-4o"}`;
    }
    return "unavailable";
  },
};
