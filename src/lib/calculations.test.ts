import { describe, it, expect } from "vitest";
import {
  calculateLineAmount,
  calculateLoadingTotals,
  calculateOrderTotals,
  calculateClosingBalance,
  calculateCdAmount,
  validateItem,
  validateLoading,
  validateOrder,
  round2,
} from "./calculations";
import type { DraftItem, DraftLoading, DraftOrder } from "@/types";

function item(overrides: Partial<DraftItem> = {}): DraftItem {
  return {
    clientId: "c1",
    product_id: "p1",
    product_name_snapshot: "8000 P",
    pack_size: 50,
    rate_snapshot: 1465,
    quantity: 10,
    pricing_type: "NORMAL",
    ...overrides,
  };
}

describe("calculateLineAmount", () => {
  it("multiplies quantity by rate for normal items", () => {
    expect(calculateLineAmount(item({ quantity: 10, rate_snapshot: 1465 }))).toBe(14650);
  });

  it("returns 0 for free/scheme items regardless of quantity", () => {
    expect(
      calculateLineAmount(item({ quantity: 6, rate_snapshot: 1565, pricing_type: "FREE" }))
    ).toBe(0);
  });

  it("returns 0 for empty quantity", () => {
    expect(calculateLineAmount(item({ quantity: "" }))).toBe(0);
  });

  it("returns 0 for zero or negative quantity", () => {
    expect(calculateLineAmount(item({ quantity: 0 }))).toBe(0);
    expect(calculateLineAmount(item({ quantity: -5 }))).toBe(0);
  });

  it("handles decimal rates without float drift", () => {
    expect(calculateLineAmount(item({ quantity: 3, rate_snapshot: 1515.5 }))).toBe(4546.5);
  });
});

describe("calculateLoadingTotals", () => {
  it("sums bags and amounts across normal + free items", () => {
    const loading: Pick<DraftLoading, "items"> = {
      items: [
        item({ clientId: "1", quantity: 10, rate_snapshot: 1465, pricing_type: "NORMAL" }),
        item({ clientId: "2", quantity: 30, rate_snapshot: 1565, pricing_type: "NORMAL" }),
        item({ clientId: "3", quantity: 20, rate_snapshot: 1515, pricing_type: "NORMAL" }),
        item({ clientId: "4", quantity: 20, rate_snapshot: 1680, pricing_type: "NORMAL" }),
        item({ clientId: "5", quantity: 6, rate_snapshot: 1565, pricing_type: "FREE" }),
      ],
    };
    const totals = calculateLoadingTotals(loading);
    expect(totals.totalBags).toBe(86);
    expect(totals.freeBags).toBe(6);
    expect(totals.payableBags).toBe(80);
    // 14650 + 46950 + 30300 + 33600 + 0
    expect(totals.loadingAmount).toBe(125500);
  });

  it("returns zeroes for an empty loading", () => {
    const totals = calculateLoadingTotals({ items: [] });
    expect(totals).toEqual({
      totalBags: 0,
      freeBags: 0,
      payableBags: 0,
      loadingAmount: 0,
    });
  });
});

describe("calculateCdAmount", () => {
  it("computes a percentage of gross amount", () => {
    expect(calculateCdAmount(100000, 5)).toBe(5000);
  });
  it("handles fractional percentages", () => {
    expect(calculateCdAmount(310850, 1.5)).toBe(4662.75);
  });
  it("treats 0% as ₹0", () => {
    expect(calculateCdAmount(100000, 0)).toBe(0);
  });
  it("treats non-finite percent as 0", () => {
    expect(calculateCdAmount(100000, NaN)).toBe(0);
  });
});

describe("calculateOrderTotals — Geeta Ram & Sons sample", () => {
  const loadings: Pick<DraftLoading, "items">[] = [
    // Loading 1 — Driver Side — 50 bags
    {
      items: [
        item({ clientId: "1a", quantity: 10, rate_snapshot: 1465 }),
        item({ clientId: "1b", quantity: 10, rate_snapshot: 1515 }),
        item({ clientId: "1c", quantity: 20, rate_snapshot: 1565 }),
        item({ clientId: "1d", quantity: 10, rate_snapshot: 1680 }),
      ],
    },
    // Loading 2 — Centre — 86 bags, 6 free
    {
      items: [
        item({ clientId: "2a", quantity: 10, rate_snapshot: 1465 }),
        item({ clientId: "2b", quantity: 30, rate_snapshot: 1565 }),
        item({ clientId: "2c", quantity: 20, rate_snapshot: 1515 }),
        item({ clientId: "2d", quantity: 20, rate_snapshot: 1680 }),
        item({ clientId: "2e", quantity: 6, rate_snapshot: 1565, pricing_type: "FREE" }),
      ],
    },
    // Loading 3 — Rahul Kumar — 70 bags
    {
      items: [
        item({ clientId: "3a", quantity: 30, rate_snapshot: 1465 }),
        item({ clientId: "3b", quantity: 5, rate_snapshot: 1515 }),
        item({ clientId: "3c", quantity: 25, rate_snapshot: 1565 }),
        item({ clientId: "3d", quantity: 10, rate_snapshot: 1680 }),
      ],
    },
  ];

  // Gross = 310850. Using a C.D.% that reproduces the original ₹5,777 C.D.
  // from the source sample (5777 / 310850 ≈ 1.858%) to check the percent
  // model still lines up with the real-world numbers this app replaces.
  // Kept at full precision (not rounded to a UI-friendly 2 decimals) so the
  // reproduction is exact rather than approximate.
  const cdPercentForSample = (5777 / 310850) * 100;
  const adjustments = { difference: 10000, freight: 12000, cd_percent: cdPercentForSample };

  it("computes total bags across all loadings", () => {
    const totals = calculateOrderTotals({ loadings, adjustments });
    expect(totals.totalBags).toBe(206);
    expect(totals.freeBags).toBe(6);
    expect(totals.payableBags).toBe(200);
    expect(totals.totalLoadings).toBe(3);
  });

  it("computes gross amount from actual line items (does not trust hardcoded sample totals)", () => {
    const totals = calculateOrderTotals({ loadings, adjustments });
    expect(totals.grossAmount).toBe(310850);
  });

  it("derives C.D. amount from gross × percent, and closing balance from that", () => {
    const totals = calculateOrderTotals({ loadings, adjustments });
    expect(totals.cdAmount).toBeCloseTo(5777, 0);
    // 310850 - 10000 - 12000 - ~5777 ≈ 283073
    expect(totals.closingBalance).toBeCloseTo(283073, 0);
  });
});

