import { type NextRequest } from "next/server";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { analysisService } from "@/server/services/analysis.service";
import { investorProfileSchema } from "@/server/validators/investor-profile.validator";

/**
 * GET /api/investor-profile
 * Returns the current user's investment profile, or null if not set.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
  }

  const profile = await analysisService.getInvestorProfile(session.userId);
  return ok(profile);
});

/**
 * POST /api/investor-profile
 * Create or update the current user's investment profile.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return fail(401, "UNAUTHORIZED", "Please sign in to continue.");
  }

  const body = await req.json();
  const parsed = investorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      400,
      "VALIDATION_ERROR",
      "Invalid input.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const profile = await analysisService.upsertInvestorProfile(
    session.userId,
    parsed.data,
  );

  return ok(profile);
});
