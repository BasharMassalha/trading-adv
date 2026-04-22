import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, currency = "USD"): string {
  if (currency === "USD") return USD.format(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Safely convert a Prisma Decimal (or null/undefined) to a JS number.
 * Prisma Decimal objects expose a `.toNumber()` method; plain numbers are
 * returned as-is so this helper is safe to call on either type.
 */
export function toNum(
  d: { toNumber(): number } | number | string | null | undefined,
): number | null {
  if (d == null) return null;
  if (typeof d === "number") return d;
  if (typeof d === "string") return parseFloat(d) || null;
  return d.toNumber();
}
