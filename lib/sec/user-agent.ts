/**
 * Shared request headers for SEC EDGAR.
 *
 * SEC policy requires every request to declare a contact address in the
 * User-Agent. Their edge (www.sec.gov in particular) returns 403 for agents it
 * considers undeclared — notably anything pointing at a non-routable domain
 * such as `@localhost`, which is why a missing SEC_USER_AGENT breaks
 * deployments even though it may appear to work behind a warm cache.
 *
 * Set SEC_USER_AGENT to "AppName/1.0 (you@yourdomain.com)" in every
 * environment. The fallback below keeps the app functional but is shared by
 * every install, so it is far more likely to be rate-limited.
 */

const FALLBACK_USER_AGENT = "TradingAdvisor/1.0 (contact@tradingadv.app)";

let warned = false;

export function getSecUserAgent(): string {
  const configured = process.env.SEC_USER_AGENT?.trim();
  if (configured) return configured;

  if (!warned) {
    warned = true;
    console.warn(
      "[sec] SEC_USER_AGENT is not set — using a shared fallback User-Agent. " +
        'Set SEC_USER_AGENT="YourApp/1.0 (you@yourdomain.com)" to avoid SEC 403/429 responses.',
    );
  }
  return FALLBACK_USER_AGENT;
}

export function secHeaders(accept = "application/json, text/xml, */*"): HeadersInit {
  return {
    "User-Agent": getSecUserAgent(),
    Accept: accept,
    // SEC's documented client guidance; www.sec.gov is stricter without it.
    "Accept-Encoding": "gzip, deflate",
  };
}

/** True when a 403 most likely reflects a rejected/undeclared User-Agent. */
export function isLikelyUserAgentRejection(status: number): boolean {
  return status === 403;
}

export function describeSecFailure(status: number, url: string): string {
  if (isLikelyUserAgentRejection(status)) {
    return (
      `SEC returned 403 for ${url}. This usually means the User-Agent was rejected. ` +
      `Set SEC_USER_AGENT="YourApp/1.0 (you@yourdomain.com)" in this environment` +
      (process.env.SEC_USER_AGENT ? " (current value was refused)." : " — it is currently unset.")
    );
  }
  if (status === 429) {
    return `SEC rate limit hit (429) for ${url}. Requests are throttled; try again shortly.`;
  }
  return `SEC fetch ${status} for ${url}`;
}
