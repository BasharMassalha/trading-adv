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
    <div className="space-y-2.5">
      <div>
        <h3 className="text-[13.5px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {description}
        </p>
      </div>

      {positions.length === 0 ? (
        <div className="border border-dashed bg-surface p-8 text-center text-[13px] text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
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
                <TableCell className="font-mono font-semibold">
                  {p.ticker}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.name}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={tone === "long" ? "info" : "destructive"}
                    className="font-mono"
                  >
                    {p.holderCount}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPercent(p.avgWeightPct)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {p.holders.slice(0, 6).map((h) => (
                      <Link
                        key={h.id}
                        href={`/superinvestors/${h.id}`}
                        className="text-[11.5px] text-primary underline-offset-2 hover:underline"
                      >
                        {h.name.split(" ").slice(-1)[0]}
                      </Link>
                    ))}
                    {p.holders.length > 6 ? (
                      <span className="text-[11.5px] text-faint">
                        +{p.holders.length - 6}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
