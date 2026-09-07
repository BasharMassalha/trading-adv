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
import { SignUpForm } from "./sign-up-form";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  const googleEnabled = isGoogleOAuthConfigured();

  return (
    <Card className="p-1">
      <CardHeader className="pb-4">
        <CardTitle className="text-[22px]">Create your account</CardTitle>
        <CardDescription>
          Set your mandate, import a book, and read the first report in minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <SignUpForm googleEnabled={googleEnabled} />
        </Suspense>
        <p className="mt-6 text-[13px] text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
