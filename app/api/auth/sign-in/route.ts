import { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { authService } from "@/server/services/auth.service";
import { signInSchema } from "@/server/validators/auth.validator";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const input = signInSchema.parse(body);
  const user = await authService.signIn(input);
  return ok(user);
});
