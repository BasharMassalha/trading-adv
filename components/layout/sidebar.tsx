"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Upload,
  Sparkles,
  Settings,
  LineChart,
  SquareTerminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clientEnv } from "@/lib/env";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Portfolios", href: "/portfolio", icon: Briefcase },
  { label: "Upload", href: "/portfolio/upload", icon: Upload },
  { label: "AI Advisor", href: "/advisor", icon: Sparkles },
  { label: "Markets", href: "/markets", icon: LineChart },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const beginNavigation = useBeginNavigation();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card/40">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <SquareTerminal className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">
          {clientEnv.NEXT_PUBLIC_APP_NAME}
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (active) return;
                beginNavigation();
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
  );
}
