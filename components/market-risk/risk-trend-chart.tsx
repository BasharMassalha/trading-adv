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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">
        {label ? formatShortDate(label) : ""}
      </div>
      <div className="mt-0.5 font-medium tabular-nums">
        Score {data.score}{" "}
        <span className="font-normal text-muted-foreground">
          · {data.regime}
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk score trend</CardTitle>
        <CardDescription>
          Aggregated 0–100 risk score over time. Reference lines mark the
          Normal / Elevated / High thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No history available yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(20, 80%, 55%)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(20, 80%, 55%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  ticks={ticks}
                  tickFormatter={formatShortDate}
                  minTickGap={20}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                />
                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine
                  y={40}
                  stroke="hsl(45, 80%, 50%)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  y={60}
                  stroke="hsl(25, 85%, 50%)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  y={80}
                  stroke="hsl(0, 80%, 50%)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />

                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(20, 80%, 55%)"
                  strokeWidth={2}
                  fill="url(#riskFill)"
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
