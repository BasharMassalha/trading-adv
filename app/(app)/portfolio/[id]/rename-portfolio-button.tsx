"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  portfolioId: string;
  portfolioName: string;
  className?: string;
  /** Icon-only control for tight spaces (e.g. portfolio list cards). */
  compact?: boolean;
};

export function RenamePortfolioButton({
  portfolioId,
  portfolioName,
  className,
  compact = false,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(portfolioName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(portfolioName);
  }, [portfolioName]);

  function cancel() {
    setEditing(false);
    setName(portfolioName);
    setError(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (trimmed === portfolioName) {
      cancel();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Could not rename portfolio.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div
        className={cn("flex flex-wrap items-center gap-2", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          disabled={busy}
          className="h-8 w-[min(100%,14rem)] text-[13px]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") cancel();
          }}
        />
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void save()}
          className="h-8 gap-1 px-2.5"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={cancel}
          className="h-8 gap-1 px-2.5"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
        {error ? (
          <span className="w-full text-[12px] text-destructive">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "sm"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
      className={cn(compact && "h-7 w-7 shrink-0", className)}
      aria-label={`Rename ${portfolioName}`}
      title="Rename portfolio"
    >
      <Pencil className={cn("stroke-[1.6]", compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5")} />
      {!compact ? "Rename" : null}
    </Button>
  );
}
