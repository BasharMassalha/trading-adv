import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { MarketToday } from "@/components/dashboard/market-today";
import { getMarketTodaySnapshot } from "@/server/services/market-snapshot.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Markets",
  description:
    "Live US equity proxies (SPY, QQQ, DIA, IWM), VIX, and headline-backed market context.",
};

export default async function MarketsPage() {
  let snapshot = null as Awaited<ReturnType<typeof getMarketTodaySnapshot>> | null;
  try {
    snapshot = await getMarketTodaySnapshot();
  } catch (e) {
    console.error("[markets] snapshot:", e);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Markets"
        description="Live quotes for liquid US ETF proxies plus VIX where available, layered with headline themes and rotation context. ETFs track their indices closely but are not the index cash values."
        actions={
          <Badge variant="secondary">
            Data from your configured providers
          </Badge>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border bg-surface px-5 py-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
          <div>
            <h2 className="text-[13.5px] font-semibold tracking-tight">
              Risk regime lens
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Composite market stress indicators and historical analogue scores.
              Informational, not a forecast.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/market-risk">Open risk monitor</Link>
        </Button>
      </div>

      {snapshot ? (
        <MarketToday snapshot={snapshot} />
      ) : (
        <div className="border border-dashed bg-surface p-8 text-center">
          <p className="text-[13px] font-medium text-foreground">
            Market snapshot unavailable
          </p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
            Check{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
              MARKET_DATA_PROVIDER
            </code>{" "}
            and network access. Indices and narratives load automatically once
            quotes succeed.
          </p>
        </div>
      )}

      {snapshot && (
        <p className="text-center text-[11.5px] text-faint">
          As of{" "}
          {new Date(snapshot.fetchedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
    </div>
  );
}
