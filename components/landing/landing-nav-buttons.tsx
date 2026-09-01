"use client";

import Link from "next/link";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { Button } from "@/components/ui/button";

function useNavClick() {
  return useBeginNavigation();
}

export function LandingHeaderNav() {
  const onNav = useNavClick();
  return (
    <nav className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/sign-in" onClick={onNav}>
          Sign in
        </Link>
      </Button>
      <Button size="sm" asChild>
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
    <div className="flex flex-wrap items-center gap-3">
      <Button size="lg" asChild>
        <Link href="/sign-up" onClick={onNav}>
          Start free
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/dashboard" onClick={onNav}>
          See a worked example
        </Link>
      </Button>
    </div>
  );
}

export function LandingBottomCtas({ appName }: { appName: string }) {
  const onNav = useNavClick();
  return (
    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
      <Button size="lg" asChild>
        <Link href="/sign-up" onClick={onNav}>
          Get started with {appName}
        </Link>
      </Button>
      <p className="text-[12.5px] text-faint">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          onClick={onNav}
          className="font-medium text-background underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
