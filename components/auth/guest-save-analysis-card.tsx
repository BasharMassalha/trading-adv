"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";

type Props = {
  portfolioId?: string;
};

/**
 * Strong post-analysis conversion card for guest trials.
 */
export function GuestSaveAnalysisCard({ portfolioId }: Props) {
  const begin = useBeginNavigation();
  const next = portfolioId
    ? `/advisor?portfolio=${portfolioId}`
    : "/advisor";
  const href = `/sign-up?from=trial&next=${encodeURIComponent(next)}`;

  return (
    <div className="border border-primary/30 bg-primary-soft px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.6] text-primary" />
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight">
              Save this portfolio and keep your analysis
            </h3>
            <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
              Your free report is ready. Create a free account to keep this book,
              unlock the full action plan and news, and ask follow-up questions.
              Without an account, this trial can expire.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild>
            <Link href={href} onClick={begin}>
              Sign up to save
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-in?from=trial" onClick={begin}>
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
