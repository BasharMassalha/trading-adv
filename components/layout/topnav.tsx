"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MarketStatusPill } from "@/components/layout/market-status-pill";
import { BrandLockup } from "@/components/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientEnv } from "@/lib/env";
import { currentNavLabel } from "@/components/layout/nav-config";
import { brandInitials } from "@/components/brand";

type TopnavProps = {
  onOpenMobileNav?: () => void;
};

export function Topnav({ onOpenMobileNav }: TopnavProps) {
  const pathname = usePathname();
  const beginNavigation = useBeginNavigation();
  const section = currentNavLabel(pathname);

  const navigateUnless = (prefix: string) => () => {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return;
    beginNavigation();
  };

  return (
    <header className="sticky top-0 z-30 flex h-[57px] items-center gap-3 border-b bg-surface px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Open navigation menu"
          onClick={onOpenMobileNav}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link
          href="/dashboard"
          onClick={navigateUnless("/dashboard")}
          className="min-w-0"
        >
          <BrandLockup size="sm" />
        </Link>
      </div>

      <div className="hidden text-[12.5px] text-faint md:block">
        {clientEnv.NEXT_PUBLIC_APP_NAME}
        {section ? (
          <>
            {" / "}
            <span className="font-medium text-foreground">{section}</span>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <div className="relative hidden w-[280px] lg:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            placeholder="Search tickers, portfolios, reports"
            className="h-[30px] w-full rounded-md border bg-background pl-8 pr-11 text-[12.5px] text-foreground placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border-strong bg-surface px-1.5 py-px font-mono text-[10.5px] text-faint">
            ⌘K
          </kbd>
        </div>

        <MarketStatusPill />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Account menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback>{brandInitials()}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" onClick={navigateUnless("/settings")}>
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/advisor" onClick={navigateUnless("/advisor")}>
                AI advisor
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/api/auth/sign-out" onClick={beginNavigation}>
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
