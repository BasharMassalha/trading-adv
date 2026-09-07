import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { EmptyPortfolioList } from "@/components/empty-states";
import { RenamePortfolioButton } from "./[id]/rename-portfolio-button";

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

  // Guests only get one book — skip the multi-portfolio list chrome
  if (session.isGuest) {
    if (portfolios.length === 0) {
      redirect("/portfolio/upload?trial=true");
    }
    redirect(`/portfolio/${portfolios[0].id}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Portfolios"
        description="Every book you track, with its latest valuation."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/portfolio/upload">
                <Upload className="h-3.5 w-3.5 stroke-[1.6]" />
                Import
              </Link>
            </Button>
            <Button asChild>
              <Link href="/portfolio/upload">
                <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                New portfolio
              </Link>
            </Button>
          </>
        }
      />

      {portfolios.length === 0 ? (
        <EmptyPortfolioList />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
              <div
                key={p.id}
                className="border bg-surface p-4 transition-colors hover:bg-background"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/portfolio/${p.id}`} className="min-w-0 flex-1">
                    <h2 className="truncate text-[13.5px] font-semibold tracking-tight">
                      {p.name || "My Portfolio"}
                    </h2>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <RenamePortfolioButton
                      portfolioId={p.id}
                      portfolioName={p.name || "My Portfolio"}
                      compact
                    />
                    <Badge variant="secondary">{p.source || "CSV"}</Badge>
                  </div>
                </div>

                <Link href={`/portfolio/${p.id}`} className="mt-1 block">
                  <p className="text-[12px] text-faint">
                    <span className="font-mono">{p._count?.holdings ?? 0}</span>{" "}
                    holdings &middot; updated{" "}
                    <span className="font-mono">
                      {formatRelativeDate(p.updatedAt)}
                    </span>
                  </p>

                  <div className="mt-4 font-mono text-[21px] font-semibold leading-none tracking-tight">
                    {totalValue != null ? formatCurrency(totalValue) : "—"}
                  </div>

                  {gainPct != null && trend ? (
                    <div
                      className={
                        trend === "up"
                          ? "mt-2 font-mono text-[12px] text-success"
                          : "mt-2 font-mono text-[12px] text-destructive"
                      }
                    >
                      {trend === "up" ? "+" : ""}
                      {formatPercent(gainPct)}
                      <span className="ml-1.5 font-sans text-faint">
                        all time
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-[12px] text-muted-foreground">
                      Refresh market data for performance
                    </div>
                  )}
                </Link>
              </div>
            );
          })}

          <Link
            href="/portfolio/upload"
            className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 border border-dashed bg-surface p-8 text-center transition-colors hover:bg-background"
          >
            <Plus className="h-4 w-4 stroke-[1.6] text-faint" />
            <p className="text-[13px] font-medium">Add portfolio</p>
            <p className="text-[12px] text-muted-foreground">
              Upload a broker CSV or screenshot
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}
