/**
 * Average-cost basis helpers for buy/sell lot adjustments.
 */

export type PositionLot = {
  quantity: number;
  averageCost: number | null;
};

export type TransactionInput = {
  side: "BUY" | "SELL";
  shares: number;
  price: number;
};

export class CostBasisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostBasisError";
  }
}

/**
 * Apply a buy or sell to a position using weighted-average cost.
 * - BUY: newAvg = (qty*avg + shares*price) / (qty+shares)
 * - SELL: quantity decreases; average cost of remaining shares is unchanged
 * - Full sell: returns quantity 0 (caller should delete the holding)
 */
export function applyLotTransaction(
  current: PositionLot,
  tx: TransactionInput,
): PositionLot {
  const shares = tx.shares;
  const price = tx.price;

  if (!(shares > 0) || !Number.isFinite(shares)) {
    throw new CostBasisError("Share quantity must be a positive number.");
  }
  if (!(price >= 0) || !Number.isFinite(price)) {
    throw new CostBasisError("Price must be zero or a positive number.");
  }

  const qty = current.quantity;
  const avg = current.averageCost;

  if (tx.side === "BUY") {
    const addedCost = shares * price;
    const existingCost = qty > 0 && avg != null ? qty * avg : 0;
    const newQty = qty + shares;
    const newAvg = newQty > 0 ? (existingCost + addedCost) / newQty : price;
    return { quantity: newQty, averageCost: newAvg };
  }

  // SELL
  if (shares > qty + 1e-10) {
    throw new CostBasisError(
      `Cannot sell ${shares} shares; only ${qty} are held.`,
    );
  }
  const newQty = Math.max(0, qty - shares);
  if (newQty <= 1e-10) {
    return { quantity: 0, averageCost: null };
  }
  // Remaining shares keep the same average cost
  return { quantity: newQty, averageCost: avg };
}

export function unrealizedGainLoss(
  quantity: number,
  averageCost: number | null,
  marketPrice: number | null,
): { marketValue: number | null; unrealized: number | null } {
  if (marketPrice == null || quantity <= 0) {
    return { marketValue: null, unrealized: null };
  }
  const marketValue = quantity * marketPrice;
  if (averageCost == null) {
    return { marketValue, unrealized: null };
  }
  return { marketValue, unrealized: marketValue - quantity * averageCost };
}
