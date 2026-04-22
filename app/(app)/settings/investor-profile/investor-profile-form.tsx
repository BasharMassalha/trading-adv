"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Target,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvestorProfileView } from "@/server/services/analysis.service";

const formSchema = z.object({
  riskTolerance: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]),
  investmentHorizon: z.enum(["SHORT", "MEDIUM", "LONG"]),
  investmentGoal: z.enum([
    "GROWTH",
    "INCOME",
    "BALANCED",
    "CAPITAL_PRESERVATION",
  ]),
  assetPreference: z.enum([
    "ETF_ONLY",
    "MOSTLY_ETFS",
    "MIXED",
    "MOSTLY_STOCKS",
  ]),
  preferredRegions: z.string(),
  preferredSectors: z.string(),
  avoidedSectors: z.string(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const RISK_OPTIONS = [
  {
    value: "CONSERVATIVE",
    label: "Conservative",
    desc: "Prefer stability over growth; willing to accept lower returns for less volatility",
    icon: Shield,
  },
  {
    value: "MODERATE",
    label: "Moderate",
    desc: "Balanced approach; comfortable with some fluctuations for better returns",
    icon: BarChart3,
  },
  {
    value: "AGGRESSIVE",
    label: "Aggressive",
    desc: "Maximize growth; willing to accept significant volatility",
    icon: TrendingUp,
  },
];

const HORIZON_OPTIONS = [
  { value: "SHORT", label: "Short-term", desc: "Less than 3 years" },
  { value: "MEDIUM", label: "Medium-term", desc: "3–10 years" },
  { value: "LONG", label: "Long-term", desc: "10+ years" },
];

const GOAL_OPTIONS = [
  {
    value: "GROWTH",
    label: "Growth",
    desc: "Maximise capital appreciation over time",
  },
  {
    value: "INCOME",
    label: "Income",
    desc: "Generate regular income (dividends/interest)",
  },
  {
    value: "BALANCED",
    label: "Balanced",
    desc: "Mix of growth and income",
  },
  {
    value: "CAPITAL_PRESERVATION",
    label: "Capital preservation",
    desc: "Protect principal, beat inflation",
  },
];

const ASSET_OPTIONS = [
  { value: "ETF_ONLY", label: "ETFs only", desc: "Passive index investing" },
  {
    value: "MOSTLY_ETFS",
    label: "Mostly ETFs",
    desc: "Primarily ETFs with some individual picks",
  },
  { value: "MIXED", label: "Mixed", desc: "Balanced stocks and ETFs" },
  {
    value: "MOSTLY_STOCKS",
    label: "Mostly stocks",
    desc: "Active individual stock picking",
  },
];

const COMMON_SECTORS = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Discretionary",
  "Consumer Staples",
  "Energy",
  "Industrials",
  "Materials",
  "Real Estate",
  "Utilities",
  "Communication Services",
];

const COMMON_REGIONS = [
  "US",
  "Europe",
  "Asia Pacific",
  "Emerging Markets",
  "Global",
];

type Props = {
  initialProfile: InvestorProfileView | null;
};

