/**
 * Trading agent.
 *
 * Arms a cloned portfolio and, on each run:
 *   1. Refreshes prices
 *   2. Runs the same analysis as the advisor
 *   3. Sizes trades with a return-seeking policy and a position cap
 *   4. Fills them inside the cloned book at the latest quote
 *
 * Fills never leave this app. The source portfolio is not modified.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import { getMarketDataProvider } from "@/lib/market-data/provider";
import {
  CASH_TICKER,
  maxPositionWeightForProfile,
  planTrades,
  type AdditionIdea,
  type HoldingSignal,
  type PlannedTrade,
} from "@/lib/trading-agent/policy";
import {
  explainHoldDecision,
  explainSkipDecision,
} from "@/lib/trading-agent/why";
import type {
  AgentOrderView,
  AgentOverview,
  AgentRunView,
  MindDecision,
  MindPhase,
  MindTrace,
  TradingAgentView,
} from "@/lib/trading-agent/types";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { investmentProfileRepository } from "@/server/repositories/investment-profile.repository";
import { analysisService } from "./analysis.service";
import { enrichmentService } from "./enrichment.service";
import { portfolioService } from "./portfolio.service";

const RUN_STALE_MS = 10 * 60 * 1000;

const agentInclude = {
  book: { select: { id: true, name: true, totalValue: true } },
  source: { select: { id: true, name: true } },
  runs: {
    orderBy: { startedAt: "desc" as const },
    take: 5,
    include: {
      orders: { orderBy: { createdAt: "asc" as const } },
    },
  },
} satisfies Prisma.TradingAgentInclude;

type AgentRecord = Prisma.TradingAgentGetPayload<{ include: typeof agentInclude }>;
type AgentRow = Prisma.TradingAgentGetPayload<object>;

export type StartedRun = {
  agent: AgentRow;
  runId: string;
  trace: MindTrace;
  view: TradingAgentView;
};

function num(value: Parameters<typeof toNum>[0]): number | null {
  const n = toNum(value);
  return n != null && Number.isFinite(n) ? n : null;
}

function holdingMarketValue(holding: {
  quantity: Prisma.Decimal | number | null;
  marketValue: Prisma.Decimal | number | null;
  asset: {
    symbol: string;
    type: string;
    latestPrice: Prisma.Decimal | number | null;
  };
}): number {
  const qty = num(holding.quantity) ?? 0;
  if (qty <= 0) return 0;
  const ticker = holding.asset.symbol.toUpperCase();
  if (ticker === CASH_TICKER || holding.asset.type === "CASH") return qty;
  const price = num(holding.asset.latestPrice);
  if (price != null && price > 0) return qty * price;
  return num(holding.marketValue) ?? 0;
}

function toOrderView(order: AgentRecord["runs"][number]["orders"][number]): AgentOrderView {
  const side = order.side === "SELL" ? "SELL" : "BUY";
  return {
    id: order.id,
    ticker: order.ticker,
    side,
    shares: num(order.shares) ?? 0,
    price: num(order.price) ?? 0,
    notional: num(order.notional) ?? 0,
    reason: order.reason,
  };
}

const MIND_PHASES: MindPhase[] = [
  "starting",
  "prices",
  "reading",
  "deciding",
  "filling",
  "done",
];

function toTrace(value: unknown): MindTrace | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const phase = MIND_PHASES.includes(raw.phase as MindPhase)
    ? (raw.phase as MindPhase)
    : "done";
  const notes = Array.isArray(raw.notes)
    ? raw.notes.flatMap((note) => {
        if (!note || typeof note !== "object") return [];
        const row = note as Record<string, unknown>;
        if (typeof row.text !== "string" || typeof row.at !== "string") return [];
        return [{ at: row.at, text: row.text }];
      })
    : [];
  const decisions: MindDecision[] = [];
  if (Array.isArray(raw.decisions)) {
    for (const item of raw.decisions) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const outcome = row.outcome;
      if (
        typeof row.ticker !== "string" ||
        typeof row.reason !== "string" ||
        (outcome !== "BUY" &&
          outcome !== "SELL" &&
          outcome !== "HELD" &&
          outcome !== "SKIPPED")
      ) {
        continue;
      }
      decisions.push({
        ticker: row.ticker,
        stance: typeof row.stance === "string" ? row.stance : "",
        outcome,
        reason: row.reason,
      });
    }
  }
  return {
    phase,
    notes,
    analysisSummary:
      typeof raw.analysisSummary === "string" ? raw.analysisSummary : null,
    decisions,
  };
}

function toRunView(run: AgentRecord["runs"][number]): AgentRunView {
  return {
    id: run.id,
    status: run.status,
    summary: run.summary,
    error: run.error,
    portfolioValueBefore: num(run.portfolioValueBefore),
    portfolioValueAfter: num(run.portfolioValueAfter),
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    trace: toTrace(run.trace),
    orders: run.orders.map(toOrderView),
  };
}

function freshTrace(): MindTrace {
  return {
    phase: "starting",
    notes: [
      {
        at: new Date().toISOString(),
        text: "Waking up. This pass reads the copied book. Your original portfolio stays as it is.",
      },
    ],
    analysisSummary: null,
    decisions: [],
  };
}

async function remember(
  runId: string,
  trace: MindTrace,
  phase: MindPhase,
  text?: string,
) {
  trace.phase = phase;
  if (text) {
    trace.notes.push({ at: new Date().toISOString(), text });
    if (trace.notes.length > 40) {
      trace.notes.splice(0, trace.notes.length - 40);
    }
  }
  try {
    await prisma.agentRun.update({
      where: { id: runId },
      data: { trace: JSON.parse(JSON.stringify(trace)) },
    });
  } catch (err) {
    console.warn(
      "[trading-agent] could not save the live log:",
      err instanceof Error ? err.message : err,
    );
  }
}

function wantedSell(signal: HoldingSignal): boolean {
  return (
    signal.verdict === "SELL" ||
    signal.verdict === "TRIM" ||
    signal.action === "CONSIDER_SELLING" ||
    signal.action === "CONSIDER_REDUCING"
  );
}

function wantedBuy(signal: HoldingSignal): boolean {
  return (
    signal.verdict === "BUY" ||
    signal.verdict === "ACCUMULATE" ||
    signal.action === "CONSIDER_ADDING"
  );
}

function stanceLabel(signal: HoldingSignal): string {
  return [signal.verdict, signal.conviction].filter(Boolean).join(" · ") || "No clear call";
}

/** What the agent noticed, and whether it acted. */
function explainDecisions(input: {
  signals: HoldingSignal[];
  additions: AdditionIdea[];
  quotes: Record<string, number>;
  trades: PlannedTrade[];
}): MindDecision[] {
  const acted = new Map(
    input.trades
      .filter((trade) => trade.ticker !== CASH_TICKER)
      .map((trade) => [trade.ticker, trade]),
  );
  const decisions: MindDecision[] = [];
  const seen = new Set<string>();

  for (const signal of input.signals) {
    const ticker = signal.ticker.trim().toUpperCase();
    if (!ticker || ticker === CASH_TICKER || seen.has(ticker)) continue;
    seen.add(ticker);
    const trade = acted.get(ticker);
    const stance = stanceLabel(signal);
    if (trade) {
      decisions.push({
        ticker,
        stance,
        outcome: trade.side,
        reason: trade.reason,
      });
      continue;
    }
    const low = (signal.conviction ?? "MEDIUM") === "LOW";
    if (low && (wantedSell(signal) || wantedBuy(signal))) {
      decisions.push({
        ticker,
        stance,
        outcome: "SKIPPED",
        reason: explainSkipDecision("low-conviction", signal.reason),
      });
      continue;
    }
    if (wantedBuy(signal)) {
      decisions.push({
        ticker,
        stance,
        outcome: "SKIPPED",
        reason: explainSkipDecision("no-room"),
      });
      continue;
    }
    if (wantedSell(signal)) {
      decisions.push({
        ticker,
        stance,
        outcome: "SKIPPED",
        reason: explainSkipDecision("wanted-sell"),
      });
      continue;
    }
    decisions.push({
      ticker,
      stance,
      outcome: "HELD",
      reason: explainHoldDecision(signal.reason),
    });
  }

  for (const idea of input.additions) {
    const ticker = idea.ticker.trim().toUpperCase();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    const trade = acted.get(ticker);
    if (trade) {
      decisions.push({
        ticker,
        stance: "New idea",
        outcome: "BUY",
        reason: trade.reason,
      });
      continue;
    }
    const priced = input.quotes[ticker] > 0;
    decisions.push({
      ticker,
      stance: "New idea",
      outcome: "SKIPPED",
      reason: explainSkipDecision(priced ? "no-room" : "no-price"),
    });
  }

  const cash = input.trades.find((trade) => trade.ticker === CASH_TICKER);
  if (cash) {
    decisions.push({
      ticker: CASH_TICKER,
      stance: cash.side === "BUY" ? "Leftover cash" : "Deploy cash",
      outcome: cash.side,
      reason: cash.reason,
    });
  }

  return decisions;
}

