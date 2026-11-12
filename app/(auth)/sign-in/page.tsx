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

function buildAuthHref(
  path: "/sign-up" | "/sign-in",
  searchParams: Record<string, string | string[] | undefined>,
) {
  const qs = new URLSearchParams();
  const from = searchParams.from;
  const next = searchParams.next;
  if (typeof from === "string" && from) qs.set("from", from);
  if (typeof next === "string" && next) qs.set("next", next);
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const googleEnabled = isGoogleOAuthConfigured();
  const signUpHref = buildAuthHref("/sign-up", searchParams);
  const fromTrial = searchParams.from === "trial";

  return (
    <Card className="p-1">
      <CardHeader className="pb-4">
        <CardTitle className="text-[22px]">Welcome back</CardTitle>
        <CardDescription>
          {fromTrial
            ? "Sign in to keep the portfolio and analysis from your free trial."
            : "Sign in to pick up where your analysis left off."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <SignInForm googleEnabled={googleEnabled} />
        </Suspense>
        <p className="mt-6 text-[13px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={signUpHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
