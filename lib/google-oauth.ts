import { getGoogleRedirectUri } from "@/lib/auth-app-url";
import { serverEnv } from "@/lib/env";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = ["openid", "email", "profile"].join(" ");

function requireGoogleCreds() {
  const e = serverEnv();
  const id = e.GOOGLE_CLIENT_ID;
  const secret = e.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Google OAuth is not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).");
  }
  return { clientId: id, clientSecret: secret };
}

export function isGoogleOAuthConfigured() {
  const e = serverEnv();
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}

/**
 * Google OAuth2 authorize URL (response_type=code).
 */
export function getGoogleAuthorizationUrl(state: string) {
  const { clientId } = requireGoogleCreds();
  const redirectUri = getGoogleRedirectUri();
  const u = new URL(GOOGLE_AUTH);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("state", state);
  u.searchParams.set("access_type", "online");
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
};

export async function exchangeGoogleAuthCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = requireGoogleCreds();
  const redirectUri = getGoogleRedirectUri();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export type GoogleUserInfo = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google userinfo failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<GoogleUserInfo>;
}
