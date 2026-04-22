"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { LoadingOverlay } from "@/components/loading/loading-overlay";

const noop = () => {};
const Ctx = createContext<() => void>(noop);

export function useBeginNavigation() {
  return useContext(Ctx);
}

/**
 * Wraps the app: shows a full-screen loading layer when `beginNavigation` runs
 * until the route (pathname) changes. Use for sidebar / same-tab links.
 */
export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  const beginNavigation = useCallback(() => {
    setNavigating(true);
  }, []);

  return (
    <Ctx.Provider value={beginNavigation}>
      <LoadingOverlay show={navigating} message="Loading…" />
      {children}
    </Ctx.Provider>
  );
}
