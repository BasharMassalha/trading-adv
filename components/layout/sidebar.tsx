"use client";

import { BrandLockup } from "@/components/brand";
import { NavLinks } from "@/components/layout/nav-links";

export function Sidebar() {
  return (
    <aside className="hidden w-[216px] min-w-[216px] flex-col border-r bg-surface px-3 py-[18px] md:flex">
      <div className="px-2 pb-4">
        <BrandLockup size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto">
        <NavLinks />
      </nav>

      <div className="mt-auto border-t px-2.5 pb-1 pt-3 text-[11px] leading-relaxed text-faint">
        Analysis is evidence-led and cited.
        <br />
        Nothing executes without you.
      </div>
    </aside>
  );
}
