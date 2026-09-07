// ── Domain types ────────────────────────────────────────────────────────

export type PricingType = "NORMAL" | "FREE";

export const LOADING_TYPES = ["Driver Side", "Centre", "Other"] as const;
/** Preset suggestions, but the field accepts any custom text (via "Other"). */
export type LoadingType = string;

export const PRODUCT_TYPES = ["PELLET", "MASH"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Bag sizes a product can be sold in. Each size can carry its own rate. */
export const PACK_SIZES = [25, 40, 50] as const;
export type PackSize = (typeof PACK_SIZES)[number];

export interface ProductPack {
  size: PackSize;
  rate: number;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  /** One entry per bag size this product is sold in (e.g. 25kg @ ₹1,110, 50kg @ ₹1,730). */
  packs: ProductPack[];
  active: boolean;
  created_at: string;
}

export interface Party {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  loading_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  pack_size: PackSize;
  rate_snapshot: number;
  quantity: number;
  pricing_type: PricingType;
  sort_order: number;
}

export interface Loading {
  id: string;
  order_id: string;
  loading_type: LoadingType;
  loading_party: string;
  location: string;
  contact: string;
  sort_order: number;
  items: OrderItem[];
}

export interface OrderAdjustments {
  difference: number;
  freight: number;
  /** C.D. is entered as a percentage of the Base Amount, not a flat rupee value. */
  cd_percent: number;
}

export interface Order {
  id: string;
  order_number: string;
  order_date: string; // ISO date
  party_id: string | null;
  party_name_snapshot: string;
  party_contact_snapshot: string | null;
  adjustments: OrderAdjustments;
  created_at: string;
  updated_at: string;
  loadings: Loading[];
}

// ── Calculation result shapes ──────────────────────────────────────────

export interface LineCalc {
  amount: number;
}

export interface LoadingTotals {
  totalBags: number;
  freeBags: number;
  payableBags: number;
  loadingAmount: number;
}

export interface OrderTotals {
  totalLoadings: number;
  totalBags: number;
  freeBags: number;
  payableBags: number;
  grossAmount: number;
  /** Gross Amount − Difference − Freight — the figure C.D.% is applied against. */
  baseAmount: number;
  /** C.D. amount in rupees, i.e. baseAmount × adjustments.cd_percent / 100. */
  cdAmount: number;
  closingBalance: number;
}

// ── Draft types used while editing an order (before persistence ids exist) ─

export interface DraftItem {
  clientId: string;
  product_id: string | null;
  product_name_snapshot: string;
  pack_size: PackSize;
  rate_snapshot: number;
  quantity: number | "";
  pricing_type: PricingType;
}

export interface DraftLoading {
  clientId: string;
  loading_type: LoadingType;
  loading_party: string;
  location: string;
  contact: string;
  items: DraftItem[];
}

export interface DraftOrder {
  order_date: string;
  party_id: string | null;
  party_name_snapshot: string;
  party_contact_snapshot: string | null;
  loadings: DraftLoading[];
  adjustments: OrderAdjustments;
}