export function InvestorProfileForm({ initialProfile }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      riskTolerance: (initialProfile?.riskTolerance as any) ?? "MODERATE",
      investmentHorizon: (initialProfile?.investmentHorizon as any) ?? "MEDIUM",
      investmentGoal: (initialProfile?.investmentGoal as any) ?? "BALANCED",
      assetPreference: (initialProfile?.assetPreference as any) ?? "MIXED",
      preferredRegions: initialProfile?.preferredRegions?.join(", ") ?? "",
      preferredSectors: initialProfile?.preferredSectors?.join(", ") ?? "",
      avoidedSectors: initialProfile?.avoidedSectors?.join(", ") ?? "",
      notes: initialProfile?.notes ?? "",
    },
  });

  const watchRisk = watch("riskTolerance");
  const watchHorizon = watch("investmentHorizon");
  const watchGoal = watch("investmentGoal");
  const watchAsset = watch("assetPreference");

  async function onSubmit(data: FormData) {
    setSaving(true);
    setSuccess(false);

    try {
      const body = {
        riskTolerance: data.riskTolerance,
        investmentHorizon: data.investmentHorizon,
        investmentGoal: data.investmentGoal,
        assetPreference: data.assetPreference,
        preferredRegions: data.preferredRegions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        preferredSectors: data.preferredSectors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        avoidedSectors: data.avoidedSectors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: data.notes || null,
      };

      const res = await fetch("/api/investor-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Empty state for new users
  if (!initialProfile) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Set up your investor profile</CardTitle>
            <CardDescription>
              Help the AI advisor provide personalized analysis by sharing your
              investment preferences. This only takes a minute.
            </CardDescription>
          </CardHeader>
        </Card>

        <ProfileFormFields
          watchRisk={watchRisk}
          watchHorizon={watchHorizon}
          watchGoal={watchGoal}
          watchAsset={watchAsset}
          setValue={setValue}
          register={register}
          errors={errors}
        />

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Save profile
          </Button>
          {success && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Profile saved!
            </span>
          )}
        </div>
      </form>
    );
  }

  // Edit state for existing users
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ProfileFormFields
        watchRisk={watchRisk}
        watchHorizon={watchHorizon}
        watchGoal={watchGoal}
        watchAsset={watchAsset}
        setValue={setValue}
        register={register}
        errors={errors}
      />

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Update profile
        </Button>
        {success && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Changes saved!
          </span>
        )}
      </div>
    </form>
  );
}

function ProfileFormFields({
  watchRisk,
  watchHorizon,
  watchGoal,
  watchAsset,
  setValue,
  register,
  errors,
}: {
  watchRisk: string;
  watchHorizon: string;
  watchGoal: string;
  watchAsset: string;
  setValue: any;
  register: any;
  errors: any;
}) {
  return (
    <>
      {/* Risk Tolerance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Risk Tolerance
          </CardTitle>
          <CardDescription>
            How much volatility are you comfortable with?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("riskTolerance", opt.value)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  watchRisk === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <opt.icon
                  className={`mb-2 h-5 w-5 ${
                    watchRisk === opt.value
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="font-medium">{opt.label}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Investment Horizon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Investment Horizon
          </CardTitle>
          <CardDescription>
            How long do you plan to stay invested?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {HORIZON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("investmentHorizon", opt.value)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  watchHorizon === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Investment Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Investment Goal
          </CardTitle>
          <CardDescription>
            What are you primarily trying to achieve?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("investmentGoal", opt.value)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  watchGoal === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asset Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Asset Preference
          </CardTitle>
          <CardDescription>
            What type of investments do you prefer?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {ASSET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("assetPreference", opt.value)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  watchAsset === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector and Region Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Sector & Region Preferences</CardTitle>
          <CardDescription>
            Optional: specify sectors or regions you prefer or wish to avoid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preferredRegions">Preferred regions</Label>
            <input
              id="preferredRegions"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="e.g. US, Europe, Asia Pacific"
              {...register("preferredRegions")}
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REGIONS.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => {
                    const input = document.getElementById(
                      "preferredRegions",
                    ) as HTMLInputElement;
                    const current = input.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (!current.includes(r)) {
                      input.value = [...current, r].join(", ");
                    }
                  }}
                >
                  + {r}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredSectors">Preferred sectors</Label>
            <input
              id="preferredSectors"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="e.g. Technology, Healthcare"
              {...register("preferredSectors")}
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SECTORS.slice(0, 6).map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => {
                    const input = document.getElementById(
                      "preferredSectors",
                    ) as HTMLInputElement;
                    const current = input.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean);
                    if (!current.includes(s)) {
                      input.value = [...current, s].join(", ");
                    }
                  }}
                >
                  + {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avoidedSectors">Sectors to avoid</Label>
            <input
              id="avoidedSectors"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="e.g. Tobacco, Weapons, Gambling"
              {...register("avoidedSectors")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>
            Any other context that might help the AI advisor understand your
            situation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g. I'm saving for a house down payment in 5 years, have a stable income, and can handle some short-term losses..."
            className="min-h-[100px]"
            {...register("notes")}
          />
        </CardContent>
      </Card>
    </>
  );
}
