"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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
  isGuest?: boolean;
};

export function Topnav({ onOpenMobileNav, isGuest = false }: TopnavProps) {
  const pathname = usePathname();
  const beginNavigation = useBeginNavigation();
  const section = currentNavLabel(pathname, isGuest);

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
          href={isGuest ? "/portfolio/upload?trial=true" : "/dashboard"}
          onClick={navigateUnless(isGuest ? "/portfolio/upload" : "/dashboard")}
          className="min-w-0"
        >
          <BrandLockup size="sm" />
        </Link>
      </div>

      <div className="hidden items-center gap-2 text-[12.5px] text-faint md:flex">
        <span>{isGuest ? "Free trial" : clientEnv.NEXT_PUBLIC_APP_NAME}</span>
        {section ? (
          <>
            <span aria-hidden>·</span>
            <span className="font-medium text-foreground">{section}</span>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {!isGuest ? <MarketStatusPill /> : null}
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Account menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback>{isGuest ? "G" : brandInitials()}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isGuest ? (
              <>
                <DropdownMenuLabel>Guest trial</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/sign-up?from=trial" onClick={beginNavigation}>
                    Create account to keep this
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sign-in?from=trial" onClick={beginNavigation}>
                    Sign in
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/api/auth/sign-out" onClick={beginNavigation}>
                    End trial
                  </Link>
                </DropdownMenuItem>
              </>
            ) : (
              <>
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
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
