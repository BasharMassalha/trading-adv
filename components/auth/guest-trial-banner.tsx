"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";

type Variant = "upload" | "portfolio" | "advisor" | "save";

const COPY: Record<Variant, { body: string; cta: string }> = {
  upload: {
    body: "Step 1 of 3 — import your book for one free analysis.",
    cta: "Save permanently",
  },
  portfolio: {
    body: "Step 2 of 3 — review holdings, then run analysis. Sign up to keep this book.",
    cta: "Create account",
  },
  advisor: {
    body: "Step 3 of 3 — your free report. Sign up to keep it and ask follow-ups.",
    cta: "Keep my analysis",
  },
  save: {
    body: "Create a free account to save your portfolio and unlock chat.",
    cta: "Sign up free",
  },
};

type Props = {
  variant?: Variant;
  /** Optional return path encoded into sign-up query */
  returnTo?: string;
};

export function GuestTrialBanner({
  variant = "portfolio",
  returnTo,
}: Props) {
  const begin = useBeginNavigation();
  const copy = COPY[variant];
  const href = returnTo
    ? `/sign-up?from=trial&next=${encodeURIComponent(returnTo)}`
    : "/sign-up?from=trial";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-primary/25 bg-primary-soft px-3.5 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
        <Badge variant="info">One-time trial</Badge>
        <span>{copy.body}</span>
      </div>
      <Button size="sm" asChild>
        <Link href={href} onClick={begin}>
          {copy.cta}
        </Link>
      </Button>
    </div>
  );
}
