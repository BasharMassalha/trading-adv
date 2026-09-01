import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function SignInPage() {
  const googleEnabled = isGoogleOAuthConfigured();

  return (
    <Card className="p-1">
      <CardHeader className="pb-4">
        <CardTitle className="text-[22px]">Welcome back</CardTitle>
        <CardDescription>
          Sign in to pick up where your analysis left off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <SignInForm googleEnabled={googleEnabled} />
        </Suspense>
        <p className="mt-6 text-[13px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
