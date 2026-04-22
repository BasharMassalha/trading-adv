/**
 * Report generator factory.
 *
 * Returns the configured generator instance based on ANALYSIS_PROVIDER:
 * - "mock": Uses rule-based heuristics (default, works without API keys)
 * - "openai": Uses OpenAI GPT-4 for intelligent analysis
 *
 * CONFIGURATION
 * ─────────────
 * - ANALYSIS_PROVIDER: "mock" | "openai" (default: "mock")
 * - OPENAI_API_KEY: Required when ANALYSIS_PROVIDER=openai
 * - OPENAI_ANALYSIS_MODEL: Model to use (default: "gpt-4o")
 */

import type { IReportGenerator } from "./types";
import { AnalysisProviderError } from "./types";
import { MockReportGenerator } from "./mock-generator";
import { OpenAIReportGenerator } from "./openai-generator";
import { serverEnv } from "@/lib/env";

let _instance: IReportGenerator | null = null;

/**
 * Get the configured report generator.
 * The instance is cached for the lifetime of the process.
 */
export function getReportGenerator(): IReportGenerator {
  if (_instance) return _instance;

  const env = serverEnv();
  const provider = env.ANALYSIS_PROVIDER.toLowerCase().trim();

  console.info("[analysis] Initializing report generator:", provider);

  switch (provider) {
    case "openai": {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn(
          "[analysis] ANALYSIS_PROVIDER=openai but OPENAI_API_KEY is not set. Falling back to mock.",
        );
        _instance = new MockReportGenerator();
        break;
      }

      const model = env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o";
      try {
        _instance = new OpenAIReportGenerator(apiKey, model);
        console.info("[analysis] OpenAI generator initialized with model:", model);
      } catch (err) {
        console.error("[analysis] Failed to initialize OpenAI generator:", err);
        console.warn("[analysis] Falling back to mock generator.");
        _instance = new MockReportGenerator();
      }
      break;
    }

    case "mock":
    default:
      _instance = new MockReportGenerator();
      console.info("[analysis] Using mock generator");
      break;
  }

  return _instance;
}

/**
 * Reset the cached generator instance.
 * Useful for testing or reconfiguration.
 */
export function resetReportGenerator(): void {
  _instance = null;
}

/**
 * Get the name of the current generator.
 */
export function getGeneratorName(): string {
  return getReportGenerator().name;
}

/**
 * Check if a real (non-mock) generator is available.
 */
export function isRealGeneratorAvailable(): boolean {
  const env = serverEnv();
  if (env.ANALYSIS_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    return true;
  }
  return false;
}
