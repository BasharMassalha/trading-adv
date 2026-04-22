import { LoadingOverlay } from "@/components/loading/loading-overlay";

/**
 * Shown by Next.js while a server segment in (app) is loading (e.g. slow data fetch).
 * Matches the client navigation overlay for a consistent feel.
 */
export default function AppLoading() {
  return <LoadingOverlay show zIndexClass="z-[100]" message="Loading…" />;
}
