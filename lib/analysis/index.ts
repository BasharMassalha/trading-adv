/**
 * Portfolio Analysis Module
 *
 * This module provides AI-powered portfolio analysis with:
 * - Pluggable provider architecture (mock, OpenAI)
 * - Structured report generation
 * - Future-ready input extensibility (news, filings)
 *
 * USAGE
 * ─────
 * import { getReportGenerator, type AnalysisInput } from "@/lib/analysis";
 *
 * const generator = getReportGenerator();
 * const report = await generator.generate(input);
 *
 * CONFIGURATION
 * ─────────────
 * - ANALYSIS_PROVIDER: "mock" | "openai"
 * - OPENAI_API_KEY: Required for OpenAI provider
 * - OPENAI_ANALYSIS_MODEL: Model to use (default: gpt-4o)
 */

// Types
export type {
  AnalysisInput,
  AnalysisReport,
  IReportGenerator,
  InvestorProfileContext,
  HoldingContext,
  PortfolioContext,
  NewsItem,
  FilingItem,
  AnalysisErrorCode,
} from "./types";

export { AnalysisProviderError } from "./types";

// Generator factory
export {
  getReportGenerator,
  resetReportGenerator,
  getGeneratorName,
  isRealGeneratorAvailable,
} from "./generator";

// Providers (for direct use or testing)
export { MockReportGenerator } from "./mock-generator";
export { OpenAIReportGenerator } from "./openai-generator";
