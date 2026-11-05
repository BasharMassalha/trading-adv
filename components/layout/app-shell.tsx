"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topnav } from "@/components/layout/topnav";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { isTrialAllowedPath } from "@/components/layout/nav-config";

type AppShellProps = {
  children: React.ReactNode;
  isGuest?: boolean;
};

/**
 * Full app chrome (sidebar + top nav) for all routes except onboarding,
 * where we show only the wizard so users stay focused on the questions.
 * Guests get a slim trial chrome (Import → Portfolio → Analysis).
 */
export function AppShell({ children, isGuest = false }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isOnboarding =
    pathname === "/onboarding" || pathname?.startsWith("/onboarding/");

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isGuest || !pathname) return;
    if (isTrialAllowedPath(pathname)) return;
    router.replace("/portfolio/upload?trial=true");
  }, [isGuest, pathname, router]);

  useEffect(() => {
    if (isOnboarding) return;
    let cancelled = false;
    const pull = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/market/quotes", { method: "POST" });
        if (!cancelled && res.ok) routerRef.current.refresh();
      } catch {
        // The next minute retries.
      }
    };
    const first = window.setTimeout(pull, 2500);
    const timer = window.setInterval(pull, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isOnboarding]);

  if (isOnboarding) {
    return (
      <div className="min-h-screen w-full bg-background">{children}</div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar isGuest={isGuest} />
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isGuest={isGuest}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topnav
          onOpenMobileNav={() => setMobileNavOpen(true)}
          isGuest={isGuest}
        />
        <main className="flex-1 px-4 pb-16 pt-5 md:px-8 md:pb-[70px] md:pt-[26px]">
          {children}
        </main>
      </div>
    </div>
  );
}
