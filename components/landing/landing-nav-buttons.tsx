"use client";

import Link from "next/link";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { Button } from "@/components/ui/button";
import { TryFreeAnalysisButton } from "@/components/landing/try-free-analysis-button";

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
      <TryFreeAnalysisButton tone="inline" className="hidden sm:inline-flex">
        Try free
      </TryFreeAnalysisButton>
      <Button size="sm" variant="outline" asChild className="sm:hidden">
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
    <div className="flex flex-col gap-4">
      <TryFreeAnalysisButton tone="hero">
        Try it on your portfolio
      </TryFreeAnalysisButton>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
        <Link
          href="/sign-up"
          onClick={onNav}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Or create an account
        </Link>
        <span className="text-border-strong" aria-hidden>
          ·
        </span>
        <Link
          href="/dashboard"
          onClick={onNav}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          See a worked example
        </Link>
      </div>
    </div>
  );
}

export function LandingBottomCtas({ appName }: { appName: string }) {
  const onNav = useNavClick();
  return (
    <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
      <TryFreeAnalysisButton tone="inverse">
        Try it on your portfolio
      </TryFreeAnalysisButton>
      <p className="max-w-[280px] text-[12.5px] text-background/55 sm:text-right">
        Prefer an account first?{" "}
        <Link
          href="/sign-up"
          onClick={onNav}
          className="font-medium text-background underline-offset-4 hover:underline"
        >
          Get started with {appName}
        </Link>
        {" · "}
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
