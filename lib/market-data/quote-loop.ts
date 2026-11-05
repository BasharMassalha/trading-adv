import { quoteRefreshService } from "@/server/services/quote-refresh.service";

const INTERVAL_MS = 60_000;

const globalForQuotes = globalThis as unknown as {
  __quoteRefreshLoop?: boolean;
};

/**
 * Keep held prices current inside a long-lived Node process.
 * One pass per minute. Vercel does not run this; the cron and the open
 * browser each trigger a pull there.
 */
export function startQuoteRefresh() {
  if (globalForQuotes.__quoteRefreshLoop) return;
  globalForQuotes.__quoteRefreshLoop = true;
  console.info("[quotes] live price loop up. Held symbols refresh about every minute.");

  let running = false;
  const loop = async () => {
    if (running) return;
    running = true;
    try {
      await quoteRefreshService.refresh();
    } catch (err) {
      console.error(
        "[quotes] refresh failed:",
        err instanceof Error ? err.message : err,
      );
    } finally {
      running = false;
    }
  };

  void loop();
  const timer = setInterval(() => {
    void loop();
  }, INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}
