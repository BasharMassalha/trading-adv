import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "./env";
import { AppError, UnauthorizedError } from "./errors";

/**
 * Minimal JWT-cookie auth scaffold. This is intentionally small — swap for
 * NextAuth / Clerk / Auth.js when the product is ready for real accounts.
 */

const COOKIE_NAME = "tadv_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export type SessionPayload = {
  userId: string;
  email: string;
  name?: string | null;
  isGuest?: boolean;
};

function getSecret() {
  return new TextEncoder().encode(serverEnv().AUTH_SECRET);
}

function maxAgeFor(payload: SessionPayload) {
  return payload.isGuest ? GUEST_COOKIE_MAX_AGE_SECONDS : COOKIE_MAX_AGE_SECONDS;
}

export async function createSession(payload: SessionPayload) {
  const maxAge = maxAgeFor(payload);
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name ?? null,
    isGuest: payload.isGuest === true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function destroySession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: (payload.name as string | undefined) ?? null,
      isGuest: payload.isGuest === true,
    };
  } catch {
    return null;
  }
}

/** Any signed-in user, including free-trial guests. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Please sign in to continue.");
  }
  return session;
}

/** Registered (non-guest) account only — used for chat, TTS, and save. */
export async function requireRegisteredSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.isGuest) {
    throw new AppError({
      message:
        "Create a free account to save your analysis, ask follow-ups, and keep your portfolio.",
      status: 401,
      code: "TRIAL_SIGNUP_REQUIRED",
    });
  }
  return session;
}

export const GUEST_SESSION_MAX_AGE_SECONDS = GUEST_COOKIE_MAX_AGE_SECONDS;
