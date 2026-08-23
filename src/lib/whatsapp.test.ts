import { describe, it, expect } from "vitest";
import { generateWhatsAppMessage, generateLoadingMessage, generateDraftLoadingMessage } from "./whatsapp";
import type { Order } from "@/types";

function sampleOrder(): Order {
  return {
    id: "o1",
    order_number: "ORD-2026-0001",
    order_date: "2026-08-22",
    party_id: "p1",
    party_name_snapshot: "Geeta Ram & Sons",
    party_contact_snapshot: "8394987423",
    adjustments: { difference: 10000, freight: 12000, cd_percent: 1.86 },
    created_at: "2026-08-22T00:00:00.000Z",
    updated_at: "2026-08-22T00:00:00.000Z",
    loadings: [
      {
        id: "l1",
        order_id: "o1",
        loading_type: "Driver Side",
        loading_party: "Amrit Singh",
        location: "Rangana Farm (Shamli Road)",
        contact: "9729573718",
        sort_order: 0,
        items: [
          { id: "i1", loading_id: "l1", product_id: "prod1", product_name_snapshot: "8000 P", pack_size: 50, rate_snapshot: 1465, quantity: 10, pricing_type: "NORMAL", sort_order: 0 },
          { id: "i2", loading_id: "l1", product_id: "prod2", product_name_snapshot: "Fighter P", pack_size: 50, rate_snapshot: 1565, quantity: 6, pricing_type: "FREE", sort_order: 1 },
        ],
      },
      {
        id: "l2",
        order_id: "o1",
        loading_type: "Centre",
        loading_party: "Geeta Ram & Sons",
        location: "Gangoh",
        contact: "8394987423",
        sort_order: 1,
        items: [
          { id: "i3", loading_id: "l2", product_id: "prod1", product_name_snapshot: "8000 P", pack_size: 50, rate_snapshot: 1465, quantity: 10, pricing_type: "NORMAL", sort_order: 0 },
        ],
      },
    ],
  };
}

describe("generateWhatsAppMessage", () => {
  it("starts with the order date, then the party name — no title, no emojis", () => {
    const msg = generateWhatsAppMessage(sampleOrder());
    expect(msg.startsWith("Date: 22 Aug 2026")).toBe(true);
    expect(msg).toContain("*Geeta Ram & Sons*");
    expect(msg).toContain("8394987423");
    expect(msg).not.toContain("MARKETING ORDER");
    expect(msg).not.toContain("ORD-2026-0001");
  });

  it("contains no emoji characters anywhere in the message", () => {
    const msg = generateWhatsAppMessage(sampleOrder());
    // eslint-disable-next-line no-misleading-character-class
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiRegex.test(msg)).toBe(false);
  });

  it("computes amounts from actual data, never hardcoded", () => {
    const msg = generateWhatsAppMessage(sampleOrder());
    expect(msg).toMatch(/8000 P.*14,650|8000 P.*₹14,650/);
  });

  it("marks free/scheme lines distinctly with ₹0", () => {
    const msg = generateWhatsAppMessage(sampleOrder());
    expect(msg).toMatch(/Fighter P.*Free\/Scheme.*₹0/);
  });

  it("shows C.D. as a percentage alongside the computed rupee amount", () => {
    const msg = generateWhatsAppMessage(sampleOrder());
    expect(msg).toMatch(/C\.D\. \(1\.86%\): ₹/);
  });

  it("includes every loading and the order summary", () => {
    const msg = generateWhatsAppMessage(sampleOrder());
    expect(msg).toContain("Loading 1 — Driver Side");
    expect(msg).toContain("Loading 2 — Centre");
    expect(msg).toContain("Order Summary");
    expect(msg).toContain("Closing Balance");
  });
});

describe("generateLoadingMessage", () => {
  it("includes the header and only the requested loading, not others", () => {
    const msg = generateLoadingMessage(sampleOrder(), 0);
    expect(msg.startsWith("Date: 22 Aug 2026")).toBe(true);
    expect(msg).toContain("*Geeta Ram & Sons*");
    expect(msg).toContain("Loading 1 — Driver Side");
    expect(msg).not.toContain("Loading 2 — Centre");
    expect(msg).not.toContain("Order Summary");
  });

  it("computes that loading's amount correctly", () => {
    const msg = generateLoadingMessage(sampleOrder(), 0);
    // 10 x 1465 = 14650, free line = 0
    expect(msg).toContain("Loading Amount: ₹14,650");
  });

  it("returns an empty string for an out-of-range index", () => {
    expect(generateLoadingMessage(sampleOrder(), 99)).toBe("");
  });
});

describe("generateDraftLoadingMessage", () => {
  it("builds the same style of message from unsaved draft state", () => {
    const header = { order_date: "2026-08-22", party_name_snapshot: "Geeta Ram & Sons", party_contact_snapshot: "8394987423" };
    const draftLoading = {
      clientId: "l1",
      loading_type: "Driver Side" as const,
      loading_party: "Amrit Singh",
      location: "Rangana Farm",
      contact: "9729573718",
      items: [
        { clientId: "i1", product_id: "p1", product_name_snapshot: "8000", pack_size: 50 as const, rate_snapshot: 1465, quantity: 10, pricing_type: "NORMAL" as const },
      ],
    };
    const msg = generateDraftLoadingMessage(header, draftLoading, 0);
    expect(msg).toContain("*Geeta Ram & Sons*");
    expect(msg).toContain("Loading 1 — Driver Side");
    expect(msg).toContain("Loading Amount: ₹14,650");
  });
});
