"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Shield,
  Clock,
  Target,
  BarChart3,
  Briefcase,
  Upload,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types and Constants
// ---------------------------------------------------------------------------

type ProfileData = {
  riskTolerance: string;
  investmentHorizon: string;
  investmentGoal: string;
  assetPreference: string;
  preferredSectors: string[];
  avoidedSectors: string[];
  strategyMessage: string;
};

const STEPS = [
  { id: "risk", title: "Risk", icon: Shield },
  { id: "horizon", title: "Horizon", icon: Clock },
  { id: "goal", title: "Goal", icon: Target },
  { id: "asset", title: "Assets", icon: BarChart3 },
  { id: "sectors", title: "Sectors", icon: Briefcase },
  { id: "message", title: "Strategy", icon: MessageSquare },
  { id: "complete", title: "Review", icon: Upload },
] as const;

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
  { value: "SHORT", label: "Short-term", desc: "Less than 3 years", years: "< 3" },
  { value: "MEDIUM", label: "Medium-term", desc: "3 to 10 years", years: "3-10" },
  { value: "LONG", label: "Long-term", desc: "More than 10 years", years: "10+" },
];

const GOAL_OPTIONS = [
  {
    value: "GROWTH",
    label: "Growth",
    desc: "Maximize capital appreciation over time",
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
    label: "Capital Preservation",
    desc: "Protect principal, beat inflation",
  },
];

