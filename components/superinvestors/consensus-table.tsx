"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent } from "@/lib/utils";
import type { ConsensusPosition } from "@/lib/superinvestors";

type Props = {
  title: string;
  description: string;
  positions: ConsensusPosition[];
  emptyHint: string;
  tone: "long" | "short";
};

export function ConsensusTable({
  title,
  description,
  positions,
  emptyHint,
  tone,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {positions.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Holders</TableHead>
                <TableHead className="text-right">Avg weight</TableHead>
                <TableHead>Who</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={`${tone}-${p.ticker}`}>
                  <TableCell className="font-mono font-medium">
                    {p.ticker}
                  </TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={tone === "long" ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {p.holderCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(p.avgWeightPct)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.holders.slice(0, 6).map((h) => (
                        <Link
                          key={h.id}
                          href={`/superinvestors/${h.id}`}
                          className="text-xs text-primary underline-offset-2 hover:underline"
                        >
                          {h.name.split(" ").slice(-1)[0]}
                        </Link>
                      ))}
                      {p.holders.length > 6 ? (
                        <span className="text-xs text-muted-foreground">
                          +{p.holders.length - 6}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
