import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoldingsTable } from "@/components/superinvestors/holdings-table";
import { superinvestorsService } from "@/server/services/superinvestors.service";
import { SUPERINVESTORS_DISCLAIMER } from "@/lib/superinvestors";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PageProps = {
  params: { id: string };
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const inv = await superinvestorsService.getById(params.id);
  return {
    title: inv ? `${inv.name} · Superinvestors` : "Superinvestor",
  };
}

export default async function SuperinvestorDetailPage({ params }: PageProps) {
  const inv = await superinvestorsService.getById(params.id);
  if (!inv) notFound();

  const change = inv.holdingsChange;
  const changeCount =
    (change?.added.length ?? 0) + (change?.removed.length ?? 0);

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3" asChild>
          <Link href="/superinvestors">
            <ArrowLeft className="h-4 w-4 stroke-[1.6]" />
            All superinvestors
          </Link>
        </Button>
      </div>

      <PageHeader
        title={inv.name}
        description={`${inv.firm} · ${inv.reportingEntity}`}
        actions={
          inv.sourceUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={inv.sourceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 stroke-[1.6]" />
                SEC filing
              </a>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{inv.style}</Badge>
        <Badge variant={inv.holdingsSource === "sec-13f" ? "info" : "outline"}>
          {inv.holdingsSource === "sec-13f"
            ? `13F ${inv.asOfQuarter}`
            : inv.holdingsSource === "unavailable"
              ? "13F unavailable"
              : "No 13F"}
        </Badge>
        {inv.freshness?.status === "current" ||
        inv.freshness?.status === "early" ? (
          <Badge variant="success">On latest period</Badge>
        ) : null}
        {inv.freshness?.status === "behind" ? (
          <Badge variant="warning">{inv.freshness.label}</Badge>
        ) : null}
        {inv.cik ? (
          <Badge variant="outline">
            CIK <span className="font-mono">{inv.cik}</span>
          </Badge>
        ) : null}
        {inv.filingDate ? (
          <Badge variant="outline">
            Filed {formatShortDate(inv.filingDate)}
          </Badge>
        ) : null}
      </div>

      {inv.holdingsSource === "sec-13f" && inv.freshness ? (
        <p className="border bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
          This book is reported as of{" "}
          <span className="font-medium text-foreground">
            {inv.reportDate
              ? formatShortDate(inv.reportDate)
              : inv.asOfQuarter}
          </span>
          {inv.filingDate ? (
            <>
              {" "}
              and was filed with the SEC on{" "}
              <span className="font-medium text-foreground">
                {formatShortDate(inv.filingDate)}
              </span>
            </>
          ) : null}
          . {inv.freshness.label}
          {inv.freshness.status === "behind"
            ? ` The calendar expects ${inv.freshness.expectedQuarterLabel} (deadline ${formatShortDate(inv.freshness.expectedDeadline)}).`
            : inv.freshness.nextDeadline
              ? ` The next period’s filings are due around ${formatShortDate(inv.freshness.nextDeadline)}.`
              : ""}{" "}
          13F never shows trades inside a quarter — only the snapshot at
          period-end, published ~45 days later.
        </p>
      ) : null}

      {change ? (
        <div className="border bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-semibold tracking-tight">
              Change vs {change.previousQuarter}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              Prior period filed {formatShortDate(change.previousFilingDate)}
            </p>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {changeCount === 0
              ? "No long names were added or fully exited between the two filings (among disclosed equity/call lines)."
              : `${change.added.length} long name${change.added.length === 1 ? "" : "s"} added · ${change.removed.length} exited since ${change.previousQuarter}.`}
          </p>
          {changeCount > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-faint">
                  Added
                </div>
                {change.added.length === 0 ? (
                  <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                    None
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1 text-[12.5px]">
                    {change.added.slice(0, 12).map((row) => (
                      <li key={`a-${row.ticker}`}>
                        <span className="font-mono font-medium text-success">
                          {row.ticker}
                        </span>{" "}
                        <span className="text-muted-foreground">{row.name}</span>
                      </li>
                    ))}
                    {change.added.length > 12 ? (
                      <li className="text-faint">
                        +{change.added.length - 12} more
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-faint">
                  Exited
                </div>
                {change.removed.length === 0 ? (
                  <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                    None
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1 text-[12.5px]">
                    {change.removed.slice(0, 12).map((row) => (
                      <li key={`r-${row.ticker}`}>
                        <span className="font-mono font-medium text-destructive">
                          {row.ticker}
                        </span>{" "}
                        <span className="text-muted-foreground">{row.name}</span>
                      </li>
                    ))}
                    {change.removed.length > 12 ? (
                      <li className="text-faint">
                        +{change.removed.length - 12} more
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="border bg-surface p-5">
        <p className="max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          {inv.bio}
        </p>

        {inv.bookValueUsdM != null ? (
          <p className="mt-3 border-t pt-3 text-[12.5px] text-muted-foreground">
            Reported 13F equity/options book{" "}
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(inv.bookValueUsdM * 1_000_000)}
            </span>
          </p>
        ) : null}
      </div>

      <p className="border bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
        This page shows{" "}
        <span className="font-medium text-foreground">
          SEC 13F holdings only
        </span>
        . Form 13F does not include strategy memos or market outlook statements,
        so those are not invented here.
      </p>

      {inv.holdingsError ? (
        <p className="border border-destructive/30 bg-destructive-soft px-4 py-3 text-[12.5px] text-destructive">
          Could not load live 13F: {inv.holdingsError}
        </p>
      ) : null}

      <Tabs defaultValue="longs" className="w-full">
        <TabsList>
          <TabsTrigger value="longs">
            Longs (<span className="font-mono">{inv.longs.length}</span>)
          </TabsTrigger>
          <TabsTrigger value="shorts">
            Puts (<span className="font-mono">{inv.shorts.length}</span>)
          </TabsTrigger>
          <TabsTrigger value="notes">Filing notes</TabsTrigger>
        </TabsList>

        <TabsContent value="longs">
          <HoldingsTable
            positions={inv.longs}
            emptyLabel="No long holdings from SEC 13F for this profile."
          />
        </TabsContent>

        <TabsContent value="shorts" className="space-y-2.5">
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight">
              Disclosed put options
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Only put options that appear in the 13F information table. Equity
              short books are usually not reported on Form 13F.
            </p>
          </div>
          <HoldingsTable
            positions={inv.shorts}
            emptyLabel="No put options disclosed in the latest 13F."
          />
        </TabsContent>

        <TabsContent value="notes" className="space-y-3">
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-muted-foreground">
            {inv.dataNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="text-[11.5px] leading-relaxed text-faint">
            {SUPERINVESTORS_DISCLAIMER}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