const ASSET_OPTIONS = [
  {
    value: "ETF_ONLY",
    label: "ETFs Only",
    desc: "Passive index investing with low fees",
  },
  {
    value: "MOSTLY_ETFS",
    label: "Mostly ETFs",
    desc: "Primarily ETFs with some individual picks",
  },
  {
    value: "MIXED",
    label: "Mixed",
    desc: "Balanced approach with stocks and ETFs",
  },
  {
    value: "MOSTLY_STOCKS",
    label: "Mostly Stocks",
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
  "Real Estate",
  "Utilities",
  "Communication Services",
];

// ---------------------------------------------------------------------------
// Shared presentation helpers
// ---------------------------------------------------------------------------

/** Flat hairline panel wrapping one wizard step. */
function StepPanel({
  title,
  description,
  hint,
  children,
}: {
  title: string;
  description: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border bg-surface p-5">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-[60ch] text-[12.5px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] uppercase tracking-wide text-faint">
          {hint}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

const OPTION_BASE =
  "border bg-surface p-4 text-left transition-colors hover:bg-background";
const OPTION_SELECTED = "border-primary bg-primary-soft hover:bg-primary-soft";

/** Toggle chip used for sector and prompt selection. */
function Chip({
  children,
  selected,
  tone = "primary",
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  tone?: "primary" | "destructive";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "max-w-full rounded-md border px-2.5 py-1 text-left text-[12px] transition-colors",
        selected
          ? tone === "destructive"
            ? "border-destructive/40 bg-destructive-soft text-destructive"
            : "border-primary bg-primary-soft text-primary"
          : "bg-surface text-muted-foreground hover:bg-background",
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    riskTolerance: "",
    investmentHorizon: "",
    investmentGoal: "",
    assetPreference: "",
    preferredSectors: [],
    avoidedSectors: [],
    strategyMessage: "",
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS.length - 1;
  const canProceed = validateStep(currentStep, profileData);

  function validateStep(step: number, data: ProfileData): boolean {
    switch (step) {
      case 0: return !!data.riskTolerance;
      case 1: return !!data.investmentHorizon;
      case 2: return !!data.investmentGoal;
      case 3: return !!data.assetPreference;
      case 4: return true; // Sectors are optional
      case 5: return true; // Strategy message is optional
      case 6: return true; // Complete step
      default: return false;
    }
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const body = {
        riskTolerance: profileData.riskTolerance,
        investmentHorizon: profileData.investmentHorizon,
        investmentGoal: profileData.investmentGoal,
        assetPreference: profileData.assetPreference,
        preferredSectors: profileData.preferredSectors,
        avoidedSectors: profileData.avoidedSectors,
        preferredRegions: [],
        notes: null,
        strategyMessage: profileData.strategyMessage.trim() || null,
      };

      const res = await fetch("/api/investor-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      // Redirect to portfolio upload
      router.push("/portfolio/upload?onboarding=true");
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Progress Header */}
      <div className="border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] text-faint">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="font-mono text-[11px] text-faint">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="mt-2 h-[3px] rounded-none" />

        {/* Step Indicators */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-1.5 text-[11px]",
                  isActive && "text-primary",
                  isCompleted && "text-muted-foreground",
                  !isActive && !isCompleted && "text-faint",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 shrink-0 stroke-[1.6]" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5 shrink-0 stroke-[1.6]" />
                )}
                <span>{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <RiskStep
            value={profileData.riskTolerance}
            onChange={(v) => setProfileData({ ...profileData, riskTolerance: v })}
          />
        )}
        {currentStep === 1 && (
          <HorizonStep
            value={profileData.investmentHorizon}
            onChange={(v) => setProfileData({ ...profileData, investmentHorizon: v })}
          />
        )}
        {currentStep === 2 && (
          <GoalStep
            value={profileData.investmentGoal}
            onChange={(v) => setProfileData({ ...profileData, investmentGoal: v })}
          />
        )}
        {currentStep === 3 && (
          <AssetStep
            value={profileData.assetPreference}
            onChange={(v) => setProfileData({ ...profileData, assetPreference: v })}
          />
        )}
        {currentStep === 4 && (
          <SectorsStep
            preferred={profileData.preferredSectors}
            avoided={profileData.avoidedSectors}
            onChangePreferred={(v) => setProfileData({ ...profileData, preferredSectors: v })}
            onChangeAvoided={(v) => setProfileData({ ...profileData, avoidedSectors: v })}
          />
        )}
        {currentStep === 5 && (
          <StrategyMessageStep
            value={profileData.strategyMessage}
            onChange={(v) =>
              setProfileData({ ...profileData, strategyMessage: v })
            }
          />
        )}
        {currentStep === 6 && (
          <CompleteStep profileData={profileData} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.6]" />
          Back
        </Button>

        <div className="flex gap-2">
          {(currentStep === 4 || currentStep === 5) && (
            <Button variant="ghost" onClick={handleNext}>
              Skip
            </Button>
          )}

          {isLastStep ? (
            <Button onClick={handleComplete} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin stroke-[1.6]" />
              ) : (
                <Upload className="h-4 w-4 stroke-[1.6]" />
              )}
              Continue to portfolio upload
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed}>
              Continue
              <ArrowRight className="h-4 w-4 stroke-[1.6]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function RiskStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <StepPanel
      title="What is your risk tolerance?"
      description="Sets how much volatility the advisor assumes you can carry before it flags a position."
    >
      <div className="grid gap-2">
        {RISK_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                OPTION_BASE,
                "flex items-start gap-3",
                selected && OPTION_SELECTED,
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 stroke-[1.6]",
                  selected ? "text-primary" : "text-faint",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{opt.label}</div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {opt.desc}
                </div>
              </div>
              {selected ? (
                <Check className="h-4 w-4 shrink-0 stroke-[1.6] text-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </StepPanel>
  );
}

function HorizonStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <StepPanel
      title="What is your investment horizon?"
      description="How long the capital can stay invested before you need it back."
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {HORIZON_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(OPTION_BASE, selected && OPTION_SELECTED)}
            >
              <div
                className={cn(
                  "font-mono text-[20px] font-semibold leading-none",
                  selected ? "text-primary" : "text-foreground",
                )}
              >
                {opt.years}
              </div>
              <div className="mt-2 text-[13px] font-medium">{opt.label}</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>
    </StepPanel>
  );
}

function GoalStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <StepPanel
      title="What is your primary investment goal?"
      description="The outcome the advisor optimises for when it ranks ideas."
      hint="Select one"
    >
      <fieldset>
        <legend className="sr-only">Primary investment goal</legend>
        <div className="grid gap-2" role="radiogroup" aria-label="Primary investment goal">
          {GOAL_OPTIONS.map((opt, index) => {
            const letter = String.fromCharCode(65 + index);
            const selected = value === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  OPTION_BASE,
                  "flex cursor-pointer items-start gap-3",
                  "focus-within:border-primary",
                  selected && OPTION_SELECTED,
                )}
              >
                <input
                  type="radio"
                  name="onboarding-investment-goal"
                  value={opt.value}
                  checked={selected}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[11px] font-medium",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-faint",
                  )}
                  aria-hidden
                >
                  {letter}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {opt.desc}
                  </span>
                </span>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 stroke-[1.6] text-primary" aria-hidden />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
    </StepPanel>
  );
}

function AssetStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <StepPanel
      title="What is your asset preference?"
      description="Whether you want index exposure, single names, or a mix of both."
      hint="Select one"
    >
      <fieldset>
        <legend className="sr-only">Asset preference</legend>
        <div className="grid gap-2" role="radiogroup" aria-label="Asset preference">
          {ASSET_OPTIONS.map((opt, index) => {
            const letter = String.fromCharCode(65 + index);
            const selected = value === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  OPTION_BASE,
                  "flex cursor-pointer items-start gap-3",
                  "focus-within:border-primary",
                  selected && OPTION_SELECTED,
                )}
              >
                <input
                  type="radio"
                  name="onboarding-asset-preference"
                  value={opt.value}
                  checked={selected}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[11px] font-medium",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-faint",
                  )}
                  aria-hidden
                >
                  {letter}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {opt.desc}
                  </span>
                </span>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 stroke-[1.6] text-primary" aria-hidden />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
    </StepPanel>
  );
}

