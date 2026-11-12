"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIDEO_SRC = "/guides/screenshot-holdings.mp4";
const POSTER_SRC = "/guides/screenshot-holdings-poster.png";
const SVG_FALLBACK = "/guides/screenshot-holdings.svg";

type Props = {
  className?: string;
  /** When false, pause and unload media so CSV tab stays cheap. */
  active?: boolean;
};

/**
 * Short muted loop showing which region of a broker screen to capture.
 * Prefers MP4; falls back to the animated SVG if playback fails.
 */
export function ScreenshotGuide({ className, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"video" | "svg">("video");
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!active || mode !== "video" || !el) {
      el?.pause();
      return;
    }

    el.muted = true;
    const play = el.play();
    if (play && typeof play.then === "function") {
      play
        .then(() => setNeedsGesture(false))
        .catch(() => setNeedsGesture(true));
    }
  }, [active, mode]);

  function handleReplay() {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.muted = true;
    void el.play().then(() => setNeedsGesture(false)).catch(() => {
      setMode("svg");
    });
  }

  if (!active) return null;

  return (
    <figure className={cn("space-y-2.5", className)}>
      <div className="relative overflow-hidden border bg-[#F4F6F8]">
        <div className="relative aspect-video w-full">
          {mode === "video" ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-contain"
              poster={POSTER_SRC}
              muted
              playsInline
              loop
              autoPlay
              preload="metadata"
              aria-label="Demonstration of cropping a brokerage holdings table for upload"
              onError={() => setMode("svg")}
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- animated SVG guide asset
            <img
              src={SVG_FALLBACK}
              alt="Crop the holdings table; leave out charts and account totals"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          {mode === "video" && needsGesture ? (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/35">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={handleReplay}
              >
                <Play className="h-3.5 w-3.5 fill-current stroke-[1.6]" />
                Play guide
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <figcaption className="text-[12.5px] leading-relaxed text-muted-foreground">
        Capture the holdings table — ticker, shares, and cost or value. Crop out
        charts and account totals.
      </figcaption>
    </figure>
  );
}
