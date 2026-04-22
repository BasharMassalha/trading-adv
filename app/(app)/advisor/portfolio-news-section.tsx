"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type NewsArticleView = {
  ticker?: string;
  headline: string;
  summary: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  sentiment?: string;
};

export type NewsBundleView = {
  items: NewsArticleView[];
  tickersQueried: string[];
  warnings: string[];
  provider: string;
  retrievedAt: string;
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function providerLabel(name: string): string {
  if (name.includes("finnhub")) return "Finnhub";
  if (name.includes("mock")) return "Demo data";
  return name;
}

export function PortfolioNewsSection({
  bundle,
  portfolioName,
}: {
  bundle: NewsBundleView | null;
  portfolioName: string;
}) {
  const router = useRouter();

  if (!bundle) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-5 w-5" />
            Portfolio news
          </CardTitle>
          <CardDescription>
            News will load once your portfolio has enriched holdings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasArticles = bundle.items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Recent news for {portfolioName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Same sources used when generating your analysis — key holdings are
            prioritized. Not financial advice.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => router.refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {bundle.tickersQueried.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Tickers scanned:</span>
          {bundle.tickersQueried.map((t) => (
            <Badge key={t} variant="secondary" className="font-mono text-[10px]">
              {t}
            </Badge>
          ))}
          <span className="ml-2">
            via {providerLabel(bundle.provider)} ·{" "}
            {formatDate(bundle.retrievedAt)}
          </span>
        </div>
      )}

      {bundle.warnings.length > 0 && (
        <ul className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {bundle.warnings.slice(0, 5).map((w, i) => (
            <li key={i}>• {w}</li>
          ))}
        </ul>
      )}

      {!hasArticles ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No recent articles matched your key holdings. Try refreshing market
            data on the portfolio page, then refresh here or regenerate
            analysis.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[min(520px,calc(100vh-22rem))] pr-3">
          <div className="space-y-3 pb-2">
            {bundle.items.map((article, idx) => (
              <Card
                key={`${article.headline}-${idx}`}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {article.ticker && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {article.ticker}
                      </Badge>
                    )}
                    {article.sentiment && (
                      <Badge
                        variant={
                          article.sentiment === "positive"
                            ? "default"
                            : article.sentiment === "negative"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] capitalize"
                      >
                        {article.sentiment}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {article.source ?? "Source unknown"}{" "}
                      {article.publishedAt
                        ? `· ${formatDate(article.publishedAt)}`
                        : ""}
                    </span>
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug">
                    {article.headline}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-4 text-sm text-muted-foreground">
                  <p className="leading-relaxed">{article.summary}</p>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Read source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
