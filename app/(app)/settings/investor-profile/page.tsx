import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { analysisService } from "@/server/services/analysis.service";
import { InvestorProfileForm } from "./investor-profile-form";

export const metadata: Metadata = { title: "Investor Profile" };

export const dynamic = "force-dynamic";

export default async function InvestorProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const profile = await analysisService.getInvestorProfile(session.userId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Investor Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Help the AI advisor understand your investment goals, risk tolerance,
          and preferences for more personalized analysis.
        </p>
      </div>

      <InvestorProfileForm initialProfile={profile} />
    </div>
  );
}
