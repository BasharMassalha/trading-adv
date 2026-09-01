"use client";

type LoadingOverlayProps = {
  show: boolean;
  /** Shown under the animation */
  message?: string;
  /** z-index: navigation uses 200, auth can use 210 to sit above cards */
  zIndexClass?: string;
};

/**
 * Full-screen loading layer. Uses an animated SVG in /public (smooth loop
 * like a GIF) for a crisp, professional look on all displays.
 */
export function LoadingOverlay({
  show,
  message = "Loading…",
  zIndexClass = "z-[200]",
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-background/80 animate-in fade-in duration-200`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 border bg-surface px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- local animated SVG asset */}
        <img
          src="/terminal-loader.svg"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0"
        />
        <p className="text-[13px] text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
