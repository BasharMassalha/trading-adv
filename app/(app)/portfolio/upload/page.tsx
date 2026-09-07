import type { Metadata } from "next";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { UploadOrchestrator } from "./upload-orchestrator";

export const metadata: Metadata = { title: "Import portfolio" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await getSession();
  return (
    <Suspense
      fallback={
        <div className="text-[13px] text-muted-foreground">Loading…</div>
      }
    >
      <UploadOrchestrator isGuest={session?.isGuest === true} />
    </Suspense>
  );
}
