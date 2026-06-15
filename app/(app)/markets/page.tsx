import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
          <p className="text-sm text-muted-foreground">
            Live quotes for liquid US ETF proxies plus VIX when available —
            layered with headline themes and rotation context. ETFs track
            their indices closely but are not the index cash values.
          </p>
          <Badge variant="secondary" className="text-[10px]">
            Data from your configured market/news providers
          </Badge>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-muted/40">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Risk regime lens</CardTitle>
              <CardDescription>
                See composite market stress indicators and historical
                analogue scores — informational, not a forecast.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button asChild variant="default" size="sm">
            <Link href="/market-risk">Open Market Risk Regime Monitor</Link>
          </Button>
        </CardContent>
      </Card>

      {snapshot ? (
        <MarketToday snapshot={snapshot} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-sm">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-foreground">
              Market snapshot unavailable
            </p>
            <p className="max-w-md text-muted-foreground">
              Check{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                MARKET_DATA_PROVIDER
              </code>{" "}
              and network access. Indices and narratives will load automatically
              when quotes succeed.
            </p>
          </CardContent>
        </Card>
      )}

      {snapshot && (
        <p className="text-center text-xs text-muted-foreground">
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
