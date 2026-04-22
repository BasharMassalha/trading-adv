import { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { authService } from "@/server/services/auth.service";
import { signUpSchema } from "@/server/validators/auth.validator";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const input = signUpSchema.parse(body);
  const user = await authService.signUp(input);
  return ok(user, { status: 201 });
});
