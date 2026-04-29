"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  portfolioId: string;
  portfolioName: string;
  className?: string;
};

export function DeletePortfolioButton({
  portfolioId,
  portfolioName,
  className,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const okConfirm = window.confirm(
      `Delete “${portfolioName}”? This removes all holdings and AI reports for this portfolio. This cannot be undone.`,
    );
    if (!okConfirm) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/portfolio/${portfolioId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        window.alert(json.error?.message ?? "Could not delete portfolio.");
        return;
      }
      router.push("/portfolio");
      router.refresh();
    } catch {
      window.alert("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={handleDelete}
      className={cn(
        "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      <span className="ml-1.5">Delete</span>
    </Button>
  );
}
