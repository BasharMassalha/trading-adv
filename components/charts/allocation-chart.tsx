"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = { name: string; value: number };

const COLORS = [
  "hsl(221 83% 60%)",
  "hsl(160 84% 45%)",
  "hsl(280 70% 60%)",
  "hsl(38 92% 55%)",
  "hsl(0 75% 60%)",
  "hsl(200 80% 55%)",
  "hsl(120 45% 50%)",
  "hsl(260 60% 65%)",
];

export function AllocationChart({ data }: { data: Slice[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
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
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
