"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topnav } from "@/components/layout/topnav";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

/**
 * Full app chrome (sidebar + top nav) for all routes except onboarding,
 * where we show only the wizard so users stay focused on the questions.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isOnboarding =
    pathname === "/onboarding" || pathname?.startsWith("/onboarding/");

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isOnboarding) {
    return (
      <div className="min-h-screen w-full bg-background">{children}</div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topnav onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 pb-16 pt-5 md:px-8 md:pb-[70px] md:pt-[26px]">
          {children}
        </main>
      </div>
    </div>
  );
}
