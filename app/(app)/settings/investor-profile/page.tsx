import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { analysisService } from "@/server/services/analysis.service";
import { PageHeader } from "@/components/layout/page-header";
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
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Investor profile"
        description="The mandate the AI advisor works against: risk tolerance, horizon, goals and constraints."
      />

      <InvestorProfileForm initialProfile={profile} />
    </div>
  );
}
