"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileText,
  ImageIcon,
  Info,
} from "lucide-react";
import { parsedHoldingSchema, type ParseResult } from "@/lib/portfolio/parsed-holding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form schema
// Each holding row uses preprocess-coerced numbers (same as the server-side
// parsedHoldingSchema) so form inputs (which are always strings) are cast
// automatically before validation.
// ---------------------------------------------------------------------------

const reviewFormSchema = z.object({
  portfolioName: z
    .string()
    .trim()
    .min(1, "Portfolio name is required")
    .max(80, "Name is too long"),
  holdings: z
    .array(parsedHoldingSchema)
    .min(1, "At least one holding is required"),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

// ---------------------------------------------------------------------------
// Editable cell — tiny inline input with error display
// ---------------------------------------------------------------------------

function Cell({
  error,
  children,
  className,
}: {
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-2 py-1.5 align-top", className)}>
      {children}
      {error && (
        <p className="mt-0.5 text-[10px] font-medium text-destructive">
          {error}
        </p>
      )}
    </td>
  );
}

const numInputClass =
  "h-8 w-full min-w-[80px] rounded border-0 bg-transparent px-1.5 text-right text-sm tabular-nums ring-1 ring-transparent transition focus:ring-1 focus:ring-ring focus:bg-muted/60 hover:bg-muted/40";

const textInputClass =
  "h-8 w-full min-w-[72px] rounded border-0 bg-transparent px-1.5 text-sm ring-1 ring-transparent transition focus:ring-1 focus:ring-ring focus:bg-muted/60 hover:bg-muted/40";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ImportReview({
  result,
  onBack,
}: {
  result: ParseResult;
  onBack: () => void;
}) {
  const router = useRouter();

  // Derive a sensible default name from the filename
  const defaultName = result.filename
    .replace(/\.[^.]+$/, "")   // strip extension
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "My Portfolio";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      portfolioName: defaultName,
      holdings: result.holdings.map((h) => ({
        ticker: h.ticker ?? "",
        companyName: h.companyName ?? null,
        shares: h.shares ?? null,
        averageCost: h.averageCost ?? null,
        currentPrice: h.currentPrice ?? null,
        marketValue: h.marketValue ?? null,
        gainLoss: h.gainLoss ?? null,
        currency: h.currency ?? "USD",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "holdings",
  });

  async function onSubmit(values: ReviewFormValues) {
    const res = await fetch("/api/portfolio/confirm-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portfolioName: values.portfolioName,
        source: result.sourceType,
        baseCurrency: "USD",
        holdings: values.holdings,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      // Surface error without crashing — show it via an alert for now.
      // In a real app this would go into a toast or an error field.
      window.alert(json?.error?.message ?? "Failed to save portfolio. Please try again.");
      return;
    }

    router.push(`/portfolio/${json.data.portfolioId}`);
    router.refresh();
  }

  const hasWarnings = result.warnings.length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to upload
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Review holdings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Check the extracted data, edit any cells, then confirm to save.
          </p>
        </div>
      </div>

      {/* ── Source badge row ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          {result.sourceType === "CSV" ? (
            <FileText className="h-3 w-3" />
          ) : (
            <ImageIcon className="h-3 w-3" />
          )}
          {result.sourceType === "CSV" ? "CSV import" : "AI extraction"}
        </Badge>
        <Badge variant="outline">{fields.length} holdings</Badge>
        {result.filename && (
          <span className="text-xs text-muted-foreground">{result.filename}</span>
        )}
      </div>

      {/* ── Warnings ───────────────────────────────────────────────────── */}
      {hasWarnings && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            {result.warnings.length} warning
            {result.warnings.length === 1 ? "" : "s"} from extraction
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {result.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-warning">·</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Portfolio name ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-5">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 200 }}>
            <Label htmlFor="portfolioName">Portfolio name</Label>
            <Input
              id="portfolioName"
              {...register("portfolioName")}
              placeholder="My Portfolio"
            />
            {errors.portfolioName && (
              <p className="text-xs text-destructive">
                {errors.portfolioName.message}
              </p>
            )}
          </div>
          <p className="pb-1 text-xs text-muted-foreground">
            You can rename it later from the portfolio settings.
          </p>
        </CardContent>
      </Card>

      {/* ── Editable holdings table ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Holdings</CardTitle>
              <CardDescription>
                Click any cell to edit. All fields except ticker are optional.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                <Info className="mr-1 inline h-3.5 w-3.5" />
                Columns with{" "}
                <span className="text-muted-foreground/70">—</span> were not
                found in the source file.
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-4">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b">
                {[
                  { label: "Ticker", className: "pl-4 text-left w-[88px]" },
                  { label: "Company", className: "text-left min-w-[160px]" },
                  { label: "Shares", className: "text-right w-[90px]" },
                  { label: "Avg Cost", className: "text-right w-[90px]" },
                  { label: "Price", className: "text-right w-[90px]" },
                  { label: "Mkt Value", className: "text-right w-[100px]" },
                  { label: "Gain / Loss", className: "text-right w-[100px]" },
                  { label: "CCY", className: "text-center w-[64px]" },
                  { label: "", className: "w-[40px]" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={cn(
                      "h-9 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      col.className,
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => {
                const rowErr = errors.holdings?.[i];
                return (
                  <tr
                    key={field.id}
                    className="group border-b last:border-0 hover:bg-muted/20"
                  >
                    {/* Ticker */}
                    <Cell
                      error={rowErr?.ticker?.message}
                      className="pl-4"
                    >
                      <input
                        {...register(`holdings.${i}.ticker`)}
                        placeholder="AAPL"
                        className={cn(
                          textInputClass,
                          "font-medium uppercase",
                          rowErr?.ticker && "ring-destructive/60 bg-destructive/5",
                        )}
                      />
                    </Cell>

                    {/* Company Name */}
                    <Cell error={rowErr?.companyName?.message}>
                      <input
                        {...register(`holdings.${i}.companyName`)}
                        placeholder="—"
                        className={textInputClass}
                      />
                    </Cell>

                    {/* Shares */}
                    <Cell error={rowErr?.shares?.message}>
                      <input
                        {...register(`holdings.${i}.shares`)}
                        type="number"
                        step="any"
                        min={0}
                        placeholder="—"
                        className={numInputClass}
                      />
                    </Cell>

                    {/* Avg Cost */}
                    <Cell error={rowErr?.averageCost?.message}>
                      <input
                        {...register(`holdings.${i}.averageCost`)}
                        type="number"
                        step="any"
                        min={0}
                        placeholder="—"
                        className={numInputClass}
                      />
                    </Cell>

                    {/* Current Price */}
                    <Cell error={rowErr?.currentPrice?.message}>
                      <input
                        {...register(`holdings.${i}.currentPrice`)}
                        type="number"
                        step="any"
                        min={0}
                        placeholder="—"
                        className={numInputClass}
                      />
                    </Cell>

                    {/* Market Value */}
                    <Cell error={rowErr?.marketValue?.message}>
                      <input
                        {...register(`holdings.${i}.marketValue`)}
                        type="number"
                        step="any"
                        placeholder="—"
                        className={numInputClass}
                      />
                    </Cell>

                    {/* Gain / Loss */}
                    <Cell error={rowErr?.gainLoss?.message}>
                      <Controller
                        control={control}
                        name={`holdings.${i}.gainLoss`}
                        render={({ field: f }) => (
                          <input
                            type="number"
                            step="any"
                            placeholder="—"
                            value={f.value ?? ""}
                            onChange={(e) =>
                              f.onChange(
                                e.target.value === "" ? null : e.target.value,
                              )
                            }
                            className={cn(
                              numInputClass,
                              typeof f.value === "number" && f.value < 0
                                ? "text-destructive"
                                : typeof f.value === "number" && f.value > 0
                                  ? "text-success"
                                  : "",
                            )}
                          />
                        )}
                      />
                    </Cell>

                    {/* Currency */}
                    <Cell error={rowErr?.currency?.message}>
                      <input
                        {...register(`holdings.${i}.currency`)}
                        placeholder="USD"
                        maxLength={3}
                        className={cn(textInputClass, "text-center uppercase")}
                      />
                    </Cell>

                    {/* Delete row */}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="rounded p-1 text-muted-foreground/50 opacity-0 transition hover:bg-muted hover:text-destructive group-hover:opacity-100"
                        aria-label={`Remove row ${i + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {fields.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm">
                No holdings — add rows manually or go back and re-upload.
              </p>
            </div>
          )}

          {/* Add row */}
          <div className="mt-3 px-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  ticker: "",
                  companyName: null,
                  shares: null,
                  averageCost: null,
                  currentPrice: null,
                  marketValue: null,
                  gainLoss: null,
                  currency: "USD",
                })
              }
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add row
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Top-level holdings error ────────────────────────────────────── */}
      {errors.holdings?.root?.message && (
        <p className="text-sm text-destructive">{errors.holdings.root.message}</p>
      )}

      {/* ── AI disclaimer (image imports) ─────────────────────────────── */}
      {result.sourceType === "IMAGE" && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Holdings were extracted automatically. Please verify every value
            carefully — AI extraction is not perfect and does not replace your
            broker records.
          </p>
        </div>
      )}

      {/* ── Confirm / Cancel ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card/60 p-4 backdrop-blur">
        <div className="flex-1">
          <p className="text-sm font-medium">
            Ready to import {fields.length} holding
            {fields.length === 1 ? "" : "s"}?
          </p>
          <p className="text-xs text-muted-foreground">
            Holdings will be saved to a new portfolio. You can re-import at
            any time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || fields.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm import
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
