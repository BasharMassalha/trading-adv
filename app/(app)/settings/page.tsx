import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
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
          Update your name and email address.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[12.5px]">
              Name
            </Label>
            <Input id="name" defaultValue="Alex Morgan" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[12.5px]">
              Email
            </Label>
            <Input id="email" type="email" defaultValue="alex@example.com" />
          </div>
          <Button>Save changes</Button>
        </div>
      </div>

      <div className="border bg-surface p-5">
        <h2 className="text-[13.5px] font-semibold tracking-tight">Password</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          Change your account password.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-[12.5px]">
              Current password
            </Label>
            <Input id="current-password" type="password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-[12.5px]">
              New password
            </Label>
            <Input id="new-password" type="password" />
          </div>
          <Button variant="outline">Update password</Button>
        </div>
      </div>

      <div className="border border-destructive/30 bg-destructive-soft p-5">
        <h2 className="text-[13.5px] font-semibold tracking-tight text-destructive">
          Danger zone
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          Permanently delete your account and all associated data. This cannot
          be undone.
        </p>
        <Button variant="destructive" size="sm" className="mt-4">
          Delete account
        </Button>
      </div>
    </div>
  );
}
