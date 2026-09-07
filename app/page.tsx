import Link from "next/link";
import {
  Activity,
  FileSearch,
  FileText,
  Gauge,
  MessageSquare,
  Users,
} from "lucide-react";
import { clientEnv } from "@/lib/env";
import { BrandLockup } from "@/components/brand";
import { LandingAnalysisFrame } from "@/components/landing/landing-analysis-frame";
import { LandingSampleReport } from "@/components/landing/landing-sample-report";
import {
  LandingHeaderNav,
  LandingHeroCtas,
  LandingBottomCtas,
} from "@/components/landing/landing-nav-buttons";

const SOURCES: { value: string; label: string }[] = [
  {
    value: "SEC EDGAR",
    label: "10-K, 10-Q and 8-K filings, read at the source",
  },
  {
    value: "13F",
    label: "Quarterly institutional positions and options disclosures",
  },
  {
    value: "Live pricing",
    label: "Quotes, 90-day history and sector classification",
  },
  {
    value: "Headline flow",
    label: "News scored and attached to the position it moves",
  },
];

const CAPABILITIES: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    icon: FileSearch,
    title: "A verdict for every position",
    body: "Each line in your book gets a written case: accumulate, hold, or recycle, with the filing, the consensus, or the price series that produced it.",
  },
  {
    icon: Users,
    title: "Institutional positioning",
    body: "See which tracked superinvestors hold what you hold, where consensus is thinning, and when a fund hedges rather than exits.",
  },
  {
    icon: FileText,
    title: "Read from the filing, not the headline",
    body: "Company language is pulled from EDGAR directly, so the argument in your report is the argument in the document.",
  },
  {
    icon: Gauge,
    title: "Risk against your mandate",
    body: "One score, measured against the comfort level you set during onboarding, not against a benchmark that has nothing to do with you.",
  },
  {
    icon: Activity,
    title: "Regime, not just your book",
    body: "Where the broad market sits on the risk curve today, which indicators are driving it, and the historical episode it most resembles.",
  },
  {
    icon: MessageSquare,
    title: "An advisor that shows its work",
    body: "Ask follow-ups in plain language and stress-test alternatives. Every answer traces back to something you can open and check.",
  },
];

const LAYERS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Your mandate",
    body: "Risk tolerance, time horizon, objective, and the sectors you will and will not hold. Everything downstream is scored against this, not against a generic profile.",
  },
  {
    n: "02",
    title: "The position math",
    body: "Positions normalised and enriched, then weights, sector and asset mix, concentration, and performance measured on a consistent basis you can trace.",
  },
  {
    n: "03",
    title: "The filing record",
    body: "Recent 10-K, 10-Q and 8-K disclosures for the tickers you actually hold, so the fundamental picture comes from the company, not from commentary.",
  },
  {
    n: "04",
    title: "Institutional positioning",
    body: "13F holdings across tracked superinvestors: who is accumulating, who has thinned out, and who is carrying disclosed protective positions.",
  },
  {
    n: "05",
    title: "Market context",
    body: "The current risk regime, the indicators moving it, and the headline flow attached to each holding, so a single-name call is made in context.",
  },
  {
    n: "06",
    title: "The written case",
    body: "All five layers resolved into a structured report and a conviction score per position, and the same foundation answers your follow-up questions.",
  },
];

const STEPS: { title: string; body: string }[] = [
  {
    title: "Set the mandate",
    body: "A short onboarding captures risk tolerance, horizon, objective, and sector preferences. Two minutes, once.",
  },
  {
    title: "Bring the book in",
    body: "Upload a brokerage export or a screenshot of your positions. They are read, normalised, and priced automatically.",
  },
  {
    title: "Read the case",
    body: "Structured analysis per position, cited to source. Every suggestion is a starting point; nothing executes without you.",
  },
];

