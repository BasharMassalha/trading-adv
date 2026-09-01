"use client";

import { useState } from "react";
import type { ParseResult } from "@/lib/portfolio/parsed-holding";
import { PageHeader } from "@/components/layout/page-header";
import { UploadTabs } from "./upload-tabs";
import { ImportReview } from "./import-review";

// ---------------------------------------------------------------------------
// Step machine
// ---------------------------------------------------------------------------

type Step =
  | { type: "upload" }
  | {
      type: "review";
      result: ParseResult;
    };

/**
 * Manages the two-phase upload flow:
 *   upload → (file parsed by API) → review & edit → confirm → /portfolio/[id]
 *
 * All state lives here so child components stay pure and testable.
 */
export function UploadOrchestrator() {
  const [step, setStep] = useState<Step>({ type: "upload" });

  if (step.type === "review") {
    return (
      <ImportReview
        result={step.result}
        onBack={() => setStep({ type: "upload" })}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Import portfolio"
        description="Upload a broker CSV export or a screenshot of your holdings. We parse them automatically so you can review every row before saving."
      />
      <UploadTabs
        onParsed={(result) => setStep({ type: "review", result })}
      />
    </div>
  );
}
