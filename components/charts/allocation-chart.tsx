"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { allocationColor } from "@/lib/chart-colors";

type Slice = { name: string; value: number };

export function AllocationChart({ data }: { data: Slice[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.25rem",
              fontSize: 12,
            }}
            formatter={(v: number) => `$${v.toLocaleString()}`}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            stroke="hsl(var(--background))"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={allocationColor(i)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
