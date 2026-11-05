import {
  agentIntervalMs,
  tradingAgentService,
} from "@/server/services/trading-agent.service";

const POLL_MS = 60_000;

const globalForWorker = globalThis as unknown as {
  __tradingAgentWorker?: boolean;
};

/**
 * Keep active agents running inside this Node process.
 * A pass does not require anyone to be signed in. The loop polls once a
 * minute; each agent is analyzed again only after TRADING_AGENT_INTERVAL_MINUTES
 * (default 15) since its last pass.
 */
export function startTradingAgentWorker(options?: { keepAlive?: boolean }) {
  if (globalForWorker.__tradingAgentWorker) return;
  globalForWorker.__tradingAgentWorker = true;

  const minutes = Math.round(agentIntervalMs() / 60_000);
  console.info(
    `[trading-agent] worker up. Active agents run every ${minutes} min with no signed-in session.`,
  );

  let ticking = false;
  const loop = async () => {
    if (ticking) return;
    ticking = true;
    try {
      const result = await tradingAgentService.tick();
      if (result.results.length > 0) {
        console.info(
          `[trading-agent] tick ${result.results
            .map((row) => `${row.agentId.slice(0, 6)} ${row.status}`)
            .join(", ")}`,
        );
      }
    } catch (err) {
      console.error(
        "[trading-agent] tick failed:",
        err instanceof Error ? err.message : err,
      );
    } finally {
      ticking = false;
    }
  };

  void loop();
  const timer = setInterval(() => {
    void loop();
  }, POLL_MS);
  if (!options?.keepAlive && typeof timer.unref === "function") {
    timer.unref();
  }
}
