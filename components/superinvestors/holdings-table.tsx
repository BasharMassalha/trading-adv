"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/lib/utils";
import type { SuperinvestorPosition } from "@/lib/superinvestors";

type Props = {
  positions: SuperinvestorPosition[];
  emptyLabel: string;
};

export function HoldingsTable({ positions, emptyLabel }: Props) {
  if (positions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => (
            <TableRow key={`${p.side}-${p.ticker}`}>
              <TableCell className="font-mono font-medium">
                {p.concrete === false ? (
                  <span className="text-muted-foreground">{p.ticker}</span>
                ) : (
                  p.ticker
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  {p.name}
                  {p.concrete === false ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {/^[0-9A-Z]{9}$/.test(p.ticker) ? "CUSIP" : "Unresolved"}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(p.weightPct)}
              </TableCell>
              <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                {p.note ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
