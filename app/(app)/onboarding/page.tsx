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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Welcome to {clientEnv.NEXT_PUBLIC_APP_NAME}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Let's set up your investment profile in just a few steps
          </p>
        </div>

        <OnboardingWizard />
      </div>
    </div>
  );
}
