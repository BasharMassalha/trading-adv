/**
 * Portfolio Analysis Module
 *
 * This module provides AI-powered portfolio analysis with:
 * - OpenAI-only report generation (see generator.ts; mock removed from production path)
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
 * - ANALYSIS_PROVIDER: "openai" (default)
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

// Direct OpenAI implementation (tests may import mock-generator from its path)
export { OpenAIReportGenerator } from "./openai-generator";
