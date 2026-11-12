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

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const googleEnabled = isGoogleOAuthConfigured();
  const signInHref = buildAuthHref("/sign-in", searchParams);
  const fromTrial = searchParams.from === "trial";

  return (
    <Card className="p-1">
      <CardHeader className="pb-4">
        <CardTitle className="text-[22px]">
          {fromTrial ? "Keep your analysis" : "Create your account"}
        </CardTitle>
        <CardDescription>
          {fromTrial
            ? "Create a free account to save this portfolio, unlock chat, and come back anytime."
            : "Set your mandate, import a book, and read the first report in minutes."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <SignUpForm googleEnabled={googleEnabled} />
        </Suspense>
        <p className="mt-6 text-[13px] text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
