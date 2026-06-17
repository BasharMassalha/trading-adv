"use client";

import { SquareTerminal } from "lucide-react";
import { clientEnv } from "@/lib/env";
import { NavLinks } from "@/components/layout/nav-links";

export function Sidebar() {
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
        <NavLinks />
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
