export type AgentOrderView = {
  id: string;
  ticker: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  notional: number;
  reason: string;
};

export type MindPhase =
  | "starting"
  | "prices"
  | "reading"
  | "deciding"
  | "filling"
  | "done";

export type MindNote = {
  at: string;
  text: string;
};

export type MindDecision = {
  ticker: string;
  stance: string;
  outcome: "BUY" | "SELL" | "HELD" | "SKIPPED";
  reason: string;
};

/** Written as the run progresses so the page can show the agent thinking. */
export type MindTrace = {
  phase: MindPhase;
  notes: MindNote[];
  analysisSummary: string | null;
  decisions: MindDecision[];
};

export type AgentRunView = {
  id: string;
  status: "RUNNING" | "COMPLETED" | "NO_TRADE" | "FAILED";
  summary: string | null;
  error: string | null;
  portfolioValueBefore: number | null;
  portfolioValueAfter: number | null;
  startedAt: string;
  finishedAt: string | null;
  trace: MindTrace | null;
  orders: AgentOrderView[];
};

export type TradingAgentView = {
  id: string;
  status: "ACTIVE" | "PAUSED";
  mandate: string;
  maxPositionWeight: number;
  portfolioId: string;
  portfolioName: string;
  sourcePortfolioId: string;
  sourcePortfolioName: string;
  bookValue: number | null;
  lastRunAt: string | null;
  runs: AgentRunView[];
};

export type AgentOverview = {
  agents: TradingAgentView[];
  /** Portfolios that can still be armed. Agent books and sources are omitted. */
  portfolios: { id: string; name: string; holdingCount: number }[];
};
