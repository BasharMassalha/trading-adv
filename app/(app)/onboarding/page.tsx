import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { clientEnv } from "@/lib/env";
import { analysisService } from "@/server/services/analysis.service";
import { BrandLockup } from "@/components/brand";
import { OnboardingWizard } from "./onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const existingProfile = await analysisService.getInvestorProfile(
    session.userId,
  );

  if (existingProfile) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface/95">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 md:px-0">
          <BrandLockup size="sm" />
          <Link
            href="/portfolio/upload?onboarding=true"
            className="text-[12.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip to import
          </Link>
        </div>
      </header>
      <div className="container py-8 md:py-10">
        <div className="mx-auto mb-6 max-w-2xl">
          <h1 className="text-[24px] font-semibold tracking-tight">
            Welcome to {clientEnv.NEXT_PUBLIC_APP_NAME}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Set the mandate your analysis will be measured against. Seven short
            steps — or skip and import first.
          </p>
        </div>

        <OnboardingWizard />
      </div>
    </div>
  );
}
