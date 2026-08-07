import type { Metadata } from "next";
import Link from "next/link";
import { Users, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Superinvestors
          </h1>
          <p className="text-sm text-muted-foreground">
            Live 13F holdings from SEC EDGAR for{" "}
            {snapshot.investors.length} well-known investors — plus consensus
            longs and disclosed put options only.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="text-[10px]">
              Latest period {snapshot.asOfLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              SEC 13F · ~45-day lag
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {snapshot.liveCount}/{snapshot.investors.length} live
            </Badge>
          </div>
        </div>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>{snapshot.disclaimer}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        />
        <StatCard
          label="Consensus puts"
          value={String(snapshot.consensusShorts.length)}
          hint="Disclosed 13F puts only"
          trend="down"
        />
        <StatCard
          label="Fetch issues"
          value={String(snapshot.failedCount)}
          hint="Unavailable this refresh"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared ideas</CardTitle>
          <CardDescription>
            Overlap across live 13F books. Put consensus only includes options
            actually disclosed in filings — most hedge-fund short books stay
            private and are never shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
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
            emptyHint="No shared put tickers — expected, since most shorts are not in 13F."
            tone="short"
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          All investors
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.investors.map((inv) => (
            <Link
              key={inv.id}
              href={`/superinvestors/${inv.id}`}
              className="group"
            >
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{inv.name}</CardTitle>
                    <Badge
                      variant={
                        inv.holdingsSource === "sec-13f"
                          ? "default"
                          : "secondary"
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {inv.holdingsSource === "sec-13f"
                        ? inv.asOfQuarter
                        : inv.holdingsSource === "unavailable"
                          ? "Fetch failed"
                          : "No 13F"}
                    </Badge>
                  </div>
                  <CardDescription>{inv.firm}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {inv.style}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{inv.longs.length} longs shown</span>
                    <span>·</span>
                    <span>
                      {inv.shorts.length} put
                      {inv.shorts.length === 1 ? "" : "s"}
                    </span>
                    {inv.bookValueUsdM != null ? (
                      <>
                        <span>·</span>
                        <span>
                          {formatCurrency(inv.bookValueUsdM * 1_000_000).replace(
                            /\.\d+$/,
                            "",
                          )}{" "}
                          13F book
                        </span>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
