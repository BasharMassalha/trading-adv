import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { EmptyPortfolioList } from "@/components/empty-states";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portfolios" };

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export default async function PortfolioListPage() {
  const session = await getSession();

  // Redirect to sign-in if not authenticated
  if (!session) {
    redirect("/sign-in");
  }

  // Load user's portfolios
  const portfolios = await portfolioRepository.listByUser(session.userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolios</h1>
          <p className="text-sm text-muted-foreground">
            All your tracked portfolios in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/portfolio/upload">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portfolio/upload">
              <Plus className="mr-2 h-4 w-4" />
              New portfolio
            </Link>
          </Button>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <EmptyPortfolioList />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {portfolios.map((p) => {
            const totalValue = p.totalValue ? Number(p.totalValue) : null;
            const totalCost = p.totalCost ? Number(p.totalCost) : null;
            const totalGain = p.totalGain ? Number(p.totalGain) : null;

            let gainPct: number | null = null;
            if (totalGain != null && totalCost != null && totalCost > 0) {
              gainPct = (totalGain / totalCost) * 100;
            }

            const trend = totalGain != null ? (totalGain >= 0 ? "up" : "down") : null;

            return (
              <Link key={p.id} href={`/portfolio/${p.id}`} className="group">
                <Card className="transition-shadow group-hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {p.name || "My Portfolio"}
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px]">
                        {p.source || "CSV"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {p._count?.holdings ?? 0} holdings &middot; updated{" "}
                      {formatRelativeDate(p.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">
                      {totalValue != null ? formatCurrency(totalValue) : "—"}
                    </div>
                    {gainPct != null && trend ? (
                      <div
                        className={
                          trend === "up"
                            ? "mt-1 text-sm text-success"
                            : "mt-1 text-sm text-destructive"
                        }
                      >
                        {trend === "up" ? "+" : ""}
                        {formatPercent(gainPct)} all time
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-muted-foreground">
                        Refresh market data for performance
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          <Link href="/portfolio/upload">
            <Card className="flex h-full min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-8 text-center transition-colors hover:bg-muted/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Add portfolio</p>
              <p className="text-xs text-muted-foreground">
                Upload CSV or screenshot
              </p>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
