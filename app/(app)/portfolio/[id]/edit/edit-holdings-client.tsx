"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import {
  applyLotTransaction,
  CostBasisError,
  unrealizedGainLoss,
} from "@/lib/portfolio/cost-basis";

export type EditableHolding = {
  symbol: string;
  name: string | null;
  quantity: number;
  averageCost: number | null;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedGainLoss: number | null;
  unrealizedGainLossPct: number | null;
};

type DraftTx = {
  id: string;
  ticker: string;
  side: "BUY" | "SELL";
  shares: string;
  price: string;
};

type Props = {
  portfolioId: string;
  portfolioName: string;
  holdings: EditableHolding[];
};

function previewLots(
  holdings: EditableHolding[],
  drafts: DraftTx[],
): Map<string, { quantity: number; averageCost: number | null; error?: string }> {
  const lots = new Map<
    string,
    { quantity: number; averageCost: number | null; error?: string }
  >();

  for (const h of holdings) {
    lots.set(h.symbol.toUpperCase(), {
      quantity: h.quantity,
      averageCost: h.averageCost,
    });
  }

  for (const d of drafts) {
    const ticker = d.ticker.trim().toUpperCase();
    if (!ticker) continue;
    const shares = Number(d.shares);
    const price = Number(d.price);
    if (
      !(shares > 0) ||
      !(price >= 0) ||
      !Number.isFinite(shares) ||
      !Number.isFinite(price)
    ) {
      continue;
    }
    const current = lots.get(ticker) ?? { quantity: 0, averageCost: null };
    try {
      const next = applyLotTransaction(current, {
        side: d.side,
        shares,
        price,
      });
      if (next.quantity <= 0) {
        lots.delete(ticker);
      } else {
        lots.set(ticker, next);
      }
    } catch (err) {
      lots.set(ticker, {
        ...current,
        error: err instanceof CostBasisError ? err.message : "Invalid trade",
      });
    }
  }

  return lots;
}

function emptyTrade(ticker: string, price: number | null): DraftTx {
  return {
    id: crypto.randomUUID(),
    ticker,
    side: "BUY",
    shares: "",
    price: price != null ? String(price) : "",
  };
}

