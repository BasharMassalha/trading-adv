"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionTitle } from "@/components/layout/page-header";

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
      <div className="border border-dashed bg-surface p-8 text-center">
        <p className="text-[13px] text-muted-foreground">
          News loads once your portfolio has enriched holdings.
        </p>
      </div>
    );
  }

  const hasArticles = bundle.items.length > 0;

  return (
    <div className="space-y-4">
      <SectionTitle
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-3.5 w-3.5 stroke-[1.6]" />
            Refresh
          </Button>
        }
      >
        Recent news for {portfolioName}
      </SectionTitle>

      <p className="-mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
        The same sources used when generating your analysis, with key holdings
        prioritised. Not financial advice.
      </p>

      {bundle.tickersQueried.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-faint">
          <span>Tickers scanned</span>
          {bundle.tickersQueried.map((t) => (
            <Badge key={t} variant="outline" className="font-mono">
              {t}
            </Badge>
          ))}
          <span className="ml-1 font-mono">
            {providerLabel(bundle.provider)} · {formatDate(bundle.retrievedAt)}
          </span>
        </div>
      )}

      {bundle.warnings.length > 0 && (
        <ul className="border bg-warning-soft px-3 py-2 text-[12px] leading-relaxed text-warning">
          {bundle.warnings.slice(0, 5).map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {!hasArticles ? (
        <div className="border border-dashed bg-surface p-8 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            No recent articles matched your key holdings. Refresh market data on
            the portfolio page, then refresh here or regenerate the analysis.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[min(520px,calc(100vh-22rem))] pr-3">
          <div className="border bg-surface">
            {bundle.items.map((article, idx) => (
              <article
                key={`${article.headline}-${idx}`}
                className="border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-background"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {article.ticker && (
                    <Badge variant="outline" className="font-mono font-semibold">
                      {article.ticker}
                    </Badge>
                  )}
                  {article.sentiment && (
                    <Badge
                      variant={
                        article.sentiment === "positive"
                          ? "success"
                          : article.sentiment === "negative"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {article.sentiment}
                    </Badge>
                  )}
                  <span className="text-[11px] text-faint">
                    {article.source ?? "Source unknown"}
                    {article.publishedAt
                      ? ` · ${formatDate(article.publishedAt)}`
                      : ""}
                  </span>
                </div>
                <h3 className="mt-2 text-[13.5px] font-semibold leading-snug">
                  {article.headline}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {article.summary}
                </p>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Read source
                    <ExternalLink className="h-3.5 w-3.5 stroke-[1.6]" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
