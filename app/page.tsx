import Link from "next/link";
import { ArrowRight, LineChart, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clientEnv } from "@/lib/env";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LineChart className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            {clientEnv.NEXT_PUBLIC_APP_NAME}
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-16 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered portfolio intelligence
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          Your personal AI stock portfolio advisor.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Upload a CSV or a screenshot of your broker account. We'll parse your
          holdings, analyse your exposure, and deliver clear, actionable advice.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Start free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard">View demo dashboard</Link>
          </Button>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          {
            icon: Upload,
            title: "Import anything",
            body: "CSV, screenshots, or manual entry. We normalise your holdings automatically.",
          },
          {
            icon: LineChart,
            title: "See the full picture",
            body: "Allocation, performance, and risk — visualised in a modern dashboard.",
          },
          {
            icon: Sparkles,
            title: "AI recommendations",
            body: "Chat with an advisor tuned to your portfolio, your goals, and your risk tolerance.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="bg-card/60 backdrop-blur">
            <CardContent className="p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
