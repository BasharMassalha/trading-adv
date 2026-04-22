"use client";

import { useState } from "react";
import type { ParseResult } from "@/lib/portfolio/parsed-holding";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import portfolio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a broker CSV export or a screenshot of your holdings. We'll
          parse them automatically so you can review before saving.
        </p>
      </div>
      <UploadTabs
        onParsed={(result) => setStep({ type: "review", result })}
      />
    </div>
  );
}
