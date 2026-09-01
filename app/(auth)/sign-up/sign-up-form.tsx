"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoadingOverlay } from "@/components/loading/loading-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    };

    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "Failed to create account");
      }
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <div className="space-y-3">
          <GoogleSignInButton label="Sign up with Google" />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-2 text-[11px] uppercase tracking-wide text-faint">
                Or email
              </span>
            </div>
          </div>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <LoadingOverlay
          show={loading}
          message="Creating your account…"
          zIndexClass="z-[220]"
        />
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Alex Morgan" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {error ? (
        <p
          className="border border-destructive/30 bg-destructive-soft px-3 py-2 text-[12.5px] text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
    </div>
  );
}
