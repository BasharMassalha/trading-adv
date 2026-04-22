"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { Button } from "@/components/ui/button";

function useNavClick() {
  return useBeginNavigation();
}

export function LandingHeaderNav() {
  const onNav = useNavClick();
  return (
    <nav className="flex items-center gap-2">
      <Button variant="ghost" asChild>
        <Link href="/sign-in" onClick={onNav}>
          Sign in
        </Link>
      </Button>
      <Button asChild>
        <Link href="/sign-up" onClick={onNav}>
          Get started
        </Link>
      </Button>
    </nav>
  );
}

export function LandingHeroCtas() {
  const onNav = useNavClick();
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <Button size="lg" asChild>
        <Link href="/sign-up" onClick={onNav}>
          Start free <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/dashboard" onClick={onNav}>
          View demo dashboard
        </Link>
      </Button>
    </div>
  );
}

export function LandingBottomCtas({ appName }: { appName: string }) {
  const onNav = useNavClick();
  return (
    <>
      <div className="mt-8">
        <Button size="lg" asChild>
          <Link href="/sign-up" onClick={onNav}>
            Get started with {appName}
          </Link>
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Already a user?{" "}
        <Link
          href="/sign-in"
          onClick={onNav}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
