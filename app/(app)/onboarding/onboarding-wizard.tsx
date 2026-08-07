"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Shield,
  Clock,
  Target,
  BarChart3,
  Briefcase,
  Upload,
  Sparkles,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  { id: "risk", title: "Risk Tolerance", icon: Shield },
  { id: "horizon", title: "Investment Horizon", icon: Clock },
  { id: "goal", title: "Investment Goal", icon: Target },
  { id: "asset", title: "Asset Preference", icon: BarChart3 },
  { id: "sectors", title: "Sectors", icon: Briefcase },
  { id: "message", title: "Your Strategy", icon: MessageSquare },
  { id: "complete", title: "Complete", icon: Upload },
] as const;

const RISK_OPTIONS = [
  {
    value: "CONSERVATIVE",
    label: "Conservative",
    desc: "Prefer stability over growth; willing to accept lower returns for less volatility",
    icon: Shield,
    color: "text-blue-500",
  },
  {
    value: "MODERATE",
    label: "Moderate",
    desc: "Balanced approach; comfortable with some fluctuations for better returns",
    icon: BarChart3,
    color: "text-yellow-500",
  },
  {
    value: "AGGRESSIVE",
    label: "Aggressive",
    desc: "Maximize growth; willing to accept significant volatility",
    icon: TrendingUp,
    color: "text-red-500",
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
    emoji: "📈",
  },
  {
    value: "INCOME",
    label: "Income",
    desc: "Generate regular income (dividends/interest)",
    emoji: "💰",
  },
  {
    value: "BALANCED",
    label: "Balanced",
    desc: "Mix of growth and income",
    emoji: "⚖️",
  },
  {
    value: "CAPITAL_PRESERVATION",
    label: "Capital Preservation",
    desc: "Protect principal, beat inflation",
    emoji: "🛡️",
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

  function handleSkipToUpload() {
    router.push("/portfolio/upload?onboarding=true");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Indicators */}
        <div className="flex justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1",
                  isActive && "text-primary",
                  isCompleted && "text-primary",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "border-muted-foreground/30"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden text-xs sm:block">{step.title}</span>
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
      <div className="flex items-center justify-between border-t pt-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {(currentStep === 4 || currentStep === 5) && (
            <Button variant="ghost" onClick={handleNext}>
              Skip
            </Button>
          )}
          
          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Continue to Portfolio Upload
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
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
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">What's your risk tolerance?</CardTitle>
        <CardDescription className="text-base">
          This helps us understand how much volatility you're comfortable with in your portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {RISK_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  "flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all hover:bg-muted/50",
                  value === opt.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border"
                )}
              >
                <div className={cn("rounded-lg bg-muted p-2", opt.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{opt.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{opt.desc}</div>
                </div>
                {value === opt.value && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
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
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">What's your investment horizon?</CardTitle>
        <CardDescription className="text-base">
          How long do you plan to keep your money invested before you need it?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {HORIZON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-center transition-all hover:bg-muted/50",
                value === opt.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border"
              )}
            >
              <div className="text-3xl font-bold text-primary">{opt.years}</div>
              <div className="font-semibold">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.desc}</div>
              {value === opt.value && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
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
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">What&apos;s your primary investment goal?</CardTitle>
        <CardDescription className="text-base">
          What are you hoping to achieve with your investments?
        </CardDescription>
        <p className="mt-3 text-sm font-medium text-foreground">
          Multiple choice — select{" "}
          <span className="text-primary">one</span> answer
        </p>
      </CardHeader>
      <CardContent>
        <fieldset>
          <legend className="sr-only">Primary investment goal</legend>
          <div className="space-y-3" role="radiogroup" aria-label="Primary investment goal">
            {GOAL_OPTIONS.map((opt, index) => {
              const letter = String.fromCharCode(65 + index);
              const selected = value === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-stretch gap-3 rounded-xl border-2 p-4 text-left transition-all hover:bg-muted/40",
                    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border",
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
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {letter}
                  </span>
                  <span className="text-2xl leading-none" aria-hidden>
                    {opt.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {opt.desc}
                    </span>
                  </span>
                  {selected && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
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
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">What&apos;s your asset preference?</CardTitle>
        <CardDescription className="text-base">
          Do you prefer index funds/ETFs or individual stocks?
        </CardDescription>
        <p className="mt-3 text-sm font-medium text-foreground">
          Multiple choice — select{" "}
          <span className="text-primary">one</span> answer
        </p>
      </CardHeader>
      <CardContent>
        <fieldset>
          <legend className="sr-only">Asset preference</legend>
          <div className="space-y-3" role="radiogroup" aria-label="Asset preference">
            {ASSET_OPTIONS.map((opt, index) => {
              const letter = String.fromCharCode(65 + index);
              const selected = value === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-stretch gap-3 rounded-xl border-2 p-4 text-left transition-all hover:bg-muted/40",
                    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border",
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
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {opt.desc}
                    </span>
                  </span>
                  {selected && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
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
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Any sector preferences?</CardTitle>
        <CardDescription className="text-base">
          Optional: Select sectors you prefer or want to avoid. You can skip this step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium">Preferred Sectors</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Click to add sectors you're interested in
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_SECTORS.map((sector) => {
              const isSelected = preferred.includes(sector);
              return (
                <Badge
                  key={sector}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-primary/80"
                  onClick={() => toggleSector(sector, "preferred")}
                >
                  {isSelected && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {sector}
                </Badge>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">Sectors to Avoid</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Click to mark sectors you prefer not to invest in
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_SECTORS.map((sector) => {
              const isSelected = avoided.includes(sector);
              return (
                <Badge
                  key={sector}
                  variant={isSelected ? "destructive" : "outline"}
                  className="cursor-pointer px-3 py-1.5 text-sm transition-colors"
                  onClick={() => toggleSector(sector, "avoided")}
                >
                  {isSelected && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {sector}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STRATEGY_PROMPTS = [
  "I want to grow this account aggressively over 10+ years and I'm fine with drawdowns along the way.",
  "Let my winners run — don't tell me to trim a position just because it got big.",
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
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          Tell us your goals and strategy
        </CardTitle>
        <CardDescription className="text-base">
          Optional, but this is the single most useful thing you can give the
          AI. It weights your own words above the choices you just made.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          placeholder="e.g. I'm building long-term wealth and can stomach big swings. I want ideas that meaningfully beat the index, not just safe diversification. I follow AI infrastructure and energy closely, and I never want exposure to tobacco."
          className="min-h-[180px] text-base"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Return expectations, risk appetite, themes you like or refuse.</span>
          <span>{value.length}/2000</span>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">Need a starting point?</p>
          <div className="flex flex-wrap gap-2">
            {STRATEGY_PROMPTS.map((prompt) => (
              <Badge
                key={prompt}
                variant="outline"
                className="cursor-pointer px-3 py-1.5 text-left text-xs font-normal transition-colors hover:bg-primary/10"
                onClick={() =>
                  onChange(value.trim() ? `${value.trim()} ${prompt}` : prompt)
                }
              >
                + {prompt}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompleteStep({ profileData }: { profileData: ProfileData }) {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl">Your profile is ready!</CardTitle>
        <CardDescription className="text-base">
          Here's a summary of your investment preferences. Now let's import your portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-muted/30 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryItem label="Risk Tolerance" value={formatValue(profileData.riskTolerance)} />
            <SummaryItem label="Investment Horizon" value={formatValue(profileData.investmentHorizon)} />
            <SummaryItem label="Investment Goal" value={formatValue(profileData.investmentGoal)} />
            <SummaryItem label="Asset Preference" value={formatValue(profileData.assetPreference)} />
          </div>
          
          {(profileData.preferredSectors.length > 0 || profileData.avoidedSectors.length > 0) && (
            <div className="mt-4 border-t pt-4">
              {profileData.preferredSectors.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium">Preferred: </span>
                  <span className="text-sm text-muted-foreground">
                    {profileData.preferredSectors.join(", ")}
                  </span>
                </div>
              )}
              {profileData.avoidedSectors.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Avoiding: </span>
                  <span className="text-sm text-muted-foreground">
                    {profileData.avoidedSectors.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {profileData.strategyMessage.trim().length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="text-sm font-medium">Your strategy</div>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {profileData.strategyMessage.trim()}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Upload className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Next: Import your portfolio</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Upload a CSV or screenshot of your holdings so we can analyze your investments.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function formatValue(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
