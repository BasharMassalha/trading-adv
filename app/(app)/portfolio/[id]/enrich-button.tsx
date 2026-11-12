"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortfolioViewDTO } from "@/server/services/enrichment.service";

type State = "idle" | "loading" | "done" | "error";

export function EnrichButton({
  portfolioId,
  lastEnrichedAt,
  onEnriched,
  autoStart = false,
  label,
}: {
  portfolioId: string;
  lastEnrichedAt: string | Date | null;
  onEnriched?: (portfolio: PortfolioViewDTO) => void;
  /** Kick off enrichment once on mount when market data is missing. */
  autoStart?: boolean;
  label?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enrichedCount, setEnrichedCount] = useState<number | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [localUpdatedAt, setLocalUpdatedAt] = useState<string | null>(null);
  const autoStarted = useRef(false);

  async function handleRefresh() {
    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/portfolio/${portfolioId}/enrich?force=true`,
        {
          method: "POST",
          cache: "no-store",
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "Enrichment failed");
      }

      let portfolio = json.data.portfolio as PortfolioViewDTO | undefined;
      let nextProvider = (json.data.provider as string | undefined) ?? null;
      let nextCount = (json.data.enrichedCount as number | undefined) ?? null;

      if (res.status === 202 || json.data?.started) {
        const startedAt =
          typeof json.data?.startedAt === "string"
            ? json.data.startedAt
            : new Date().toISOString();
        const polled = await pollUntilPrices(portfolioId, startedAt);
        portfolio = polled.portfolio;
        nextProvider = polled.provider ?? nextProvider;
        nextCount = polled.pricedCount;
      }

      if (!portfolio) {
        throw new Error("Prices did not arrive. Try again in a moment.");
      }

      setEnrichedCount(nextCount);
      setProvider(nextProvider);
      setLocalUpdatedAt(portfolio.lastEnrichedAt);
      onEnriched?.(portfolio);
      setState("done");
      window.setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Enrichment failed");
    }
  }

  useEffect(() => {
    if (!autoStart || lastEnrichedAt || autoStarted.current) return;
    autoStarted.current = true;
    void handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once when data is missing
  }, [autoStart, lastEnrichedAt, portfolioId]);

  const stamp = localUpdatedAt ?? lastEnrichedAt;
  const ago = stamp ? formatRelative(new Date(stamp)) : "never";
  const idleLabel = label ?? "Refresh market data";

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
            {idleLabel}
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

async function pollUntilPrices(
  portfolioId: string,
  startedAt: string,
): Promise<{
  portfolio: PortfolioViewDTO;
  provider: string | null;
  pricedCount: number;
}> {
  const startedMs = new Date(startedAt).getTime();
  const maxAttempts = 45;
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`/api/portfolio/${portfolioId}/enrich`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json.ok) continue;
    const portfolio = json.data?.portfolio as PortfolioViewDTO | undefined;
    if (!portfolio) continue;
    const stamp = portfolio.lastEnrichedAt
      ? new Date(portfolio.lastEnrichedAt).getTime()
      : 0;
    const priced =
      typeof json.data?.pricedCount === "number"
        ? json.data.pricedCount
        : portfolio.holdings.filter(
            (h) =>
              h.symbol.toUpperCase() !== "CASH" &&
              h.currentPrice != null &&
              h.currentPrice > 0,
          ).length;
    if (stamp >= startedMs - 1000 && priced > 0) {
      return {
        portfolio,
        provider: json.data?.provider ?? null,
        pricedCount: priced,
      };
    }
  }
  throw new Error(
    "Prices did not arrive in time. Wait a moment and retry.",
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