export default function LandingPage() {
  const name = clientEnv.NEXT_PUBLIC_APP_NAME;

  return (
    <main className="min-h-screen bg-background">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-[1160px] items-center justify-between px-6 md:px-10">
          <BrandLockup size="md" />
          <nav className="hidden items-center gap-7 text-[13.5px] text-muted-foreground md:flex">
            <a href="#capabilities" className="hover:text-foreground">
              Product
            </a>
            <a href="#method" className="hover:text-foreground">
              Method
            </a>
            <a href="#report" className="hover:text-foreground">
              Sample report
            </a>
            <a href="#sources" className="hover:text-foreground">
              Data
            </a>
          </nav>
          <LandingHeaderNav />
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1160px] px-6 pb-16 pt-14 md:px-10 md:pb-16 md:pt-[76px]">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-[60px]">
          <div>
            <h1 className="max-w-[540px] text-[34px] font-semibold leading-[1.12] tracking-tight md:text-[42px]">
              Every holding, cross-examined against the record.
            </h1>
            <p className="mt-5 max-w-[470px] text-[16px] leading-relaxed text-muted-foreground">
              {name} builds a written case for each position you own: SEC
              filings, 13F institutional consensus, analyst dispersion, and live
              pricing, cross-referenced automatically and cited line by line.
              Not a balance you check. A case you can defend.
            </p>
            <div className="mt-8">
              <LandingHeroCtas />
            </div>
          </div>

          <LandingAnalysisFrame />
        </div>
      </section>

      {/* ── Source strip ────────────────────────────────────────────── */}
      <section id="sources" className="border-y bg-surface py-7">
        <div className="mx-auto grid max-w-[1160px] gap-6 px-6 md:px-10 lg:grid-cols-4">
          {SOURCES.map((s, i) => (
            <div
              key={s.value}
              className={
                i === 0 ? "" : "lg:border-l lg:border-border lg:pl-5"
              }
            >
              <div className="font-mono text-[19px] font-semibold tracking-tight">
                {s.value}
              </div>
              <div className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────────────── */}
      <section id="capabilities" className="py-16 md:py-[70px]">
        <div className="mx-auto max-w-[1160px] px-6 md:px-10">
          <div className="max-w-[600px]">
            <h2 className="text-[27px] font-semibold leading-tight tracking-tight">
              A tracker tells you what you own. This tells you whether you
              should hold it.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
              Every number on the screen traces back to a document you can open:
              a 10-K, a 13F, a price series. Nothing is asserted without a
              source, and nothing is hidden behind a score.
            </p>
          </div>

          <div className="hairline-grid mt-10 grid md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-6">
                <Icon className="h-5 w-5 stroke-[1.6] text-primary" />
                <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Method / evidence stack ─────────────────────────────────── */}
      <section id="method" className="border-y bg-surface py-16 md:py-[70px]">
        <div className="mx-auto max-w-[1160px] px-6 md:px-10">
          <div className="grid gap-12 lg:grid-cols-[340px_1fr] lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
                Method
              </div>
              <h2 className="mt-3 text-[27px] font-semibold leading-tight tracking-tight">
                Six layers behind a single verdict.
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                A one-line recommendation is easy to produce and impossible to
                trust. Each report is assembled in order, and every layer is
                visible in the output.
              </p>
            </div>

            <ol className="border-t">
              {LAYERS.map((l) => (
                <li
                  key={l.n}
                  className="grid gap-4 border-b py-6 sm:grid-cols-[56px_1fr]"
                >
                  <div className="font-mono text-[13px] text-faint">{l.n}</div>
                  <div>
                    <h3 className="text-[15px] font-semibold">{l.title}</h3>
                    <p className="mt-2 max-w-[620px] text-[13.5px] leading-relaxed text-muted-foreground">
                      {l.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Sample report ───────────────────────────────────────────── */}
      <div id="report">
        <LandingSampleReport />
      </div>

      {/* ── Steps ───────────────────────────────────────────────────── */}
      <section className="py-16 md:py-[70px]">
        <div className="mx-auto max-w-[1160px] px-6 md:px-10">
          <div className="max-w-[560px]">
            <h2 className="text-[27px] font-semibold leading-tight tracking-tight">
              Three steps to a real analysis.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
              No manual data entry, and no waiting on someone else&rsquo;s
              quarterly note.
            </p>
          </div>

          <div className="landing-stagger mt-10 grid gap-7 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative pl-11">
                <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-border-strong font-mono text-[12px] text-muted-foreground">
                  {i + 1}
                </span>
                <h3 className="text-[14.5px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1160px] px-6 pb-4 md:px-10">
        <div className="flex flex-col gap-8 rounded-[14px] bg-foreground px-8 py-11 sm:flex-row sm:items-center sm:justify-between md:px-14">
          <div>
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-background">
              Run a free analysis on your own book.
            </h2>
            <p className="mt-2 text-[13.5px] text-background/55">
              No account needed. Upload one brokerage export and see the case
              for your positions in a few minutes.
            </p>
          </div>
          <LandingBottomCtas appName={name} />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="mt-14 border-t py-8">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-5 px-6 md:flex-row md:items-center md:justify-between md:px-10">
          <BrandLockup size="sm" />
          <nav className="flex flex-wrap gap-6 text-[12.5px] text-muted-foreground">
            <a href="#capabilities" className="hover:text-foreground">
              Product
            </a>
            <a href="#method" className="hover:text-foreground">
              Method
            </a>
            <a href="#sources" className="hover:text-foreground">
              Data
            </a>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <p className="text-[11.5px] text-faint">
            © {new Date().getFullYear()} {name}. Not financial advice.
          </p>
        </div>
      </footer>
    </main>
  );
}