function SectorsStep({
  preferred,
  avoided,
  onChangePreferred,
  onChangeAvoided,
}: {
  preferred: string[];
  avoided: string[];
  onChangePreferred: (v: string[]) => void;
  onChangeAvoided: (v: string[]) => void;
}) {
  function toggleSector(sector: string, type: "preferred" | "avoided") {
    if (type === "preferred") {
      if (preferred.includes(sector)) {
        onChangePreferred(preferred.filter((s) => s !== sector));
      } else {
        // Remove from avoided if it was there
        onChangeAvoided(avoided.filter((s) => s !== sector));
        onChangePreferred([...preferred, sector]);
      }
    } else {
      if (avoided.includes(sector)) {
        onChangeAvoided(avoided.filter((s) => s !== sector));
      } else {
        // Remove from preferred if it was there
        onChangePreferred(preferred.filter((s) => s !== sector));
        onChangeAvoided([...avoided, sector]);
      }
    }
  }

  return (
    <StepPanel
      title="Any sector preferences?"
      description="Optional. Mark the sectors you want weighted up and the ones you want excluded."
    >
      <div className="space-y-5">
        <div>
          <Label className="text-[12.5px]">Preferred sectors</Label>
          <p className="mb-2.5 mt-1 text-[12px] text-muted-foreground">
            Sectors you want the advisor to lean into.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SECTORS.map((sector) => (
              <Chip
                key={sector}
                selected={preferred.includes(sector)}
                onClick={() => toggleSector(sector, "preferred")}
              >
                {sector}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-[12.5px]">Sectors to avoid</Label>
          <p className="mb-2.5 mt-1 text-[12px] text-muted-foreground">
            Sectors the advisor should never recommend.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SECTORS.map((sector) => (
              <Chip
                key={sector}
                selected={avoided.includes(sector)}
                tone="destructive"
                onClick={() => toggleSector(sector, "avoided")}
              >
                {sector}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </StepPanel>
  );
}

const STRATEGY_PROMPTS = [
  "I want to grow this account aggressively over 10+ years and I'm fine with drawdowns along the way.",
  "Let my winners run. Don't tell me to trim a position just because it got big.",
  "I like founder-led tech and energy names; never suggest tobacco or gambling.",
  "Show me where I can realistically add return, not only where to be safe.",
];

function StrategyMessageStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <StepPanel
      title="Describe your strategy in your own words"
      description="Optional, and the single most useful input you can give. The AI weights this above the selections you just made."
    >
      <div className="space-y-3">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          placeholder="e.g. I'm building long-term wealth and can stomach big swings. I want ideas that meaningfully beat the index, not just safe diversification. I follow AI infrastructure and energy closely, and I never want exposure to tobacco."
          className="min-h-[180px]"
        />
        <div className="flex items-center justify-between gap-3 text-[11px] text-faint">
          <span>
            Return expectations, risk appetite, themes you like or refuse.
          </span>
          <span className="font-mono">{value.length}/2000</span>
        </div>
        <div className="border bg-background p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-faint">
            Starting points
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STRATEGY_PROMPTS.map((prompt) => (
              <Chip
                key={prompt}
                onClick={() =>
                  onChange(value.trim() ? `${value.trim()} ${prompt}` : prompt)
                }
              >
                + {prompt}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </StepPanel>
  );
}

function CompleteStep({ profileData }: { profileData: ProfileData }) {
  return (
    <StepPanel
      title="Profile complete"
      description="Review the mandate below, then import your holdings so the advisor has something to analyse."
    >
      <div className="space-y-4">
        <div className="border bg-background p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryItem label="Risk tolerance" value={formatValue(profileData.riskTolerance)} />
            <SummaryItem label="Investment horizon" value={formatValue(profileData.investmentHorizon)} />
            <SummaryItem label="Investment goal" value={formatValue(profileData.investmentGoal)} />
            <SummaryItem label="Asset preference" value={formatValue(profileData.assetPreference)} />
          </div>

          {(profileData.preferredSectors.length > 0 || profileData.avoidedSectors.length > 0) && (
            <div className="mt-4 space-y-1 border-t pt-4">
              {profileData.preferredSectors.length > 0 && (
                <div className="text-[12.5px]">
                  <span className="font-medium">Preferred: </span>
                  <span className="text-muted-foreground">
                    {profileData.preferredSectors.join(", ")}
                  </span>
                </div>
              )}
              {profileData.avoidedSectors.length > 0 && (
                <div className="text-[12.5px]">
                  <span className="font-medium">Avoiding: </span>
                  <span className="text-muted-foreground">
                    {profileData.avoidedSectors.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {profileData.strategyMessage.trim().length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="text-[11px] uppercase tracking-wide text-faint">
                Your strategy
              </div>
              <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
                {profileData.strategyMessage.trim()}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 border bg-background p-4">
          <Upload className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.6] text-faint" />
          <div>
            <div className="text-[13px] font-medium">
              Next: import your portfolio
            </div>
            <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              Upload a CSV or a screenshot of your holdings and the analysis
              runs against this profile.
            </div>
          </div>
        </div>
      </div>
    </StepPanel>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-medium">{value}</div>
    </div>
  );
}

function formatValue(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
