/**
 * Starts the trading-agent loop when this Node server stays up
 * (`next dev`, `next start` on a machine you leave running).
 *
 * Vercel freezes the process between requests, so the loop is not started
 * there. Production on Vercel uses the cron in vercel.json instead.
 * Set TRADING_AGENT_WORKER=0 to keep the server up without the loop.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.TRADING_AGENT_WORKER === "0") return;
  if (process.env.VERCEL) return;

  const { initPrisma } = await import("@/lib/prisma");
  await initPrisma();

  const { startTradingAgentWorker } = await import("@/lib/trading-agent/worker");
  startTradingAgentWorker();
}
