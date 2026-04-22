/**
 * Public origin for OAuth redirect URIs and absolute links.
 * Prefer NEXT_PUBLIC_APP_URL; on Vercel, fall back to VERCEL_URL.
 */
export function getAuthAppUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function getGoogleRedirectUri() {
  return `${getAuthAppUrl()}/api/auth/google/callback`;
}
