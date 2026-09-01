import { formatCurrency } from "@/lib/utils";
import { allocationColor } from "@/lib/chart-colors";

type Slice = { name: string; value: number };

export const RAMP = Array.from({ length: 10 }, (_, i) => allocationColor(i));

export function SectorAllocationBar({
  data,
  max = 7,
}: {
  data: Slice[];
  max?: number;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, max);
  const tail = sorted.slice(max);
  const rows =
    tail.length > 0
      ? [
          ...head,
          {
            name: "Other",
            value: tail.reduce((sum, s) => sum + s.value, 0),
          },
        ]
      : head;

  const total = rows.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-foreground">
        Refresh market data to see the sector breakdown.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden">
        {rows.map((s, i) => (
          <div
            key={s.name}
            style={{
              flex: s.value,
              background: RAMP[i % RAMP.length],
            }}
            title={`${s.name}: ${((s.value / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>

      <div className="mt-3.5">
        {rows.map((s, i) => (
          <div
            key={s.name}
            className="flex items-center justify-between gap-3 border-t py-2.5 text-[12.5px] first:border-t-0"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2 w-2 shrink-0"
                style={{ background: RAMP[i % RAMP.length] }}
                aria-hidden
              />
              <span className="truncate">{s.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-[11.5px] text-faint">
                {formatCurrency(s.value)}
              </span>
              <span className="w-12 text-right font-mono">
                {((s.value / total) * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
