/**
 * Starts the trading-agent loop when this Node server stays up
 * (`next dev`, `next start` on a machine you leave running).
 *
 * Vercel freezes the process between requests, so the loops are not started
 * there. Production on Vercel uses the cron in vercel.json, and an open
 * browser also asks for fresh quotes about once a minute.
 * Set TRADING_AGENT_WORKER=0 to keep price updates and skip the trading loop.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.VERCEL) return;

  const { initPrisma } = await import("@/lib/prisma");
  await initPrisma();

  const { startQuoteRefresh } = await import("@/lib/market-data/quote-loop");
  startQuoteRefresh();

  if (process.env.TRADING_AGENT_WORKER === "0") return;
  const { startTradingAgentWorker } = await import("@/lib/trading-agent/worker");
  startTradingAgentWorker();
}
