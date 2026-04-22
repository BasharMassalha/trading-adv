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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmptyDashboard() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <Card className="w-full max-w-lg border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Trading Advisor</CardTitle>
          <CardDescription className="text-base">
            Upload your portfolio to get personalized AI-powered insights,
            analysis, and recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <PieChart className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Portfolio Analysis</div>
                <div className="text-muted-foreground">
                  See your holdings, allocation, and performance metrics
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">AI Insights</div>
                <div className="text-muted-foreground">
                  Get personalized recommendations based on your goals
                </div>
              </div>
            </div>
          </div>

          <Button asChild className="w-full gap-2">
            <Link href="/portfolio/upload">
              <Upload className="h-4 w-4" />
              Upload Your Portfolio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function EmptyPortfolioList() {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Briefcase className="h-7 w-7 text-muted-foreground" />
        </div>
        <CardTitle>No portfolios yet</CardTitle>
        <CardDescription>
          Import your first portfolio to start tracking your investments and get
          AI-powered analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-6">
        <Button asChild className="gap-2">
          <Link href="/portfolio/upload">
            <Upload className="h-4 w-4" />
            Import Portfolio
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmptyPortfolioDetail() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle>Portfolio not found</CardTitle>
          <CardDescription>
            This portfolio doesn't exist or you don't have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pb-6">
          <Button asChild variant="default" className="gap-2">
            <Link href="/portfolio">
              <ArrowRight className="h-4 w-4" />
              View Your Portfolios
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/portfolio/upload">
              <Upload className="h-4 w-4" />
              Import New Portfolio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
