import Link from "next/link";
import type { Metadata } from "next";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { MarketToday } from "@/components/dashboard/market-today";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  computePortfolioStats,
  MOCK_HOLDINGS,
} from "@/lib/mock-data";
import { getMarketTodaySnapshot } from "@/server/services/market-snapshot.service";
import { getSession } from "@/lib/auth";
import { enrichmentService, type PortfolioView } from "@/server/services/enrichment.service";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { EmptyDashboard } from "@/components/empty-states";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

type DashboardState =
  | { type: "anonymous" }
  | { type: "empty" }
  | { type: "loaded"; data: PortfolioView };

async function getDashboardState(): Promise<DashboardState> {
  const session = await getSession();

  // Not logged in - show demo for anonymous visitors
  if (!session) {
    return { type: "anonymous" };
  }

  // Logged in - check if they have portfolios
  try {
    const portfolios = await portfolioRepository.listByUser(session.userId);
    if (portfolios.length === 0) {
      return { type: "empty" };
    }

    // Load the most recent portfolio
    const latest = portfolios[0];
    const data = await enrichmentService.getPortfolioView(latest.id);
    if (!data) {
      return { type: "empty" };
    }

    return { type: "loaded", data };
  } catch {
    return { type: "empty" };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const state = await getDashboardState();

  let marketSnapshot = null as Awaited<ReturnType<typeof getMarketTodaySnapshot>> | null;
  try {
    marketSnapshot = await getMarketTodaySnapshot();
  } catch (e) {
    console.error("[dashboard] market snapshot:", e);
  }

  // Show empty state for logged-in users with no portfolios
  if (state.type === "empty") {
    return <EmptyDashboard />;
  }

  // For anonymous users, show demo data
  // For logged-in users with data, show their real data
  const isAnonymous = state.type === "anonymous";
  const realData = state.type === "loaded" ? state.data : null;
  const usingMock = isAnonymous;

  // ── Stats ────────────────────────────────────────────────────────────────
  let totalValue: number | null;
  let totalGain: number | null;
  let totalGainPct: number | null;
  let holdingCount: number;
  let isEnriched: boolean;

  let topMovers: {
    symbol: string;
    name: string;
    sector: string | null;
    marketValue: number | null;
    gainPct: number | null;
  }[] = [];

  let sectorAlloc: { name: string; value: number }[] = [];

  if (realData) {
    totalValue = realData.totalValue;
    totalGain = realData.totalGain;
    totalGainPct = realData.totalGainPct;
    holdingCount = realData.holdingCount;
    isEnriched = realData.lastEnrichedAt != null;

    topMovers = [...realData.holdings]
      .filter((h) => h.unrealizedGainLossPct != null)
      .sort((a, b) => (b.unrealizedGainLossPct ?? 0) - (a.unrealizedGainLossPct ?? 0))
      .slice(0, 4)
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        sector: h.sector,
        marketValue: h.marketValue,
        gainPct: h.unrealizedGainLossPct,
      }));

    sectorAlloc = realData.sectorAllocation;
  } else {
    const stats = computePortfolioStats(MOCK_HOLDINGS);
    totalValue = stats.totalValue;
    totalGain = stats.totalGain;
    totalGainPct = stats.totalGainPct;
    holdingCount = stats.rows.length;
    isEnriched = false;

    topMovers = stats.rows
      .sort((a, b) => b.gainPct - a.gainPct)
      .slice(0, 4)
      .map((r) => ({
        symbol: r.symbol,
        name: r.name,
        sector: r.sector,
        marketValue: r.marketValue,
        gainPct: r.gainPct,
      }));

    sectorAlloc = Object.entries(
      MOCK_HOLDINGS.reduce<Record<string, number>>((acc, h) => {
        acc[h.sector] = (acc[h.sector] ?? 0) + h.quantity * h.price;
        return acc;
      }, {}),
    ).map(([name, value]) => ({ name, value }));
  }

  const biggestLoser = realData
    ? [...realData.holdings]
        .filter((h) => h.unrealizedGainLossPct != null)
        .sort((a, b) => (a.unrealizedGainLossPct ?? 0) - (b.unrealizedGainLossPct ?? 0))[0]
    : null;

  const topConcentration = realData
    ? [...realData.holdings]
        .filter((h) => h.weight != null)
        .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0]
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isAnonymous
              ? "Demo data — sign in to see your real holdings."
              : `Showing your most recent portfolio${!isEnriched ? " (prices not yet loaded)" : ""}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/portfolio/upload">Upload portfolio</Link>
          </Button>
          <Button asChild>
            <Link href="/advisor">
              Ask AI advisor <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Demo data banner (only for anonymous visitors) ───────────── */}
      {isAnonymous && (
        <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/30 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            You're viewing demo data.{" "}
            <Link
              href="/sign-up"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>{" "}
            to track your actual holdings and get AI-powered insights.
          </p>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Portfolio value"
          value={totalValue != null ? formatCurrency(totalValue) : "—"}
          delta={totalGainPct != null ? formatPercent(totalGainPct) : undefined}
          trend={totalGain != null ? (totalGain >= 0 ? "up" : "down") : "neutral"}
          hint="vs. cost basis"
          icon={DollarSign}
        />
        <StatCard
          label="Total gain / loss"
          value={totalGain != null ? formatCurrency(totalGain) : "—"}
          delta={totalGainPct != null ? formatPercent(totalGainPct) : undefined}
          trend={totalGain != null ? (totalGain >= 0 ? "up" : "down") : "neutral"}
          hint="unrealised"
          icon={TrendingUp}
        />
        <StatCard
          label="Holdings"
          value={String(holdingCount)}
          hint="unique positions"
          icon={Wallet}
        />
        <StatCard
          label={biggestLoser ? "Biggest loser" : "Positions"}
          value={
            biggestLoser
              ? `${biggestLoser.symbol} ${
                  biggestLoser.unrealizedGainLoss != null
                    ? formatCurrency(biggestLoser.unrealizedGainLoss)
                    : ""
                }`
              : isAnonymous
                ? "DEMO"
                : "—"
          }
          delta={
            biggestLoser?.unrealizedGainLossPct != null
              ? formatPercent(biggestLoser.unrealizedGainLossPct)
              : undefined
          }
          trend={biggestLoser ? "down" : "neutral"}
          hint={isAnonymous ? "demo data" : biggestLoser ? "unrealised" : ""}
          icon={TrendingDown}
        />
      </div>

      {/* ── Market pulse + allocation ───────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {marketSnapshot ? (
            <MarketToday snapshot={marketSnapshot} />
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Market snapshot unavailable.
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
            <CardDescription>Exposure by sector.</CardDescription>
          </CardHeader>
          <CardContent>
            {sectorAlloc.length > 0 ? (
              <AllocationChart data={sectorAlloc} />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                Refresh market data to see sector breakdown.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top movers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top gainers</CardTitle>
              <CardDescription>Best unrealised positions.</CardDescription>
            </div>
            {realData && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/portfolio/${realData.id}`}>View all</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {topMovers.map((r) => (
              <div
                key={r.symbol}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.symbol}</span>
                    {r.sector && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.sector}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {r.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {r.marketValue != null ? formatCurrency(r.marketValue) : "—"}
                  </div>
                  {r.gainPct != null && (
                    <div
                      className={
                        r.gainPct >= 0
                          ? "text-xs text-success"
                          : "text-xs text-destructive"
                      }
                    >
                      {r.gainPct >= 0 ? "+" : ""}
                      {formatPercent(r.gainPct)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Summary insights */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio highlights</CardTitle>
            <CardDescription>Key metrics at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topConcentration && (
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Concentration</Badge>
                  <span className="text-sm font-medium">{topConcentration.symbol}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Largest position at{" "}
                  {topConcentration.weight != null
                    ? formatPercent(topConcentration.weight * 100, 1)
                    : "—"}{" "}
                  of total portfolio value.
                </p>
              </div>
            )}

            {sectorAlloc.length > 0 && totalValue && (
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Top sector</Badge>
                  <span className="text-sm font-medium">
                    {sectorAlloc[0].name}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatPercent((sectorAlloc[0].value / totalValue) * 100, 1)} of
                  your portfolio is in {sectorAlloc[0].name}.
                </p>
              </div>
            )}

            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Badge variant={isEnriched ? "success" : "outline"}>
                  {isEnriched ? "Live prices" : "No prices yet"}
                </Badge>
                <span className="text-sm font-medium">Market data</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {isEnriched
                  ? "Prices refreshed. Open a portfolio and click Refresh to update."
                  : "Open your portfolio page and click 'Refresh market data' to load live prices."}
              </p>
            </div>

            {!isAnonymous && (
              <div className="rounded-md border bg-primary/5 border-primary/20 p-3">
                <div className="flex items-center gap-2">
                  <Badge>AI ready</Badge>
                  <span className="text-sm font-medium">Ask the advisor</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your portfolio is loaded. The AI advisor can analyse your
                  holdings, risk profile, and suggest rebalancing ideas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
