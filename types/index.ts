/**
 * Shared TypeScript types for the Trading Adv application.
 *
 * Business types live here — DB types come from the generated Prisma client.
 */

export type { SessionPayload } from "@/lib/auth";
export type { ApiSuccess, ApiError, ApiResponse } from "@/lib/api-response";
export type { ParsedHolding, CreatePortfolioInput } from "@/server/validators/portfolio.validator";
export type { ChatMessage } from "@/server/services/advisor.service";

/** Convenience union for async operation state in React components. */
export type AsyncStatus = "idle" | "pending" | "success" | "error";
