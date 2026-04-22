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
      className={`fixed inset-0 ${zIndexClass} flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-16 w-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- local animated SVG asset */}
        <img
          src="/terminal-loader.svg"
          alt=""
          width={64}
          height={64}
          className="h-16 w-16"
        />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
