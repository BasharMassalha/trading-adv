"use client";

import Link from "next/link";
import {
  Briefcase,
  Upload,
  TrendingUp,
  PieChart,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { clientEnv } from "@/lib/env";

export function EmptyDashboard() {
  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome to ${clientEnv.NEXT_PUBLIC_APP_NAME}`}
        description="Import your holdings to get valuation, allocation, risk scoring, and AI-powered analysis."
      />

      <div className="border border-dashed bg-surface p-8 text-center">
        <TrendingUp className="mx-auto h-5 w-5 text-faint" />
        <p className="mt-3 text-[13px] font-medium">No portfolio loaded yet</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
          Upload a broker CSV export or a screenshot of your holdings. Parsing
          takes a few seconds, and you review every row before anything is
          saved.
        </p>
        <Button asChild className="mt-4">
          <Link href="/portfolio/upload">
            <Upload className="h-3.5 w-3.5" />
            Upload your portfolio
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="hairline-grid grid md:grid-cols-2">
        <div className="p-5">
          <div className="flex items-center gap-2">
            <PieChart className="h-3.5 w-3.5 shrink-0 text-faint" />
            <h2 className="text-[13.5px] font-semibold tracking-tight">
              Portfolio analysis
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            See your holdings, sector allocation, and performance metrics
            against a benchmark.
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-faint" />
            <h2 className="text-[13.5px] font-semibold tracking-tight">
              AI insights
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            Get recommendations weighted to the goals and risk tolerance on your
            profile.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmptyPortfolioList() {
  return (
    <div className="border border-dashed bg-surface p-8 text-center">
      <Briefcase className="mx-auto h-5 w-5 text-faint" />
      <p className="mt-3 text-[13px] font-medium">No portfolios yet</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
        Import your first portfolio to start tracking your investments and get
        AI-powered analysis.
      </p>
      <Button asChild className="mt-4">
        <Link href="/portfolio/upload">
          <Upload className="h-3.5 w-3.5" />
          Import portfolio
        </Link>
      </Button>
    </div>
  );
}

export function EmptyPortfolioDetail() {
  return (
    <div className="mx-auto max-w-md border border-dashed bg-surface p-8 text-center">
      <Briefcase className="mx-auto h-5 w-5 text-faint" />
      <p className="mt-3 text-[13px] font-medium">Portfolio not found</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
        This portfolio doesn&rsquo;t exist, or you don&rsquo;t have access to
        it.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/portfolio">
            <ArrowRight className="h-3.5 w-3.5" />
            View your portfolios
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/portfolio/upload">
            <Upload className="h-3.5 w-3.5" />
            Import new portfolio
          </Link>
        </Button>
      </div>
    </div>
  );
}
