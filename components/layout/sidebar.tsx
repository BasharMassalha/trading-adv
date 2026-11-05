"use client";

import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { NavLinks } from "@/components/layout/nav-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";

type SidebarProps = {
  isGuest?: boolean;
};

export function Sidebar({ isGuest = false }: SidebarProps) {
  const begin = useBeginNavigation();

  return (
    <aside className="hidden w-[216px] min-w-[216px] flex-col border-r bg-surface px-3 py-[18px] md:flex">
      <div className="px-2 pb-3">
        <BrandLockup size="sm" />
        {isGuest ? (
          <div className="mt-3">
            <Badge variant="info">Free trial</Badge>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto">
        <NavLinks isGuest={isGuest} />
      </nav>

      {isGuest ? (
        <div className="mt-auto space-y-3 border-t px-2.5 pb-1 pt-3">
          <p className="text-[11px] leading-relaxed text-faint">
            One free analysis. Sign up to save your book and unlock chat.
          </p>
          <Button size="sm" className="w-full" asChild>
            <Link href="/sign-up?from=trial" onClick={begin}>
              Keep your analysis
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-auto border-t px-2.5 pb-1 pt-3 text-[11px] leading-relaxed text-faint">
          Analysis is evidence-led and cited.
          <br />
          Agent trades stay inside a book you arm.
        </div>
      )}
    </aside>
  );
}
