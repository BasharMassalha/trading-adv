import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthAppUrl } from "@/lib/auth-app-url";
import { getGoogleAuthorizationUrl, isGoogleOAuthConfigured } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "google_oauth_state";
const STATE_MAX_AGE = 60 * 10; // 10 minutes

/**
 * Start Google OAuth: set CSRF state cookie and redirect to Google.
 */
export function GET() {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(`${getAuthAppUrl()}/sign-in?error=google_unconfigured`);
  }

  const state = randomBytes(32).toString("base64url");
  const secure = process.env.NODE_ENV === "production";

  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });

  const url = getGoogleAuthorizationUrl(state);
  return NextResponse.redirect(url);
}
