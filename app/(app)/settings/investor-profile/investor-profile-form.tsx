"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Target,
  TrendingUp,
  Shield,
  Clock,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InvestorProfileView } from "@/server/services/analysis.service";
import { cn } from "@/lib/utils";

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
  strategyMessage: z.string().max(2000).optional(),
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
      strategyMessage: initialProfile?.strategyMessage ?? "",
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
        strategyMessage: data.strategyMessage?.trim() || null,
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="border border-border-strong bg-surface p-5">
          <h2 className="text-[13.5px] font-semibold tracking-tight">
            Set up your investor profile
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            The advisor uses these constraints to judge your holdings. It takes
            about a minute.
          </p>
        </div>

        <ProfileFormFields
          watchRisk={watchRisk}
          watchHorizon={watchHorizon}
          watchGoal={watchGoal}
          watchAsset={watchAsset}
          setValue={setValue}
          register={register}
          errors={errors}
        />

        <div className="flex items-center gap-3 border-t pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin stroke-[1.6]" />
            ) : (
              <ArrowRight className="h-4 w-4 stroke-[1.6]" />
            )}
            Save profile
          </Button>
          {success && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-success">
              <CheckCircle2 className="h-4 w-4 stroke-[1.6]" />
              Profile saved
            </span>
          )}
        </div>
      </form>
    );
  }

  // Edit state for existing users
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ProfileFormFields
        watchRisk={watchRisk}
        watchHorizon={watchHorizon}
        watchGoal={watchGoal}
        watchAsset={watchAsset}
        setValue={setValue}
        register={register}
        errors={errors}
      />

      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin stroke-[1.6]" />
          ) : (
            <Check className="h-4 w-4 stroke-[1.6]" />
          )}
          Update profile
        </Button>
        {success && (
          <span className="flex items-center gap-1.5 text-[12.5px] text-success">
            <CheckCircle2 className="h-4 w-4 stroke-[1.6]" />
            Changes saved
          </span>
        )}
      </div>
    </form>
  );
}

/** Flat hairline panel used for each block of the form. */
function Panel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="border bg-surface p-5">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 shrink-0 stroke-[1.6] text-faint" /> : null}
        <h2 className="text-[13.5px] font-semibold tracking-tight">{title}</h2>
      </div>
      {description ? (
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

const OPTION_BASE =
  "flex flex-col items-start border bg-surface p-4 text-left transition-colors hover:bg-background";
const OPTION_SELECTED = "border-primary bg-primary-soft hover:bg-primary-soft";

/** Chip that appends a suggestion into the adjacent free-text input. */
function SuggestionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border bg-surface px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-background"
    >
      + {label}
    </button>
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
      <Panel
        title="Risk tolerance"
        description="How much volatility are you comfortable with?"
        icon={Shield}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {RISK_OPTIONS.map((opt) => {
            const selected = watchRisk === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("riskTolerance", opt.value)}
                className={cn(OPTION_BASE, selected && OPTION_SELECTED)}
              >
                <opt.icon
                  className={cn(
                    "mb-2 h-4 w-4 stroke-[1.6]",
                    selected ? "text-primary" : "text-faint",
                  )}
                />
                <span className="text-[13px] font-medium">{opt.label}</span>
                <span className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Investment Horizon */}
      <Panel
        title="Investment horizon"
        description="How long do you plan to stay invested?"
        icon={Clock}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {HORIZON_OPTIONS.map((opt) => {
            const selected = watchHorizon === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("investmentHorizon", opt.value)}
                className={cn(OPTION_BASE, selected && OPTION_SELECTED)}
              >
                <span className="text-[13px] font-medium">{opt.label}</span>
                <span className="mt-1 font-mono text-[12px] text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Investment Goal */}
      <Panel
        title="Investment goal"
        description="What are you primarily trying to achieve?"
        icon={Target}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {GOAL_OPTIONS.map((opt) => {
            const selected = watchGoal === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("investmentGoal", opt.value)}
                className={cn(OPTION_BASE, selected && OPTION_SELECTED)}
              >
                <span className="text-[13px] font-medium">{opt.label}</span>
                <span className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Asset Preference */}
      <Panel
        title="Asset preference"
        description="What type of investments do you prefer?"
        icon={BarChart3}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {ASSET_OPTIONS.map((opt) => {
            const selected = watchAsset === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("assetPreference", opt.value)}
                className={cn(OPTION_BASE, selected && OPTION_SELECTED)}
              >
                <span className="text-[13px] font-medium">{opt.label}</span>
                <span className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Sector and Region Preferences */}
      <Panel
        title="Sectors and regions"
        description="Optional. Sectors or regions you prefer, and any you want excluded."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preferredRegions" className="text-[12.5px]">
              Preferred regions
            </Label>
            <Input
              id="preferredRegions"
              placeholder="e.g. US, Europe, Asia Pacific"
              {...register("preferredRegions")}
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REGIONS.map((r) => (
                <SuggestionChip
                  key={r}
                  label={r}
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
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredSectors" className="text-[12.5px]">
              Preferred sectors
            </Label>
            <Input
              id="preferredSectors"
              placeholder="e.g. Technology, Healthcare"
              {...register("preferredSectors")}
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SECTORS.slice(0, 6).map((s) => (
                <SuggestionChip
                  key={s}
                  label={s}
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
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avoidedSectors" className="text-[12.5px]">
              Sectors to avoid
            </Label>
            <Input
              id="avoidedSectors"
              placeholder="e.g. Tobacco, Weapons, Gambling"
              {...register("avoidedSectors")}
            />
          </div>
        </div>
      </Panel>

      {/* Strategy message — the investor's own words */}
      <Panel
        title="Your strategy, goals and preferences"
        description="Describe in your own words what you want from this portfolio. The AI weights this above the selections above, including how aggressively you want it to pursue returns."
        icon={MessageSquare}
      >
        <div className="space-y-2">
          <Textarea
            id="strategyMessage"
            placeholder="e.g. I want to grow this account meaningfully over 10 years and I'm fine with volatility. Let winners run instead of trimming them just for size. I like founder-led tech and energy, avoid tobacco. Tell me where I can realistically add return, not just where to be safe."
            className="min-h-[140px]"
            maxLength={2000}
            {...register("strategyMessage")}
          />
          <p className="text-[11px] text-faint">
            Mention your return expectations, how much risk you accept, names or
            themes you like, and anything the advisor should never suggest.
          </p>
          {errors.strategyMessage && (
            <p className="text-[12px] text-destructive">
              {errors.strategyMessage.message}
            </p>
          )}
        </div>
      </Panel>

      {/* Additional Notes */}
      <Panel
        title="Additional notes"
        description="Constraints or personal context: taxes, income stability, upcoming expenses."
      >
        <Textarea
          placeholder="e.g. I'm saving for a house down payment in 5 years, have a stable income, and can handle some short-term losses..."
          className="min-h-[100px]"
          {...register("notes")}
        />
      </Panel>
    </>
  );
}
