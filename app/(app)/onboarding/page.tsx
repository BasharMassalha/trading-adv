import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { clientEnv } from "@/lib/env";
import { analysisService } from "@/server/services/analysis.service";
import { OnboardingWizard } from "./onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();

  // Redirect to sign-in if not authenticated
  if (!session) {
    redirect("/sign-in");
  }

  // Check if user already has an investment profile
  const existingProfile = await analysisService.getInvestorProfile(session.userId);

  // If profile exists, redirect to dashboard (they've already completed onboarding)
  if (existingProfile) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 md:py-12">
        <div className="mx-auto mb-6 max-w-2xl">
          <h1 className="text-[24px] font-semibold tracking-tight">
            Welcome to {clientEnv.NEXT_PUBLIC_APP_NAME}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Set the mandate your analysis will be measured against. Seven short
            steps.
          </p>
        </div>

        <OnboardingWizard />
      </div>
    </div>
  );
}
