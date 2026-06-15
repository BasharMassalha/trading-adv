"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  portfolio: number;
  benchmark?: number;
};

export function PerformanceComparisonChart({
  data,
  benchmarkLabel = "S&P 500 (SPY)",
}: {
  data: Point[];
  benchmarkLabel?: string;
}) {
  const hasBenchmark = data.some((d) => d.benchmark != null);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
            fontSize={12}
            tickFormatter={(v) => {
              const d = new Date(v);
              return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
            }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(v) => `${Number(v).toFixed(0)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)} (indexed)`,
              name === "portfolio" ? "Your portfolio" : benchmarkLabel,
            ]}
            labelFormatter={(label) =>
              new Date(label).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
          />
          {hasBenchmark && (
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(value) =>
                value === "portfolio" ? "Your portfolio" : benchmarkLabel
              }
            />
          )}
          <Area
            type="monotone"
            dataKey="portfolio"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#portfolioFill)"
            name="portfolio"
          />
          {hasBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="benchmark"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
