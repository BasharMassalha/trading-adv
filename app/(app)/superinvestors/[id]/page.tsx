import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 h-8" asChild>
            <Link href="/superinvestors">
              <ArrowLeft className="mr-1 h-4 w-4" />
              All superinvestors
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {inv.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {inv.firm} · {inv.reportingEntity}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {inv.style}
            </Badge>
            <Badge
              variant={
                inv.holdingsSource === "sec-13f" ? "default" : "outline"
              }
              className="text-[10px]"
            >
              {inv.holdingsSource === "sec-13f"
                ? `13F ${inv.asOfQuarter}`
                : inv.holdingsSource === "unavailable"
                  ? "13F unavailable"
                  : "No 13F"}
            </Badge>
            {inv.cik ? (
              <Badge variant="outline" className="text-[10px]">
                CIK {inv.cik}
              </Badge>
            ) : null}
            {inv.filingDate ? (
              <Badge variant="outline" className="text-[10px]">
                Filed {inv.filingDate}
              </Badge>
            ) : null}
          </div>
        </div>
        {inv.sourceUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={inv.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              SEC filing
            </a>
          </Button>
        ) : null}
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">{inv.bio}</p>

      {inv.bookValueUsdM != null ? (
        <p className="text-sm text-muted-foreground">
          Reported 13F equity/options book:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(inv.bookValueUsdM * 1_000_000)}
          </span>
        </p>
      ) : null}

      <Card className="border-muted bg-muted/20">
        <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This page shows <strong className="text-foreground">SEC 13F
            holdings only</strong>. Form 13F does not include strategy memos or
            market outlook statements, so those are not invented here.
          </p>
        </CardContent>
      </Card>

      {inv.holdingsError ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            Could not load live 13F: {inv.holdingsError}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="longs" className="w-full">
        <TabsList>
          <TabsTrigger value="longs">Longs ({inv.longs.length})</TabsTrigger>
          <TabsTrigger value="shorts">
            Puts ({inv.shorts.length})
          </TabsTrigger>
          <TabsTrigger value="notes">Filing notes</TabsTrigger>
        </TabsList>
        <TabsContent value="longs" className="mt-4">
          <HoldingsTable
            positions={inv.longs}
            emptyLabel="No long holdings from SEC 13F for this profile."
          />
        </TabsContent>
        <TabsContent value="shorts" className="mt-4">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Disclosed put options</CardTitle>
            <CardDescription>
              Only put options that appear in the 13F information table. Equity
              short books are usually not reported on Form 13F.
            </CardDescription>
          </CardHeader>
          <HoldingsTable
            positions={inv.shorts}
            emptyLabel="No put options disclosed in the latest 13F."
          />
        </TabsContent>
        <TabsContent value="notes" className="mt-4 space-y-3">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {inv.dataNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {SUPERINVESTORS_DISCLAIMER}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
