/**
 * Report generator factory.
 *
 * Portfolio analysis uses **OpenAI only** (no mock fallback). Configure:
 * - ANALYSIS_PROVIDER: "openai" (default) | "anthropic" (analysis not implemented yet)
 * - OPENAI_API_KEY: required for analysis
 * - OPENAI_ANALYSIS_MODEL: optional (default: gpt-4o)
 */

import type { IReportGenerator } from "./types";
import { AnalysisProviderError } from "./types";
import { OpenAIReportGenerator } from "./openai-generator";
import { serverEnv } from "@/lib/env";

let _instance: IReportGenerator | null = null;

/**
 * Get the OpenAI report generator. Cached for the process lifetime.
 * @throws AnalysisProviderError if not configured for OpenAI analysis
 */
export function getReportGenerator(): IReportGenerator {
  if (_instance) return _instance;

  const env = serverEnv();
  const provider = env.ANALYSIS_PROVIDER.toLowerCase().trim();

  if (provider === "anthropic") {
    throw new AnalysisProviderError(
      "Portfolio analysis currently requires OpenAI. Set ANALYSIS_PROVIDER=openai and OPENAI_API_KEY.",
      "INVALID_API_KEY",
    );
  }

  if (provider !== "openai") {
    throw new AnalysisProviderError(
      "ANALYSIS_PROVIDER must be openai for portfolio analysis.",
      "INVALID_API_KEY",
    );
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AnalysisProviderError(
      "OPENAI_API_KEY is required. Portfolio analysis uses AI only — no mock fallback.",
      "INVALID_API_KEY",
    );
  }

  const model = env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o";
  try {
    _instance = new OpenAIReportGenerator(apiKey, model);
  } catch (err) {
    console.error("[analysis] Failed to initialize OpenAI generator:", err);
    throw new AnalysisProviderError(
      "Failed to initialize OpenAI report generator. Check OPENAI_API_KEY and model name.",
      "INVALID_API_KEY",
    );
  }

  console.info("[analysis] OpenAI generator initialized with model:", model);
  return _instance;
}

/**
 * Reset the cached generator instance (tests / hot reload).
 */
export function resetReportGenerator(): void {
  _instance = null;
}

/**
 * Human-readable name without forcing generator construction.
 */
export function getGeneratorName(): string {
  if (_instance) return _instance.name;
  const env = serverEnv();
  if (env.ANALYSIS_PROVIDER === "openai" && env.OPENAI_API_KEY?.trim()) {
    return `openai-${env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o"}`;
  }
  if (env.ANALYSIS_PROVIDER === "anthropic") {
    return "unavailable-anthropic";
  }
  return "unavailable";
}

/**
 * True when OpenAI analysis can run (key present, provider is openai).
 */
export function isRealGeneratorAvailable(): boolean {
  const env = serverEnv();
  return env.ANALYSIS_PROVIDER === "openai" && Boolean(env.OPENAI_API_KEY?.trim());
}
