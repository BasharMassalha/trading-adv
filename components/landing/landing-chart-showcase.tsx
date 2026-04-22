"use client";

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const sectors = [
  { name: "Tech", v: 38 },
  { name: "Health", v: 22 },
  { name: "Fin.", v: 18 },
  { name: "Ind.", v: 12 },
  { name: "Rest", v: 10 },
];

const lineSeries = [
  { m: "Jan", y: 100 },
  { m: "Feb", y: 98 },
  { m: "Mar", y: 105 },
  { m: "Apr", y: 103 },
  { m: "May", y: 112 },
  { m: "Jun", y: 118 },
];

const allocation = [
  { name: "A", v: 42, fill: "hsl(217, 91%, 58%)" },
  { name: "B", v: 28, fill: "hsl(217, 70%, 45%)" },
  { name: "C", v: 30, fill: "hsl(142, 50%, 42%)" },
];

const COLS = [
  "hsl(217, 91%, 58%)",
  "hsl(217, 70%, 48%)",
  "hsl(200, 60%, 45%)",
  "hsl(180, 40%, 42%)",
  "hsl(215, 25%, 50%)",
];

function ChartPanel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card/80 to-card/40 p-4 shadow-sm backdrop-blur-sm ${className}`}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function LandingChartShowcase() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
      <ChartPanel
        title="Sector mix"
        subtitle="Illustrative split; your real weights live in the app"
        className="lg:col-span-2"
      >
        <div className="h-[220px] w-full sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectors} barCategoryGap="18%">
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                hide
                domain={[0, 50]}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}%`, "Share"]}
              />
              <Bar dataKey="v" radius={[6, 6, 0, 0]} animationDuration={1000}>
                {sectors.map((_, i) => (
                  <Cell key={sectors[i].name} fill={COLS[i % COLS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>

      <ChartPanel
        title="Relative performance"
        subtitle="Index-normalised, demo curve"
        className="lg:row-span-1"
      >
        <div className="h-[220px] w-full sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="m"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke="hsl(142, 60%, 48%)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>

      <ChartPanel
        title="Position bands"
        subtitle="Stylised allocation rings"
        className="md:col-span-2 lg:col-span-1"
      >
        <div className="mx-auto h-[200px] w-full max-w-[220px] sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocation}
                dataKey="v"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={3}
                isAnimationActive
                animationDuration={1000}
              >
                {allocation.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Labels anonymised for preview
        </p>
      </ChartPanel>
    </div>
  );
}
