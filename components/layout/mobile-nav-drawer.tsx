"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand";
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
          "fixed inset-0 z-50 bg-foreground/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-[min(100vw-3rem,17rem)] flex-col border-r bg-surface transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-3">
          <BrandLockup size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks onNavigate={onClose} />
        </nav>

        <div className="border-t px-5 py-3 text-[11px] leading-relaxed text-faint">
          Analysis is evidence-led and cited.
          <br />
          Nothing executes without you.
        </div>
      </aside>
    </>
  );
}
