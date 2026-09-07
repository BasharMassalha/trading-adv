"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionTitle } from "@/components/layout/page-header";
import { TrialContentLock } from "@/components/auth/trial-content-lock";

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

function NewsArticleCard({ article }: { article: NewsArticleView }) {
  return (
    <article className="border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-background">
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
          {article.publishedAt ? ` · ${formatDate(article.publishedAt)}` : ""}
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
  );
}

export function PortfolioNewsSection({
  bundle,
  portfolioName,
  isGuest = false,
  maxItems,
  onRequireSignup,
}: {
  bundle: NewsBundleView | null;
  portfolioName: string;
  isGuest?: boolean;
  maxItems?: number;
  onRequireSignup?: () => void;
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
  const visible =
    maxItems != null ? bundle.items.slice(0, maxItems) : bundle.items;
  const lockedCount =
    maxItems != null ? Math.max(0, bundle.items.length - maxItems) : 0;

  return (
    <div className="space-y-4">
      <SectionTitle
        actions={
          !isGuest ? (
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
          ) : null
        }
      >
        Recent news for {portfolioName}
      </SectionTitle>

      <p className="-mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
        {isGuest
          ? "A sample of the headlines behind your analysis. Sign up for the full feed."
          : "The same sources used when generating your analysis, with key holdings prioritised. Not financial advice."}
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
        <div className="space-y-3">
          <ScrollArea className="h-[min(420px,calc(100vh-24rem))] pr-3">
            <div className="border bg-surface">
              {visible.map((article, idx) => (
                <NewsArticleCard
                  key={`${article.headline}-${idx}`}
                  article={article}
                />
              ))}
            </div>
          </ScrollArea>

          {lockedCount > 0 && onRequireSignup ? (
            <TrialContentLock
              title={`${lockedCount} more article${lockedCount === 1 ? "" : "s"}`}
              description="See the rest of the headlines behind this analysis."
              onSeeMore={onRequireSignup}
              blurredPreview={
                <div className="space-y-2">
                  {bundle.items.slice(maxItems, (maxItems ?? 0) + 2).map((a, i) => (
                    <div
                      key={i}
                      className="border bg-background p-2.5 text-[12px]"
                    >
                      <span className="font-mono font-semibold">
                        {a.ticker ?? "—"}
                      </span>{" "}
                      <span className="text-muted-foreground">{a.headline}</span>
                    </div>
                  ))}
                </div>
              }
            />
          ) : null}

          {isGuest && lockedCount === 0 && onRequireSignup ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onRequireSignup}
            >
              See more
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
