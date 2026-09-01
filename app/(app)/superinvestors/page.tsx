import type { Metadata } from "next";
import Link from "next/link";
import { Users, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { ConsensusTable } from "@/components/superinvestors/consensus-table";
import { superinvestorsService } from "@/server/services/superinvestors.service";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Superinvestors",
  description:
    "Live SEC 13F portfolios and overlapping holdings across leading investors.",
};

export default async function SuperinvestorsPage() {
  const snapshot = await superinvestorsService.getSnapshot(3);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Superinvestors"
        description={`Live 13F holdings from SEC EDGAR for ${snapshot.investors.length} well-known investors, plus consensus longs and disclosed put options only.`}
        actions={
          <>
            <Badge variant="secondary">
              Latest period {snapshot.asOfLabel}
            </Badge>
            <Badge variant="outline">SEC 13F · ~45-day lag</Badge>
            <Badge variant="outline">
              <span className="font-mono">
                {snapshot.liveCount}/{snapshot.investors.length}
              </span>{" "}
              live
            </Badge>
          </>
        }
      />

      <p className="border border-warning/30 bg-warning-soft px-4 py-3 text-[12.5px] leading-relaxed text-warning">
        {snapshot.disclaimer}
      </p>

      <StatGrid>
        <StatCard
          label="Investors tracked"
          value={String(snapshot.investors.length)}
          hint={`${snapshot.liveCount} with live 13F`}
          icon={Users}
        />
        <StatCard
          label="Consensus longs"
          value={String(snapshot.consensusLongs.length)}
          hint="Held by 3+ managers"
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          label="Consensus puts"
          value={String(snapshot.consensusShorts.length)}
          hint="Disclosed 13F puts only"
          trend="down"
          icon={TrendingDown}
        />
        <StatCard
          label="Fetch issues"
          value={String(snapshot.failedCount)}
          hint="Unavailable this refresh"
          icon={AlertTriangle}
        />
      </StatGrid>

      {/* ── Consensus ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <SectionTitle>Shared ideas</SectionTitle>
          <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-muted-foreground">
            Overlap across live 13F books. Put consensus only includes options
            actually disclosed in filings. Most hedge-fund short books stay
            private and are never shown here.
          </p>
        </div>

        <ConsensusTable
          title="Consensus longs"
          description="Tickers appearing in at least three long books."
          positions={snapshot.consensusLongs}
          emptyHint="No long overlap at the current threshold (or tickers still resolving)."
          tone="long"
        />
        <ConsensusTable
          title="Consensus puts"
          description="Put-option tickers shared by at least three managers."
          positions={snapshot.consensusShorts}
          emptyHint="No shared put tickers. Expected, since most shorts are not in 13F."
          tone="short"
        />
      </div>

      {/* ── Investor directory ───────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionTitle>All investors</SectionTitle>

        <div className="hairline-grid grid md:grid-cols-2 xl:grid-cols-3">
          {snapshot.investors.map((inv) => (
            <Link
              key={inv.id}
              href={`/superinvestors/${inv.id}`}
              className="flex flex-col p-5 transition-colors hover:bg-background"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold tracking-tight">
                    {inv.name}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {inv.firm}
                  </div>
                </div>
                <Badge
                  variant={
                    inv.holdingsSource === "sec-13f" ? "info" : "secondary"
                  }
                  className="shrink-0"
                >
                  {inv.holdingsSource === "sec-13f"
                    ? inv.asOfQuarter
                    : inv.holdingsSource === "unavailable"
                      ? "Fetch failed"
                      : "No 13F"}
                </Badge>
              </div>

              <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {inv.style}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-faint">
                <span>
                  <span className="font-mono">{inv.longs.length}</span> longs
                  shown
                </span>
                <span>·</span>
                <span>
                  <span className="font-mono">{inv.shorts.length}</span> put
                  {inv.shorts.length === 1 ? "" : "s"}
                </span>
                {inv.bookValueUsdM != null ? (
                  <>
                    <span>·</span>
                    <span>
                      <span className="font-mono">
                        {formatCurrency(inv.bookValueUsdM * 1_000_000).replace(
                          /\.\d+$/,
                          "",
                        )}
                      </span>{" "}
                      13F book
                    </span>
                  </>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