function toView(agent: AgentRecord): TradingAgentView {
  return {
    id: agent.id,
    status: agent.status,
    mandate: agent.mandate,
    maxPositionWeight: num(agent.maxPositionWeight) ?? 0.12,
    portfolioId: agent.portfolioId,
    portfolioName: agent.book.name,
    sourcePortfolioId: agent.sourcePortfolioId,
    sourcePortfolioName: agent.source.name,
    bookValue: num(agent.book.totalValue),
    lastRunAt: agent.lastRunAt ? agent.lastRunAt.toISOString() : null,
    runs: agent.runs.map(toRunView),
  };
}

async function loadView(agentId: string): Promise<TradingAgentView> {
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    include: agentInclude,
  });
  if (!agent) throw new NotFoundError("Agent not found.");
  return toView(agent);
}

function summarize(trades: PlannedTrade[]): string {
  const names = (side: PlannedTrade["side"]) =>
    trades
      .filter((trade) => trade.side === side && trade.ticker !== CASH_TICKER)
      .map((trade) => trade.ticker);
  const sells = names("SELL");
  const buys = names("BUY");
  const cash = trades.find((trade) => trade.ticker === CASH_TICKER);
  const parts: string[] = [];
  if (sells.length > 0) parts.push(`Sold ${sells.join(", ")}`);
  if (buys.length > 0) parts.push(`Bought ${buys.join(", ")}`);
  if (cash) {
    const dollars = cash.shares * cash.price;
    parts.push(
      cash.side === "BUY"
        ? `Parked $${dollars.toFixed(2)} in cash`
        : `Deployed $${dollars.toFixed(2)} of cash`,
    );
  }
  return parts.length > 0 ? `${parts.join(". ")}.` : "No trades.";
}

