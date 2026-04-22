import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
};

export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  icon: Icon,
  hint,
}: StatCardProps) {
  const deltaColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : null}
        </div>
        <div className="mt-4 text-2xl font-semibold tracking-tight">{value}</div>
        {delta || hint ? (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {delta ? (
              <span className={cn("inline-flex items-center gap-1", deltaColor)}>
                {trend === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : trend === "down" ? (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                ) : null}
                {delta}
              </span>
            ) : null}
            {hint ? (
              <span className="text-muted-foreground">{hint}</span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
