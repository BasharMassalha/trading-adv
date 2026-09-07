"use client";

import Link from "next/link";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  returnTo?: string;
};

/**
 * Hard conversion wall for guest-only gated actions (chat, TTS, second analyze).
 */
export function TrialSignupWall({
  open,
  onClose,
  title = "Create a free account to continue",
  description = "You've seen how the analysis works. Sign up to save your portfolio, ask follow-up questions, and keep your report.",
  returnTo,
}: Props) {
  const begin = useBeginNavigation();
  if (!open) return null;

  const href = returnTo
    ? `/sign-up?from=trial&next=${encodeURIComponent(returnTo)}`
    : "/sign-up?from=trial";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-wall-title"
    >
      <div className="w-full max-w-md border border-border-strong bg-surface p-6 shadow-lg">
        <h2
          id="trial-wall-title"
          className="text-[15px] font-semibold tracking-tight"
        >
          {title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={href} onClick={begin}>
              Sign up free
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-in?from=trial" onClick={begin}>
              Sign in
            </Link>
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
