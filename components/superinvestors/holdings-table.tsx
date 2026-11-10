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
import { cn, formatPercent } from "@/lib/utils";
import type {
  PositionChange,
  SuperinvestorPosition,
} from "@/lib/superinvestors";

type Props = {
  positions: SuperinvestorPosition[];
  emptyLabel: string;
};

function changeBadge(change?: PositionChange) {
  if (change === "added") {
    return <Badge variant="success">New</Badge>;
  }
  if (change === "removed") {
    return <Badge variant="destructive">Exited</Badge>;
  }
  return null;
}

export function HoldingsTable({ positions, emptyLabel }: Props) {
  if (positions.length === 0) {
    return (
      <div className="border border-dashed bg-surface p-8 text-center text-[13px] text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
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
          <TableRow
            key={`${p.side}-${p.change ?? "held"}-${p.cusip ?? p.ticker}`}
            className={cn(p.change === "removed" && "opacity-70")}
          >
            <TableCell>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "font-mono font-semibold",
                    p.concrete === false && "text-muted-foreground",
                    p.change === "removed" && "line-through",
                  )}
                >
                  {p.ticker}
                </span>
                {changeBadge(p.change)}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(p.change === "removed" && "text-muted-foreground")}
                >
                  {p.name}
                </span>
                {p.concrete === false ? (
                  <Badge variant="outline">
                    {/^[0-9A-Z]{9}$/.test(p.ticker) ? "CUSIP" : "Unresolved"}
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="text-right font-mono">
              {p.change === "removed" ? "—" : formatPercent(p.weightPct)}
            </TableCell>
            <TableCell className="max-w-[240px] text-[12px] text-muted-foreground">
              {p.note ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
