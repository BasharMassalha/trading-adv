import Link from "next/link";
import type { Metadata } from "next";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { MarketToday } from "@/components/dashboard/market-today";
import { FuturePortfolioProjection } from "@/components/dashboard/future-portfolio-projection";
import { RiskScoreCard } from "@/components/dashboard/risk-score-card";
import { SectorAllocationBar } from "@/components/charts/sector-allocation-bar";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { computeRiskScore } from "@/lib/portfolio/risk-score";
import {
  computePortfolioStats,
  MOCK_HOLDINGS,
  MOCK_PERFORMANCE_SERIES,
} from "@/lib/mock-data";
import { getMarketTodaySnapshot } from "@/server/services/market-snapshot.service";
import { getSession } from "@/lib/auth";
import {
  enrichmentService,
  type PortfolioView,
} from "@/server/services/enrichment.service";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { investmentProfileRepository } from "@/server/repositories/investment-profile.repository";
import { aiReportRepository } from "@/server/repositories/ai-report.repository";
import { EmptyDashboard } from "@/components/empty-states";
import { buildProjectionReturnAssumption } from "@/lib/projections/assumptions";
import { DashboardPortfolioPicker } from "@/components/dashboard/dashboard-portfolio-picker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

type DashboardState =
  | { type: "anonymous" }
  | { type: "empty" }
  | {
      type: "loaded";
      data: PortfolioView;
      investmentGoal: string | null;
      riskTolerance: string | null;
      hasLatestAnalysis: boolean;
      portfolios: { id: string; name: string; holdingCount: number }[];
    };

/** Unified row shape so real and demo books render through the same table. */
type Row = {
  symbol: string;
  name: string;
  sector: string | null;
  quantity: number | null;
  averageCost: number | null;
  price: number | null;
  marketValue: number | null;
  gain: number | null;
  gainPct: number | null;
  weight: number | null;
};

