import type { Order } from "@/types";
import { calculateLineAmount, calculateOrderTotals } from "./calculations";
import { round2 } from "./calculations";

export interface DashboardKpis {
  totalOrders: number;
  totalGrossAmount: number;
  totalBags: number;
  freeBags: number;
  totalClosingBalance: number;
}

export function getKpis(orders: Order[]): DashboardKpis {
  let totalGrossAmount = 0;
  let totalBags = 0;
  let freeBags = 0;
  let totalClosingBalance = 0;

  for (const order of orders) {
    const t = calculateOrderTotals(order);
    totalGrossAmount += t.grossAmount;
    totalBags += t.totalBags;
    freeBags += t.freeBags;
    totalClosingBalance += t.closingBalance;
  }

  return {
    totalOrders: orders.length,
    totalGrossAmount: round2(totalGrossAmount),
    totalBags,
    freeBags,
    totalClosingBalance: round2(totalClosingBalance),
  };
}

export interface MonthlyRevenue {
  key: string; // "2026-08"
  label: string; // "Aug 2026"
  grossAmount: number;
}

/** Gross amount grouped by calendar month, for the last `monthsBack` months (chronological order). */
export function getMonthlyRevenue(orders: Order[], monthsBack = 6): MonthlyRevenue[] {
  const now = new Date();
  const buckets: MonthlyRevenue[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    buckets.push({ key, label, grossAmount: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const order of orders) {
    if (!order.order_date) continue;
    const key = order.order_date.slice(0, 7); // "YYYY-MM"
    const bucket = byKey.get(key);
    if (!bucket) continue; // outside the requested window
    bucket.grossAmount += calculateOrderTotals(order).grossAmount;
  }

  return buckets.map((b) => ({ ...b, grossAmount: round2(b.grossAmount) }));
}

export interface ProductPerformance {
  name: string;
  revenue: number;
  bags: number;
}

export function getTopProducts(orders: Order[], limit = 5): ProductPerformance[] {
  const map = new Map<string, ProductPerformance>();

  for (const order of orders) {
    for (const loading of order.loadings) {
      for (const item of loading.items) {
        const key = item.product_name_snapshot || "Unnamed";
        const existing = map.get(key) ?? { name: key, revenue: 0, bags: 0 };
        existing.revenue += calculateLineAmount(item);
        existing.bags += item.quantity > 0 ? item.quantity : 0;
        map.set(key, existing);
      }
    }
  }

  return Array.from(map.values())
    .map((p) => ({ ...p, revenue: round2(p.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface PartyPerformance {
  name: string;
  revenue: number;
  orders: number;
}

export function getTopParties(orders: Order[], limit = 5): PartyPerformance[] {
  const map = new Map<string, PartyPerformance>();

  for (const order of orders) {
    const key = order.party_name_snapshot || "Unnamed";
    const existing = map.get(key) ?? { name: key, revenue: 0, orders: 0 };
    existing.revenue += calculateOrderTotals(order).grossAmount;
    existing.orders += 1;
    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((p) => ({ ...p, revenue: round2(p.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
