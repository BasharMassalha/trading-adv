/**
 * Mock vision provider.
 *
 * Returns realistic static data for development, testing, and demos.
 * Use this as a fallback when real vision APIs are unavailable.
 */

import type { ParsedHolding } from "@/lib/portfolio/parsed-holding";
import type {
  IVisionProvider,
  VisionExtractionInput,
  VisionExtractionResult,
} from "./types";

// ---------------------------------------------------------------------------
// Mock data — realistic portfolio holdings for development
// ---------------------------------------------------------------------------

const MOCK_HOLDINGS: ParsedHolding[] = [
  {
    ticker: "AAPL",
    companyName: "Apple Inc.",
    shares: 35,
    averageCost: 162.5,
    currentPrice: 189.45,
    marketValue: 6630.75,
    gainLoss: 942.25,
    currency: "USD",
  },
  {
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    shares: 20,
    averageCost: 305.1,
    currentPrice: 415.7,
    marketValue: 8314.0,
    gainLoss: 2212.0,
    currency: "USD",
  },
  {
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    shares: 10,
    averageCost: 215.4,
    currentPrice: 875.3,
    marketValue: 8753.0,
    gainLoss: 6599.0,
    currency: "USD",
  },
  {
    ticker: "GOOGL",
    companyName: "Alphabet Inc. Class A",
    shares: 25,
    averageCost: 119.6,
    currentPrice: 165.1,
    marketValue: 4127.5,
    gainLoss: 1137.5,
    currency: "USD",
  },
  {
    ticker: "JPM",
    companyName: "JPMorgan Chase & Co.",
    shares: 30,
    averageCost: 144.2,
    currentPrice: 198.8,
    marketValue: 5964.0,
    gainLoss: 1638.0,
    currency: "USD",
  },
  {
    ticker: "VOO",
    companyName: "Vanguard S&P 500 ETF",
    shares: 15,
    averageCost: 412.3,
    currentPrice: 475.2,
    marketValue: 7128.0,
    gainLoss: 943.5,
    currency: "USD",
  },
];

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class MockVisionProvider implements IVisionProvider {
  readonly name = "mock";

  async extractPortfolioFromImage(
    input: VisionExtractionInput,
  ): Promise<VisionExtractionResult> {
    // Simulate processing delay so the UI's loading state is visible
    await new Promise((r) => setTimeout(r, 800));

    console.info("[vision:mock] Simulated extraction for", {
      filename: input.filename,
      bytes: input.imageBuffer.byteLength,
      mimeType: input.mimeType,
    });

    return {
      holdings: MOCK_HOLDINGS,
      warnings: [
        "This is a simulated extraction — real AI vision is not connected.",
        "To enable real extraction, set VISION_PROVIDER=openai and provide your API key.",
      ],
      status: "ok",
      provider: this.name,
      confidence: 0.0,
      droppedRows: 0,
    };
  }
}
