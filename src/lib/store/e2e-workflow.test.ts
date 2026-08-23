import { describe, it, expect, beforeEach } from "vitest";
import { localStore } from "./local";
import { calculateOrderTotals } from "@/lib/calculations";
import type { DraftOrder } from "@/types";

// jsdom provides localStorage in the vitest environment (configured via
// vite.config.ts `test.environment: 'jsdom'`).

describe("End-to-end order workflow (spec's final test script)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("runs the full create → edit → recalc → persist workflow", async () => {
    const products = await localStore.listProducts();
    const parties = await localStore.listParties();
    const geetaRam = parties.find((p) => p.name === "Geeta Ram & Sons")!;
    expect(geetaRam).toBeTruthy();

    // Pellet variants match the original sample's rates (1465/1515/1565/1680).
    const byNamePellet = (n: string) => products.find((p) => p.name === n && p.type === "PELLET")!;
    const p8000 = byNamePellet("8000");
    const pBullet = byNamePellet("Bullet/Speed 007");
    const pFighter = byNamePellet("Fighter");
    const pWinner = byNamePellet("Winner");
    const rateOf = (p: (typeof products)[number]) => p.packs.find((pk) => pk.size === 50)!.rate;

    // Build a fresh order: Geeta Ram & Sons, 3 loadings, mirroring the sample.
    const draft: DraftOrder = {
      order_date: "2026-08-22",
      party_id: geetaRam.id,
      party_name_snapshot: geetaRam.name,
      party_contact_snapshot: geetaRam.phone,
      // 5777 / 310850 ≈ 1.858% reproduces the original ₹5,777 C.D. as a percentage.
      adjustments: { difference: 10000, freight: 12000, cd_percent: (5777 / 310850) * 100 },
      loadings: [
        {
          clientId: "l1",
          loading_type: "Driver Side",
          loading_party: "Amrit Singh",
          location: "Rangana Farm (Shamli Road)",
          contact: "9729573718",
          items: [
            { clientId: "i1", product_id: p8000.id, product_name_snapshot: p8000.name, pack_size: 50, rate_snapshot: rateOf(p8000), quantity: 10, pricing_type: "NORMAL" },
            { clientId: "i2", product_id: pBullet.id, product_name_snapshot: pBullet.name, pack_size: 50, rate_snapshot: rateOf(pBullet), quantity: 10, pricing_type: "NORMAL" },
            { clientId: "i3", product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: rateOf(pFighter), quantity: 20, pricing_type: "NORMAL" },
            { clientId: "i4", product_id: pWinner.id, product_name_snapshot: pWinner.name, pack_size: 50, rate_snapshot: rateOf(pWinner), quantity: 10, pricing_type: "NORMAL" },
          ],
        },
        {
          clientId: "l2",
          loading_type: "Centre",
          loading_party: "Geeta Ram & Sons",
          location: "Gangoh",
          contact: "8394987423",
          items: [
            { clientId: "i5", product_id: p8000.id, product_name_snapshot: p8000.name, pack_size: 50, rate_snapshot: rateOf(p8000), quantity: 10, pricing_type: "NORMAL" },
            { clientId: "i6", product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: rateOf(pFighter), quantity: 30, pricing_type: "NORMAL" },
            { clientId: "i7", product_id: pBullet.id, product_name_snapshot: pBullet.name, pack_size: 50, rate_snapshot: rateOf(pBullet), quantity: 20, pricing_type: "NORMAL" },
            { clientId: "i8", product_id: pWinner.id, product_name_snapshot: pWinner.name, pack_size: 50, rate_snapshot: rateOf(pWinner), quantity: 20, pricing_type: "NORMAL" },
            // Free/scheme Fighter — added mid-workflow like the spec describes
            { clientId: "i9", product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: rateOf(pFighter), quantity: 6, pricing_type: "FREE" },
          ],
        },
        {
          clientId: "l3",
          loading_type: "Other",
          loading_party: "Rahul Kumar",
          location: "Buddha Khera (Saharanpur)",
          contact: "+917900689235",
          items: [
            { clientId: "i10", product_id: p8000.id, product_name_snapshot: p8000.name, pack_size: 50, rate_snapshot: rateOf(p8000), quantity: 30, pricing_type: "NORMAL" },
            { clientId: "i11", product_id: pBullet.id, product_name_snapshot: pBullet.name, pack_size: 50, rate_snapshot: rateOf(pBullet), quantity: 5, pricing_type: "NORMAL" },
            { clientId: "i12", product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: rateOf(pFighter), quantity: 25, pricing_type: "NORMAL" },
            { clientId: "i13", product_id: pWinner.id, product_name_snapshot: pWinner.name, pack_size: 50, rate_snapshot: rateOf(pWinner), quantity: 10, pricing_type: "NORMAL" },
          ],
        },
      ],
    };

    // Verify loading 1 totals before saving (50 bags, no free)
    const l1Totals = calculateOrderTotals({ loadings: [draft.loadings[0]], adjustments: draft.adjustments });
    expect(l1Totals.totalBags).toBe(50);

    // Verify loading 2 free bags
    const l2Totals = calculateOrderTotals({ loadings: [draft.loadings[1]], adjustments: draft.adjustments });
    expect(l2Totals.totalBags).toBe(86);
    expect(l2Totals.freeBags).toBe(6);

    // Verify order totals pre-save
    const preSaveTotals = calculateOrderTotals(draft);
    expect(preSaveTotals.totalBags).toBe(206);
    expect(preSaveTotals.grossAmount).toBe(310850);
    expect(preSaveTotals.closingBalance).toBeCloseTo(283073, 0);

    // Save (Create)
    const created = await localStore.createOrder(draft);
    expect(created.order_number).toMatch(/^ORD-\d{4}-\d{4}$/);
    expect(created.loadings).toHaveLength(3);

    // Reload application — verify data persists (simulated by re-reading store)
    const reloaded = await localStore.getOrder(created.id);
    expect(reloaded).toBeTruthy();
    const reloadedTotals = calculateOrderTotals(reloaded!);
    expect(reloadedTotals.totalBags).toBe(206);
    expect(reloadedTotals.grossAmount).toBe(310850);
    expect(reloadedTotals.closingBalance).toBeCloseTo(283073, 0);

    // Edit order: change a quantity, verify recalculation
    const editedDraft: DraftOrder = {
      order_date: reloaded!.order_date,
      party_id: reloaded!.party_id,
      party_name_snapshot: reloaded!.party_name_snapshot,
      party_contact_snapshot: reloaded!.party_contact_snapshot,
      adjustments: reloaded!.adjustments,
      loadings: reloaded!.loadings.map((l) => ({
        clientId: l.id,
        loading_type: l.loading_type,
        loading_party: l.loading_party,
        location: l.location,
        contact: l.contact,
        items: l.items.map((it) => ({
          clientId: it.id,
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          pack_size: it.pack_size,
          rate_snapshot: it.rate_snapshot,
          quantity: it.quantity,
          pricing_type: it.pricing_type,
        })),
      })),
    };
    // Bump loading 1's first item quantity from 10 to 15 (+5 * 1465 = +7325)
    editedDraft.loadings[0].items[0].quantity = 15;

    const updated = await localStore.updateOrder(created.id, editedDraft);
    const updatedTotals = calculateOrderTotals(updated);
    expect(updatedTotals.totalBags).toBe(211); // 206 + 5
    expect(updatedTotals.grossAmount).toBe(310850 + 7325);
    // C.D. is a % of Gross Amount, so as gross moves, the C.D. rupee amount
    // moves with it too — closing balance is not simply the old value + 7325.
    const expectedCd = ((310850 + 7325) * draft.adjustments.cd_percent) / 100;
    const expectedClosing = 310850 + 7325 - 10000 - 12000 - expectedCd;
    expect(updatedTotals.closingBalance).toBeCloseTo(expectedClosing, 2);

    // Order number must be stable across edits
    expect(updated.order_number).toBe(created.order_number);

    // Duplicate
    const duplicate = await localStore.duplicateOrder(created.id);
    expect(duplicate.id).not.toBe(created.id);
    expect(duplicate.order_number).not.toBe(created.order_number);
    const dupTotals = calculateOrderTotals(duplicate);
    expect(dupTotals.grossAmount).toBe(updatedTotals.grossAmount);

    // Delete
    await localStore.deleteOrder(duplicate.id);
    const afterDelete = await localStore.getOrder(duplicate.id);
    expect(afterDelete).toBeNull();
  });

  it("historical rate snapshot: changing product master does not change past orders", async () => {
    const products = await localStore.listProducts();
    const fighterPellet = products.find((p) => p.name === "Fighter" && p.type === "PELLET")!;
    const originalRate = fighterPellet.packs.find((p) => p.size === 50)!.rate;
    const parties = await localStore.listParties();
    const party = parties[0];

    const draft: DraftOrder = {
      order_date: "2026-08-22",
      party_id: party.id,
      party_name_snapshot: party.name,
      party_contact_snapshot: party.phone,
      adjustments: { difference: 0, freight: 0, cd_percent: 0 },
      loadings: [
        {
          clientId: "l1",
          loading_type: "Other",
          loading_party: "Test Party",
          location: "",
          contact: "",
          items: [
            { clientId: "i1", product_id: fighterPellet.id, product_name_snapshot: fighterPellet.name, pack_size: 50, rate_snapshot: originalRate, quantity: 10, pricing_type: "NORMAL" },
          ],
        },
      ],
    };
    const order = await localStore.createOrder(draft);
    expect(order.loadings[0].items[0].rate_snapshot).toBe(originalRate);

    // Now change the product master rate for the 50kg pack
    await localStore.updateProduct(fighterPellet.id, { packs: [{ size: 50, rate: originalRate + 35 }] });

    // Old order must still show the original snapshot rate
    const reloaded = await localStore.getOrder(order.id);
    expect(reloaded!.loadings[0].items[0].rate_snapshot).toBe(originalRate);

    // But the product master itself has the new rate
    const updatedProducts = await localStore.listProducts();
    expect(
      updatedProducts.find((p) => p.id === fighterPellet.id)!.packs.find((p) => p.size === 50)!.rate
    ).toBe(originalRate + 35);
  });

  it("order number generation increments sequentially within the year", async () => {
    const parties = await localStore.listParties();
    const party = parties[0];
    const products = await localStore.listProducts();
    const p = products[0];
    const rate = p.packs[0]?.rate ?? 0;
    const size = p.packs[0]?.size ?? 50;

    const minimalDraft = (): DraftOrder => ({
      order_date: "2026-08-22",
      party_id: party.id,
      party_name_snapshot: party.name,
      party_contact_snapshot: party.phone,
      adjustments: { difference: 0, freight: 0, cd_percent: 0 },
      loadings: [
        {
          clientId: "l1",
          loading_type: "Other",
          loading_party: "X",
          location: "",
          contact: "",
          items: [{ clientId: "i1", product_id: p.id, product_name_snapshot: p.name, pack_size: size, rate_snapshot: rate, quantity: 1, pricing_type: "NORMAL" }],
        },
      ],
    });

    const o1 = await localStore.createOrder(minimalDraft());
    const o2 = await localStore.createOrder(minimalDraft());
    const n1 = parseInt(o1.order_number.split("-")[2], 10);
    const n2 = parseInt(o2.order_number.split("-")[2], 10);
    expect(n2).toBe(n1 + 1);
  });
});
