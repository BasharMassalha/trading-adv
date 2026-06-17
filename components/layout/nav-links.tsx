"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { NAV, isNavActive } from "@/components/layout/nav-config";

type NavLinksProps = {
  onNavigate?: () => void;
};

export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const beginNavigation = useBeginNavigation();

  return (
    <>
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => {
              if (!active) beginNavigation();
              onNavigate?.();
            }}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </>
  );
}
