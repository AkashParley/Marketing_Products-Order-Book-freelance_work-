import { supabase } from "@/lib/supabase";
import type { DataStore } from "./types";
import type { DraftOrder, Loading, Order, OrderItem, Party, Product } from "@/types";
import { generateOrderNumber } from "@/lib/utils";

function sb() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

function rowToProduct(r: any, packRows: any[]): Product {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    active: r.active,
    created_at: r.created_at,
    packs: packRows
      .filter((p) => p.product_id === r.id)
      .map((p) => ({ size: p.size, rate: Number(p.rate) })),
  };
}
function rowToParty(r: any): Party {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    address: r.address,
    city: r.city,
    notes: r.notes,
    created_at: r.created_at,
  };
}

async function fetchProductsWithPacks(): Promise<Product[]> {
  const client = sb();
  const { data: productRows, error: pErr } = await client.from("products").select("*").order("name");
  if (pErr) throw pErr;
  const ids = (productRows ?? []).map((p: any) => p.id);
  let packRows: any[] = [];
  if (ids.length) {
    const { data, error } = await client.from("product_packs").select("*").in("product_id", ids);
    if (error) throw error;
    packRows = data ?? [];
  }
  return (productRows ?? []).map((r: any) => rowToProduct(r, packRows));
}

async function syncProductPacks(productId: string, packs: { size: number; rate: number }[]) {
  const client = sb();
  const { error: delErr } = await client.from("product_packs").delete().eq("product_id", productId);
  if (delErr) throw delErr;
  if (packs.length) {
    const { error: insErr } = await client
      .from("product_packs")
      .insert(packs.map((p) => ({ product_id: productId, size: p.size, rate: p.rate })));
    if (insErr) throw insErr;
  }
}

async function fetchFullOrder(orderRow: any): Promise<Order> {
  const client = sb();
  const { data: loadingRows, error: lErr } = await client
    .from("loadings")
    .select("*")
    .eq("order_id", orderRow.id)
    .order("sort_order", { ascending: true });
  if (lErr) throw lErr;

  const loadingIds = (loadingRows ?? []).map((l: any) => l.id);
  let itemRows: any[] = [];
  if (loadingIds.length) {
    const { data, error } = await client
      .from("order_items")
      .select("*")
      .in("loading_id", loadingIds)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    itemRows = data ?? [];
  }

  const loadings: Loading[] = (loadingRows ?? []).map((l: any) => ({
    id: l.id,
    order_id: l.order_id,
    loading_type: l.loading_type,
    loading_party: l.loading_party,
    location: l.location ?? "",
    contact: l.contact ?? "",
    sort_order: l.sort_order,
    items: itemRows
      .filter((it) => it.loading_id === l.id)
      .map(
        (it): OrderItem => ({
          id: it.id,
          loading_id: it.loading_id,
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          pack_size: it.pack_size,
          rate_snapshot: Number(it.rate_snapshot),
          quantity: Number(it.quantity),
          pricing_type: it.pricing_type,
          sort_order: it.sort_order,
        })
      ),
  }));

  return {
    id: orderRow.id,
    order_number: orderRow.order_number,
    order_date: orderRow.order_date,
    party_id: orderRow.party_id,
    party_name_snapshot: orderRow.party_name_snapshot,
    party_contact_snapshot: orderRow.party_contact_snapshot,
    adjustments: {
      difference: Number(orderRow.difference),
      freight: Number(orderRow.freight),
      cd_percent: Number(orderRow.cd_percent),
    },
    created_at: orderRow.created_at,
    updated_at: orderRow.updated_at,
    loadings,
  };
}

async function persistLoadingsAndItems(orderId: string, draft: DraftOrder) {
  const client = sb();

  // Replace-all strategy: simplest correct approach for a single-user app
  // with modest order sizes. Delete existing loadings (cascade removes items)
  // then insert the new set.
  const { error: delErr } = await client.from("loadings").delete().eq("order_id", orderId);
  if (delErr) throw delErr;

  for (let li = 0; li < draft.loadings.length; li++) {
    const dl = draft.loadings[li];
    const { data: loadingRow, error: lErr } = await client
      .from("loadings")
      .insert({
        order_id: orderId,
        loading_type: dl.loading_type,
        loading_party: dl.loading_party,
        location: dl.location,
        contact: dl.contact,
        sort_order: li,
      })
      .select()
      .single();
    if (lErr) throw lErr;

    if (dl.items.length) {
      const itemsPayload = dl.items.map((it, ii) => ({
        loading_id: loadingRow.id,
        product_id: it.product_id,
        product_name_snapshot: it.product_name_snapshot,
        pack_size: it.pack_size,
        rate_snapshot: it.rate_snapshot,
        quantity: typeof it.quantity === "number" ? it.quantity : 0,
        pricing_type: it.pricing_type,
        sort_order: ii,
      }));
      const { error: iErr } = await client.from("order_items").insert(itemsPayload);
      if (iErr) throw iErr;
    }
  }
}

