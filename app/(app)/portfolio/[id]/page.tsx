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
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
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
import { isCashSymbol } from "@/lib/portfolio/cash";
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
import { RenamePortfolioButton } from "./rename-portfolio-button";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { GuestTrialBanner } from "@/components/auth/guest-trial-banner";

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

  const owned = await portfolioRepository.findById(params.id);
  if (!owned || owned.userId !== session.userId) {
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
    <div className="space-y-5">
      {session.isGuest ? <GuestTrialBanner variant="portfolio" /> : null}
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow={
          <Link
            href={session.isGuest ? "/portfolio/upload?trial=true" : "/dashboard"}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {session.isGuest ? "Import" : "Dashboard"}
          </Link>
        }
        title={view.name}
        description={
          <span className="font-mono text-[11.5px] text-faint">
            ID {params.id} · Source {view.source} · {view.baseCurrency}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={
                  session.isGuest
                    ? "/portfolio/upload?trial=true"
                    : `/portfolio/upload?portfolioId=${encodeURIComponent(params.id)}`
                }
              >
                Re-import
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/advisor?portfolio=${encodeURIComponent(params.id)}`}>
                <Sparkles className="h-3.5 w-3.5" />
                {session.isGuest ? "Run analysis" : "AI advisor"}
              </Link>
            </Button>
            {!session.isGuest ? (
              <>
                <RenamePortfolioButton
                  portfolioId={params.id}
                  portfolioName={view.name}
                />
                <DeletePortfolioButton
                  portfolioId={params.id}
                  portfolioName={view.name}
                />
              </>
            ) : null}
            <EnrichButton
              portfolioId={params.id}
              lastEnrichedAt={view.lastEnrichedAt}
            />
          </>
        }
      />

      {/* ── Needs enrichment banner ────────────────────────────────────── */}
      {needsEnrichment && (
        <div className="flex items-start gap-2.5 border border-warning/30 bg-warning-soft px-3.5 py-3 text-[12.5px]">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-warning">
              Market data not yet loaded
            </p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Prices load on their own about once a minute. Use &ldquo;Refresh
              market data&rdquo; when you also want sector details and a year of
              price history.
            </p>
          </div>
        </div>
      )}

      {/* ── Stat tiles ─────────────────────────────────────────────────── */}
      <StatGrid>
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
          valueTone="auto"
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
      </StatGrid>

      {/* ── Risk score ─────────────────────────────────────────────────── */}
      {isEnriched && view.holdings.length > 0 && (
        <RiskScoreCard result={riskScore} portfolioId={params.id} />
      )}

      {/* ── Tabbed detail ──────────────────────────────────────────────── */}
      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>

        {/* Holdings table */}
        <TabsContent value="holdings" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <SectionTitle>Holdings</SectionTitle>
              <p className="text-[12px] text-muted-foreground">
                All positions sorted by market value.
                {!isEnriched && (
                  <span className="ml-1 text-warning">
                    Prices not yet loaded. Refresh to see live values.
                  </span>
                )}
              </p>
            </div>
            {!session.isGuest ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/portfolio/${params.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead className="hidden md:table-cell">Sector</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Mkt value</TableHead>
                <TableHead className="text-right">Gain / loss</TableHead>
                <TableHead className="hidden text-right xl:table-cell">
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
        </TabsContent>

        {/* Performance chart */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="text-[14px]">
                Performance vs benchmark
              </CardTitle>
              <CardDescription className="text-[12.5px]">
                {isEnriched && performance && performance.combined.length > 0
                  ? "Indexed to 100 at start of period. Dashed line is S&P 500 (SPY)."
                  : "Refresh market data to load price history and benchmark comparison."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEnriched && performance && performance.combined.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-x-10 gap-y-3 border bg-background px-4 py-3">
                    {performance.portfolioReturnPct != null && (
                      <div className="text-[12px] text-muted-foreground">
                        Your portfolio
                        <span
                          className={cn(
                            "mt-0.5 block font-mono text-[15px] font-semibold",
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
                      <div className="text-[12px] text-muted-foreground">
                        S&P 500 (SPY)
                        <span className="mt-0.5 block font-mono text-[15px] font-semibold text-foreground">
                          {performance.benchmarkReturnPct >= 0 ? "+" : ""}
                          {formatPercent(performance.benchmarkReturnPct)}
                        </span>
                      </div>
                    )}
                    {performance.portfolioReturnPct != null &&
                      performance.benchmarkReturnPct != null && (
                        <div className="text-[12px] text-muted-foreground">
                          Alpha
                          <span
                            className={cn(
                              "mt-0.5 block font-mono text-[15px] font-semibold",
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
                <div className="border border-dashed bg-background p-8 text-center text-[12.5px] text-muted-foreground">
                  No performance history yet. Choose &ldquo;Refresh market
                  data&rdquo; to fetch 1-year price history for your holdings.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocation chart */}
        <TabsContent value="allocation">
          <Card>
            <CardHeader>
              <CardTitle className="text-[14px]">Allocation by sector</CardTitle>
              <CardDescription className="text-[12.5px]">
                Current weight breakdown across sectors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {view.sectorAllocation.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <AllocationChart data={view.sectorAllocation} />
                  <ul className="self-center border-t text-[12.5px]">
                    {view.sectorAllocation.map((s) => (
                      <li
                        key={s.name}
                        className="flex items-center justify-between gap-4 border-b py-2"
                      >
                        <span className="min-w-0 truncate text-muted-foreground">
                          {s.name}
                        </span>
                        <span className="shrink-0 font-mono font-medium">
                          {view.totalValue && view.totalValue > 0
                            ? formatPercent(
                                (s.value / view.totalValue) * 100,
                                1,
                              )
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="border border-dashed bg-background p-8 text-center text-[12.5px] text-muted-foreground">
                  Sector data will appear after market data is loaded.
                </div>
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
  const cash = isCashSymbol(h.symbol) || h.type === "CASH";
  const gainPositive = (h.unrealizedGainLoss ?? 0) >= 0;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-semibold">{h.symbol}</span>
          {cash ? (
            <Badge variant="secondary" className="px-1 text-[10px] leading-4">
              cash
            </Badge>
          ) : null}
          {!h.isEnriched && !cash && (
            <Badge variant="outline" className="px-1 text-[10px] leading-4">
              no data
            </Badge>
          )}
        </div>
        <div className="mt-px max-w-[220px] truncate text-[11.5px] text-faint">
          {h.name}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {cash ? (
          <span className="text-faint">Cash</span>
        ) : h.sector ? (
          <span className="whitespace-nowrap rounded-md border bg-background px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
            {h.sector}
          </span>
        ) : (
          <span className="text-faint">—</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {cash ? formatCurrency(h.quantity) : h.quantity}
      </TableCell>
      <TableCell className="text-right font-mono">
        {cash
          ? formatCurrency(1)
          : h.averageCost != null
            ? formatCurrency(h.averageCost)
            : "—"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {cash ? (
          formatCurrency(1)
        ) : h.currentPrice != null ? (
          <div>
            <div>{formatCurrency(h.currentPrice)}</div>
            {h.priceChangePercent != null && (
              <div
                className={cn(
                  "mt-px text-[11px]",
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
      <TableCell className="text-right font-mono font-medium">
        {h.marketValue != null
          ? formatCurrency(h.marketValue)
          : cash
            ? formatCurrency(h.quantity)
            : "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-mono">
        {cash ? (
          <span className="text-faint">—</span>
        ) : h.unrealizedGainLoss != null ? (
          <span className={gainPositive ? "text-success" : "text-destructive"}>
            {gainPositive ? "+" : ""}
            {formatCurrency(h.unrealizedGainLoss)}
            {h.unrealizedGainLossPct != null && (
              <span className="ml-1.5 text-[11px] text-faint">
                {formatPercent(h.unrealizedGainLossPct)}
              </span>
            )}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="hidden text-right font-mono text-muted-foreground xl:table-cell">
        {h.weight != null ? formatPercent(h.weight * 100, 1) : "—"}
      </TableCell>
    </TableRow>
  );
}
