"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { truncateWhy } from "@/lib/trading-agent/why";
import type {
  MindDecision,
  MindPhase,
  TradingAgentView,
} from "@/lib/trading-agent/types";

const PHASE_LABEL: Record<MindPhase, string> = {
  starting: "Waking up",
  prices: "Checking prices",
  reading: "Reading the book",
  deciding: "Choosing trades",
  filling: "Placing fills",
  done: "Settled",
};

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function outcomeBadge(outcome: MindDecision["outcome"]) {
  if (outcome === "BUY") return <Badge variant="success">Bought</Badge>;
  if (outcome === "SELL") return <Badge variant="destructive">Sold</Badge>;
  if (outcome === "HELD") return <Badge variant="secondary">Held</Badge>;
  return <Badge variant="warning">Passed</Badge>;
}

export function AgentMind({
  agents,
  busyAgentId,
}: {
  agents: TradingAgentView[];
  busyAgentId: string | null;
}) {
  const running =
    agents.find((agent) => agent.runs[0]?.status === "RUNNING") ??
    agents.find((agent) => agent.id === busyAgentId) ??
    null;
  const fallback = running ?? agents[0] ?? null;
  const [pickedId, setPickedId] = useState(fallback?.id ?? "");
  const selected =
    agents.find((agent) => agent.id === pickedId) ?? fallback;
  const run = selected?.runs[0] ?? null;
  const trace = run?.trace ?? null;
  const live = run?.status === "RUNNING" || selected?.id === busyAgentId;
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (running && running.id !== pickedId) setPickedId(running.id);
  }, [running, pickedId]);

  useEffect(() => {
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [trace?.notes.length, trace?.phase, selected?.id]);

  return (
    <section className="border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold tracking-tight">
              What it is thinking
            </h2>
            {live ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Live
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Notes update while a pass is running, including when you are signed out.
          </p>
        </div>
        {agents.length > 1 ? (
          <select
            aria-label="Which agent to watch"
            value={selected?.id ?? ""}
            onChange={(event) => setPickedId(event.target.value)}
            className="h-8 border bg-background px-2 text-[12.5px]"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.portfolioName}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {!selected || !run ? (
        <p className="px-5 py-8 text-[13px] text-muted-foreground">
          Nothing to watch yet. Arm an agent and this window fills in as it
          reads the book and decides.
        </p>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="border-b lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
                {selected.portfolioName}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {trace ? PHASE_LABEL[trace.phase] : "Waiting for the first note"}
              </p>
            </div>
            <div
              ref={logRef}
              className="h-72 space-y-3 overflow-y-auto px-5 pb-4"
            >
              {trace?.analysisSummary ? (
                <p className="text-[13px] leading-relaxed">{trace.analysisSummary}</p>
              ) : null}
              {selected.id === busyAgentId && run.status !== "RUNNING" ? (
                <p className="text-[12.5px] text-muted-foreground">
                  Starting a pass. The first note shows up in a few seconds.
                </p>
              ) : null}
              {(trace?.notes ?? []).map((note, index) => (
                <p key={`${note.at}-${index}`} className="text-[12.5px] leading-relaxed">
                  <span className="mr-2 font-mono text-[11px] text-faint">
                    {clock(note.at)}
                  </span>
                  {note.text}
                </p>
              ))}
              {!trace ? (
                <p className="text-[12.5px] text-muted-foreground">
                  This pass has no live notes. The next one will write them here.
                </p>
              ) : null}
              {run.error && trace?.phase === "done" ? (
                <p className="text-[12.5px] leading-relaxed text-destructive">
                  {run.error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="px-5 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
              Decisions
            </p>
            {trace && trace.decisions.length > 0 ? (
              <ul className="mt-3 divide-y">
                {trace.decisions.map((decision) => (
                  <li key={`${decision.ticker}-${decision.outcome}`} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-medium">
                        {decision.ticker}
                      </span>
                      {outcomeBadge(decision.outcome)}
                      {decision.stance ? (
                        <span className="text-[11.5px] text-faint">{decision.stance}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                      {truncateWhy(decision.reason)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                {live
                  ? "Decisions show up after the analysis finishes."
                  : "No named decisions on this pass."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
