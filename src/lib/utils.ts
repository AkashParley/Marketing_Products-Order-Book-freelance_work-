import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatCurrency(n: number): string {
  return inr.format(n || 0);
}

const numFmt = new Intl.NumberFormat("en-IN");
export function formatNumber(n: number): string {
  return numFmt.format(n || 0);
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function clientId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function generateOrderNumber(existing: string[], year?: number): string {
  const y = year ?? new Date().getFullYear();
  const prefix = `ORD-${y}-`;
  let max = 0;
  for (const num of existing) {
    if (num.startsWith(prefix)) {
      const n = parseInt(num.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  const next = String(max + 1).padStart(4, "0");
  return `${prefix}${next}`;
}
