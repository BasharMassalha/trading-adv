import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAuthAppUrl } from "@/lib/auth-app-url";
import { exchangeGoogleAuthCode, fetchGoogleUserInfo, isGoogleOAuthConfigured } from "@/lib/google-oauth";
import { authService } from "@/server/services/auth.service";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "google_oauth_state";

function redirectTo(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return NextResponse.redirect(`${getAuthAppUrl()}${p}`);
}

/**
 * Google redirects here with `code` and `state`. Exchanges the code, then signs in the user.
 */
export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return redirectTo("/sign-in?error=google_unconfigured");
  }

  const { searchParams } = new URL(request.url);
  const err = searchParams.get("error");
  if (err) {
    if (err === "access_denied") {
      return redirectTo("/sign-in?error=google_cancelled");
    }
    return redirectTo("/sign-in?error=google_denied");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return redirectTo("/sign-in?error=google_invalid");
  }

  const expected = cookies().get(STATE_COOKIE)?.value;
  cookies().delete(STATE_COOKIE);
  if (!expected || expected !== state) {
    return redirectTo("/sign-in?error=google_state");
  }

  try {
    const tokens = await exchangeGoogleAuthCode(code);
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);
    const result = await authService.signInWithGoogle(userInfo);
    if (result.isNew) {
      return redirectTo("/onboarding");
    }
    return redirectTo("/dashboard");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google sign-in failed";
    console.error("[google/callback]", msg);
    // Do not add error text to the URL (referrers, browser history, logs).
    return redirectTo("/sign-in?error=google_signin");
  }
}
