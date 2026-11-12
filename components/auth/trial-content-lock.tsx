"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  /** Opens the sign-in / sign-up wall */
  onSeeMore: () => void;
  ctaLabel?: string;
  /** Extra locked rows shown blurred behind the CTA */
  blurredPreview?: React.ReactNode;
};

/**
 * Inline teaser for gated trial content. CTA opens the auth wall.
 */
export function TrialContentLock({
  title,
  description,
  onSeeMore,
  ctaLabel = "See more",
  blurredPreview,
}: Props) {
  return (
    <div className="relative overflow-hidden border border-border-strong bg-surface">
      {blurredPreview ? (
        <div
          className="pointer-events-none max-h-36 select-none space-y-2 overflow-hidden p-3.5 opacity-40 blur-[2.5px]"
          aria-hidden
        >
          {blurredPreview}
        </div>
      ) : null}
      <div className="relative flex flex-col gap-3 border-t px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={onSeeMore}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
