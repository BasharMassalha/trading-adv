/**
 * Types for the portfolio analysis pipeline.
 *
 * These types define:
 * 1. The input context passed to report generators
 * 2. The structured output from analysis
 * 3. The generator interface abstraction
 *
 * FUTURE EXTENSIBILITY
 * ────────────────────
 * The AnalysisInput type includes optional fields for future intelligence layers:
 * - newsContext: Recent news articles relevant to portfolio holdings
 * - filingsContext: SEC filings, earnings reports, etc.
 * - sourceWarnings: Warnings about data quality or retrieval issues
 *
 * These are currently empty but are designed so retrieval layers can be
 * added without refactoring the core AI pipeline.
 */

import type {
  RiskTolerance,
  InvestmentHorizon,
  InvestmentGoal,
  AssetPreference,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Input context — everything the analyzer needs to reason about
// ---------------------------------------------------------------------------

export type InvestorProfileContext = {
  riskTolerance: RiskTolerance;
  investmentHorizon: InvestmentHorizon;
  investmentGoal: InvestmentGoal;
  assetPreference: AssetPreference;
  preferredRegions: string[];
  preferredSectors: string[];
  avoidedSectors: string[];
  notes: string | null;
  /** The investor's own words about goals, preferences, and strategy. */
  strategyMessage: string | null;
};

export type HoldingContext = {
  symbol: string;
  name: string;
  type: "STOCK" | "ETF" | "CRYPTO" | "BOND" | "CASH" | "OTHER";
  sector: string | null;
  quantity: number;
  averageCost: number | null;
  currentPrice: number | null;
  marketValue: number | null;
  costBasis: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
  /** Weight as a fraction, e.g. 0.25 = 25% */
  weight: number | null;
  isEnriched: boolean;
};

export type PortfolioContext = {
  id: string;
  name: string;
  totalValue: number | null;
  totalCost: number | null;
  totalGain: number | null;
  totalGainPct: number | null;
  lastEnrichedAt: Date | null;
  holdingCount: number;
  holdings: HoldingContext[];
  sectorAllocation: { name: string; value: number; weight: number }[];
  /** Breakdown by asset type */
  typeAllocation: { type: string; value: number; weight: number }[];
};

// ---------------------------------------------------------------------------
// Future intelligence layer contexts (optional, for extensibility)
// ---------------------------------------------------------------------------

/**
 * News article context for portfolio-relevant news.
 * This field is optional and designed for future news retrieval integration.
 */
export type NewsItem = {
  /** Ticker this news relates to, if any */
  ticker?: string;
  /** News headline */
  headline: string;
  /** Brief summary of the article */
  summary: string;
  /** ISO date string when published */
  publishedAt?: string;
  /** Source name (e.g. "Reuters", "Bloomberg") */
  source?: string;
  /** Sentiment if analyzed: positive, negative, neutral */
  sentiment?: "positive" | "negative" | "neutral";
};

/**
 * Earnings event context — most recent earnings result + next scheduled date.
 */
export type EarningsItem = {
  ticker: string;
  lastReportDate?: string;
  lastReportPeriod?: string;
  epsActual?: number;
  epsEstimate?: number;
  surprisePct?: number;
  surpriseLabel?: "BEAT" | "MET" | "MISSED" | "UNKNOWN";
  revenueActual?: number;
  revenueEstimate?: number;
  nextReportDate?: string;
  nextReportTiming?: string;
  source?: string;
};

/**
 * A stock several tracked superinvestors hold on the same side, derived from
 * their latest SEC Form 13F filings.
 */
export type SuperinvestorConsensusItem = {
  ticker: string;
  name: string;
  side: "long" | "short";
  /** How many tracked superinvestors report the position. */
  holderCount: number;
  /** Investor names, heaviest position first. */
  holders: string[];
  /** Average weight of the position across those investors' 13F books. */
  avgWeightPct: number;
  /** True when the user's portfolio already holds this ticker. */
  heldByUser: boolean;
};

/** Crowd-positioning signal from tracked superinvestors' 13F filings. */
export type SuperinvestorContext = {
  /** Quarter label, e.g. "Q1 2026". */
  asOfLabel: string;
  /** Number of tracked filers with a successfully parsed 13F. */
  liveFilerCount: number;
  /** Minimum holders required for a name to count as consensus. */
  minHolders: number;
  longs: SuperinvestorConsensusItem[];
  shorts: SuperinvestorConsensusItem[];
};

/**
 * SEC filing or earnings context for fundamental analysis.
 * This field is optional and designed for future filings retrieval integration.
 */
export type FilingItem = {
  /** Ticker this filing relates to */
  ticker?: string;
  /** Filing type (e.g. "10-K", "10-Q", "8-K", "Earnings") */
  filingType: string;
  /** Brief summary of key points */
  summary: string;
  /** ISO date string when filed */
  filedAt?: string;
  /** Source URL or reference */
  source?: string;
};

// ---------------------------------------------------------------------------
// Main analysis input — combines all context for the AI
// ---------------------------------------------------------------------------

export type AnalysisInput = {
  /** Core portfolio data */
  portfolio: PortfolioContext;

  /** User's investment profile and preferences */
  investorProfile: InvestorProfileContext | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Future intelligence layers (optional, empty for now)
  // These fields are designed for extensibility — retrieval systems can
  // populate them without changing the core analysis interface.
  // ─────────────────────────────────────────────────────────────────────────

  /** Recent news articles relevant to portfolio holdings */
  newsContext?: NewsItem[];

  /** SEC filings, earnings reports, and other fundamental data */
  filingsContext?: FilingItem[];

  /** Most recent earnings results + upcoming earnings dates per ticker */
  earningsContext?: EarningsItem[];

  /** Positions multiple tracked superinvestors share, from their 13F filings */
  superinvestorContext?: SuperinvestorContext;

  /** Warnings about data retrieval or quality issues */
  sourceWarnings?: string[];

  /** Additional context that may be useful for analysis */
  additionalContext?: string;
};

// ---------------------------------------------------------------------------
// Output — the structured report
// ---------------------------------------------------------------------------

/**
 * Verdict the model assigns to a holding after deep research.
 * BUY = high-conviction add, ACCUMULATE = scale in, HOLD = stay put,
 * TRIM = reduce size, SELL = exit, WATCH = no action, monitor catalyst.
 */
export type HoldingVerdict =
  | "BUY"
  | "ACCUMULATE"
  | "HOLD"
  | "TRIM"
  | "SELL"
  | "WATCH";

export type ConvictionLevel = "HIGH" | "MEDIUM" | "LOW";

/** Specific holding recommendation produced by the analysis engine. */
export type HoldingRecommendation = {
  ticker: string;
  /** Coarse legacy action used by the action-plan list. */
  action: "CONSIDER_SELLING" | "CONSIDER_REDUCING" | "HOLD" | "CONSIDER_ADDING";
  /** One-line rationale for the action. */
  reason: string;
  /**
   * The AI's deep verdict (filled when the report includes per-stock research).
   * Older reports may omit this.
   */
  verdict?: HoldingVerdict;
  conviction?: ConvictionLevel;
  /** 2-3 sentence investment thesis as we currently see it. */
  thesis?: string;
  /** Concrete bullets supporting the BUY/HOLD case. */
  bullCase?: string[];
  /** Concrete bullets supporting the SELL/TRIM/WATCH case. */
  bearCase?: string[];
  /** Upcoming events or signals that would change the verdict. */
  catalysts?: string[];
  /**
   * Notable items pulled from filings/news (e.g. "10-Q showed margin
   * compression in Cloud", "8-K disclosed CFO change"). The AI does this work,
   * the user does not have to read filings themselves.
   */
  recentDevelopments?: string[];
  /** Specific risks unique to this holding. */
  risks?: string[];
  /**
   * Earnings call summary for this holding written in plain English.
   * Surfaced as a dedicated card in the per-stock walkthrough.
   */
  earningsHighlight?: {
    /** ISO date of the report covered (last actual). */
    lastReportDate?: string;
    /** Human label such as "Q3 2025". */
    lastReportPeriod?: string;
    /** "BEAT" / "MET" / "MISSED" / "UNKNOWN" */
    surpriseLabel?: "BEAT" | "MET" | "MISSED" | "UNKNOWN";
    /** Surprise % vs estimate when available. */
    surprisePct?: number;
    /** 1-2 sentence explanation of what the print said and why it matters. */
    story?: string;
    /** ISO date of the next scheduled earnings event. */
    nextReportDate?: string;
    /** What to listen for next quarter (e.g. "AI capex guide"). */
    nextWatchPoints?: string[];
  };
  /** Optional execution plan steps the user owns (NOT research tasks). */
  todoItems?: string[];
};

/** Suggestion for adding to portfolio (ETF or stock symbol + rationale) */
export type AdditionSuggestion = {
  /** US trading symbol; must not duplicate an existing holding */
  ticker: string;
  /** Short name or fund title (e.g. "Vanguard Total Stock Market ETF") */
  suggestion: string;
  rationale: string;
};

/** Actionable plan with specific recommendations */
export type ActionPlan = {
  /** Holdings to review — each row should include todoItems checklist */
  holdingsToReview?: HoldingRecommendation[];
  /** 2–5 tickers to consider buying/researching (aligned with profile; not duplicates of current holdings) */
  potentialAdditions: AdditionSuggestion[];
  /** Concrete rebalancing steps in order of priority */
  rebalancingSteps?: string[];
};

export type AnalysisReport = {
  /** One-paragraph executive summary */
  summary: string;

  /** What's going well (e.g. diversification, performance) */
  strengths: string[];

  /** Possible concerns the investor should be aware of */
  risks: string[];

  /** Areas for potential improvement or exploration */
  opportunities: string[];

  /** Concrete next steps the investor may want to consider */
  suggestedActions: string[];

  /** Questions the AI might ask to deepen the analysis */
  followUpQuestions: string[];

  /** Specific actionable plan including buy/research ideas */
  actionPlan: ActionPlan;
};

// ---------------------------------------------------------------------------
// Generator interface — implemented by mock & real providers
// ---------------------------------------------------------------------------

export interface IReportGenerator {
  readonly name: string;

  /**
   * Generate a structured analysis report from the input context.
   * This may call an LLM or run rule-based heuristics.
   */
  generate(input: AnalysisInput): Promise<AnalysisReport>;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AnalysisProviderError extends Error {
  constructor(
    message: string,
    public readonly code: AnalysisErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AnalysisProviderError";
  }
}

export type AnalysisErrorCode =
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "VALIDATION_ERROR";
