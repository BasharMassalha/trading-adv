"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { NAV_GROUPS, isNavActive } from "@/components/layout/nav-config";

type NavLinksProps = {
  onNavigate?: () => void;
};

export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const beginNavigation = useBeginNavigation();

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-1">
          <div className="px-2.5 pb-1.5 pt-3 text-[11px] text-faint">
            {group.label}
          </div>
          {group.items.map(({ label, href, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (!active) beginNavigation();
                  onNavigate?.();
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-r-md border-l-2 px-2.5 py-[7px] text-[13px] transition-colors",
                  active
                    ? "border-primary bg-primary-soft font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-[15px] w-[15px] shrink-0 stroke-[1.6]",
                    active ? "text-primary" : "text-faint",
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
