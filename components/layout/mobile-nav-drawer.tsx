"use client";

import { useEffect } from "react";
import { X, SquareTerminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clientEnv } from "@/lib/env";
import { NavLinks } from "@/components/layout/nav-links";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation menu"
        className={cn(
          "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-[min(100vw-3rem,18rem)] flex-col border-r bg-card shadow-2xl transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <SquareTerminal className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              {clientEnv.NEXT_PUBLIC_APP_NAME}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavLinks onNavigate={onClose} />
        </nav>

        <div className="border-t p-4">
          <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Pro tip</p>
            <p className="mt-1">
              Upload a broker screenshot and let the AI advisor review your risk
              profile.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
