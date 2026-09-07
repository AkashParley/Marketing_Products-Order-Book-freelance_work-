/**
 * Centralized calculation engine.
 *
 * Every number shown anywhere in the app (loading cards, order summary,
 * the WhatsApp message) must be derived by calling functions in this file.
 * Nothing here reads from React state directly — pure functions only —
 * so the same logic is trivially unit-testable and can never drift
 * between two places that both "do the math."
 */

import type {
  DraftItem,
  DraftLoading,
  DraftOrder,
  LoadingTotals,
  OrderTotals,
} from "@/types";

/**
 * Minimal structural shape needed for line/loading/order math. Both
 * `DraftItem` (in-progress form state) and the persisted `OrderItem` satisfy
 * this, so the same calculation functions work on drafts and saved orders.
 */
interface CalcItem {
  quantity: number | "";
  rate_snapshot: number;
  pricing_type: "NORMAL" | "FREE";
}
interface CalcLoading {
  items: CalcItem[];
}
interface CalcAdjustments {
  difference: number;
  freight: number;
  /** Percentage of Base Amount, e.g. 2.5 means 2.5%. */
  cd_percent: number;
}

/** Round to 2 decimals and kill -0 / floating point noise (₹ amounts). */
export function round2(n: number): number {
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r;
}

/** Amount for a single order line. Free/scheme lines are always ₹0. */
export function calculateLineAmount(item: CalcItem): number {
  const qty = typeof item.quantity === "number" ? item.quantity : 0;
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (item.pricing_type === "FREE") return 0;
  return round2(qty * item.rate_snapshot);
}

/** Bag quantity a line contributes to Total Bags (free lines still count). */
export function calculateLineBags(item: { quantity: number | "" }): number {
  const qty = typeof item.quantity === "number" ? item.quantity : 0;
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

export function calculateLoadingTotals(loading: CalcLoading): LoadingTotals {
  let totalBags = 0;
  let freeBags = 0;
  let loadingAmount = 0;

  for (const item of loading.items) {
    const bags = calculateLineBags(item);
    totalBags += bags;
    if (item.pricing_type === "FREE") freeBags += bags;
    loadingAmount += calculateLineAmount(item);
  }

  return {
    totalBags,
    freeBags,
    payableBags: totalBags - freeBags,
    loadingAmount: round2(loadingAmount),
  };
}

/** Generic helper: `base` × `percent` / 100, rounded to 2 decimals. */
export function calculateCdAmount(base: number, cdPercent: number): number {
  const pct = Number.isFinite(cdPercent) ? cdPercent : 0;
  return round2((base * pct) / 100);
}

/**
 * Closing Balance = (Gross Amount − Difference − Freight) minus a C.D.%
 * discount taken off that same base.
 *
 *   base     = Gross Amount − Difference − Freight
 *   cdAmount = base × C.D.% / 100
 *   Closing Balance = base − cdAmount
 */
export function calculateClosingBalance(
  grossAmount: number,
  adjustments: CalcAdjustments
): number {
  const diff = Number.isFinite(adjustments.difference) ? adjustments.difference : 0;
  const freight = Number.isFinite(adjustments.freight) ? adjustments.freight : 0;
  const base = grossAmount - diff - freight;
  const cdAmount = calculateCdAmount(base, adjustments.cd_percent);
  return round2(base - cdAmount);
}

export function calculateOrderTotals(order: {
  loadings: CalcLoading[];
  adjustments: CalcAdjustments;
}): OrderTotals {
  let totalBags = 0;
  let freeBags = 0;
  let grossAmount = 0;

  for (const loading of order.loadings) {
    const t = calculateLoadingTotals(loading);
    totalBags += t.totalBags;
    freeBags += t.freeBags;
    grossAmount += t.loadingAmount;
  }

  grossAmount = round2(grossAmount);
  const diff = Number.isFinite(order.adjustments.difference) ? order.adjustments.difference : 0;
  const freight = Number.isFinite(order.adjustments.freight) ? order.adjustments.freight : 0;
  const baseAmount = round2(grossAmount - diff - freight);
  const closingBalance = calculateClosingBalance(grossAmount, order.adjustments);
  // The rupee amount C.D.% actually removed from the base — i.e. the
  // difference between (Gross − Difference − Freight) and Closing Balance.
  const cdAmount = round2(baseAmount - closingBalance);

  return {
    totalLoadings: order.loadings.length,
    totalBags,
    freeBags,
    payableBags: totalBags - freeBags,
    grossAmount,
    baseAmount,
    cdAmount,
    closingBalance,
  };
}

// ── Validation helpers ──────────────────────────────────────────────────

export interface ItemValidationIssue {
  clientId: string;
  message: string;
}

/** Validate a single draft item. Returns an error message, or null if valid. */
export function validateItem(item: DraftItem): string | null {
  if (!item.product_id && !item.product_name_snapshot) {
    return "Select a product";
  }
  if (item.quantity === "" || item.quantity === null) {
    return "Enter a quantity";
  }
  const qty = Number(item.quantity);
  if (!Number.isFinite(qty)) return "Quantity must be a number";
  if (qty <= 0) return "Quantity must be greater than 0";
  if (!Number.isInteger(qty)) return "Quantity must be a whole number";
  return null;
}

export function validateLoading(loading: DraftLoading): string | null {
  if (!loading.loading_party.trim()) return "Enter a loading party";
  if (loading.items.length === 0) return "Add at least one product";
  return null;
}

export function validateOrder(order: DraftOrder): string | null {
  if (!order.order_date) return "Select an order date";
  if (!order.party_name_snapshot.trim()) return "Select an order party";
  if (order.loadings.length === 0) return "Add at least one loading";
  if (order.adjustments.cd_percent < 0 || order.adjustments.cd_percent > 100) {
    return "C.D. % must be between 0 and 100";
  }
  for (const loading of order.loadings) {
    const err = validateLoading(loading);
    if (err) return `${loading.loading_party || "Loading"}: ${err}`;
    for (const item of loading.items) {
      const err2 = validateItem(item);
      if (err2) return `${loading.loading_party || "Loading"} — ${item.product_name_snapshot || "product"}: ${err2}`;
    }
  }
  return null;
}