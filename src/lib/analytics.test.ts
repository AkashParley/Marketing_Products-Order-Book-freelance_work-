import { describe, it, expect } from "vitest";
import { getKpis, getMonthlyRevenue, getTopProducts, getTopParties } from "./analytics";
import type { Order } from "@/types";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    order_number: "ORD-2026-0001",
    order_date: "2026-08-22",
    party_id: "p1",
    party_name_snapshot: "Geeta Ram & Sons",
    party_contact_snapshot: "8394987423",
    adjustments: { difference: 0, freight: 0, cd_percent: 0 },
    created_at: "2026-08-22T00:00:00.000Z",
    updated_at: "2026-08-22T00:00:00.000Z",
    loadings: [
      {
        id: "l1",
        order_id: "o1",
        loading_type: "Driver Side",
        loading_party: "Amrit Singh",
        location: "",
        contact: "",
        sort_order: 0,
        items: [
          { id: "i1", loading_id: "l1", product_id: "prod1", product_name_snapshot: "8000", pack_size: 50, rate_snapshot: 1465, quantity: 10, pricing_type: "NORMAL", sort_order: 0 },
          { id: "i2", loading_id: "l1", product_id: "prod2", product_name_snapshot: "Fighter", pack_size: 50, rate_snapshot: 1565, quantity: 6, pricing_type: "FREE", sort_order: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("getKpis", () => {
  it("sums gross amount, bags, free bags, and closing balance across orders", () => {
    const orders = [order(), order({ id: "o2", order_number: "ORD-2026-0002" })];
    const kpis = getKpis(orders);
    expect(kpis.totalOrders).toBe(2);
    expect(kpis.totalGrossAmount).toBe(29300); // 14650 * 2
    expect(kpis.totalBags).toBe(32); // 16 * 2
    expect(kpis.freeBags).toBe(12); // 6 * 2
  });

  it("returns zeroes for an empty order list", () => {
    const kpis = getKpis([]);
    expect(kpis).toEqual({ totalOrders: 0, totalGrossAmount: 0, totalBags: 0, freeBags: 0, totalClosingBalance: 0 });
  });
});

describe("getMonthlyRevenue", () => {
  it("buckets gross amount by calendar month within the window", () => {
    const orders = [order({ order_date: "2026-08-15" })];
    const monthly = getMonthlyRevenue(orders, 3);
    expect(monthly).toHaveLength(3);
    const augBucket = monthly.find((m) => m.key === "2026-08");
    expect(augBucket?.grossAmount).toBe(14650);
  });

  it("ignores orders outside the requested window", () => {
    const orders = [order({ order_date: "2020-01-01" })];
    const monthly = getMonthlyRevenue(orders, 3);
    const total = monthly.reduce((sum, m) => sum + m.grossAmount, 0);
    expect(total).toBe(0);
  });
});

describe("getTopProducts", () => {
  it("aggregates revenue and bags per product, sorted descending by revenue", () => {
    const orders = [order()];
    const top = getTopProducts(orders, 5);
    const p8000 = top.find((p) => p.name === "8000");
    expect(p8000?.revenue).toBe(14650);
    expect(p8000?.bags).toBe(10);
    // Free item contributes bags but 0 revenue
    const fighter = top.find((p) => p.name === "Fighter");
    expect(fighter?.revenue).toBe(0);
    expect(fighter?.bags).toBe(6);
  });

  it("respects the limit", () => {
    const orders = [order()];
    expect(getTopProducts(orders, 1)).toHaveLength(1);
  });
});

describe("getTopParties", () => {
  it("aggregates revenue and order count per party", () => {
    const orders = [order(), order({ id: "o2", order_number: "ORD-2026-0002" })];
    const top = getTopParties(orders, 5);
    expect(top[0].name).toBe("Geeta Ram & Sons");
    expect(top[0].revenue).toBe(29300);
    expect(top[0].orders).toBe(2);
  });
});