describe("calculateClosingBalance", () => {
  it("subtracts difference, freight and cd-percent-derived amount from gross", () => {
    expect(
      calculateClosingBalance(100000, { difference: 1000, freight: 2000, cd_percent: 0.5 })
    ).toBe(96500);
  });

  it("treats non-finite adjustment values as 0", () => {
    expect(
      calculateClosingBalance(100000, { difference: NaN, freight: 2000, cd_percent: 0 })
    ).toBe(98000);
  });

  it("handles all-zero adjustments", () => {
    expect(calculateClosingBalance(50000, { difference: 0, freight: 0, cd_percent: 0 })).toBe(50000);
  });
});

describe("round2", () => {
  it("avoids floating point noise", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
  it("normalizes -0 to 0", () => {
    expect(Object.is(round2(-0), 0)).toBe(true);
  });
});

describe("validateItem", () => {
  it("requires a product", () => {
    expect(validateItem(item({ product_id: null, product_name_snapshot: "" }))).toMatch(/product/i);
  });
  it("requires a quantity", () => {
    expect(validateItem(item({ quantity: "" }))).toMatch(/quantity/i);
  });
  it("rejects zero quantity", () => {
    expect(validateItem(item({ quantity: 0 }))).toMatch(/greater than 0/i);
  });
  it("rejects negative quantity", () => {
    expect(validateItem(item({ quantity: -3 }))).toMatch(/greater than 0/i);
  });
  it("rejects non-integer quantity", () => {
    expect(validateItem(item({ quantity: 2.5 }))).toMatch(/whole number/i);
  });
  it("passes a valid normal item", () => {
    expect(validateItem(item())).toBeNull();
  });
  it("passes a valid free item with quantity but no rate impact", () => {
    expect(validateItem(item({ pricing_type: "FREE", quantity: 6 }))).toBeNull();
  });
});

describe("validateLoading", () => {
  function loading(overrides: Partial<DraftLoading> = {}): DraftLoading {
    return {
      clientId: "l1",
      loading_type: "Driver Side",
      loading_party: "Amrit Singh",
      location: "Rangana Farm",
      contact: "9729573718",
      items: [item()],
      ...overrides,
    };
  }
  it("requires a loading party", () => {
    expect(validateLoading(loading({ loading_party: "" }))).toMatch(/loading party/i);
  });
  it("requires at least one product", () => {
    expect(validateLoading(loading({ items: [] }))).toMatch(/product/i);
  });
  it("passes a valid loading", () => {
    expect(validateLoading(loading())).toBeNull();
  });
});

describe("validateOrder", () => {
  function order(overrides: Partial<DraftOrder> = {}): DraftOrder {
    return {
      order_date: "2026-08-22",
      party_id: "party1",
      party_name_snapshot: "Geeta Ram & Sons",
      party_contact_snapshot: "8394987423",
      loadings: [
        {
          clientId: "l1",
          loading_type: "Driver Side",
          loading_party: "Amrit Singh",
          location: "Rangana Farm",
          contact: "9729573718",
          items: [item()],
        },
      ],
      adjustments: { difference: 0, freight: 0, cd_percent: 0 },
      ...overrides,
    };
  }
  it("requires an order date", () => {
    expect(validateOrder(order({ order_date: "" }))).toMatch(/date/i);
  });
  it("requires an order party", () => {
    expect(validateOrder(order({ party_name_snapshot: "" }))).toMatch(/party/i);
  });
  it("requires at least one loading", () => {
    expect(validateOrder(order({ loadings: [] }))).toMatch(/loading/i);
  });
  it("rejects a C.D. percent outside 0-100", () => {
    expect(
      validateOrder(order({ adjustments: { difference: 0, freight: 0, cd_percent: 150 } }))
    ).toMatch(/C\.D\./);
  });
  it("passes a fully valid order", () => {
    expect(validateOrder(order())).toBeNull();
  });
});
