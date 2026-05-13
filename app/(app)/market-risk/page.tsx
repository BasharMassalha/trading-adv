import type { Metadata } from "next";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegimeCard } from "@/components/market-risk/regime-card";
import { RiskIndicatorBar } from "@/components/market-risk/risk-indicator-bar";
import { RiskTrendLoader } from "@/components/market-risk/risk-trend-loader";
import { HistoricalComparisonSection } from "@/components/market-risk/historical-comparison-section";
import { IndicatorBreakdown } from "@/components/market-risk/indicator-breakdown";
import { AiExplanation } from "@/components/market-risk/ai-explanation";
import { marketRiskService } from "@/server/services/market-risk.service";
import type { MarketRiskSnapshot } from "@/lib/market-risk/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Market Risk",
  description:
    "Market Risk Regime Monitor — a risk indicator comparing today's conditions to historical stress periods. Not a forecast.",
};

type LoadState =
  | { kind: "ready"; snapshot: MarketRiskSnapshot }
  | { kind: "error"; message: string };

async function loadSnapshot(): Promise<LoadState> {
  try {
    const snapshot = await marketRiskService.getCurrentSnapshot();
    return { kind: "ready", snapshot };
  } catch (e) {
    return {
      kind: "error",
      message: e instanceof Error ? e.message : "Failed to load risk regime.",
    };
  }
}

export default async function MarketRiskPage() {
  const state = await loadSnapshot();

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Market Risk Regime Monitor
            </h1>
            <Badge variant="secondary" className="text-[10px]">
              Beta
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A composite, 0–100 indicator of current market stress conditions —
            with side-by-side comparison to historical stress periods such as
            the Dot-Com bust, 2008, the COVID shock, and the 2022 tightening
            cycle. This is a risk indicator, not a forecast or guaranteed
            prediction.
          </p>
        </div>
      </div>

      {state.kind === "error" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-sm">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-foreground">
              Couldn&apos;t load the risk regime snapshot.
            </p>
            <p className="text-muted-foreground">{state.message}</p>
          </CardContent>
        </Card>
      ) : (
        <ReadyView snapshot={state.snapshot} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loaded layout
// ---------------------------------------------------------------------------

function ReadyView({ snapshot }: { snapshot: MarketRiskSnapshot }) {
  return (
    <div className="space-y-6">
      {/* ── 1. Risk Regime Card + Indicator Bar ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RegimeCard snapshot={snapshot} />
        </div>
        <RiskIndicatorBar
          score={snapshot.totalScore}
          regime={snapshot.regime}
        />
      </div>

      {/* ── 2. Trend chart ────────────────────────────────────────── */}
      <RiskTrendLoader days={180} />

      {/* ── 3. Indicator breakdown ───────────────────────────────── */}
      <IndicatorBreakdown indicators={snapshot.indicators} />

      {/* ── 4. Historical similarity ─────────────────────────────── */}
      <HistoricalComparisonSection
        comparisons={snapshot.historicalComparisons}
      />

      {/* ── 5. AI Explanation ─────────────────────────────────────── */}
      <AiExplanation snapshot={snapshot} />

      {/* ── 6. Footer disclaimer ──────────────────────────────────── */}
      <Card>
        <CardContent className="flex items-start gap-3 py-5 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            The Market Risk Regime Monitor is an educational risk indicator
            built from mock data while the macro feeds are wired up. It
            describes <em>risk conditions</em> historically associated with
            elevated market stress — it is not a forecast, not a guaranteed
            prediction, and should not be the only input to any investment
            decision. Always consider your own goals, time horizon, and risk
            tolerance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
