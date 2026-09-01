"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RiskHistoryPoint } from "@/lib/market-risk/types";

function formatShortDate(d: string): string {
  try {
    const date = new Date(d);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return d;
  }
}

type TooltipPayload = {
  payload?: RiskHistoryPoint;
  value?: number;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="rounded-[0.25rem] border bg-popover px-2.5 py-2 text-[12px] shadow-pop">
      <div className="text-faint">{label ? formatShortDate(label) : ""}</div>
      <div className="mt-0.5 font-mono font-medium">
        {data.score}
        <span className="ml-1.5 font-sans font-normal text-muted-foreground">
          {data.regime}
        </span>
      </div>
    </div>
  );
}

export function RiskTrendChart({ data }: { data: RiskHistoryPoint[] }) {
  const hasData = data.length > 0;
  // Thin the X-axis ticks for long ranges.
  const tickCount = data.length > 0 ? Math.min(6, data.length) : 0;
  const step =
    tickCount > 0 ? Math.max(1, Math.floor(data.length / tickCount)) : 1;
  const ticks = data
    .filter((_, idx) => idx % step === 0)
    .map((p) => p.date);

  return (
    <div className="border bg-surface">
      <div className="border-b px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold tracking-tight">
          Risk score trend
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Aggregated 0–100 risk score over time. Reference lines mark the
          Normal / Elevated / High thresholds.
        </p>
      </div>

      <div className="p-5">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center border border-dashed bg-surface p-8 text-center text-[13px] text-muted-foreground">
            No history available yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--border))"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--faint))", fontSize: 11 }}
                  ticks={ticks}
                  tickFormatter={formatShortDate}
                  minTickGap={20}
                />
                <YAxis
                  stroke="hsl(var(--border))"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--faint))", fontSize: 11 }}
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "hsl(var(--border))" }}
                />

                <ReferenceLine
                  y={40}
                  stroke="hsl(var(--warning))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.55}
                />
                <ReferenceLine
                  y={60}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                />
                <ReferenceLine
                  y={80}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                />

                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.6}
                  fill="hsl(var(--foreground))"
                  fillOpacity={0.06}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
