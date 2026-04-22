import {
  BarChart3,
  Brain,
  Globe,
  LineChart,
  Network,
  Shield,
  Sparkles,
  SquareTerminal,
  Target,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { clientEnv } from "@/lib/env";
import { LandingChartShowcase } from "@/components/landing/landing-chart-showcase";
import { LandingHeroPreview } from "@/components/landing/landing-hero-preview";
import {
  LandingHeaderNav,
  LandingHeroCtas,
  LandingBottomCtas,
} from "@/components/landing/landing-nav-buttons";

const ANALYSIS_STEPS: { title: string; desc: string }[] = [
  {
    title: "We build your investor profile",
    desc: "Onboarding captures your risk tolerance, time horizon, goals, and sector preferences. Every later step is scoped to you, not a generic template.",
  },
  {
    title: "We quantify your portfolio with rigour",
    desc: "We normalise positions, enrich with market data, then compute weights, sector and asset mix, concentration, and performance-style metrics using consistent mathematical structure. You get numbers you can trace, not a black box.",
  },
  {
    title: "We add news and public context",
    desc: "For your holdings we pull in recent headlines and relevant company filings when your environment is configured for it, so the story next to your book matches what is moving in the market.",
  },
  {
    title: "We run a deep analysis on top",
    desc: "Our analysis layer combines your profile, the quantitative picture, and that news and filing context into a structured report. The same foundations power follow-up chat so you can stress-test ideas against the full stack.",
  },
];

const SERVICES: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    icon: Upload,
    title: "Bring your portfolio in",
    body: "CSV, screenshots, or manual input, rolled into one view of what you own so you can iterate from a real baseline.",
  },
  {
    icon: BarChart3,
    title: "Track what matters",
    body: "Values, P&L-style signals, and rank views so you see which lines actually move the needle when you want to improve.",
  },
  {
    icon: Network,
    title: "Balance risk and focus",
    body: "See concentration and sector drift early. Exposure, not just a flat list, so rebalancing is a choice, not a guess.",
  },
  {
    icon: Globe,
    title: "Market context in one place",
    body: "Quotes and context sit next to your book when your data path allows, so you reason with the market in view.",
  },
  {
    icon: Sparkles,
    title: "AI for your next move",
    body: "Talk through what-if and allocation changes in plain language, grounded in the portfolio you are building, not a generic script.",
  },
  {
    icon: Brain,
    title: "Clear, repeatable structure",
    body: "Analysis stays structured and comparable over time, so you can look back, adjust, and make calmer follow-on decisions.",
  },
];

const TRUST_PILLARS: { icon: React.ComponentType<{ className?: string }>; t: string }[] = [
  { icon: Target, t: "Built to help you plan improvements, not just read a single score" },
  { icon: Shield, t: "Sign-in and sessions handled like a product you can rely on" },
  { icon: LineChart, t: "Charts you can return to and compare as your portfolio changes" },
];

export default function LandingPage() {
  const name = clientEnv.NEXT_PUBLIC_APP_NAME;

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Soft ambient layers */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl landing-blob-pulse" />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl landing-blob-pulse"
        style={{ animationDelay: "2s" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b from-primary/12 via-primary/[0.04] to-transparent" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30">
            <SquareTerminal className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">{name}</span>
            <span className="text-[11px] font-medium text-muted-foreground">
              AI for building better portfolios
            </span>
          </div>
        </div>
        <LandingHeaderNav />
      </header>

      {/* Hero: copy + live-style preview */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-6 pt-2 md:pb-10 md:pt-4">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 lg:pt-2">
          <div className="text-center lg:text-left">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-gradient-to-r from-card/80 to-card/40 px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur lg:mx-0">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
              Build, refine, and decide with a clearer line of sight
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              An AI that helps you build, improve, and make better decisions about your portfolio.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground/95 md:text-lg lg:mx-0">
              {name} turns your actual holdings into structured views, context, and conversation so you
              can strengthen allocation, test ideas, and choose next steps with more confidence, not
              more noise. You stay in control; the AI does the heavy lifting to clarify trade-offs and
              highlight what might change the outcome.
            </p>
            <div className="mt-2 lg:text-left">
              <LandingHeroCtas />
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <LandingHeroPreview />
          </div>
        </div>
      </section>

      {/* Visual showcase */}
      <section className="relative z-10 border-y border-border/50 bg-gradient-to-b from-muted/20 via-card/15 to-background py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">At a glance</p>
            <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              See the moves that strengthen your book
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Sample visuals below, with calm colour and light motion. The same look and feel
              supports you after you sign in when you are ready to build and improve for real.
            </p>
          </div>
          <LandingChartShowcase />
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Analysis</p>
            <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              The process behind every report
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              We start by building your investor profile, then layer a deep analysis on your actual
              imports: mathematical treatment of weights, allocations, and performance-style
              metrics, plus recent news and filings for your tickers when those services are
              available. That full picture feeds a structured report and AI follow-up, so what you read
              always maps back to profile, math, and market context.
            </p>
          </div>
          <ol className="landing-stagger mt-12 grid gap-4 md:grid-cols-2">
            {ANALYSIS_STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full border-border/60 bg-gradient-to-br from-card/70 to-card/30 text-left shadow-sm backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-sm font-bold text-primary ring-1 ring-primary/20">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-medium">{step.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Services</p>
          <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
            One workspace to build, review, and improve
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, body }) => (
            <Card
              key={title}
              className="group border-border/70 bg-gradient-to-b from-card/60 to-card/25 text-left shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-primary/5"
            >
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-border/60 bg-gradient-to-b from-muted/20 to-background py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 rounded-2xl border border-border/50 bg-card/20 p-6 backdrop-blur-sm md:grid-cols-3 md:gap-6 md:p-8">
            {TRUST_PILLARS.map(({ icon: Icon, t }) => (
              <div
                key={t}
                className="flex items-start gap-3 md:flex-col md:items-center md:text-center"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm leading-snug text-muted-foreground md:pt-0">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
          Ready to build a sharper portfolio?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Create an account to save portfolios and sync your profile, or explore the demo dashboard
          first to see how {name} helps you think through your next move.
        </p>
        <LandingBottomCtas appName={name} />
      </section>

      <footer className="relative z-10 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {name}. AI that helps you build, improve, and choose with
          clarity.
        </p>
      </footer>
    </main>
  );
}
