"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "loading" | "done" | "error";

export function EnrichButton({
  portfolioId,
  lastEnrichedAt,
}: {
  portfolioId: string;
  lastEnrichedAt: Date | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enrichedCount, setEnrichedCount] = useState<number | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  async function handleRefresh() {
    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/portfolio/${portfolioId}/enrich`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "Enrichment failed");
      }
      setEnrichedCount(json.data.enrichedCount);
      setProvider(json.data.provider ?? null);
      setState("done");
      // Trigger server component re-fetch
      router.refresh();
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Enrichment failed");
    }
  }

  const ago = lastEnrichedAt
    ? formatRelative(new Date(lastEnrichedAt))
    : "never";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant={state === "done" ? "secondary" : "outline"}
        size="sm"
        onClick={handleRefresh}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Fetching prices…
          </>
        ) : state === "done" ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Refreshed ({enrichedCount} holdings)
          </>
        ) : state === "error" ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Retry refresh
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh market data
          </>
        )}
      </Button>
      <span className="text-[11px] text-faint">
        Last updated: {ago}
        {provider && state === "done" && ` via ${formatProviderName(provider)}`}
      </span>
      {state === "error" && errorMsg && (
        <p className="text-[11.5px] text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}

function formatProviderName(name: string): string {
  switch (name) {
    case "yahoo-finance":
      return "Yahoo Finance";
    case "mock":
      return "mock data";
    default:
      return name;
  }
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
