"use client";

import { useState, useRef } from "react";
import {
  FileText,
  ImageIcon,
  Upload,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ParseResult } from "@/lib/portfolio/parsed-holding";
import { ScreenshotGuide } from "@/components/portfolio/screenshot-guide";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UploadStatus = "idle" | "uploading" | "parsed" | "error";

/** Extended result with provider info for image uploads */
type ExtendedParseResult = ParseResult & {
  provider?: string;
  droppedRows?: number;
  errorCode?: string;
};

type UploadState = {
  status: UploadStatus;
  result: ExtendedParseResult | null;
  errorMessage: string | null;
};

// ---------------------------------------------------------------------------
// Drop-zone component
// ---------------------------------------------------------------------------

function DropZone({
  accept,
  hint,
  icon: Icon,
  onFile,
  status,
}: {
  accept: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  onFile: (f: File) => void;
  status: UploadStatus;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      disabled={status === "uploading"}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 border border-dashed bg-background p-8 text-center transition-colors",
        drag ? "border-primary bg-primary-soft" : "hover:border-border-strong",
        status === "parsed" && "border-success/30 bg-success-soft",
        status === "error" && "border-destructive/30 bg-destructive-soft",
        status === "uploading" && "cursor-wait opacity-70",
      )}
    >
      {status === "uploading" ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : status === "parsed" ? (
        <CheckCircle2 className="h-6 w-6 text-success" />
      ) : (
        <Icon className="h-6 w-6 text-faint" />
      )}
      <div>
        <p className="text-[13px] font-medium">
          {status === "uploading"
            ? "Parsing your file…"
            : status === "parsed"
              ? "File parsed successfully"
              : "Drop your file here or click to browse"}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Parse-result summary banner
// ---------------------------------------------------------------------------

