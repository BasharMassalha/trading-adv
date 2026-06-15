import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Wallet,
  PieChart,
  AlertTriangle,
  Sparkles,
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
import { AllocationChart } from "@/components/charts/allocation-chart";
import { PerformanceComparisonChart } from "@/components/charts/performance-comparison-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { computeRiskScore } from "@/lib/portfolio/risk-score";
import { RiskScoreCard } from "@/components/dashboard/risk-score-card";
import {
  enrichmentService,
  type PortfolioView,
  type HoldingView,
} from "@/server/services/enrichment.service";
import { investmentProfileRepository } from "@/server/repositories/investment-profile.repository";
import { getSession } from "@/lib/auth";
import { EmptyPortfolioDetail } from "@/components/empty-states";
import { EnrichButton } from "./enrich-button";
import { DeletePortfolioButton } from "./delete-portfolio-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portfolio" };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortfolioViewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();

  // Redirect to sign-in if not authenticated
  if (!session) {
    redirect("/sign-in");
  }

  // Try to load the portfolio
  let view: PortfolioView | null = null;
  try {
    view = await enrichmentService.getPortfolioView(params.id);
  } catch {
    view = null;
  }

  // If portfolio not found, show empty state
  if (!view) {
    return <EmptyPortfolioDetail />;
  }

  const isEnriched = view.lastEnrichedAt != null;
  const needsEnrichment = !isEnriched;

  const profile = await investmentProfileRepository.findByUserId(session.userId);

  const performance = isEnriched
    ? await enrichmentService.getPerformanceComparison(params.id, 365)
    : null;

  const riskScore = computeRiskScore({
    holdings: view.holdings.map((h) => ({
      symbol: h.symbol,
      type: h.type,
      weight: h.weight,
    })),
    sectorAllocation: view.sectorAllocation,
    totalValue: view.totalValue,
    riskTolerance: profile?.riskTolerance ?? null,
  });

  const uniqueSectors = view.sectorAllocation.length;
  const biggestWinner = [...view.holdings].sort(
    (a, b) => (b.unrealizedGainLossPct ?? -Infinity) - (a.unrealizedGainLossPct ?? -Infinity),
  )[0];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{view.name}</h1>
          <p className="text-xs text-muted-foreground">
            ID: {params.id} · Source: {view.source} · {view.baseCurrency}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/portfolio/upload">Re-import</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/advisor">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI advisor
            </Link>
          </Button>
          <DeletePortfolioButton portfolioId={params.id} portfolioName={view.name} />
          <EnrichButton
            portfolioId={params.id}
            lastEnrichedAt={view.lastEnrichedAt}
          />
        </div>
      </div>

      {/* ── Needs enrichment banner ────────────────────────────────────── */}
      {needsEnrichment && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-warning">
              Market data not yet loaded
            </p>
            <p className="mt-1 text-muted-foreground">
              Click "Refresh market data" above to fetch live prices,
              sector data, and 1-year price history for all your holdings.
            </p>
          </div>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Portfolio value"
          value={view.totalValue != null ? formatCurrency(view.totalValue) : "—"}
          delta={view.totalGainPct != null ? formatPercent(view.totalGainPct) : undefined}
          trend={view.totalGain != null ? (view.totalGain >= 0 ? "up" : "down") : "neutral"}
          hint="vs. cost basis"
          icon={DollarSign}
        />
        <StatCard
          label="Total gain / loss"
          value={view.totalGain != null ? formatCurrency(view.totalGain) : "—"}
          delta={view.totalGainPct != null ? formatPercent(view.totalGainPct) : undefined}
          trend={view.totalGain != null ? (view.totalGain >= 0 ? "up" : "down") : "neutral"}
          icon={TrendingUp}
        />
        <StatCard
          label="Holdings"
          value={String(view.holdingCount)}
          hint="positions"
          icon={Wallet}
        />
        <StatCard
          label="Sectors"
          value={String(uniqueSectors)}
          hint={
            biggestWinner
              ? `Top: ${biggestWinner.symbol} ${
                  biggestWinner.unrealizedGainLossPct != null
                    ? formatPercent(biggestWinner.unrealizedGainLossPct)
                    : ""
                }`
              : "diversified"
          }
          icon={PieChart}
        />
      </div>

      {/* ── Risk score ─────────────────────────────────────────────────── */}
      {isEnriched && view.holdings.length > 0 && (
        <RiskScoreCard result={riskScore} />
      )}

      {/* ── Tabbed detail ──────────────────────────────────────────────── */}
      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>

        {/* Holdings table */}
        <TabsContent value="holdings">
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
              <CardDescription>
                All positions sorted by market value.
                {!isEnriched && (
                  <span className="ml-1 text-warning">
                    Prices not yet loaded — refresh to see live values.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Ticker</TableHead>
                    <TableHead className="hidden md:table-cell">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Sector</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Mkt Value</TableHead>
                    <TableHead className="text-right">Gain / Loss</TableHead>
                    <TableHead className="text-right hidden xl:table-cell">
                      Weight
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.holdings.map((h) => (
                    <HoldingRow key={h.id} holding={h} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance chart */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance vs benchmark</CardTitle>
              <CardDescription>
                {isEnriched && performance && performance.combined.length > 0
                  ? "Indexed to 100 at start of period. Dashed line is S&P 500 (SPY)."
                  : "Refresh market data to load price history and benchmark comparison."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEnriched && performance && performance.combined.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {performance.portfolioReturnPct != null && (
                      <div>
                        <span className="text-muted-foreground">Your portfolio: </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            performance.portfolioReturnPct >= 0
                              ? "text-success"
                              : "text-destructive",
                          )}
                        >
                          {performance.portfolioReturnPct >= 0 ? "+" : ""}
                          {formatPercent(performance.portfolioReturnPct)}
                        </span>
                      </div>
                    )}
                    {performance.benchmarkReturnPct != null && (
                      <div>
                        <span className="text-muted-foreground">S&P 500 (SPY): </span>
                        <span className="font-semibold tabular-nums">
                          {performance.benchmarkReturnPct >= 0 ? "+" : ""}
                          {formatPercent(performance.benchmarkReturnPct)}
                        </span>
                      </div>
                    )}
                    {performance.portfolioReturnPct != null &&
                      performance.benchmarkReturnPct != null && (
                        <div>
                          <span className="text-muted-foreground">Alpha: </span>
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              performance.portfolioReturnPct -
                                performance.benchmarkReturnPct >=
                                0
                                ? "text-success"
                                : "text-destructive",
                            )}
                          >
                            {performance.portfolioReturnPct -
                              performance.benchmarkReturnPct >=
                            0
                              ? "+"
                              : ""}
                            {formatPercent(
                              performance.portfolioReturnPct -
                                performance.benchmarkReturnPct,
                            )}
                          </span>
                        </div>
                      )}
                  </div>
                  <PerformanceComparisonChart
                    data={performance.combined}
                    benchmarkLabel="S&P 500 (SPY)"
                  />
                </>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No performance history yet. Click &quot;Refresh market data&quot; to
                  fetch 1-year price history for your holdings.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocation chart */}
        <TabsContent value="allocation">
          <Card>
            <CardHeader>
              <CardTitle>Allocation by sector</CardTitle>
              <CardDescription>
                Current weight breakdown across sectors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {view.sectorAllocation.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <AllocationChart data={view.sectorAllocation} />
                  <ul className="space-y-2 self-center text-sm">
                    {view.sectorAllocation.map((s) => (
                      <li
                        key={s.name}
                        className="flex items-center justify-between"
                      >
                        <span className="text-muted-foreground">{s.name}</span>
                        <Badge variant="secondary">
                          {view.totalValue && view.totalValue > 0
                            ? formatPercent(
                                (s.value / view.totalValue) * 100,
                                1,
                              )
                            : "—"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sector data will appear after enrichment.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table row component
// ---------------------------------------------------------------------------

function HoldingRow({ holding: h }: { holding: HoldingView }) {
  const gainPositive = (h.unrealizedGainLoss ?? 0) >= 0;

  return (
    <TableRow>
      <TableCell className="pl-6">
        <div className="flex items-center gap-2">
          <span className="font-medium">{h.symbol}</span>
          {!h.isEnriched && (
            <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground">
              no data
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden max-w-[180px] truncate text-muted-foreground md:table-cell">
        {h.name}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {h.sector ? (
          <Badge variant="outline" className="text-[10px]">
            {h.sector}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{h.quantity}</TableCell>
      <TableCell className="text-right tabular-nums">
        {h.averageCost != null ? formatCurrency(h.averageCost) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {h.currentPrice != null ? (
          <div>
            <div>{formatCurrency(h.currentPrice)}</div>
            {h.priceChangePercent != null && (
              <div
                className={cn(
                  "text-[10px]",
                  h.priceChangePercent >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {h.priceChangePercent >= 0 ? "+" : ""}
                {h.priceChangePercent.toFixed(2)}%
              </div>
            )}
          </div>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">
        {h.marketValue != null ? formatCurrency(h.marketValue) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {h.unrealizedGainLoss != null ? (
          <span className={gainPositive ? "text-success" : "text-destructive"}>
            {gainPositive ? "+" : ""}
            {formatCurrency(h.unrealizedGainLoss)}
            {h.unrealizedGainLossPct != null && (
              <span className="ml-1 text-[10px]">
                ({formatPercent(h.unrealizedGainLossPct)})
              </span>
            )}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums text-muted-foreground xl:table-cell">
        {h.weight != null ? formatPercent(h.weight * 100, 1) : "—"}
      </TableCell>
    </TableRow>
  );
}
