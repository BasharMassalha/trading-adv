"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topnav } from "@/components/layout/topnav";

/**
 * Full app chrome (sidebar + top nav) for all routes except onboarding,
 * where we show only the wizard so users stay focused on the questions.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding =
    pathname === "/onboarding" || pathname?.startsWith("/onboarding/");

  if (isOnboarding) {
    return (
      <div className="min-h-screen w-full bg-background">{children}</div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topnav />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
