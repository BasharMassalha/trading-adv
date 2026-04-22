import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-response";
import { authService } from "@/server/services/auth.service";

export const GET = withErrorHandling(async () => {
  await authService.signOut();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
});

export const POST = withErrorHandling(async () => {
  await authService.signOut();
  return NextResponse.json({ ok: true });
});
