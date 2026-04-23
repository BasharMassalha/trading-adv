/**
 * AI advisor chat service.
 *
 * This service provides context-aware chat responses by:
 *   1. Loading the user's investor profile
 *   2. Loading the latest portfolio report
 *   3. Grounding responses in that context
 *
 * PROVIDER SUPPORT
 * ────────────────
 * - Mock: Rule-based responses (default)
 * - OpenAI: GPT-4 powered intelligent chat
 *
 * CONFIGURATION
 * ─────────────
 * - ANALYSIS_PROVIDER: "mock" | "openai"
 * - OPENAI_API_KEY: Required for OpenAI mode
 * - OPENAI_CHAT_MODEL: Model to use (default: gpt-4o)
 */

import OpenAI from "openai";
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
// Mock response generator (fallback)
// ---------------------------------------------------------------------------

function generateMockResponse(
  userMessage: string,
  ctx: InternalContext,
): string {
  const msg = userMessage.toLowerCase();

  const wantsFullHoldingList =
    (msg.includes("all the stock") ||
      msg.includes("all your stock") ||
      msg.includes("all my stock") ||
      msg.includes("every stock") ||
      msg.includes("name all") ||
      msg.includes("list all") ||
      msg.includes("full list of") ||
      msg.includes("complete list") ||
      msg.includes("what stock") && msg.includes("i have") ||
      msg.includes("what do i own")) &&
    (msg.includes("stock") || msg.includes("ticker") || msg.includes("hold") || msg.includes("own") || msg.includes("position"));

  if (wantsFullHoldingList && ctx.holdingsForPrompt && ctx.holdingsForPrompt.length > 0) {
    const lines = ctx.holdingsForPrompt.map((h) => {
      const w =
        h.weight != null
          ? ` — ~${(h.weight * 100).toFixed(1)}% of the portfolio`
          : "";
      return `• **${h.symbol}** — ${h.name}${w}`;
    });
    return `Here are all **${ctx.holdingsForPrompt.length}** positions in your portfolio:\n\n${lines.join("\n\n")}\n\nAsk if you want more detail on any name.`;
  }

  // Keyword-based routing with context awareness
  if (msg.includes("concentration") || msg.includes("weight") || msg.includes("allocation")) {
    if (ctx.report) {
      const risks = ctx.report.risks as string[] | null;
      const concentrationRisk = risks?.find((r) => r.toLowerCase().includes("concentration"));
      if (concentrationRisk) {
        return `Based on your portfolio analysis: ${concentrationRisk}\n\nYou may want to consider gradually rebalancing to reduce single-stock risk while still maintaining exposure to your top performers.`;
      }
    }
    return "I'd recommend looking at any position that exceeds 25-30% of your portfolio. Large concentrated positions can amplify both gains and losses. Consider whether trimming to a target allocation makes sense for your risk tolerance.";
  }

  if (msg.includes("risk") || msg.includes("volatile") || msg.includes("volatility")) {
    if (ctx.profile?.riskTolerance === "CONSERVATIVE") {
      return "Given your conservative risk profile, you may want to focus on broad-market ETFs and dividend-paying stocks. These tend to be less volatile than growth stocks or crypto. Your current allocation should prioritize capital preservation.";
    }
    if (ctx.profile?.riskTolerance === "AGGRESSIVE") {
      return "With your aggressive risk tolerance, some volatility is expected and can work in your favor over a long horizon. The key is ensuring you're diversified enough that no single position could significantly impact your overall wealth.";
    }
    return "Managing risk is about balancing potential returns with your comfort level. Consider your investment timeline — longer horizons can typically absorb more short-term volatility.";
  }

  if (msg.includes("rebalance") || msg.includes("rebalancing")) {
    if (ctx.report) {
      const actions = ctx.report.suggestedActions as string[] | null;
      const rebalanceAction = actions?.find(
        (a) => a.toLowerCase().includes("rebalance") || a.toLowerCase().includes("trim"),
      );
      if (rebalanceAction) {
        return `From your analysis: ${rebalanceAction}\n\nRebalancing helps maintain your target allocation and can reduce concentration risk over time.`;
      }
    }
    return "Rebalancing is typically recommended when positions drift significantly from your target allocation (often 5-10% or more). This helps lock in gains from winners and maintain your desired risk level.";
  }

  if (msg.includes("tax") || msg.includes("harvest")) {
    return "Tax-loss harvesting involves selling positions at a loss to offset capital gains. If you have holdings that are down, you might consider whether selling makes sense before year-end. Be mindful of wash sale rules if you plan to repurchase similar securities.";
  }

  if (msg.includes("sector") || msg.includes("diversif")) {
    if (ctx.report) {
      const risks = ctx.report.risks as string[] | null;
      const sectorRisk = risks?.find(
        (r) => r.toLowerCase().includes("sector") || r.toLowerCase().includes("diversif"),
      );
      if (sectorRisk) {
        return `The analysis noted: ${sectorRisk}\n\nDiversification across sectors can help protect against industry-specific downturns. Consider whether adding positions in underrepresented sectors aligns with your goals.`;
      }
    }
    return "Diversification across sectors helps reduce industry-specific risk. A well-balanced portfolio typically spans technology, healthcare, financials, consumer goods, and other sectors based on your preferences.";
  }

  if (msg.includes("dividend") || msg.includes("income")) {
    if (ctx.profile?.investmentGoal === "INCOME") {
      return "Since income is your primary goal, you may want to focus on dividend-growth ETFs like SCHD or VYM, as well as established dividend aristocrats. These provide regular income while potentially offering some capital appreciation.";
    }
    return "For dividend income, consider established dividend-paying ETFs or blue-chip stocks with consistent payout histories. The yield should be balanced against total return potential and your tax situation.";
  }

  if (msg.includes("etf") || msg.includes("index")) {
    if (ctx.profile?.assetPreference === "ETF_ONLY" || ctx.profile?.assetPreference === "MOSTLY_ETFS") {
      return "ETFs are a great choice for your investment style. They offer low costs, instant diversification, and tax efficiency. Consider a core holding like VOO or VTI for broad market exposure, supplemented by sector or factor ETFs.";
    }
    return "ETFs provide a cost-effective way to gain broad market exposure. They're especially useful for sectors or regions where individual stock selection is difficult. Many investors use a core-satellite approach: ETFs for broad exposure, individual stocks for specific convictions.";
  }

  if (msg.includes("crypto") || msg.includes("bitcoin") || msg.includes("ethereum")) {
    if (ctx.profile?.riskTolerance === "CONSERVATIVE") {
      return "Cryptocurrency is highly volatile and may not align with a conservative investment approach. If you're interested in some exposure, consider keeping it to a small percentage (1-5%) that you'd be comfortable losing entirely.";
    }
    return "Crypto can provide growth potential but comes with significant volatility. Most financial advisors suggest keeping crypto exposure to a percentage you're comfortable with given the risk — typically 5-15% for more aggressive investors.";
  }

  if (msg.includes("goal") || msg.includes("objective") || msg.includes("target")) {
    if (ctx.profile) {
      return `Based on your ${ctx.profile.investmentGoal.toLowerCase().replace("_", " ")} objective and ${ctx.profile.investmentHorizon.toLowerCase()} time horizon, your portfolio should be structured to ${
        ctx.profile.investmentGoal === "GROWTH"
          ? "maximize capital appreciation, accepting higher volatility"
          : ctx.profile.investmentGoal === "INCOME"
            ? "generate reliable income while preserving capital"
            : ctx.profile.investmentGoal === "CAPITAL_PRESERVATION"
              ? "protect your principal with modest growth"
              : "balance growth potential with income generation"
      }.`;
    }
    return "Your investment goals should guide your allocation. Growth-focused portfolios typically hold more equities, while income-focused portfolios emphasize dividend stocks and bonds.";
  }

  if (msg.includes("market") || msg.includes("economy") || msg.includes("outlook")) {
    return "Market conditions are always changing. Rather than trying to time the market, focus on maintaining a well-diversified portfolio aligned with your goals and risk tolerance. Regular rebalancing and staying invested through volatility typically leads to better long-term results.";
  }

  // Default responses grounded in context
  if (ctx.report) {
    return `Based on your portfolio analysis, here are the key points to consider:\n\n${ctx.report.summary}\n\nIs there a specific aspect of your portfolio you'd like to explore further?`;
  }

  if (ctx.profile) {
    return `As a ${ctx.profile.riskTolerance.toLowerCase()} investor with a ${ctx.profile.investmentHorizon.toLowerCase()} time horizon, your portfolio should be structured to match these preferences. Would you like me to discuss specific aspects like sector allocation, diversification, or rebalancing strategies?`;
  }

  return "I can help you understand your portfolio, discuss allocation strategies, or explore specific concerns. What aspect of your investments would you like to explore? For more personalized advice, make sure to complete your investor profile and generate a portfolio analysis.";
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

    // Check if we should use OpenAI
    const env = serverEnv();
    const useOpenAI = env.ANALYSIS_PROVIDER === "openai" && env.OPENAI_API_KEY;

    console.info(
      "[advisor] Processing message:",
      userMessage.slice(0, 60),
      "| hasProfile:",
      !!internalContext.profile,
      "| hasReport:",
      !!internalContext.report,
      "| provider:",
      useOpenAI ? "openai" : "mock",
    );

    let response: string;
    let provider: string;

    if (useOpenAI) {
      try {
        const systemPrompt = buildSystemPrompt(internalContext);
        const model = env.OPENAI_CHAT_MODEL ?? "gpt-4o";
        response = await generateOpenAIResponse(messages, systemPrompt, model);
        provider = `openai-${model}`;
      } catch (err) {
        console.error("[advisor:openai] Error:", err);
        // Fallback to mock in development
        if (env.NODE_ENV === "development") {
          console.warn("[advisor] Falling back to mock response");
          response = generateMockResponse(userMessage, internalContext);
          provider = "mock-fallback";
        } else {
          throw err;
        }
      }
    } else {
      // Simulate processing delay for mock
      await new Promise((r) => setTimeout(r, 600));
      response = generateMockResponse(userMessage, internalContext);
      provider = "mock-v1";
    }

    return { role: "assistant", content: response, provider };
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
    const env = serverEnv();
    return env.ANALYSIS_PROVIDER === "openai" && !!env.OPENAI_API_KEY;
  },

  /**
   * Get the current chat provider name.
   */
  getChatProviderName(): string {
    const env = serverEnv();
    if (env.ANALYSIS_PROVIDER === "openai" && env.OPENAI_API_KEY) {
      return `openai-${env.OPENAI_CHAT_MODEL ?? "gpt-4o"}`;
    }
    return "mock-v1";
  },
};
