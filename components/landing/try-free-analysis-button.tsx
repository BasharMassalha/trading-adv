"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileSearch } from "lucide-react";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { LoadingOverlay } from "@/components/loading/loading-overlay";
import { cn } from "@/lib/utils";

type Props = {
  /** Visual treatment for landing surfaces */
  tone?: "hero" | "inverse" | "inline";
  className?: string;
  children?: React.ReactNode;
};

/**
 * Starts a guest trial session then routes to portfolio upload.
 * Designed as the primary conversion action on marketing surfaces.
 */
export function TryFreeAnalysisButton({
  tone = "hero",
  className,
  children = "Try it on your portfolio",
}: Props) {
  const router = useRouter();
  const begin = useBeginNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTrial() {
    setError(null);
    setLoading(true);
    begin();
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(
          json?.error?.message ?? "Could not start free trial.",
        );
      }
      if (json.data?.alreadyRegistered) {
        router.push("/portfolio/upload");
      } else {
        router.push("/portfolio/upload?trial=true");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start trial.");
      setLoading(false);
    }
  }

  const isInverse = tone === "inverse";
  const isInline = tone === "inline";

  return (
    <div
      className={cn(
        "inline-flex flex-col",
        tone === "hero" ? "items-stretch sm:items-start" : "items-start",
        className,
      )}
    >
      <LoadingOverlay
        show={loading}
        message="Starting free trial…"
        zIndexClass="z-[220]"
      />
      <button
        type="button"
        disabled={loading}
        onClick={startTrial}
        className={cn(
          "group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-md border font-semibold leading-none transition-[transform,background-color,border-color,box-shadow] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:translate-y-px",
          isInline
            ? "h-9 border-primary bg-primary px-[15px] text-[13px] text-primary-foreground hover:bg-primary/90"
            : isInverse
              ? "h-12 border-background bg-background px-6 text-[14.5px] text-foreground shadow-[0_1px_0_rgba(255,255,255,0.12)] hover:bg-background/92"
              : "h-12 border-primary bg-primary px-6 text-[14.5px] text-primary-foreground shadow-[0_1px_0_hsl(var(--primary)/0.35)] hover:bg-primary/90",
        )}
      >
        {!isInline ? (
          <span
            className={cn(
              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              isInverse
                ? "bg-[linear-gradient(110deg,transparent_35%,rgba(0,0,0,0.04)_50%,transparent_65%)]"
                : "bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.14)_50%,transparent_65%)]",
            )}
            aria-hidden
          />
        ) : null}
        <FileSearch
          className={cn(
            "relative shrink-0 stroke-[1.7]",
            isInline ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
        <span className="relative">{children}</span>
        <ArrowRight
          className={cn(
            "relative shrink-0 stroke-[1.7] transition-transform duration-200 group-hover:translate-x-0.5",
            isInline ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
      </button>
      {!isInline ? (
        <p
          className={cn(
            "mt-2.5 text-[12.5px]",
            isInverse ? "text-background/55" : "text-faint",
          )}
        >
          No account needed · One free analysis · Takes a few minutes
        </p>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-[12px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
