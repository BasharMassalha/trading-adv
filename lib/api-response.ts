import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/**
 * Consistent JSON envelope for every API route.
 *
 * Success: { ok: true, data: T }
 * Error:   { ok: false, error: { code, message, details? } }
 */

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json<ApiError>(
    { ok: false, error: { code, message, details } },
    { status },
  );
}

/**
 * Wraps a route handler with centralised error mapping.
 *
 * Usage:
 *   export const POST = withErrorHandling(async (req) => { ... });
 */
export function withErrorHandling<
  Args extends unknown[],
  R extends Response | Promise<Response>,
>(handler: (...args: Args) => R) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return mapErrorToResponse(err);
    }
  };
}

export function mapErrorToResponse(err: unknown) {
  if (err instanceof ZodError) {
    return fail(400, "VALIDATION_ERROR", "Invalid request body", err.flatten());
  }
  if (err instanceof AppError) {
    return fail(err.status, err.code, err.message, err.details);
  }
  console.error("[api] unhandled error:", err);
  return fail(500, "INTERNAL_ERROR", "Something went wrong");
}
