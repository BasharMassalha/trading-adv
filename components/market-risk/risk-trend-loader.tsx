"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskTrendChart } from "./risk-trend-chart";
import type { RiskHistoryPoint } from "@/lib/market-risk/types";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: RiskHistoryPoint[] };

export function RiskTrendLoader({ days = 180 }: { days?: number }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/market-risk/history?days=${days}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as
          | { ok: true; data: RiskHistoryPoint[] }
          | { ok: false; error: { message: string } };
        if (cancelled) return;
        if (!json.ok) {
          setState({ kind: "error", message: json.error.message });
          return;
        }
        setState({ kind: "ready", data: json.data });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load history.",
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (state.kind === "loading") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardContent className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          Couldn&apos;t load risk score history: {state.message}
        </CardContent>
      </Card>
    );
  }

  return <RiskTrendChart data={state.data} />;
}
