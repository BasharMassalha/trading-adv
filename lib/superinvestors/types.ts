export type PositionSide = "long" | "short";

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
};

export type HoldingsSource = "sec-13f" | "none" | "unavailable";

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
};

export type SuperinvestorsSnapshot = {
  asOfLabel: string;
  investors: Superinvestor[];
  consensusLongs: ConsensusPosition[];
  consensusShorts: ConsensusPosition[];
  disclaimer: string;
  liveCount: number;
  failedCount: number;
};
