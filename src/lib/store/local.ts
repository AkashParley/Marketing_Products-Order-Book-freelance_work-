import type { DataStore } from "./types";
import type { DraftOrder, Loading, Order, OrderItem, Party, Product } from "@/types";
import { clientId, generateOrderNumber } from "@/lib/utils";

const KEYS = {
  products: "omo:products",
  parties: "omo:parties",
  orders: "omo:orders",
  seeded: "omo:seeded_v2",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowISO() {
  return new Date().toISOString();
}

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : clientId();
}

function getProducts(): Product[] {
  return read<Product[]>(KEYS.products, []);
}
function getParties(): Party[] {
  return read<Party[]>(KEYS.parties, []);
}
function getOrders(): Order[] {
  return read<Order[]>(KEYS.orders, []);
}

function draftToOrder(id: string, order_number: string, draft: DraftOrder, created_at: string): Order {
  const loadings: Loading[] = draft.loadings.map((dl, li) => {
    const loadingId = uuid();
    const items: OrderItem[] = dl.items.map((di, ii) => ({
      id: uuid(),
      loading_id: loadingId,
      product_id: di.product_id,
      product_name_snapshot: di.product_name_snapshot,
      pack_size: di.pack_size,
      rate_snapshot: di.rate_snapshot,
      quantity: typeof di.quantity === "number" ? di.quantity : 0,
      pricing_type: di.pricing_type,
      sort_order: ii,
    }));
    return {
      id: loadingId,
      order_id: id,
      loading_type: dl.loading_type,
      loading_party: dl.loading_party,
      location: dl.location,
      contact: dl.contact,
      sort_order: li,
      items,
    };
  });

  return {
    id,
    order_number,
    order_date: draft.order_date,
    party_id: draft.party_id,
    party_name_snapshot: draft.party_name_snapshot,
    party_contact_snapshot: draft.party_contact_snapshot,
    adjustments: { ...draft.adjustments },
    created_at,
    updated_at: nowISO(),
    loadings,
  };
}

/** Full product/price list as supplied — one product per name+type, each with its listed bag size and rate. */
function seedProducts(): Product[] {
  const rows: { name: string; type: "PELLET" | "MASH"; size: 25 | 40 | 50; rate: number }[] = [
    { name: "Calf Starter", type: "PELLET", size: 25, rate: 1110 },
    { name: "Heifer Pellet", type: "PELLET", size: 50, rate: 1730 },
    { name: "Runner Dry Feed", type: "PELLET", size: 50, rate: 1530 },
    { name: "Transition", type: "PELLET", size: 50, rate: 2245 },
    { name: "Transition", type: "MASH", size: 50, rate: 2215 },
    { name: "Buff Special", type: "MASH", size: 50, rate: 1805 },
    { name: "Cow Special", type: "MASH", size: 50, rate: 1805 },
    { name: "Energy Booster", type: "PELLET", size: 25, rate: 1040 },
    { name: "Pioneer", type: "PELLET", size: 50, rate: 1865 },
    { name: "Winner", type: "PELLET", size: 50, rate: 1680 },
    { name: "Fighter", type: "PELLET", size: 50, rate: 1565 },
    { name: "Bullet/Speed 007", type: "PELLET", size: 50, rate: 1515 },
    { name: "Challanger", type: "PELLET", size: 50, rate: 1465 },
    { name: "8000", type: "PELLET", size: 50, rate: 1465 },
    { name: "6000", type: "PELLET", size: 50, rate: 1380 },
    { name: "9000", type: "MASH", size: 50, rate: 1680 },
    { name: "Fighter", type: "MASH", size: 50, rate: 1565 },
    { name: "Bullet/Speed 007", type: "MASH", size: 50, rate: 1515 },
    { name: "8000", type: "MASH", size: 50, rate: 1465 },
    { name: "6000", type: "MASH", size: 50, rate: 1380 },
  ];
  return rows.map((r) => ({
    id: uuid(),
    name: r.name,
    type: r.type,
    packs: [{ size: r.size, rate: r.rate }],
    active: true,
    created_at: nowISO(),
  }));
}

