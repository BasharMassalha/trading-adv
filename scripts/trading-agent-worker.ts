/**
 * Standalone agent process. Leave this running on any machine that can reach
 * the database. It does not need the website or a signed-in browser.
 *
 *   npx tsx scripts/trading-agent-worker.ts
 */
import { startTradingAgentWorker } from "@/lib/trading-agent/worker";

startTradingAgentWorker({ keepAlive: true });
