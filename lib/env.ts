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
 * - ANALYSIS_PROVIDER: "mock" | "openai" (default: "mock")
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

  // Anthropic configuration (future)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Provider selection
  ANALYSIS_PROVIDER: z.enum(["mock", "openai", "anthropic"]).default("mock"),
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
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANALYSIS_PROVIDER: process.env.ANALYSIS_PROVIDER,
      VISION_PROVIDER: process.env.VISION_PROVIDER,
      MARKET_DATA_PROVIDER: process.env.MARKET_DATA_PROVIDER,
      MARKET_DATA_API_KEY: process.env.MARKET_DATA_API_KEY,
      NEWS_PROVIDER: process.env.NEWS_PROVIDER,
      NEWS_API_KEY: process.env.NEWS_API_KEY,
      FILINGS_PROVIDER: process.env.FILINGS_PROVIDER,
      NODE_ENV: process.env.NODE_ENV,
    });
  }
  return _serverEnv;
}