async function quotesFor(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  const provider = getMarketDataProvider();
  const quotes: Record<string, number> = {};
  for (const ticker of tickers) {
    try {
      const quote = await provider.getLatestQuote(ticker);
      if (quote.price > 0) quotes[ticker] = quote.price;
    } catch (err) {
      console.warn(
        `[trading-agent] No quote for ${ticker}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return quotes;
}

async function ensureCashAsset(): Promise<void> {
  await prisma.asset.upsert({
    where: { symbol: CASH_TICKER },
    create: {
      symbol: CASH_TICKER,
      name: "Cash",
      type: "CASH",
      currency: "USD",
      latestPrice: 1,
      priceChange: 0,
      priceChangePercent: 0,
      lastEnrichedAt: new Date(),
    },
    update: {
      type: "CASH",
      name: "Cash",
      latestPrice: 1,
      priceChange: 0,
      priceChangePercent: 0,
    },
  });
}

export const tradingAgentService = {
  async overview(userId: string): Promise<AgentOverview> {
    const [agents, portfolios] = await Promise.all([
      prisma.tradingAgent.findMany({
        where: { userId },
        include: agentInclude,
        orderBy: { createdAt: "desc" },
      }),
      portfolioRepository.listByUser(userId),
    ]);

    const used = new Set<string>();
    for (const agent of agents) {
      used.add(agent.portfolioId);
      used.add(agent.sourcePortfolioId);
    }

    return {
      agents: agents.map(toView),
      portfolios: portfolios
        .filter((portfolio) => !used.has(portfolio.id))
        .map((portfolio) => ({
          id: portfolio.id,
          name: portfolio.name,
          holdingCount: portfolio._count.holdings,
        })),
    };
  },

  /**
   * Clone a portfolio into a book this agent is allowed to trade.
   * Re-arming the same source returns the existing agent.
   */
  async arm(userId: string, sourcePortfolioId: string): Promise<TradingAgentView> {
    const existing = await prisma.tradingAgent.findUnique({
      where: {
        userId_sourcePortfolioId: { userId, sourcePortfolioId },
      },
    });
    if (existing) return loadView(existing.id);

    const source = await portfolioRepository.findById(sourcePortfolioId);
    if (!source || source.userId !== userId) {
      throw new NotFoundError("Portfolio not found.");
    }
    if (source.holdings.length === 0) {
      throw new ValidationError("That portfolio has no holdings to trade.");
    }

    const asBook = await prisma.tradingAgent.findUnique({
      where: { portfolioId: sourcePortfolioId },
    });
    if (asBook) {
      throw new ValidationError(
        "Choose an original portfolio. Agent books are already being traded.",
      );
    }

    const profile = await investmentProfileRepository.findByUserId(userId);
    const maxPositionWeight = maxPositionWeightForProfile(profile);

    const book = await prisma.portfolio.create({
      data: {
        userId,
        name: `Agent · ${source.name}`.slice(0, 120),
        baseCurrency: source.baseCurrency,
        source: "MANUAL",
        totalValue: source.totalValue,
        totalCost: source.totalCost,
        totalGain: source.totalGain,
        lastEnrichedAt: source.lastEnrichedAt,
        holdings: {
          create: source.holdings.map((holding) => ({
            assetId: holding.assetId,
            quantity: holding.quantity,
            averageCost: holding.averageCost,
            currency: holding.currency,
            marketValue: holding.marketValue,
            unrealizedGainLoss: holding.unrealizedGainLoss,
            weight: holding.weight,
          })),
        },
      },
    });

    const agent = await prisma.tradingAgent.create({
      data: {
        userId,
        sourcePortfolioId,
        portfolioId: book.id,
        status: "ACTIVE",
        mandate: "MAXIMIZE_RETURN",
        maxPositionWeight,
      },
    });

    return loadView(agent.id);
  },

  async setStatus(
    userId: string,
    agentId: string,
    status: "ACTIVE" | "PAUSED",
  ): Promise<TradingAgentView> {
    const agent = await prisma.tradingAgent.findFirst({
      where: { id: agentId, userId },
    });
    if (!agent) throw new NotFoundError("Agent not found.");
    await prisma.tradingAgent.update({
      where: { id: agentId },
      data: { status },
    });
    return loadView(agentId);
  },

  async runForUser(userId: string, agentId: string): Promise<TradingAgentView> {
    const started = await this.beginRunForUser(userId, agentId);
    return this.executeRun(started);
  },

  async beginRunForUser(userId: string, agentId: string): Promise<StartedRun> {
    const agent = await prisma.tradingAgent.findFirst({
      where: { id: agentId, userId },
    });
    if (!agent) throw new NotFoundError("Agent not found.");
    return this.beginRun(agent);
  },

  async beginRun(agent: AgentRow): Promise<StartedRun> {
    if (agent.status === "PAUSED") {
      throw new AppError({
        message: "This agent is paused. Resume it before running.",
        status: 409,
        code: "AGENT_PAUSED",
      });
    }

    await prisma.agentRun.updateMany({
      where: {
        agentId: agent.id,
        status: "RUNNING",
        startedAt: { lt: new Date(Date.now() - RUN_STALE_MS) },
      },
      data: {
        status: "FAILED",
        error: "Run timed out before it finished.",
        finishedAt: new Date(),
      },
    });

    const inflight = await prisma.agentRun.findFirst({
      where: { agentId: agent.id, status: "RUNNING" },
    });
    if (inflight) {
      throw new AppError({
        message: "This agent is already running.",
        status: 409,
        code: "AGENT_BUSY",
      });
    }

    const trace = freshTrace();
    const run = await prisma.agentRun.create({
      data: {
        agentId: agent.id,
        status: "RUNNING",
        trace: JSON.parse(JSON.stringify(trace)),
      },
    });

    return {
      agent,
      runId: run.id,
      trace,
      view: await loadView(agent.id),
    };
  },

  async run(agentId: string): Promise<TradingAgentView> {
    const agent = await prisma.tradingAgent.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new NotFoundError("Agent not found.");
    return this.executeRun(await this.beginRun(agent));
  },

  async executeRun(started: StartedRun): Promise<TradingAgentView> {
    const { agent, runId, trace } = started;
    const agentId = agent.id;

    try {
      await remember(
        runId,
        trace,
        "prices",
        "Refreshing prices on the copied book.",
      );
      await enrichmentService.enrich(agent.portfolioId, { forceRefresh: true });
      await remember(
        runId,
        trace,
        "reading",
        "Prices are in. Reading news, filings, and each position.",
      );
      const report = await analysisService.generateReport({
        userId: agent.userId,
        portfolioId: agent.portfolioId,
      });
      trace.analysisSummary = report.summary;
      await remember(
        runId,
        trace,
        "deciding",
        "Analysis is in. Keeping only the calls that clear the conviction and size bars.",
      );

      const portfolio = await portfolioRepository.findById(agent.portfolioId);
      if (!portfolio) throw new NotFoundError("Agent book not found.");

      const unpriced = portfolio.holdings.filter((holding) => {
        const ticker = holding.asset.symbol.toUpperCase();
        if (ticker === CASH_TICKER || holding.asset.type === "CASH") return false;
        const price = num(holding.asset.latestPrice);
        return !(price != null && price > 0);
      });
      if (unpriced.length > 0) {
        throw new ValidationError(
          `Could not price ${unpriced
            .map((holding) => holding.asset.symbol)
            .join(", ")}. Run again once those quotes are available.`,
        );
      }

      const positions = portfolio.holdings
        .map((holding) => {
          const ticker = holding.asset.symbol.toUpperCase();
          const quantity = num(holding.quantity) ?? 0;
          const price =
            ticker === CASH_TICKER || holding.asset.type === "CASH"
              ? 1
              : (num(holding.asset.latestPrice) ?? 0);
          return { ticker, quantity, price };
        })
        .filter((position) => position.quantity > 0 && position.price > 0);

      const valueBefore = positions.reduce(
        (sum, position) => sum + position.quantity * position.price,
        0,
      );

      const plan = report.actionPlan;
      const signals: HoldingSignal[] = (plan?.holdingsToReview ?? []).flatMap(
        (holding) => {
          const ticker = holding.ticker?.trim() ?? "";
          if (!ticker) return [];
          return [
            {
              ticker,
              action: holding.action,
              verdict: holding.verdict,
              conviction: holding.conviction,
              reason: holding.reason || holding.thesis,
            },
          ];
        },
      );
      const additions: AdditionIdea[] = (plan?.potentialAdditions ?? []).flatMap(
        (idea) => {
          const ticker = idea.ticker?.trim() ?? "";
          if (!ticker) return [];
          return [{ ticker, rationale: idea.rationale }];
        },
      );

      const held = new Set(positions.map((position) => position.ticker));
      const quotes = await quotesFor(
        [...new Set(additions.map((idea) => idea.ticker.toUpperCase()))].filter(
          (ticker) => !held.has(ticker),
        ),
      );

      const weight = num(agent.maxPositionWeight) ?? 0.12;
      const trades = planTrades({
        positions,
        signals,
        additions,
        quotes,
        maxPositionWeight: weight,
      });
      trace.decisions = explainDecisions({ signals, additions, quotes, trades });

      if (trades.length === 0) {
        const summary =
          signals.length === 0 && additions.length === 0
            ? "The analysis finished without a named buy or sell, so the book was left unchanged."
            : "Nothing cleared the conviction and size bars, so the book was left unchanged.";
        await remember(runId, trace, "done", summary);
        await prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: "NO_TRADE",
            summary,
            reportId: report.id,
            portfolioValueBefore: valueBefore,
            portfolioValueAfter: valueBefore,
            finishedAt: new Date(),
          },
        });
        await prisma.tradingAgent.update({
          where: { id: agentId },
          data: { lastRunAt: new Date() },
        });
        return loadView(agentId);
      }

      await remember(
        runId,
        trace,
        "filling",
        `Placing ${trades.filter((trade) => trade.ticker !== CASH_TICKER).length} stock fill(s) inside the copied book.`,
      );

      if (trades.some((trade) => trade.ticker === CASH_TICKER)) {
        await ensureCashAsset();
      }

      await portfolioService.applyTransactions({
        userId: agent.userId,
        portfolioId: agent.portfolioId,
        transactions: trades.map((trade) => ({
          ticker: trade.ticker,
          side: trade.side,
          shares: trade.shares,
          price: trade.price,
        })),
      });

      const after = await portfolioRepository.findById(agent.portfolioId);
      const valueAfter = after
        ? after.holdings.reduce((sum, holding) => sum + holdingMarketValue(holding), 0)
        : valueBefore;

      await prisma.agentOrder.createMany({
        data: trades.map((trade) => ({
          runId,
          ticker: trade.ticker,
          side: trade.side,
          shares: trade.shares,
          price: trade.price,
          notional: Math.round(trade.shares * trade.price * 10000) / 10000,
          reason: (trade.reason || "Analysis trade.").slice(0, 1000),
        })),
      });

      const filledSummary = summarize(trades);
      await remember(runId, trace, "done", filledSummary);
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "COMPLETED",
          summary: filledSummary,
          reportId: report.id,
          portfolioValueBefore: valueBefore,
          portfolioValueAfter: valueAfter,
          finishedAt: new Date(),
        },
      });
      await prisma.tradingAgent.update({
        where: { id: agentId },
        data: { lastRunAt: new Date() },
      });

      console.info(
        `[trading-agent] ${agentId} filled ${trades.length} order(s) on book ${agent.portfolioId}`,
      );
      return loadView(agentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent run failed.";
      await remember(runId, trace, "done", message);
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          error: message.slice(0, 2000),
          finishedAt: new Date(),
        },
      });
      await prisma.tradingAgent.update({
        where: { id: agentId },
        data: { lastRunAt: new Date() },
      });
      if (err instanceof AppError) throw err;
      throw new AppError({
        message,
        status: 500,
        code: "AGENT_RUN_FAILED",
      });
    }
  },

  /**
   * Run every active, non-guest agent whose last pass is older than the
   * interval. Does not need a signed-in user. "Run now" bypasses this and
   * calls `run` directly.
   */
  async tick(options?: { limitMs?: number }): Promise<{
    due: number;
    results: { agentId: string; status: string; error?: string }[];
  }> {
    const cutoff = new Date(Date.now() - agentIntervalMs());
    const agents = await prisma.tradingAgent.findMany({
      where: {
        status: "ACTIVE",
        user: { isGuest: false },
        OR: [{ lastRunAt: null }, { lastRunAt: { lte: cutoff } }],
      },
      select: { id: true },
      orderBy: { lastRunAt: "asc" },
    });

    const started = Date.now();
    const limit = options?.limitMs ?? Number.POSITIVE_INFINITY;
    const results: { agentId: string; status: string; error?: string }[] = [];

    for (const agent of agents) {
      if (Date.now() - started > limit) {
        results.push({
          agentId: agent.id,
          status: "SKIPPED",
          error: "Time budget exhausted.",
        });
        continue;
      }
      try {
        const view = await this.run(agent.id);
        results.push({
          agentId: agent.id,
          status: view.runs[0]?.status ?? "COMPLETED",
        });
      } catch (err) {
        if (
          err instanceof AppError &&
          (err.code === "AGENT_BUSY" || err.code === "AGENT_PAUSED")
        ) {
          results.push({ agentId: agent.id, status: "SKIPPED" });
          continue;
        }
        results.push({
          agentId: agent.id,
          status: "FAILED",
          error: err instanceof Error ? err.message : "Run failed.",
        });
      }
    }

    return { due: agents.length, results };
  },
};

/** How often an active agent is re-analyzed. Floor is 5 minutes. */
export function agentIntervalMs(): number {
  const raw = Number(process.env.TRADING_AGENT_INTERVAL_MINUTES ?? "15");
  const minutes = Number.isFinite(raw) ? raw : 15;
  return Math.min(Math.max(minutes, 5), 24 * 60) * 60 * 1000;
}
