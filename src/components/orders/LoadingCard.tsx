import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Trash2, Plus, GripVertical, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateLineAmount, calculateLoadingTotals } from "@/lib/calculations";
import { formatCurrency, formatNumber, clientId } from "@/lib/utils";
import {
  LOADING_TYPES,
  PACK_SIZES,
  type DraftLoading,
  type DraftItem,
  type PackSize,
  type Product,
} from "@/types";

export function LoadingCard({
  loading,
  index,
  products,
  onChange,
  onRemove,
  onCopyWhatsapp,
}: {
  loading: DraftLoading;
  index: number;
  products: Product[];
  onChange: (next: DraftLoading) => void;
  onRemove: () => void;
  /** Optional — when provided, shows a "Copy" button that sends this single loading to WhatsApp. */
  onCopyWhatsapp?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const totals = calculateLoadingTotals(loading);
  const isCustomType = !(LOADING_TYPES as readonly string[])
    .slice(0, 2)
    .includes(loading.loading_type);

  function updateField<K extends keyof DraftLoading>(key: K, value: DraftLoading[K]) {
    onChange({ ...loading, [key]: value });
  }

  function addItem() {
    const newItem: DraftItem = {
      clientId: clientId(),
      product_id: null,
      product_name_snapshot: "",
      pack_size: 50,
      rate_snapshot: 0,
      quantity: "",
      pricing_type: "NORMAL",
    };
    onChange({ ...loading, items: [...loading.items, newItem] });
  }

  function updateItem(itemId: string, patch: Partial<DraftItem>) {
    onChange({
      ...loading,
      items: loading.items.map((it) => (it.clientId === itemId ? { ...it, ...patch } : it)),
    });
  }

  function removeItem(itemId: string) {
    onChange({ ...loading, items: loading.items.filter((it) => it.clientId !== itemId) });
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1 pr-2">
          <Collapsible.Trigger asChild>
            <button className="flex min-w-0 flex-1 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-paper-dim">
              <GripVertical className="h-4 w-4 shrink-0 text-ink-soft/50" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-sm font-semibold text-ink">Loading {index + 1}</span>
                <span className="truncate text-sm text-ink-soft">
                  {loading.loading_party || "Unnamed party"}
                </span>
                <Badge variant="outline">{loading.loading_type}</Badge>
                <span className="font-mono-num text-xs text-ink-soft">
                  {formatNumber(totals.totalBags)} bags{totals.freeBags ? ` (${totals.freeBags} free)` : ""}
                </span>
                <span className="font-mono-num text-sm font-semibold text-brand-700">
                  {formatCurrency(totals.loadingAmount)}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          </Collapsible.Trigger>
          {onCopyWhatsapp && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Copy this loading to WhatsApp"
              onClick={(e) => {
                e.stopPropagation();
                onCopyWhatsapp();
              }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Collapsible.Content>
          <div className="flex flex-col gap-4 border-t border-line px-5 py-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                <Label>Loading type</Label>
                <Select
                  value={isCustomType ? "Other" : loading.loading_type}
                  onValueChange={(v) => updateField("loading_type", v === "Other" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOADING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCustomType && (
                  <Input
                    value={loading.loading_type}
                    onChange={(e) => updateField("loading_type", e.target.value)}
                    placeholder="Type loading type"
                    autoFocus
                  />
                )}
              </div>
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                <Label>Loading party</Label>
                <Input
                  value={loading.loading_party}
                  onChange={(e) => updateField("loading_party", e.target.value)}
                  placeholder="e.g. Amrit Singh"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location</Label>
                <Input
                  value={loading.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Village / farm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Contact</Label>
                <Input
                  value={loading.contact}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="Phone number"
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Products</Label>
              <div className="flex flex-col gap-2">
                {loading.items.map((item) => (
                  <ItemRow
                    key={item.clientId}
                    item={item}
                    products={products}
                    onChange={(patch) => updateItem(item.clientId, patch)}
                    onRemove={() => removeItem(item.clientId)}
                  />
                ))}
              </div>
              <Button variant="secondary" size="sm" className="mt-1 w-fit" onClick={addItem}>
                <Plus className="h-3.5 w-3.5" /> Add Product
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-paper-dim px-4 py-3 text-sm">
              <div className="flex gap-4 text-ink-soft">
                <span>
                  Total Bags: <strong className="font-mono-num text-ink">{formatNumber(totals.totalBags)}</strong>
                </span>
                {totals.freeBags > 0 && (
                  <span>
                    Free: <strong className="font-mono-num text-amber-600">{formatNumber(totals.freeBags)}</strong>
                  </span>
                )}
              </div>
              <div className="font-mono-num font-semibold text-brand-700">
                {formatCurrency(totals.loadingAmount)}
              </div>
            </div>

            <Button variant="ghost" size="sm" className="w-fit text-rust-500 hover:bg-rust-500/10 hover:text-rust-600" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" /> Remove loading
            </Button>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card>
  );
}

function ItemRow({
  item,
  products,
  onChange,
  onRemove,
}: {
  item: DraftItem;
  products: Product[];
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}) {
  const amount = calculateLineAmount(item);
  const selectedProduct = products.find((p) => p.id === item.product_id);
  const matchedPack = selectedProduct?.packs.find((p) => p.size === item.pack_size);
  const rateNeedsManualEntry = !!selectedProduct && !matchedPack;

  function handleProductChange(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const defaultPack = product.packs[0];
    onChange({
      product_id: product.id,
      product_name_snapshot: product.name,
      pack_size: defaultPack ? defaultPack.size : item.pack_size,
      rate_snapshot: defaultPack ? defaultPack.rate : 0,
    });
  }

  function handlePackSizeChange(size: string) {
    const packSize = Number(size) as PackSize;
    const pack = selectedProduct?.packs.find((p) => p.size === packSize);
    onChange({ pack_size: packSize, rate_snapshot: pack ? pack.rate : 0 });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-xl border border-line bg-paper p-2.5">
      <div className="col-span-12 sm:col-span-4">
        <Select value={item.product_id ?? undefined} onValueChange={handleProductChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select product">{item.product_name_snapshot || undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.type === "PELLET" ? "Pellet" : "Mash"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3 sm:col-span-2">
        <Select value={String(item.pack_size)} onValueChange={handlePackSizeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {PACK_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} KG
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3 sm:col-span-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Qty"
          value={item.quantity}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ quantity: v === "" ? "" : Number(v) });
          }}
        />
      </div>
      <div className="col-span-3 sm:col-span-2">
        {item.pricing_type !== "FREE" && rateNeedsManualEntry ? (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Rate"
            value={item.rate_snapshot || ""}
            onChange={(e) => onChange({ rate_snapshot: e.target.value === "" ? 0 : Number(e.target.value) })}
            title="No listed rate for this bag size — enter it manually"
          />
        ) : (
          <div className="flex h-10 items-center rounded-lg border border-line bg-paper-dim px-3 font-mono-num text-sm text-ink-soft">
            {item.pricing_type === "FREE" ? "FREE" : formatCurrency(item.rate_snapshot)}
          </div>
        )}
      </div>
      <div className="col-span-3 sm:col-span-2">
        <div className="flex h-10 items-center rounded-lg px-3 font-mono-num text-sm font-semibold text-brand-700">
          {formatCurrency(amount)}
        </div>
      </div>
      <div className="col-span-8 flex items-center gap-2 sm:col-span-1">
        <button
          type="button"
          onClick={() => onChange({ pricing_type: item.pricing_type === "FREE" ? "NORMAL" : "FREE" })}
          className="w-full"
        >
          <Badge
            variant={item.pricing_type === "FREE" ? "amber" : "muted"}
            className="w-full cursor-pointer justify-center"
          >
            {item.pricing_type === "FREE" ? "Free" : "Normal"}
          </Badge>
        </button>
      </div>
      <div className="col-span-1 flex justify-end">
        <Button variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}