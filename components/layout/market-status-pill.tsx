"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Status = { open: boolean; label: string };

/**
 * Regular US equity session, evaluated in exchange local time. Holidays are not
 * modelled — this is chrome, not a trading gate.
 */
function readSession(): Status {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekday = get("weekday");
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const open = isWeekday && minutes >= 9 * 60 + 30 && minutes < 16 * 60;

  if (open) return { open, label: "Market open" };
  if (!isWeekday) return { open, label: "Weekend" };
  return { open, label: "Market closed" };
}

export function MarketStatusPill() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    setStatus(readSession());
    const id = setInterval(() => setStatus(readSession()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] text-muted-foreground sm:flex">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status?.open ? "bg-success" : "bg-faint",
        )}
      />
      {status?.label ?? "Session"}
    </div>
  );
}
