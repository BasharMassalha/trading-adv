"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { AgentOverview, AgentRunView, TradingAgentView } from "@/lib/trading-agent/types";
import { AgentMind } from "./agent-mind";

type AgentDeskProps = {
  overview: AgentOverview;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShares(shares: number): string {
  return shares.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function runBadge(status: AgentRunView["status"]) {
  if (status === "COMPLETED") return <Badge variant="success">Filled</Badge>;
  if (status === "NO_TRADE") return <Badge variant="secondary">No trade</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="info">Running</Badge>;
}

async function readError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return json?.error?.message ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function AgentDesk({ overview }: AgentDeskProps) {
  const router = useRouter();
  const [live, setLive] = useState(overview);
  const [sourceId, setSourceId] = useState(overview.portfolios[0]?.id ?? "");
  const selectedSource = live.portfolios.some((portfolio) => portfolio.id === sourceId)
    ? sourceId
    : (live.portfolios[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLive(overview);
  }, [overview]);

  useEffect(() => {
    if (live.agents.length === 0) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/trading-agent");
        const json = await res.json();
        if (!cancelled && res.ok && json.ok) setLive(json.data as AgentOverview);
      } catch {
        // The next poll retries. A missed tick just leaves the last view up.
      }
    };
    const timer = setInterval(pull, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live.agents.length]);

  async function arm() {
    if (!selectedSource) return;
    setBusy("arm");
    setError(null);
    try {
      const res = await fetch("/api/trading-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePortfolioId: selectedSource }),
      });
      if (!res.ok) throw new Error(await readError(res));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not arm the agent.");
    } finally {
      setBusy(null);
    }
  }

  async function run(agentId: string) {
    setBusy(`run:${agentId}`);
    setError(null);
    try {
      const res = await fetch(`/api/trading-agent/${agentId}/run`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readError(res));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(agentId: string, status: "ACTIVE" | "PAUSED") {
    setBusy(`status:${agentId}`);
    setError(null);
    try {
      const res = await fetch(`/api/trading-agent/${agentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readError(res));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the agent.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        eyebrow="Paper book"
        title="Trading agent"
        description="Arms a copy of a portfolio and trades that copy. Each run refreshes prices, runs the advisor analysis, and fills the ideas that clear a conviction and size bar. The aim is a higher return. New buys stop once a name reaches the position cap from your investor profile."
      />

      <div className="border bg-surface px-5 py-4 text-[12.5px] leading-relaxed text-muted-foreground">
        An active agent keeps working when you are signed out. On a machine
        running this app, the loop re-analyzes about every 15 minutes. On Vercel
        Hobby, one background pass runs daily at 14:00 UTC once{" "}
        <span className="font-mono text-[11.5px]">CRON_SECRET</span> is set.
        While you are signed in, prices refresh about every minute. Pause stops
        the agent. Run now forces a full pass immediately.
      </div>

      {error ? (
        <div className="border border-destructive/30 bg-destructive-soft px-4 py-3 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      <AgentMind
        agents={live.agents}
        busyAgentId={busy?.startsWith("run:") ? busy.slice(4) : null}
      />

      {live.portfolios.length > 0 ? (
        <div className="border bg-surface p-5">
          <h2 className="text-[13.5px] font-semibold tracking-tight">
            Arm an agent
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Pick a book to clone. The cap is fixed at that moment: 8%
            conservative, 12% moderate, 20% aggressive, 25% when the profile is
            both aggressive and growth. Change it in{" "}
            <Link href="/settings/investor-profile" className="text-primary underline-offset-4 hover:underline">
              investor profile
            </Link>{" "}
            before arming.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="agent-source" className="text-[12.5px]">
                Portfolio
              </Label>
              <select
                id="agent-source"
                value={selectedSource}
                onChange={(event) => setSourceId(event.target.value)}
                className="h-9 w-full border bg-background px-3 text-[13px]"
              >
                {live.portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name} ({portfolio.holdingCount} holdings)
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={arm} disabled={busy != null || !selectedSource}>
              {busy === "arm" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5 stroke-[1.6]" />
              )}
              Arm agent
            </Button>
          </div>
        </div>
      ) : live.agents.length === 0 ? (
        <div className="border border-dashed bg-surface p-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            Import a portfolio before arming an agent.
          </p>
          <Button size="sm" className="mt-4" asChild>
            <Link href="/portfolio/upload">Import a portfolio</Link>
          </Button>
        </div>
      ) : null}

      {live.agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          busy={busy}
          onRun={() => run(agent.id)}
          onToggle={() =>
            setStatus(agent.id, agent.status === "ACTIVE" ? "PAUSED" : "ACTIVE")
          }
        />
      ))}
    </div>
  );
}

function AgentCard({
  agent,
  busy,
  onRun,
  onToggle,
}: {
  agent: TradingAgentView;
  busy: string | null;
  onRun: () => void;
  onToggle: () => void;
}) {
  const latest = agent.runs[0] ?? null;
  const running = busy === `run:${agent.id}`;
  const toggling = busy === `status:${agent.id}`;

  return (
    <section className="border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-semibold tracking-tight">
              {agent.portfolioName}
            </h2>
            {agent.status === "ACTIVE" ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="warning">Paused</Badge>
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Cloned from {agent.sourcePortfolioName}. Position cap{" "}
            {formatPercent(agent.maxPositionWeight * 100)}. Book{" "}
            {agent.bookValue != null ? formatCurrency(agent.bookValue) : "—"}.
            Last run {formatWhen(agent.lastRunAt)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/portfolio/${agent.portfolioId}`}>Open book</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/advisor?portfolio=${agent.portfolioId}`}>Analysis</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy != null}
            onClick={onToggle}
          >
            {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {agent.status === "ACTIVE" ? "Pause" : "Resume"}
          </Button>
          <Button
            size="sm"
            disabled={busy != null || agent.status !== "ACTIVE"}
            onClick={onRun}
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {running ? "Running" : "Run now"}
          </Button>
        </div>
      </div>

      {running ? (
        <p className="px-5 py-4 text-[12.5px] text-muted-foreground">
          Refreshing prices and running the analysis. Fills post when that
          finishes, usually within a minute.
        </p>
      ) : latest ? (
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {runBadge(latest.status)}
            <span className="text-[12px] text-muted-foreground">
              {formatWhen(latest.startedAt)}
            </span>
            {latest.portfolioValueBefore != null &&
            latest.portfolioValueAfter != null ? (
              <span className="text-[12px] text-muted-foreground">
                {formatCurrency(latest.portfolioValueBefore)} →{" "}
                {formatCurrency(latest.portfolioValueAfter)}
              </span>
            ) : null}
          </div>
          {latest.summary ? (
            <p className="text-[13px] leading-relaxed">{latest.summary}</p>
          ) : null}
          {latest.error ? (
            <p className="text-[12.5px] leading-relaxed text-destructive">
              {latest.error}
            </p>
          ) : null}
          {latest.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="text-[11px] uppercase tracking-wide text-faint">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Side</th>
                    <th className="py-2 pr-3 font-medium">Ticker</th>
                    <th className="py-2 pr-3 font-medium">Shares</th>
                    <th className="py-2 pr-3 font-medium">Price</th>
                    <th className="py-2 pr-3 font-medium">Notional</th>
                    <th className="py-2 font-medium">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.orders.map((order) => (
                    <tr key={order.id} className="border-t align-top">
                      <td className="py-2 pr-3 font-medium">{order.side}</td>
                      <td className="py-2 pr-3 font-mono">{order.ticker}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatShares(order.shares)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatCurrency(order.price)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatCurrency(order.notional)}
                      </td>
                      <td className="py-2 text-muted-foreground">{order.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {agent.runs.length > 1 ? (
            <ul className="space-y-1.5 border-t pt-3 text-[12px] text-muted-foreground">
              {agent.runs.slice(1).map((run) => (
                <li key={run.id} className="flex flex-wrap items-baseline gap-2">
                  <span className="text-faint">{formatWhen(run.startedAt)}</span>
                  <span>{run.summary ?? run.error ?? run.status}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="px-5 py-4 text-[12.5px] text-muted-foreground">
          No runs yet. Run now to analyze this book and place the first fills.
        </p>
      )}
    </section>
  );
}
