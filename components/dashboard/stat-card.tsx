import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  /**
   * "auto" tints the figure itself with the trend colour. Reserve it for
   * metrics that ARE a gain or loss — a portfolio total should stay neutral
   * even when it is up.
   */
  valueTone?: "neutral" | "auto";
  /** Optional normalised series (any scale) drawn as a baseline sparkline. */
  spark?: number[];
};

function Sparkline({ points, trend }: { points: number[]; trend: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 160;
      const y = 22 - ((p - min) / span) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className="mt-2.5 w-full"
      height="24"
      viewBox="0 0 160 24"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={path}
        fill="none"
        strokeWidth="1.4"
        className={
          trend === "down" ? "stroke-destructive" : "stroke-success"
        }
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  icon: Icon,
  hint,
  valueTone = "neutral",
  spark,
}: StatCardProps) {
  const tone =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="bg-surface px-[18px] py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-faint" /> : null}
      </div>

      <div
        className={cn(
          "mt-2.5 font-mono text-[21px] font-semibold leading-none tracking-tight",
          valueTone === "auto" ? tone : null,
        )}
      >
        {value}
      </div>

      {delta || hint ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[12px]">
          {delta ? (
            <span className={tone}>
              {trend === "up" ? "▲ " : trend === "down" ? "▼ " : ""}
              {delta}
            </span>
          ) : null}
          {hint ? <span className="text-faint">{hint}</span> : null}
        </div>
      ) : null}

      {spark && spark.length > 1 ? (
        <Sparkline points={spark} trend={trend} />
      ) : null}
    </div>
  );
}

/** Hairline-divided container the tiles are designed to sit in. */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hairline-grid grid sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
