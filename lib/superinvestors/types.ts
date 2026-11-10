import type { FilingFreshness } from "./freshness";

export type PositionSide = "long" | "short";

/** QoQ status vs the prior 13F period for this name. */
export type PositionChange = "added" | "held" | "removed";

export type SuperinvestorPosition = {
  ticker: string;
  name: string;
  /** Weight as % of reported 13F book value. */
  weightPct: number;
  side: PositionSide;
  note?: string;
  /** False when ticker could not be resolved (CUSIP shown instead). */
  concrete?: boolean;
  cusip?: string;
  valueUsd?: number;
  shares?: number;
  /** Present when prior-period comparison ran. */
  change?: PositionChange;
};

export type HoldingsSource = "sec-13f" | "none" | "unavailable";

/** Quarter-over-quarter long-book turnover vs the prior 13F period. */
export type HoldingsChangeSummary = {
  previousQuarter: string;
  previousReportDate: string;
  previousFilingDate: string;
  added: { ticker: string; name: string; cusip: string }[];
  removed: { ticker: string; name: string; cusip: string }[];
  /** Equity (+ call) lines compared after CUSIP aggregation. */
  comparedCount: number;
};

export type Superinvestor = {
  id: string;
  name: string;
  firm: string;
  style: string;
  cik?: string;
  reportingEntity: string;
  asOfQuarter: string;
  bookValueUsdM?: number;
  bio: string;
  longs: SuperinvestorPosition[];
  shorts: SuperinvestorPosition[];
  dataNotes: string[];
  holdingsSource: HoldingsSource;
  filingDate?: string;
  reportDate?: string;
  /** Prior distinct 13F report period, if known from EDGAR index. */
  previousReportDate?: string;
  previousFilingDate?: string;
  previousQuarter?: string;
  /** Whether this filing matches the expected latest SEC period. */
  freshness?: FilingFreshness;
  /** QoQ long-book adds/exits (detail views; may be omitted on list). */
  holdingsChange?: HoldingsChangeSummary;
  /** Prior-period longs used for consensus QoQ (not shown directly). */
  priorLongs?: SuperinvestorPosition[];
  /** Prior-period puts used for consensus QoQ (not shown directly). */
  priorShorts?: SuperinvestorPosition[];
  /** When this filer's 13F was last fetched from SEC (ISO). */
  fetchedAt?: string;
  sourceUrl?: string;
  holdingsError?: string;
};

export type ConsensusPosition = {
  ticker: string;
  name: string;
  side: PositionSide;
  holderCount: number;
  holders: { id: string; name: string; weightPct: number }[];
  avgWeightPct: number;
  /** Vs prior-period consensus (same min-holders rule). */
  change?: PositionChange;
};

export type SuperinvestorsSnapshot = {
  asOfLabel: string;
  /** Expected latest 13F period per SEC calendar. */
  expectedQuarterLabel: string;
  /** How many live filers are on the expected latest period. */
  currentCount: number;
  /** How many live filers are still on an older period. */
  behindCount: number;
  /** When live 13F data for this snapshot was last fetched (ISO). */
  fetchedAt: string;
  investors: Superinvestor[];
  consensusLongs: ConsensusPosition[];
  consensusShorts: ConsensusPosition[];
  disclaimer: string;
  liveCount: number;
  failedCount: number;
};
