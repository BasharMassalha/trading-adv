import type { Metadata } from "next";
import Link from "next/link";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { ConsensusTable } from "@/components/superinvestors/consensus-table";
import { superinvestorsService } from "@/server/services/superinvestors.service";
import { formatCurrency } from "@/lib/utils";
import type { Superinvestor } from "@/lib/superinvestors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata: Metadata = {
  title: "Superinvestors",
  description:
    "Live SEC 13F portfolios and overlapping holdings across leading investors.",
};

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
  } catch {
    return iso;
  }
}

function freshnessBadge(inv: Superinvestor) {
  if (inv.holdingsSource !== "sec-13f" || !inv.freshness) return null;
  if (inv.freshness.status === "behind") {
    return (
      <Badge variant="warning" className="shrink-0">
        {inv.freshness.quartersBehind === 1
          ? "1Q behind"
          : `${inv.freshness.quartersBehind}Q behind`}
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="shrink-0">
      Latest period
    </Badge>
  );
}

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
              Expected now {snapshot.expectedQuarterLabel}
            </Badge>
            <Badge variant="outline">SEC 13F · ~45-day lag</Badge>
            <Badge variant="outline">
              <span className="font-mono">
                {snapshot.currentCount}/{snapshot.liveCount || snapshot.investors.length}
              </span>{" "}
              on latest period
            </Badge>
          </>
        }
      />

      <p className="border border-warning/30 bg-warning-soft px-4 py-3 text-[12.5px] leading-relaxed text-warning">
        {snapshot.disclaimer}
      </p>

      <p className="border bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Freshness is vs the SEC calendar, not our cache. After each quarter-end,
        filers have about 45 days to publish.{" "}
        <span className="font-medium text-foreground">
          {snapshot.currentCount} of {snapshot.liveCount}
        </span>{" "}
        live books are on the expected {snapshot.expectedQuarterLabel} period
        {snapshot.behindCount > 0
          ? `; ${snapshot.behindCount} still show an older quarter`
          : ""}
        . A new filing period means the disclosed portfolio snapshot changed;
        day-to-day trading inside a quarter is not visible in 13F.
      </p>

      <StatGrid>
        <StatCard
          label="Investors tracked"
          value={String(snapshot.investors.length)}
          hint={`${snapshot.liveCount} with live 13F`}
          icon={Users}
        />
        <StatCard
          label="On latest period"
          value={String(snapshot.currentCount)}
          hint={`Expected ${snapshot.expectedQuarterLabel}`}
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          label="Consensus longs"
          value={String(snapshot.consensusLongs.length)}
          hint="Held by 3+ managers"
          icon={TrendingUp}
        />
        <StatCard
          label="Behind / issues"
          value={String(snapshot.behindCount + snapshot.failedCount)}
          hint={`${snapshot.behindCount} older period · ${snapshot.failedCount} fetch fail`}
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
          description="Tickers appearing in at least three long books. New / Exited is vs the prior 13F period’s consensus."
          positions={snapshot.consensusLongs}
          emptyHint="No long overlap at the current threshold (or tickers still resolving)."
          tone="long"
        />
        <ConsensusTable
          title="Consensus puts"
          description="Put-option tickers shared by at least three managers. New / Exited is vs the prior 13F period’s consensus."
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
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge
                    variant={
                      inv.holdingsSource === "sec-13f" ? "info" : "secondary"
                    }
                  >
                    {inv.holdingsSource === "sec-13f"
                      ? inv.asOfQuarter
                      : inv.holdingsSource === "unavailable"
                        ? "Fetch failed"
                        : "No 13F"}
                  </Badge>
                  {freshnessBadge(inv)}
                </div>
              </div>

              <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {inv.style}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-faint">
                {inv.filingDate ? (
                  <>
                    <span>
                      Filed {formatShortDate(inv.filingDate)}
                    </span>
                    <span>·</span>
                  </>
                ) : null}
                {inv.previousQuarter ? (
                  <>
                    <span>was {inv.previousQuarter}</span>
                    <span>·</span>
                  </>
                ) : null}
                <span>
                  <span className="font-mono">{inv.longs.length}</span> longs
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
