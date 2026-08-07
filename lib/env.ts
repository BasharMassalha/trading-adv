import { z } from "zod";

/**
 * Centralised, type-safe environment variable access.
 *
 * Server-only vars are validated lazily so that client bundles don't trip the
 * validator (they don't have access to server env vars by design).
 *
 * AI CONFIGURATION
 * ────────────────
 * - OPENAI_API_KEY: Required for OpenAI-based analysis and chat
 * - ANALYSIS_PROVIDER: "openai" (default) | "anthropic" (analysis not wired yet)
 * - OPENAI_ANALYSIS_MODEL: Model for portfolio analysis (default: "gpt-4o")
 * - OPENAI_CHAT_MODEL: Model for advisor chat (default: "gpt-4o")
 */

const serverSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET should be at least 16 chars")
    .default("dev-insecure-secret-change-me-please"),

  // OpenAI configuration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ANALYSIS_MODEL: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().optional(),
  // Text-to-speech (briefing narration)
  OPENAI_TTS_MODEL: z.string().optional(),
  OPENAI_TTS_VOICE: z.string().optional(),

  // Anthropic configuration (future)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Provider selection
  ANALYSIS_PROVIDER: z
    .preprocess((v) => {
      if (v == null || v === "") return "openai";
      const s = String(v).toLowerCase().trim();
      if (s === "mock") {
        console.warn(
          "[env] ANALYSIS_PROVIDER=mock is no longer supported; using openai (AI-only analysis).",
        );
        return "openai";
      }
      return s;
    }, z.enum(["openai", "anthropic"]))
    .default("openai"),
  VISION_PROVIDER: z.enum(["auto", "openai", "mock"]).default("auto"),
  MARKET_DATA_PROVIDER: z
    .enum(["auto", "yahoo", "yahoo-finance", "mock"])
    .default("auto"),
  MARKET_DATA_API_KEY: z.string().optional(),

  // News provider configuration
  NEWS_PROVIDER: z.enum(["mock", "finnhub"]).default("mock"),
  NEWS_API_KEY: z.string().optional(),

  // Filings provider configuration
  FILINGS_PROVIDER: z.enum(["mock", "sec", "sec-edgar"]).default("mock"),

  /**
   * Contact string sent to SEC EDGAR, e.g. "MyApp/1.0 (you@yourdomain.com)".
   * SEC returns 403 for undeclared agents, so this must be set in every
   * deployed environment or superinvestor 13F and filings data will be empty.
   */
  SEC_USER_AGENT: z.string().optional(),

  // Google OAuth (Sign in with Google)
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Terminal001"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

let _serverEnv: z.infer<typeof serverSchema> | null = null;

/** Must never be used in production; checked after parse. */
const INSECURE_DEFAULT_AUTH_SECRET = "dev-insecure-secret-change-me-please";
const INSECURE_EXAMPLE_AUTH_SECRET = "replace-me-with-a-long-random-string";

const FORBIDDEN_PRODUCTION_SECRETS = new Set([
  INSECURE_DEFAULT_AUTH_SECRET,
  INSECURE_EXAMPLE_AUTH_SECRET,
]);

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called from the client bundle.");
  }
  if (!_serverEnv) {
    _serverEnv = serverSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
      AUTH_SECRET: process.env.AUTH_SECRET,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_ANALYSIS_MODEL: process.env.OPENAI_ANALYSIS_MODEL,
      OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL,
      OPENAI_TTS_MODEL: process.env.OPENAI_TTS_MODEL,
      OPENAI_TTS_VOICE: process.env.OPENAI_TTS_VOICE,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANALYSIS_PROVIDER: process.env.ANALYSIS_PROVIDER,
      VISION_PROVIDER: process.env.VISION_PROVIDER,
      MARKET_DATA_PROVIDER: process.env.MARKET_DATA_PROVIDER,
      MARKET_DATA_API_KEY: process.env.MARKET_DATA_API_KEY,
      NEWS_PROVIDER: process.env.NEWS_PROVIDER,
      NEWS_API_KEY: process.env.NEWS_API_KEY,
      FILINGS_PROVIDER: process.env.FILINGS_PROVIDER,
      SEC_USER_AGENT: process.env.SEC_USER_AGENT?.trim() || undefined,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim() || undefined,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET?.trim() || undefined,
      NODE_ENV: process.env.NODE_ENV,
    });
    if (_serverEnv.NODE_ENV === "production") {
      const s = _serverEnv.AUTH_SECRET;
      if (s.length < 32) {
        throw new Error(
          "AUTH_SECRET must be at least 32 characters in production. Generate e.g. with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
        );
      }
      if (FORBIDDEN_PRODUCTION_SECRETS.has(s)) {
        throw new Error(
          "Set AUTH_SECRET to a long random value in production (do not use dev or .env.example placeholder values).",
        );
      }
    }
  }
  return _serverEnv;
}
