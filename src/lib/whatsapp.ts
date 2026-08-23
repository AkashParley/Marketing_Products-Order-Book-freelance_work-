import type { DraftLoading, Order } from "@/types";
import { calculateLoadingTotals, calculateOrderTotals, calculateLineAmount } from "./calculations";
import { formatCurrency, formatDate, formatNumber } from "./utils";

/** Structural shape shared by a saved `Loading` and an in-progress `DraftLoading`. */
interface LoadingLike {
  loading_type: string;
  loading_party: string;
  location: string;
  contact: string;
  items: {
    product_name_snapshot: string;
    pack_size: number;
    rate_snapshot: number;
    quantity: number | "";
    pricing_type: "NORMAL" | "FREE";
  }[];
}

/** Structural shape shared by a saved `Order` and an in-progress `DraftOrder`, for the header block. */
interface HeaderLike {
  order_date: string;
  party_name_snapshot: string;
  party_contact_snapshot: string | null;
}

function headerLines(order: HeaderLike): string[] {
  const lines: string[] = [];
  lines.push(`Date: ${formatDate(order.order_date)}`);
  lines.push("");
  lines.push(`*${order.party_name_snapshot}*`);
  if (order.party_contact_snapshot) lines.push(order.party_contact_snapshot);
  return lines;
}

function loadingBlock(loading: LoadingLike, index: number): string[] {
  const totals = calculateLoadingTotals(loading);
  const lines: string[] = [];
  lines.push(`*Loading ${index + 1} — ${loading.loading_type}*`);
  const contactLine = [loading.loading_party, loading.location, loading.contact]
    .filter(Boolean)
    .join(", ");
  if (contactLine) lines.push(contactLine);

  loading.items.forEach((item) => {
    const amount = calculateLineAmount(item);
    const qty = typeof item.quantity === "number" ? item.quantity : 0;
    if (item.pricing_type === "FREE") {
      lines.push(`${item.product_name_snapshot} (${item.pack_size}kg) — ${formatNumber(qty)} × Free/Scheme = ₹0`);
    } else {
      lines.push(
        `${item.product_name_snapshot} (${item.pack_size}kg) — ${formatNumber(qty)} × ${formatCurrency(
          item.rate_snapshot
        )} = ${formatCurrency(amount)}`
      );
    }
  });

  lines.push(`Bags: ${formatNumber(totals.totalBags)}${totals.freeBags ? ` (incl. ${totals.freeBags} free)` : ""}`);
  lines.push(`Loading Amount: ${formatCurrency(totals.loadingAmount)}`);
  return lines;
}

/** Full order message: header + every loading + order summary. */
export function generateWhatsAppMessage(order: Order): string {
  const lines: string[] = [...headerLines(order)];

  order.loadings.forEach((loading, idx) => {
    lines.push("");
    lines.push(...loadingBlock(loading, idx));
  });

  const orderTotals = calculateOrderTotals(order);
  const cdPercent = order.adjustments.cd_percent;

  lines.push("");
  lines.push("*Order Summary*");
  lines.push(`Total Loadings: ${orderTotals.totalLoadings}`);
  lines.push(`Total Bags: ${formatNumber(orderTotals.totalBags)}`);
  if (orderTotals.freeBags) lines.push(`Free Bags: ${formatNumber(orderTotals.freeBags)}`);
  lines.push(`Payable Bags: ${formatNumber(orderTotals.payableBags)}`);
  lines.push(`Gross Amount: ${formatCurrency(orderTotals.grossAmount)}`);
  lines.push("");
  lines.push(`Difference: ${formatCurrency(order.adjustments.difference)}`);
  lines.push(`Freight: ${formatCurrency(order.adjustments.freight)}`);
  lines.push(`C.D. (${formatNumber(cdPercent)}%): ${formatCurrency(orderTotals.cdAmount)}`);
  lines.push("");
  lines.push(`*Closing Balance: ${formatCurrency(orderTotals.closingBalance)}*`);

  return lines.join("\n");
}

/**
 * Message for a single loading only — header (date + party) plus just that
 * loading's products and totals. Used by each loading's "Copy" action so
 * one truck's worth of the order can be sent on its own, for an order
 * that has already been saved.
 */
export function generateLoadingMessage(order: Order, loadingIndex: number): string {
  const loading = order.loadings[loadingIndex];
  if (!loading) return "";
  const lines: string[] = [...headerLines(order), "", ...loadingBlock(loading, loadingIndex)];
  return lines.join("\n");
}

/**
 * Same as `generateLoadingMessage`, but works directly off in-progress form
 * state (no saved ids required) — so a loading can be copied to WhatsApp
 * before the order has been saved.
 */
export function generateDraftLoadingMessage(
  header: HeaderLike,
  loading: DraftLoading,
  index: number
): string {
  const lines: string[] = [...headerLines(header), "", ...loadingBlock(loading, index)];
  return lines.join("\n");
}

export function whatsappShareUrl(message: string, phone?: string | null): string {
  const cleanPhone = phone ? phone.replace(/[^\d+]/g, "") : "";
  const base = cleanPhone ? `https://wa.me/${cleanPhone.replace(/^\+/, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
