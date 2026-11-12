import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.isGuest) redirect("/sign-up?from=trial&next=%2Fsettings");

  const displayName = session.name?.trim() || "—";
  const email = session.email;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your account and the mandate your analysis is measured against."
      />

      <div className="border bg-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-tight">
          Investor profile
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          Risk tolerance, horizon, goals and sector constraints. Every AI
          analysis is scored against this profile.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/settings/investor-profile">
            Manage investor profile
            <ArrowRight className="h-4 w-4 stroke-[1.6] text-faint" />
          </Link>
        </Button>
      </div>

      <div className="border bg-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-tight">Profile</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          Account details from your current session.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[12.5px]">
              Name
            </Label>
            <Input id="name" value={displayName} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[12.5px]">
              Email
            </Label>
            <Input id="email" type="email" value={email} readOnly disabled />
          </div>
          <p className="text-[12px] text-faint">
            Profile editing is coming soon. Your sign-in email stays tied to this
            account.
          </p>
        </div>
      </div>

      <div className="border bg-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-tight">Password</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          Password changes are not available in the app yet. If you signed up
          with email, contact support to reset access.
        </p>
      </div>

      <div className="border border-destructive/30 bg-destructive-soft p-5">
        <h2 className="text-[13.5px] font-semibold tracking-tight text-destructive">
          Sign out
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          End this session on this device. Account deletion is not available in
          the product yet.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/api/auth/sign-out">Sign out</Link>
        </Button>
      </div>
    </div>
  );
}