async function getDashboardState(
  selectedPortfolioId?: string,
): Promise<DashboardState> {
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

    const portfolioOptions = portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      holdingCount: p._count?.holdings ?? 0,
    }));

    const selected =
      (selectedPortfolioId
        ? portfolios.find((p) => p.id === selectedPortfolioId)
        : undefined) ?? portfolios[0];

    const data = await enrichmentService.getPortfolioView(selected.id);
    if (!data) {
      return { type: "empty" };
    }

    const profile = await investmentProfileRepository.findByUserId(
      session.userId,
    );
    const latestReport = await aiReportRepository.findLatestForPortfolio(
      data.id,
    );

    return {
      type: "loaded",
      data,
      investmentGoal: profile?.investmentGoal ?? null,
      riskTolerance: profile?.riskTolerance ?? null,
      hasLatestAnalysis: latestReport != null,
      portfolios: portfolioOptions,
    };
  } catch {
    return { type: "empty" };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { portfolio?: string };
}) {
  const state = await getDashboardState(searchParams?.portfolio?.trim());

  let marketSnapshot = null as Awaited<
    ReturnType<typeof getMarketTodaySnapshot>
  > | null;
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
  const investmentGoal = state.type === "loaded" ? state.investmentGoal : null;
  const riskTolerance = state.type === "loaded" ? state.riskTolerance : null;
  const hasLatestAnalysis =
    state.type === "loaded" ? state.hasLatestAnalysis : false;
  const portfolioOptions =
    state.type === "loaded" ? state.portfolios : [];
  const usingMock = isAnonymous;

  const projectionAssumption = buildProjectionReturnAssumption({
    riskTolerance,
    investmentGoal,
    hasLatestAnalysis,
    isDemo: usingMock,
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  let totalValue: number | null;
  let totalGain: number | null;
  let totalGainPct: number | null;
  let holdingCount: number;
  let isEnriched: boolean;

  let rows: Row[] = [];
  let sectorAlloc: { name: string; value: number }[] = [];

  if (realData) {
    totalValue = realData.totalValue;
    totalGain = realData.totalGain;
    totalGainPct = realData.totalGainPct;
    holdingCount = realData.holdingCount;
    isEnriched = realData.lastEnrichedAt != null;

    rows = [...realData.holdings]
      .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        sector: h.sector,
        quantity: h.quantity,
        averageCost: h.averageCost,
        price: h.currentPrice,
        marketValue: h.marketValue,
        gain: h.unrealizedGainLoss,
        gainPct: h.unrealizedGainLossPct,
        weight: h.weight != null ? h.weight * 100 : null,
      }));

    sectorAlloc = realData.sectorAllocation;
  } else {
    const stats = computePortfolioStats(MOCK_HOLDINGS);
    totalValue = stats.totalValue;
    totalGain = stats.totalGain;
    totalGainPct = stats.totalGainPct;
    holdingCount = stats.rows.length;
    isEnriched = false;

    rows = [...stats.rows]
      .sort((a, b) => b.marketValue - a.marketValue)
      .map((r) => ({
        symbol: r.symbol,
        name: r.name,
        sector: r.sector,
        quantity: r.quantity,
        averageCost: r.avgCost,
        price: r.price,
        marketValue: r.marketValue,
        gain: r.gain,
        gainPct: r.gainPct,
        weight:
          stats.totalValue > 0 ? (r.marketValue / stats.totalValue) * 100 : null,
      }));

    sectorAlloc = Object.entries(
      MOCK_HOLDINGS.reduce<Record<string, number>>((acc, h) => {
        acc[h.sector] = (acc[h.sector] ?? 0) + h.quantity * h.price;
        return acc;
      }, {}),
    ).map(([name, value]) => ({ name, value }));
  }

  const withPct = rows.filter((r) => r.gainPct != null);
  const biggestLoser =
    withPct.length > 0
      ? [...withPct].sort((a, b) => (a.gainPct ?? 0) - (b.gainPct ?? 0))[0]
      : null;
  const topConcentration =
    rows.filter((r) => r.weight != null).sort(
      (a, b) => (b.weight ?? 0) - (a.weight ?? 0),
    )[0] ?? null;

  const riskScoreInput = realData
    ? {
        holdings: realData.holdings.map((h) => ({
          symbol: h.symbol,
          type: h.type,
          weight: h.weight,
        })),
        sectorAllocation: realData.sectorAllocation,
        totalValue: realData.totalValue,
        riskTolerance: riskTolerance ?? "MODERATE",
      }
    : (() => {
        const stats = computePortfolioStats(MOCK_HOLDINGS);
        const sectorMap = MOCK_HOLDINGS.reduce<Record<string, number>>(
          (acc, h) => {
            const mv = h.quantity * h.price;
            acc[h.sector] = (acc[h.sector] ?? 0) + mv;
            return acc;
          },
          {},
        );
        return {
          holdings: stats.rows.map((r) => ({
            symbol: r.symbol,
            type: "STOCK",
            weight:
              stats.totalValue > 0 ? r.marketValue / stats.totalValue : null,
          })),
          sectorAllocation: Object.entries(sectorMap).map(([name, value]) => ({
            name,
            value,
          })),
          totalValue: stats.totalValue,
          riskTolerance: "MODERATE",
        };
      })();

  const riskScore = computeRiskScore(riskScoreInput);
  const valueSpark = usingMock
    ? MOCK_PERFORMANCE_SERIES.map((p) => p.value)
    : undefined;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Dashboard"
        description={
          isAnonymous
            ? "Worked example using sample positions. Sign in to analyse your own book."
            : isEnriched
              ? "Valuation and allocation for the portfolio selected below, at the latest close."
              : "Valuation and allocation for the portfolio selected below. Prices not loaded yet."
        }
        actions={
          <>
            {!isAnonymous && portfolioOptions.length > 0 && realData ? (
              <DashboardPortfolioPicker
                portfolios={portfolioOptions}
                selectedId={realData.id}
              />
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/portfolio/upload">Upload portfolio</Link>
            </Button>
            <Button asChild>
              <Link
                href={
                  realData
                    ? `/advisor?portfolio=${encodeURIComponent(realData.id)}`
                    : "/advisor"
                }
              >
                Ask AI advisor
              </Link>
            </Button>
          </>
        }
      />

      {/* ── Demo data banner (only for anonymous visitors) ───────────── */}
      {isAnonymous && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border border-border-strong bg-surface px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
          <Badge variant="secondary">Sample</Badge>
          <span>
            These are illustrative positions.{" "}
            <Link
              href="/sign-up"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>{" "}
            to run the same analysis against your own holdings.
          </span>
        </div>
      )}

      {/* ── Stat tiles ─────────────────────────────────────────────────── */}
      <StatGrid>
        <StatCard
          label="Portfolio value"
          value={totalValue != null ? formatCurrency(totalValue) : "—"}
          delta={totalGainPct != null ? formatPercent(totalGainPct) : undefined}
          trend={
            totalGain != null ? (totalGain >= 0 ? "up" : "down") : "neutral"
          }
          hint="vs. cost basis"
          icon={DollarSign}
          spark={valueSpark}
        />
        <StatCard
          label="Total gain / loss"
          value={totalGain != null ? formatCurrency(totalGain) : "—"}
          delta={totalGainPct != null ? formatPercent(totalGainPct) : undefined}
          trend={
            totalGain != null ? (totalGain >= 0 ? "up" : "down") : "neutral"
          }
          hint="unrealised"
          valueTone="auto"
          icon={TrendingUp}
        />
        <StatCard
          label="Holdings"
          value={String(holdingCount)}
          hint="unique positions"
          icon={Wallet}
        />
        <StatCard
          label={biggestLoser ? "Weakest position" : "Positions"}
          value={biggestLoser ? biggestLoser.symbol : isAnonymous ? "—" : "—"}
          delta={
            biggestLoser?.gainPct != null
              ? formatPercent(biggestLoser.gainPct)
              : undefined
          }
          trend={biggestLoser ? "down" : "neutral"}
          hint={biggestLoser ? "unrealised" : ""}
          valueTone="auto"
          icon={TrendingDown}
        />
      </StatGrid>

      {/* ── Risk + allocation ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RiskScoreCard
          result={riskScore}
          showAdvisorLink={!isAnonymous}
          compact={isAnonymous}
          portfolioId={realData?.id}
        />

        <div className="border bg-surface p-5">
          <h3 className="text-[13.5px] font-semibold">Allocation</h3>
          <p className="mb-4 mt-0.5 text-[12px] text-muted-foreground">
            By sector, weighted by market value
          </p>
          <SectorAllocationBar data={sectorAlloc} />
        </div>
      </div>

      {/* ── Holdings ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionTitle
          actions={
            realData ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/portfolio/${realData.id}`}>Open portfolio</Link>
              </Button>
            ) : null
          }
        >
          Holdings
        </SectionTitle>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Avg cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Mkt value</TableHead>
              <TableHead className="text-right">Gain / loss</TableHead>
              <TableHead className="text-right">Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.symbol}>
                <TableCell>
                  <div className="font-mono text-[13px] font-semibold">
                    {r.symbol}
                  </div>
                  <div className="mt-px max-w-[220px] truncate text-[11.5px] text-faint">
                    {r.name}
                  </div>
                </TableCell>
                <TableCell>
                  {r.sector ? (
                    <span className="whitespace-nowrap rounded-md border bg-background px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                      {r.sector}
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {r.quantity ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {r.averageCost != null ? formatCurrency(r.averageCost) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {r.price != null ? formatCurrency(r.price) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {r.marketValue != null ? formatCurrency(r.marketValue) : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "whitespace-nowrap text-right font-mono",
                    r.gain != null && r.gain >= 0
                      ? "text-success"
                      : r.gain != null
                        ? "text-destructive"
                        : null,
                  )}
                >
                  {r.gain != null ? (
                    <>
                      {r.gain >= 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(r.gain))}
                      {r.gainPct != null ? (
                        <span className="ml-1.5 text-[11px] text-faint">
                          {formatPercent(r.gainPct)}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {r.weight != null ? formatPercent(r.weight, 1) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Market pulse ───────────────────────────────────────────────── */}
      {marketSnapshot ? (
        <MarketToday snapshot={marketSnapshot} />
      ) : (
        <div className="border border-dashed p-8 text-center text-[12.5px] text-muted-foreground">
          Market snapshot unavailable.
        </div>
      )}

      {/* ── Projection ─────────────────────────────────────────────────── */}
      <FuturePortfolioProjection
        portfolioValue={totalValue}
        investmentGoal={investmentGoal}
        assumption={projectionAssumption}
        isDemo={usingMock}
      />

      {/* ── Highlights ─────────────────────────────────────────────────── */}
      <div className="hairline-grid grid md:grid-cols-3">
        {topConcentration ? (
          <div className="p-5">
            <div className="flex items-center gap-2">
              <Badge variant="warning">Concentration</Badge>
              <span className="font-mono text-[13px] font-semibold">
                {topConcentration.symbol}
              </span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Largest single position at{" "}
              {topConcentration.weight != null
                ? formatPercent(topConcentration.weight, 1)
                : "—"}{" "}
              of the book. Anything above roughly a fifth starts to dominate the
              portfolio&rsquo;s outcome on its own.
            </p>
          </div>
        ) : null}

        {sectorAlloc.length > 0 && totalValue ? (
          <div className="p-5">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Top sector</Badge>
              <span className="text-[13px] font-semibold">
                {sectorAlloc[0].name}
              </span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {formatPercent((sectorAlloc[0].value / totalValue) * 100, 1)} of
              exposure sits in {sectorAlloc[0].name}; one macro shock moves all
              of it at once.
            </p>
          </div>
        ) : null}

        <div className="p-5">
          <div className="flex items-center gap-2">
            <Badge variant={isEnriched ? "success" : "outline"}>
              {isEnriched ? "Live prices" : "No prices yet"}
            </Badge>
            <span className="text-[13px] font-semibold">Market data</span>
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {isEnriched
              ? "Pricing is current. Open the portfolio and refresh to pull the latest quotes."
              : "Open your portfolio and choose “Refresh market data” to price the book."}
          </p>
        </div>
      </div>
    </div>
  );
}
