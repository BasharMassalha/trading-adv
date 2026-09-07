"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import {
  NAV_GROUPS,
  TRIAL_NAV_GROUPS,
  isNavActive,
} from "@/components/layout/nav-config";

type NavLinksProps = {
  onNavigate?: () => void;
  isGuest?: boolean;
};

export function NavLinks({ onNavigate, isGuest = false }: NavLinksProps) {
  const pathname = usePathname();
  const beginNavigation = useBeginNavigation();
  const groups = isGuest ? TRIAL_NAV_GROUPS : NAV_GROUPS;

  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-1">
          <div className="px-2.5 pb-1.5 pt-3 text-[11px] text-faint">
            {group.label}
          </div>
          {group.items.map(({ label, href, icon: Icon, step }) => {
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
                {step != null ? (
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border font-mono text-[10px] leading-none",
                      active
                        ? "border-primary/40 bg-primary text-primary-foreground"
                        : "border-border-strong text-faint",
                    )}
                    aria-hidden
                  >
                    {step}
                  </span>
                ) : (
                  <Icon
                    className={cn(
                      "h-[15px] w-[15px] shrink-0 stroke-[1.6]",
                      active ? "text-primary" : "text-faint",
                    )}
                  />
                )}
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
