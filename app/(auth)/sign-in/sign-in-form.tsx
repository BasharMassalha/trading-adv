"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoadingOverlay } from "@/components/loading/loading-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const GOOGLE_ERROR: Record<string, string> = {
  google_cancelled: "Google sign in was cancelled.",
  google_unconfigured: "Google sign in is not configured on this environment.",
  google_state: "The sign in session expired. Please try again.",
  google_invalid: "Google returned an invalid response. Please try again.",
  google_denied: "Google could not sign you in. Please try again.",
  google_signin: "We could not complete Google sign in. Please try again or use email.",
};

export function SignInForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramError = useMemo(() => {
    const k = searchParams.get("error");
    if (!k) return null;
    return GOOGLE_ERROR[k] ?? "Something went wrong with sign in. Please try again.";
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    };

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "Failed to sign in");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  }

  const displayError = error ?? paramError;

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <div className="space-y-3">
          <GoogleSignInButton label="Continue with Google" />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or email</span>
            </div>
          </div>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <LoadingOverlay
          show={loading}
          message="Signing in…"
          zIndexClass="z-[220]"
        />
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
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      {displayError ? (
        <p className="text-sm text-destructive" role="alert">
          {displayError}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
    </div>
  );
}