function ParseSummary({
  result,
  onReview,
  onReset,
}: {
  result: ExtendedParseResult;
  onReview: () => void;
  onReset: () => void;
}) {
  const hasWarnings = result.warnings.length > 0;
  const providerLabel = formatProviderName(result.provider);
  const isRateLimited = result.errorCode === "RATE_LIMITED";
  const isServiceError =
    isRateLimited ||
    result.errorCode === "NETWORK_ERROR" ||
    result.errorCode === "INVALID_API_KEY";

  const headline =
    isRateLimited
      ? "Vision service is temporarily busy."
      : result.errorCode === "INVALID_API_KEY"
        ? "Vision service is not configured."
        : result.errorCode === "NETWORK_ERROR"
          ? "Could not reach the vision service."
          : result.status === "empty"
            ? "No holdings could be extracted from this file."
            : `Found ${result.holdings.length} holding${result.holdings.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-start gap-2.5 border px-3.5 py-3",
          result.status === "empty"
            ? "border-destructive/30 bg-destructive-soft"
            : hasWarnings
              ? "border-warning/30 bg-warning-soft"
              : "border-success/30 bg-success-soft",
        )}
      >
        {result.status === "empty" ? (
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" />
        ) : hasWarnings ? (
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warning" />
        ) : (
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-success" />
        )}
        <div className="min-w-0 flex-1 text-[12.5px]">
          <p className="font-medium">
            {headline}
            {result.status === "partial" && (
              <span className="ml-1 text-warning">(some rows skipped)</span>
            )}
          </p>
          {hasWarnings ? (
            <ul className="mt-1.5 space-y-0.5 text-[11.5px] text-muted-foreground">
              {result.warnings.slice(0, 4).map((w, i) => (
                <li key={i} className="truncate">
                  {w}
                </li>
              ))}
              {result.warnings.length > 4 && (
                <li>…and {result.warnings.length - 4} more warnings</li>
              )}
            </ul>
          ) : null}
        </div>
      </div>

      {result.status !== "empty" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {result.sourceType} · {result.filename}
          </Badge>
          <Badge variant="outline">
            <span className="font-mono">{result.holdings.length}</span> holdings
          </Badge>
          {providerLabel && <Badge variant="outline">via {providerLabel}</Badge>}
        </div>
      )}

      {result.status === "empty" && result.sourceType === "IMAGE" && !isServiceError && (
        <div className="border border-warning/30 bg-warning-soft p-3.5 text-[12px] text-muted-foreground">
          <p className="font-medium text-foreground">Tips for better extraction</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5">
            <li>Use a clear, high-resolution screenshot</li>
            <li>Ensure the holdings table is fully visible</li>
            <li>Avoid cropping important columns (ticker, shares, price)</li>
            <li>Try CSV export if screenshot extraction fails</li>
          </ul>
        </div>
      )}

      {isRateLimited && (
        <div className="border bg-background p-3.5 text-[12px] text-muted-foreground">
          The request was retried automatically. Wait a minute, then upload again.
          or use CSV export for an immediate import.
        </div>
      )}

      <div className="flex gap-2">
        {result.status !== "empty" && (
          <Button onClick={onReview} className="flex-1 sm:flex-none">
            Review &amp; confirm
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="outline" onClick={onReset}>
          <Upload className="h-3.5 w-3.5" />
          {isServiceError ? "Try again" : "Upload different file"}
        </Button>
      </div>
    </div>
  );
}

function formatProviderName(provider: string | undefined): string | null {
  if (!provider) return null;
  switch (provider) {
    case "openai-vision":
      return "OpenAI Vision";
    case "mock":
      return "mock data";
    default:
      return provider;
  }
}

// ---------------------------------------------------------------------------
// Custom hook: per-tab upload state
// ---------------------------------------------------------------------------

function useUpload(endpoint: string) {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    result: null,
    errorMessage: null,
  });

  async function upload(file: File) {
    setState({ status: "uploading", result: null, errorMessage: null });
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "Upload failed");
      }
      setState({
        status: "parsed",
        result: json.data as ExtendedParseResult,
        errorMessage: null,
      });
    } catch (err) {
      setState({
        status: "error",
        result: null,
        errorMessage: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  function reset() {
    setState({ status: "idle", result: null, errorMessage: null });
  }

  return { ...state, upload, reset };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function UploadTabs({
  onParsed,
}: {
  onParsed: (result: ParseResult) => void;
}) {
  const csv = useUpload("/api/portfolio/upload-csv");
  const img = useUpload("/api/portfolio/upload-image");
  const [tab, setTab] = useState("csv");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="csv">
          <FileText className="h-3.5 w-3.5" />
          CSV file
        </TabsTrigger>
        <TabsTrigger value="image">
          <ImageIcon className="h-3.5 w-3.5" />
          Screenshot
        </TabsTrigger>
      </TabsList>

      {/* ── CSV tab ─────────────────────────────────────────────────── */}
      <TabsContent value="csv">
        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Upload CSV</CardTitle>
            <CardDescription className="text-[12.5px]">
              Export your holdings from your broker and drop the file here. We
              auto-detect most column layouts (Schwab, Fidelity, IBKR, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {csv.status !== "parsed" ? (
              <>
                <DropZone
                  accept=".csv,.txt"
                  hint="CSV up to 8 MB; columns detected automatically"
                  icon={FileText}
                  onFile={csv.upload}
                  status={csv.status}
                />
                {csv.status === "error" && csv.errorMessage && (
                  <p className="flex items-center gap-2 border border-destructive/30 bg-destructive-soft px-3.5 py-2.5 text-[12.5px] text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {csv.errorMessage}
                  </p>
                )}
                <div className="border bg-background p-4">
                  <p className="text-[11px] uppercase tracking-wide text-faint">
                    Supported column names (sample)
                  </p>
                  <pre className="mt-2.5 overflow-x-auto font-mono text-[11.5px] text-muted-foreground">
                    {`Symbol,   Quantity,  AvgCost,  MarketValue,  Currency
Ticker,   Shares,    Avg Price, Mkt Value,   Curr
Stock,    Qty,       Cost Basis, Value,      USD`}
                  </pre>
                </div>
              </>
            ) : (
              <ParseSummary
                result={csv.result!}
                onReview={() => onParsed(csv.result!)}
                onReset={csv.reset}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Image tab ───────────────────────────────────────────────── */}
      <TabsContent value="image">
        <Card>
          <CardHeader>
            <CardTitle className="text-[14px]">Upload screenshot</CardTitle>
            <CardDescription className="text-[12.5px]">
              Screenshot your broker&rsquo;s holdings table — the guide below
              shows what to include. AI reads ticker, shares, and cost or value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {img.status !== "parsed" ? (
              <>
                <ScreenshotGuide active={tab === "image"} />
                <DropZone
                  accept="image/png,image/jpeg,image/webp"
                  hint="PNG, JPG or WebP up to 8 MB; higher resolution = better accuracy"
                  icon={ImageIcon}
                  onFile={img.upload}
                  status={img.status}
                />
                {img.status === "error" && img.errorMessage && (
                  <p className="flex items-center gap-2 border border-destructive/30 bg-destructive-soft px-3.5 py-2.5 text-[12.5px] text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {img.errorMessage}
                  </p>
                )}
                <p className="text-[11.5px] leading-relaxed text-faint">
                  Works with common layouts (Schwab, Fidelity, Robinhood, IBKR).
                  If extraction misses rows, try a tighter crop or CSV export.
                </p>
              </>
            ) : (
              <ParseSummary
                result={img.result!}
                onReview={() => onParsed(img.result!)}
                onReset={img.reset}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