function ensureSeed() {
  if (read<boolean>(KEYS.seeded, false)) return;

  const products = seedProducts();
  write(KEYS.products, products);

  // Demo order uses the four Pellet products that match the original sample rates.
  const find = (name: string, type: "PELLET" | "MASH") =>
    products.find((p) => p.name === name && p.type === type)!;
  const p8000 = find("8000", "PELLET");
  const pBullet = find("Bullet/Speed 007", "PELLET");
  const pFighter = find("Fighter", "PELLET");
  const pWinner = find("Winner", "PELLET");

  const geetaRam: Party = {
    id: uuid(),
    name: "Geeta Ram & Sons",
    phone: "8394987423",
    address: null,
    city: "Gangoh (Saharanpur)",
    notes: null,
    created_at: nowISO(),
  };
  const parties: Party[] = [geetaRam];
  write(KEYS.parties, parties);

  const draft: DraftOrder = {
    order_date: nowISO().slice(0, 10),
    party_id: geetaRam.id,
    party_name_snapshot: geetaRam.name,
    party_contact_snapshot: geetaRam.phone,
    // 5777 / 310850 ≈ 1.858% reproduces the original ₹5,777 C.D. from the source sample.
    adjustments: { difference: 10000, freight: 12000, cd_percent: 1.86 },
    loadings: [
      {
        clientId: uuid(),
        loading_type: "Driver Side",
        loading_party: "Amrit Singh",
        location: "Rangana Farm (Shamli Road)",
        contact: "9729573718",
        items: [
          { clientId: uuid(), product_id: p8000.id, product_name_snapshot: p8000.name, pack_size: 50, rate_snapshot: 1465, quantity: 10, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pBullet.id, product_name_snapshot: pBullet.name, pack_size: 50, rate_snapshot: 1515, quantity: 10, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: 1565, quantity: 20, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pWinner.id, product_name_snapshot: pWinner.name, pack_size: 50, rate_snapshot: 1680, quantity: 10, pricing_type: "NORMAL" },
        ],
      },
      {
        clientId: uuid(),
        loading_type: "Centre",
        loading_party: "Geeta Ram & Sons",
        location: "Gangoh",
        contact: "8394987423",
        items: [
          { clientId: uuid(), product_id: p8000.id, product_name_snapshot: p8000.name, pack_size: 50, rate_snapshot: 1465, quantity: 10, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: 1565, quantity: 30, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pBullet.id, product_name_snapshot: pBullet.name, pack_size: 50, rate_snapshot: 1515, quantity: 20, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pWinner.id, product_name_snapshot: pWinner.name, pack_size: 50, rate_snapshot: 1680, quantity: 20, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: 1565, quantity: 6, pricing_type: "FREE" },
        ],
      },
      {
        clientId: uuid(),
        loading_type: "Other",
        loading_party: "Rahul Kumar",
        location: "Buddha Khera (Saharanpur)",
        contact: "+917900689235",
        items: [
          { clientId: uuid(), product_id: p8000.id, product_name_snapshot: p8000.name, pack_size: 50, rate_snapshot: 1465, quantity: 30, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pBullet.id, product_name_snapshot: pBullet.name, pack_size: 50, rate_snapshot: 1515, quantity: 5, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pFighter.id, product_name_snapshot: pFighter.name, pack_size: 50, rate_snapshot: 1565, quantity: 25, pricing_type: "NORMAL" },
          { clientId: uuid(), product_id: pWinner.id, product_name_snapshot: pWinner.name, pack_size: 50, rate_snapshot: 1680, quantity: 10, pricing_type: "NORMAL" },
        ],
      },
    ],
  };

  const id = uuid();
  const orderNumber = generateOrderNumber([]);
  const order = draftToOrder(id, orderNumber, draft, nowISO());
  write(KEYS.orders, [order]);

  write(KEYS.seeded, true);
}

export const localStore: DataStore = {
  async listProducts() {
    ensureSeed();
    return getProducts().sort((a, b) => a.name.localeCompare(b.name));
  },
  async createProduct(input) {
    ensureSeed();
    const products = getProducts();
    const product: Product = {
      id: uuid(),
      name: input.name,
      type: input.type,
      packs: input.packs,
      active: input.active ?? true,
      created_at: nowISO(),
    };
    write(KEYS.products, [...products, product]);
    return product;
  },
  async updateProduct(id, patch) {
    const products = getProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Product not found");
    products[idx] = { ...products[idx], ...patch };
    write(KEYS.products, products);
    return products[idx];
  },
  async deleteProduct(id) {
    write(KEYS.products, getProducts().filter((p) => p.id !== id));
  },

  async listParties() {
    ensureSeed();
    return getParties().sort((a, b) => a.name.localeCompare(b.name));
  },
  async createParty(input) {
    ensureSeed();
    const parties = getParties();
    const party: Party = { id: uuid(), created_at: nowISO(), ...input };
    write(KEYS.parties, [...parties, party]);
    return party;
  },
  async updateParty(id, patch) {
    const parties = getParties();
    const idx = parties.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Party not found");
    parties[idx] = { ...parties[idx], ...patch };
    write(KEYS.parties, parties);
    return parties[idx];
  },
  async deleteParty(id) {
    write(KEYS.parties, getParties().filter((p) => p.id !== id));
  },

  async listOrders() {
    ensureSeed();
    return getOrders().sort((a, b) => b.order_number.localeCompare(a.order_number));
  },
  async getOrder(id) {
    ensureSeed();
    return getOrders().find((o) => o.id === id) ?? null;
  },
  async createOrder(draft) {
    ensureSeed();
    const orders = getOrders();
    const id = uuid();
    const orderNumber = generateOrderNumber(orders.map((o) => o.order_number));
    const order = draftToOrder(id, orderNumber, draft, nowISO());
    write(KEYS.orders, [...orders, order]);
    return order;
  },
  async updateOrder(id, draft) {
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error("Order not found");
    const existing = orders[idx];
    const updated = draftToOrder(id, existing.order_number, draft, existing.created_at);
    orders[idx] = updated;
    write(KEYS.orders, orders);
    return updated;
  },
  async deleteOrder(id) {
    write(KEYS.orders, getOrders().filter((o) => o.id !== id));
  },
  async duplicateOrder(id) {
    const orders = getOrders();
    const source = orders.find((o) => o.id === id);
    if (!source) throw new Error("Order not found");
    const newId = uuid();
    const orderNumber = generateOrderNumber(orders.map((o) => o.order_number));
    const draft: DraftOrder = {
      order_date: new Date().toISOString().slice(0, 10),
      party_id: source.party_id,
      party_name_snapshot: source.party_name_snapshot,
      party_contact_snapshot: source.party_contact_snapshot,
      adjustments: { ...source.adjustments },
      loadings: source.loadings.map((l) => ({
        clientId: uuid(),
        loading_type: l.loading_type,
        loading_party: l.loading_party,
        location: l.location,
        contact: l.contact,
        items: l.items.map((it) => ({
          clientId: uuid(),
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          pack_size: it.pack_size,
          rate_snapshot: it.rate_snapshot,
          quantity: it.quantity,
          pricing_type: it.pricing_type,
        })),
      })),
    };
    const order = draftToOrder(newId, orderNumber, draft, nowISO());
    write(KEYS.orders, [...orders, order]);
    return order;
  },
};
