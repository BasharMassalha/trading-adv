"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, SquareTerminal } from "lucide-react";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientEnv } from "@/lib/env";

type TopnavProps = {
  onOpenMobileNav?: () => void;
};

export function Topnav({ onOpenMobileNav }: TopnavProps) {
  const pathname = usePathname();
  const beginNavigation = useBeginNavigation();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:gap-4 md:px-6">
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
          onClick={() => {
            if (pathname === "/dashboard") return;
            beginNavigation();
          }}
          className="flex min-w-0 items-center gap-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <SquareTerminal className="h-4 w-4" />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight">
            {clientEnv.NEXT_PUBLIC_APP_NAME}
          </span>
        </Link>
      </div>

      <div className="relative hidden flex-1 md:block md:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tickers, portfolios, reports..."
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-9 w-9">
                <AvatarImage src="" alt="" />
                <AvatarFallback>T0</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                onClick={() => {
                  if (
                    pathname === "/settings" ||
                    pathname.startsWith("/settings/")
                  )
                    return;
                  beginNavigation();
                }}
              >
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/advisor"
                onClick={() => {
                  if (
                    pathname === "/advisor" ||
                    pathname.startsWith("/advisor/")
                  )
                    return;
                  beginNavigation();
                }}
              >
                AI Advisor
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
