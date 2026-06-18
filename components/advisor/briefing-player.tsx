"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Lightbulb,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportView } from "@/server/services/analysis.service";
import {
  buildBriefing,
  estimateSceneDurationMs,
  type BriefingNewsItem,
  type BriefingScene,
  type BriefingTone,
} from "@/lib/analysis/briefing";

type Props = {
  open: boolean;
  onClose: () => void;
  report: ReportView | null;
  portfolioName: string;
  news?: BriefingNewsItem[];
};

type TtsState = "unknown" | "neural" | "fallback";

function tonePalette(tone: BriefingTone | undefined) {
  switch (tone) {
    case "positive":
      return {
        glow: "from-emerald-500/25 via-emerald-500/0 to-emerald-500/0",
        ring: "ring-emerald-500/40",
        chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        icon: TrendingUp,
      };
    case "negative":
      return {
        glow: "from-rose-500/25 via-rose-500/0 to-rose-500/0",
        ring: "ring-rose-500/40",
        chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        icon: ShieldAlert,
      };
    case "warning":
      return {
        glow: "from-amber-500/25 via-amber-500/0 to-amber-500/0",
        ring: "ring-amber-500/40",
        chip: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
        icon: ShieldAlert,
      };
    case "info":
      return {
        glow: "from-sky-500/25 via-sky-500/0 to-sky-500/0",
        ring: "ring-sky-500/40",
        chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
        icon: Lightbulb,
      };
    case "neutral":
    default:
      return {
        glow: "from-primary/20 via-primary/0 to-primary/0",
        ring: "ring-primary/30",
        chip: "bg-primary/10 text-primary border-primary/30",
        icon: Target,
      };
  }
}

