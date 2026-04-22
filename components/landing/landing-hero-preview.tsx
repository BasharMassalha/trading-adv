"use client";

import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";

const trend = [
  { v: 2.1 },
  { v: 2.0 },
  { v: 2.15 },
  { v: 2.05 },
  { v: 2.22 },
  { v: 2.18 },
  { v: 2.35 },
  { v: 2.31 },
  { v: 2.48 },
  { v: 2.52 },
  { v: 2.61 },
  { v: 2.55 },
  { v: 2.72 },
];

const chartGradId = "hero-area-grad";

export function LandingHeroPreview() {
  return (
    <div className="landing-float relative w-full max-w-lg lg:max-w-none">
      <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-xl backdrop-blur-md">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Demo · Total value
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                $2,720,000
                <span className="ml-2 inline-flex items-center text-xs font-medium text-emerald-500">
                  <TrendingUp className="mr-0.5 h-3 w-3" />
                  +2.1%
                </span>
              </p>
            </div>
            <div className="hidden rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:block">
              90D view
            </div>
          </div>
        </div>
        <div className="h-[200px] w-full p-2 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin - 0.1", "dataMax + 0.1"]} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="hsl(217, 91%, 55%)"
                strokeWidth={2}
                fill={`url(#${chartGradId})`}
                isAnimationActive
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border/60 bg-muted/10 p-3">
          {[
            { l: "Tech", p: "38%" },
            { l: "Health", p: "22%" },
            { l: "Other", p: "40%" },
          ].map((x) => (
            <div key={x.l} className="text-center">
              <p className="text-[10px] text-muted-foreground">{x.l}</p>
              <p className="text-sm font-medium tabular-nums">{x.p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
