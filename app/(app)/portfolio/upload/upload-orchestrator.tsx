"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ParseResult } from "@/lib/portfolio/parsed-holding";
import { PageHeader } from "@/components/layout/page-header";
import { GuestTrialBanner } from "@/components/auth/guest-trial-banner";
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
 * When `?portfolioId=` is present, confirm replaces that portfolio's holdings
 * instead of creating a new one (re-import into an existing book).
 */
export function UploadOrchestrator({ isGuest = false }: { isGuest?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTrial = isGuest || searchParams.get("trial") === "true";
  const portfolioId = searchParams.get("portfolioId") ?? undefined;
  const [step, setStep] = useState<Step>({ type: "upload" });

  if (step.type === "review") {
    return (
      <div className="space-y-5">
        {isTrial ? <GuestTrialBanner variant="upload" /> : null}
        <ImportReview
          result={step.result}
          portfolioId={portfolioId}
          onBack={() =>
            portfolioId
              ? router.push(`/portfolio/${portfolioId}`)
              : setStep({ type: "upload" })
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {isTrial ? <GuestTrialBanner variant="upload" /> : null}
      <PageHeader
        title={portfolioId ? "Re-import portfolio" : "Import portfolio"}
        description={
          isTrial
            ? "Step 1 — upload a broker CSV or screenshot. You’ll get one free analysis."
            : portfolioId
              ? "Upload a new CSV or screenshot. After you review the rows, they will replace the holdings in this portfolio."
              : "Upload a broker CSV export or a screenshot of your holdings. We parse them automatically so you can review every row before saving."
        }
      />
      <UploadTabs
        onParsed={(result) => setStep({ type: "review", result })}
      />
    </div>
  );
}
