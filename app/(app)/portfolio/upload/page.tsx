import type { Metadata } from "next";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { LoadingOverlay } from "@/components/loading/loading-overlay";
import { UploadOrchestrator } from "./upload-orchestrator";

export const metadata: Metadata = { title: "Import portfolio" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await getSession();
  return (
    <Suspense fallback={<LoadingOverlay show message="Opening importer…" />}>
      <UploadOrchestrator isGuest={session?.isGuest === true} />
    </Suspense>
  );
}
