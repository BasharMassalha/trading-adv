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

type PageProps = {
  params: { id: string };
};

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
        {inv.cik ? (
          <Badge variant="outline">
            CIK <span className="font-mono">{inv.cik}</span>
          </Badge>
        ) : null}
        {inv.filingDate ? (
          <Badge variant="outline">
            Filed <span className="font-mono">{inv.filingDate}</span>
          </Badge>
        ) : null}
      </div>

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
