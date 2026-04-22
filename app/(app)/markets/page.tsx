import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Markets" };

export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Real-time market data — coming soon.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {["S&P 500", "NASDAQ", "DOW"].map((idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{idx}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
          <Badge variant="secondary">Coming soon</Badge>
          <p className="text-sm text-muted-foreground">
            Live quotes, indices, and watchlists will be available here once
            the market-data integration is wired up.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
