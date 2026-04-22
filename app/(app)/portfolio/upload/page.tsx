import type { Metadata } from "next";
import { UploadOrchestrator } from "./upload-orchestrator";

export const metadata: Metadata = { title: "Import portfolio" };

export default function UploadPage() {
  return <UploadOrchestrator />;
}