export const supabaseStore: DataStore = {
  async listProducts() {
    return fetchProductsWithPacks();
  },
  async createProduct(input) {
    const client = sb();
    const { data, error } = await client
      .from("products")
      .insert({ name: input.name, type: input.type, active: input.active ?? true })
      .select()
      .single();
    if (error) throw error;
    await syncProductPacks(data.id, input.packs);
    return rowToProduct(data, input.packs.map((p) => ({ product_id: data.id, size: p.size, rate: p.rate })));
  },
  async updateProduct(id, patch) {
    const client = sb();
    const { name, type, active, packs } = patch;
    const updatePayload: Record<string, unknown> = {};
    if (name !== undefined) updatePayload.name = name;
    if (type !== undefined) updatePayload.type = type;
    if (active !== undefined) updatePayload.active = active;

    let data: any;
    if (Object.keys(updatePayload).length) {
      const res = await client.from("products").update(updatePayload).eq("id", id).select().single();
      if (res.error) throw res.error;
      data = res.data;
    } else {
      const res = await client.from("products").select("*").eq("id", id).single();
      if (res.error) throw res.error;
      data = res.data;
    }

    if (packs !== undefined) {
      await syncProductPacks(id, packs);
    }

    const { data: packRows, error: packErr } = await client.from("product_packs").select("*").eq("product_id", id);
    if (packErr) throw packErr;
    return rowToProduct(data, packRows ?? []);
  },
  async deleteProduct(id) {
    const { error } = await sb().from("products").delete().eq("id", id);
    if (error) throw error;
  },

  async listParties() {
    const { data, error } = await sb().from("parties").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map(rowToParty);
  },
  async createParty(input) {
    const { data, error } = await sb().from("parties").insert(input).select().single();
    if (error) throw error;
    return rowToParty(data);
  },
  async updateParty(id, patch) {
    const { data, error } = await sb().from("parties").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return rowToParty(data);
  },
  async deleteParty(id) {
    const { error } = await sb().from("parties").delete().eq("id", id);
    if (error) throw error;
  },

  async listOrders() {
    const client = sb();
    const { data: orderRows, error } = await client
      .from("orders")
      .select("*")
      .order("order_number", { ascending: false });
    if (error) throw error;
    const orders = await Promise.all((orderRows ?? []).map(fetchFullOrder));
    return orders;
  },
  async getOrder(id) {
    const { data, error } = await sb().from("orders").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return fetchFullOrder(data);
  },
  async createOrder(draft) {
    const client = sb();
    const { data: existing, error: exErr } = await client.from("orders").select("order_number");
    if (exErr) throw exErr;
    const orderNumber = generateOrderNumber((existing ?? []).map((o: any) => o.order_number));

    const { data: orderRow, error } = await client
      .from("orders")
      .insert({
        order_number: orderNumber,
        order_date: draft.order_date,
        party_id: draft.party_id,
        party_name_snapshot: draft.party_name_snapshot,
        party_contact_snapshot: draft.party_contact_snapshot,
        difference: draft.adjustments.difference,
        freight: draft.adjustments.freight,
        cd_percent: draft.adjustments.cd_percent,
      })
      .select()
      .single();
    if (error) throw error;

    await client.from("order_adjustments").upsert({
      order_id: orderRow.id,
      difference: draft.adjustments.difference,
      freight: draft.adjustments.freight,
      cd_percent: draft.adjustments.cd_percent,
    });

    await persistLoadingsAndItems(orderRow.id, draft);
    return (await this.getOrder(orderRow.id)) as Order;
  },
  async updateOrder(id, draft) {
    const client = sb();
    const { data: orderRow, error } = await client
      .from("orders")
      .update({
        order_date: draft.order_date,
        party_id: draft.party_id,
        party_name_snapshot: draft.party_name_snapshot,
        party_contact_snapshot: draft.party_contact_snapshot,
        difference: draft.adjustments.difference,
        freight: draft.adjustments.freight,
        cd_percent: draft.adjustments.cd_percent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await client.from("order_adjustments").upsert({
      order_id: id,
      difference: draft.adjustments.difference,
      freight: draft.adjustments.freight,
      cd_percent: draft.adjustments.cd_percent,
    });

    await persistLoadingsAndItems(id, draft);
    return (await this.getOrder(orderRow.id)) as Order;
  },
  async deleteOrder(id) {
    const { error } = await sb().from("orders").delete().eq("id", id);
    if (error) throw error;
  },
  async duplicateOrder(id) {
    const source = await this.getOrder(id);
    if (!source) throw new Error("Order not found");
    const draft: DraftOrder = {
      order_date: new Date().toISOString().slice(0, 10),
      party_id: source.party_id,
      party_name_snapshot: source.party_name_snapshot,
      party_contact_snapshot: source.party_contact_snapshot,
      adjustments: { ...source.adjustments },
      loadings: source.loadings.map((l) => ({
        clientId: crypto.randomUUID(),
        loading_type: l.loading_type,
        loading_party: l.loading_party,
        location: l.location,
        contact: l.contact,
        items: l.items.map((it) => ({
          clientId: crypto.randomUUID(),
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          pack_size: it.pack_size,
          rate_snapshot: it.rate_snapshot,
          quantity: it.quantity,
          pricing_type: it.pricing_type,
        })),
      })),
    };
    return this.createOrder(draft);
  },
};