function TradeFields({
  draft,
  onChange,
  onRemove,
  canRemove,
}: {
  draft: DraftTx;
  onChange: (patch: Partial<DraftTx>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Side</Label>
        <div className="flex h-9 overflow-hidden rounded-md border">
          <button
            type="button"
            className={cn(
              "px-3 text-[12.5px] font-medium",
              draft.side === "BUY"
                ? "bg-success-soft text-success"
                : "bg-surface text-muted-foreground",
            )}
            onClick={() => onChange({ side: "BUY" })}
          >
            Buy
          </button>
          <button
            type="button"
            className={cn(
              "border-l px-3 text-[12.5px] font-medium",
              draft.side === "SELL"
                ? "bg-destructive-soft text-destructive"
                : "bg-surface text-muted-foreground",
            )}
            onClick={() => onChange({ side: "SELL" })}
          >
            Sell
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`shares-${draft.id}`} className="text-[11px]">
          Shares
        </Label>
        <Input
          id={`shares-${draft.id}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={draft.shares}
          onChange={(e) => onChange({ shares: e.target.value })}
          placeholder="10"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`price-${draft.id}`} className="text-[11px]">
          Price
        </Label>
        <Input
          id={`price-${draft.id}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={draft.price}
          onChange={(e) => onChange({ price: e.target.value })}
          placeholder="150.00"
        />
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Remove trade"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function EditHoldingsClient({
  portfolioId,
  portfolioName,
  holdings,
}: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftTx[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNewTicker, setShowNewTicker] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => previewLots(holdings, drafts),
    [holdings, drafts],
  );

  const heldSymbols = useMemo(
    () => new Set(holdings.map((h) => h.symbol.toUpperCase())),
    [holdings],
  );

  const newTickerDrafts = drafts.filter(
    (d) => d.ticker && !heldSymbols.has(d.ticker.toUpperCase()),
  );

  function draftsFor(symbol: string) {
    return drafts.filter((d) => d.ticker.toUpperCase() === symbol.toUpperCase());
  }

  function updateDraft(id: string, patch: Partial<DraftTx>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function openTrade(symbol: string, price: number | null) {
    const key = symbol.toUpperCase();
    setExpanded((prev) => new Set(prev).add(key));
    setDrafts((prev) => {
      if (prev.some((d) => d.ticker.toUpperCase() === key)) return prev;
      return [...prev, emptyTrade(key, price)];
    });
  }

  function closeTrade(symbol: string) {
    const key = symbol.toUpperCase();
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setDrafts((prev) => prev.filter((d) => d.ticker.toUpperCase() !== key));
  }

  function addTradeTo(symbol: string, price: number | null) {
    setDrafts((prev) => [...prev, emptyTrade(symbol.toUpperCase(), price)]);
  }

  function startNewTicker() {
    setShowNewTicker(true);
    setNewTicker("");
  }

  function confirmNewTicker() {
    const symbol = newTicker.trim().toUpperCase();
    if (!symbol) return;
    if (heldSymbols.has(symbol)) {
      openTrade(
        symbol,
        holdings.find((h) => h.symbol.toUpperCase() === symbol)?.currentPrice ??
          null,
      );
      setShowNewTicker(false);
      setNewTicker("");
      return;
    }
    setExpanded((prev) => new Set(prev).add(symbol));
    setDrafts((prev) => {
      if (prev.some((d) => d.ticker.toUpperCase() === symbol)) return prev;
      return [...prev, emptyTrade(symbol, null)];
    });
    setShowNewTicker(false);
    setNewTicker("");
  }

  async function onSave() {
    setError(null);
    if (drafts.length === 0) {
      setError("Add at least one buy or sell before saving.");
      return;
    }

    const transactions = [];
    for (const d of drafts) {
      const ticker = d.ticker.trim().toUpperCase();
      const shares = Number(d.shares);
      const price = Number(d.price);
      if (!ticker) {
        setError("Each trade needs a ticker.");
        return;
      }
      if (!(shares > 0) || !Number.isFinite(shares)) {
        setError(`Enter a valid share quantity for ${ticker}.`);
        return;
      }
      if (!(price >= 0) || !Number.isFinite(price)) {
        setError(`Enter a valid price for ${ticker}.`);
        return;
      }
      transactions.push({ ticker, side: d.side, shares, price });
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/portfolio/${portfolioId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "Failed to save trades.");
      }
      router.push(`/portfolio/${portfolioId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save trades.");
      setSaving(false);
    }
  }

  const orphanSymbols = [
    ...new Set(
      newTickerDrafts.map((d) => d.ticker.toUpperCase()).filter(Boolean),
    ),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow={
          <Link
            href={`/portfolio/${portfolioId}`}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to portfolio
          </Link>
        }
        title="Record trades"
        description={`Buy or sell shares in ${portfolioName}. Open a ticker to enter the trade — average cost and gain/loss update in place.`}
      />

      <div className="border bg-surface">
        <div className="border-b px-4 py-3">
          <h2 className="text-[13.5px] font-semibold">Positions</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Click Trade on a row to buy or sell that ticker right here.
          </p>
        </div>

        <div className="divide-y">
          {holdings.length === 0 && orphanSymbols.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-muted-foreground">
              No holdings yet. Add a new ticker to open a position.
            </p>
          ) : null}

          {holdings.map((h) => {
            const symbol = h.symbol.toUpperCase();
            const isOpen = expanded.has(symbol);
            const tickerDrafts = draftsFor(symbol);
            const next = preview.get(symbol);
            const removed = isOpen && tickerDrafts.length > 0 && !next;
            const qty = removed ? 0 : (next?.quantity ?? h.quantity);
            const avg = removed ? null : (next?.averageCost ?? h.averageCost);
            const { marketValue, unrealized } = unrealizedGainLoss(
              qty,
              avg,
              h.currentPrice,
            );
            const unrealizedPct =
              unrealized != null && avg != null && qty > 0 && avg * qty !== 0
                ? (unrealized / (avg * qty)) * 100
                : null;
            const changed = qty !== h.quantity || avg !== h.averageCost;

            return (
              <div key={h.symbol} className="px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold">
                        {h.symbol}
                      </span>
                      {h.name ? (
                        <span className="truncate text-[12px] text-muted-foreground">
                          {h.name}
                        </span>
                      ) : null}
                      {removed ? (
                        <Badge variant="destructive">Will close</Badge>
                      ) : changed && isOpen ? (
                        <Badge variant="info">Updated</Badge>
                      ) : null}
                    </div>
                    {next?.error ? (
                      <p className="mt-1 text-[12px] text-destructive">
                        {next.error}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right font-mono text-[12px] sm:grid-cols-4">
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wide text-faint">
                        Shares
                      </div>
                      <div>
                        {h.quantity}
                        {qty !== h.quantity ? (
                          <span className="text-primary"> → {qty}</span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wide text-faint">
                        Avg cost
                      </div>
                      <div>
                        {h.averageCost != null
                          ? formatCurrency(h.averageCost)
                          : "—"}
                        {avg != null && avg !== h.averageCost ? (
                          <span className="text-primary">
                            {" "}
                            → {formatCurrency(avg)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wide text-faint">
                        Mkt value
                      </div>
                      <div>
                        {marketValue != null
                          ? formatCurrency(marketValue)
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10.5px] uppercase tracking-wide text-faint">
                        Gain / loss
                      </div>
                      <div
                        className={cn(
                          unrealized != null && unrealized >= 0
                            ? "text-success"
                            : unrealized != null
                              ? "text-destructive"
                              : "",
                        )}
                      >
                        {unrealized != null ? formatCurrency(unrealized) : "—"}
                        {unrealizedPct != null
                          ? ` (${formatPercent(unrealizedPct)})`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {isOpen ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => closeTrade(symbol)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openTrade(symbol, h.currentPrice)}
                      >
                        Trade
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-3 space-y-3 border border-border-strong bg-background p-3.5">
                    <p className="text-[12px] text-muted-foreground">
                      Enter buy or sell for <span className="font-mono font-semibold text-foreground">{symbol}</span>
                      , shares, and fill price. Preview updates above.
                    </p>
                    {tickerDrafts.map((d) => (
                      <TradeFields
                        key={d.id}
                        draft={d}
                        onChange={(patch) => updateDraft(d.id, patch)}
                        onRemove={() => {
                          removeDraft(d.id);
                          if (tickerDrafts.length <= 1) closeTrade(symbol);
                        }}
                        canRemove
                      />
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addTradeTo(symbol, h.currentPrice)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Another trade for {symbol}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* New tickers opened via Add ticker */}
          {orphanSymbols.map((symbol) => {
            const tickerDrafts = draftsFor(symbol);
            const next = preview.get(symbol);
            const isOpen = expanded.has(symbol) || tickerDrafts.length > 0;

            return (
              <div key={symbol} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold">
                      {symbol}
                    </span>
                    <Badge variant="secondary">New position</Badge>
                    {next ? (
                      <span className="font-mono text-[12px] text-muted-foreground">
                        → {next.quantity} sh @{" "}
                        {next.averageCost != null
                          ? formatCurrency(next.averageCost)
                          : "—"}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => closeTrade(symbol)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
                {isOpen ? (
                  <div className="mt-3 space-y-3 border border-border-strong bg-background p-3.5">
                    {tickerDrafts.map((d) => (
                      <TradeFields
                        key={d.id}
                        draft={d}
                        onChange={(patch) => updateDraft(d.id, patch)}
                        onRemove={() => {
                          removeDraft(d.id);
                          if (tickerDrafts.length <= 1) closeTrade(symbol);
                        }}
                        canRemove
                      />
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addTradeTo(symbol, null)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Another trade for {symbol}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="border-t px-4 py-3">
          {showNewTicker ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-ticker" className="text-[11px]">
                  New ticker
                </Label>
                <Input
                  id="new-ticker"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="w-32 font-mono uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmNewTicker();
                    }
                  }}
                  autoFocus
                />
              </div>
              <Button type="button" size="sm" onClick={confirmNewTicker}>
                Open trade
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowNewTicker(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={startNewTicker}>
              <Plus className="h-3.5 w-3.5" />
              Add ticker
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p
          className="border border-destructive/30 bg-destructive-soft px-3 py-2 text-[12.5px] text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={`/portfolio/${portfolioId}`}>Cancel</Link>
        </Button>
        <Button onClick={onSave} disabled={saving || drafts.length === 0}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save trades"
          )}
        </Button>
      </div>
    </div>
  );
}