export function BriefingPlayer({
  open,
  onClose,
  report,
  portfolioName,
  news,
}: Props) {
  const briefing = useMemo(
    () => buildBriefing(report, portfolioName, news),
    [report, portfolioName, news],
  );
  const scenes = briefing?.scenes ?? [];

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ttsState, setTtsState] = useState<TtsState>("unknown");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Reset when opened/closed.
  useEffect(() => {
    if (open) {
      setIdx(0);
      setProgress(0);
      setPlaying(true);
    } else {
      setPlaying(false);
      if (speechSupported) window.speechSynthesis.cancel();
      const a = audioElRef.current;
      if (a) a.pause();
    }
  }, [open, speechSupported]);

  // Release cached blob URLs on unmount.
  useEffect(() => {
    const cache = audioCacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  // Pick a fallback voice for browsers without neural TTS.
  useEffect(() => {
    if (!speechSupported) return;
    const pick = () => {
      const all = window.speechSynthesis.getVoices();
      if (all.length === 0) return;
      const preferred = [
        "Google UK English Female",
        "Samantha",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)",
      ];
      const byName = all.find((v) => preferred.includes(v.name));
      const en =
        byName ??
        all.find((v) => /en[-_]US/i.test(v.lang)) ??
        all.find((v) => /^en/i.test(v.lang)) ??
        all[0];
      setVoice(en ?? null);
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, [speechSupported]);

  // Fetch (and cache) neural audio for a scene. Returns null to signal fallback.
  async function fetchSceneAudio(scene: BriefingScene): Promise<string | null> {
    const cache = audioCacheRef.current;
    const cached = cache.get(scene.id);
    if (cached) return cached;
    try {
      const res = await fetch("/api/briefing/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scene.narration }),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cache.set(scene.id, url);
      return url;
    } catch {
      return null;
    }
  }

  // Core playback engine: narrate the active scene, then advance.
  useEffect(() => {
    if (!open || !playing) return;
    const scene = scenes[idx];
    if (!scene) return;

    let cancelled = false;
    let raf: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const audio = audioElRef.current;
    const synth = speechSupported ? window.speechSynthesis : null;

    setProgress(0);

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      if (audio) {
        audio.onended = null;
        audio.ontimeupdate = null;
        audio.pause();
      }
      if (synth) synth.cancel();
    };

    const advance = () => {
      if (cancelled) return;
      cancelled = true;
      cleanup();
      if (idx >= scenes.length - 1) setPlaying(false);
      else setIdx(idx + 1);
    };

    // Estimated-time progress + optional browser speech (used when muted or
    // when neural TTS is unavailable).
    const runFallback = () => {
      const dur = estimateSceneDurationMs(scene);
      const start = performance.now();
      const tick = (t: number) => {
        if (cancelled) return;
        setProgress(Math.min(1, (t - start) / dur));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      if (!muted && synth) {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(scene.narration);
        if (voice) u.voice = voice;
        u.rate = 0.98;
        u.pitch = 1.05;
        u.onend = advance;
        u.onerror = advance;
        synth.speak(u);
        timer = setTimeout(advance, dur * 1.8 + 2500);
      } else {
        timer = setTimeout(advance, dur);
      }
    };

    if (muted || ttsState === "fallback" || !audio) {
      runFallback();
    } else {
      setLoading(ttsState === "unknown");
      fetchSceneAudio(scene)
        .then((url) => {
          if (cancelled) return;
          setLoading(false);
          if (!url) {
            setTtsState("fallback");
            runFallback();
            return;
          }
          setTtsState("neural");
          audio.src = url;
          audio.currentTime = 0;
          audio.onended = advance;
          audio.ontimeupdate = () => {
            if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
          };
          audio.play().catch(() => {
            if (cancelled) return;
            setTtsState("fallback");
            runFallback();
          });
          // Warm the cache for the next scene.
          const next = scenes[idx + 1];
          if (next) void fetchSceneAudio(next);
        })
        .catch(() => {
          if (cancelled) return;
          setLoading(false);
          setTtsState("fallback");
          runFallback();
        });
    }

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playing, idx, muted, ttsState, voice, speechSupported]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") goto(idx + 1);
      else if (e.key === "ArrowLeft") goto(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx, scenes.length]);

  if (!open) return null;

  function goto(next: number) {
    if (scenes.length === 0) return;
    setIdx(Math.max(0, Math.min(scenes.length - 1, next)));
  }

  if (!briefing || scenes.length === 0) {
    return (
      <Overlay onClose={onClose}>
        <div className="rounded-2xl border bg-card p-8 text-center shadow-2xl">
          <Film className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="font-semibold">No briefing available yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate (or regenerate) an analysis to unlock the video briefing.
          </p>
          <Button onClick={onClose} className="mt-5">
            Close
          </Button>
        </div>
      </Overlay>
    );
  }

  const scene = scenes[idx];
  const palette = tonePalette(scene.tone);
  const Icon = palette.icon;
  const isLast = idx >= scenes.length - 1;
  const speaking = playing && !muted;

  return (
    <Overlay onClose={onClose}>
      <audio ref={audioElRef} hidden />
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Film className="h-3.5 w-3.5 text-primary" />
            <span>Video briefing</span>
            <span className="mx-2">·</span>
            <span>
              {idx + 1} / {scenes.length}
            </span>
            {ttsState === "neural" && (
              <span className="ml-2 hidden items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline-flex">
                <Sparkles className="h-2.5 w-2.5" />
                Neural voice
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Segmented progress */}
        <div className="flex gap-1 px-5 pt-3">
          {scenes.map((s, i) => (
            <div
              key={s.id}
              className="h-1 flex-1 overflow-hidden rounded-full bg-muted-foreground/20"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width:
                    i < idx
                      ? "100%"
                      : i === idx
                        ? `${Math.round(progress * 100)}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Scene stage */}
        <div className="relative min-h-[22rem] overflow-hidden p-6 sm:p-10">
          {/* Moving ambient background */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-br",
              palette.glow,
            )}
          />
          <div className="briefing-pan pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-from),_transparent_55%)] opacity-70" />

          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Preparing your narrator…
              </p>
            </div>
          )}

          <div key={scene.id} className="briefing-zoom relative space-y-6">
            <div className="briefing-rise flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl border bg-background/70 ring-2 backdrop-blur",
                  palette.ring,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                {scene.subtitle && (
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {scene.subtitle}
                  </p>
                )}
                <h2 className="truncate text-2xl font-semibold tracking-tight">
                  {scene.title}
                </h2>
              </div>
              {scene.badge && (
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-xs font-semibold",
                    palette.chip,
                  )}
                >
                  {scene.badge}
                </span>
              )}
              {speaking && (
                <span className="ml-1 flex items-end gap-0.5 self-center" aria-hidden>
                  <i className="briefing-eq h-3 w-0.5 rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                  <i className="briefing-eq h-4 w-0.5 rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                  <i className="briefing-eq h-2.5 w-0.5 rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>

            {scene.bullets && scene.bullets.length > 0 && (
              <ul className="space-y-3">
                {scene.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="briefing-rise flex gap-3 rounded-lg border bg-background/60 p-3 text-sm leading-relaxed backdrop-blur"
                    style={{ animationDelay: `${150 + i * 130}ms` }}
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Captions */}
        <div className="border-t bg-muted/30 px-5 py-3">
          <p className="briefing-fade text-center text-sm leading-relaxed text-foreground/80">
            {scene.narration}
          </p>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goto(idx - 1)}
            disabled={idx === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIdx(0);
                setPlaying(true);
              }}
              title="Restart"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => {
                if (isLast && !playing) {
                  setIdx(0);
                  setPlaying(true);
                } else {
                  setPlaying((p) => !p);
                }
              }}
              title={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMuted((m) => !m)}
              title={muted ? "Unmute narration" : "Mute narration"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => goto(idx + 1)}
            disabled={isLast}
            className="gap-1.5"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl">{children}</div>
    </div>
  );
}
