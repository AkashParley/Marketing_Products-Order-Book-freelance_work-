import { useState } from "react";
import { Plus, Pencil, Trash2, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useProducts } from "@/hooks/useProducts";
import { store } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { PACK_SIZES, PRODUCT_TYPES, type PackSize, type Product, type ProductPack, type ProductType } from "@/types";

export default function ProductsPage() {
  const { products, loading, refetch } = useProducts();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  async function handleToggleActive(p: Product) {
    try {
      await store.updateProduct(p.id, { active: !p.active });
      toast(p.active ? "Product marked inactive" : "Product marked active");
      refetch();
    } catch {
      toast("Could not update product", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await store.deleteProduct(deleteTarget.id);
      toast("Product deleted");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast("Could not delete product", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Products</h1>
          <p className="text-sm text-ink-soft">
            Each product can carry a rate per bag size (25 / 40 / 50 KG). Editing a rate never changes past orders.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add Product
        </Button>
      </div>

      {loading ? (
        <ProductsSkeleton />
      ) : products.length === 0 ? (
        <EmptyState onAdd={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className={!p.active ? "opacity-60" : undefined}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-semibold text-ink">{p.name}</span>
                      <Badge variant={p.type === "PELLET" ? "default" : "outline"}>
                        {p.type === "PELLET" ? "Pellet" : "Mash"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {p.packs.length === 0 && <span className="text-xs text-ink-soft">No rates set</span>}
                      {p.packs
                        .slice()
                        .sort((a, b) => a.size - b.size)
                        .map((pack) => (
                          <span
                            key={pack.size}
                            className="rounded-md bg-brand-50 px-2 py-1 font-mono-num text-xs text-brand-700"
                          >
                            {pack.size}kg — {formatCurrency(pack.rate)}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-xs font-medium text-ink-soft">
                    {p.active ? "Active" : "Inactive"}
                  </span>
                  <Switch checked={p.active} onCheckedChange={() => handleToggleActive(p)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          refetch();
        }}
      />
      <ProductDialog
        product={editing ?? undefined}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product from the master list. Existing orders keep their saved
              rate snapshot and are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: {
  product?: Product;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(product?.name ?? "");
  const [type, setType] = useState<ProductType>(product?.type ?? "PELLET");
  const [packs, setPacks] = useState<ProductPack[]>(product?.packs ?? [{ size: 50, rate: 0 }]);
  const [saving, setSaving] = useState(false);

  function resetFor(p?: Product) {
    setName(p?.name ?? "");
    setType(p?.type ?? "PELLET");
    setPacks(p?.packs?.length ? p.packs : [{ size: 50, rate: 0 }]);
  }

  function addPackRow() {
    const unused = PACK_SIZES.find((s) => !packs.some((p) => p.size === s));
    setPacks((prev) => [...prev, { size: unused ?? 50, rate: 0 }]);
  }

  function updatePack(index: number, patch: Partial<ProductPack>) {
    setPacks((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePack(index: number) {
    setPacks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast("Enter a product name", "error");
      return;
    }
    if (packs.length === 0) {
      toast("Add at least one bag size and rate", "error");
      return;
    }
    for (const p of packs) {
      if (!Number.isFinite(p.rate) || p.rate < 0) {
        toast("Enter a valid rate for every bag size", "error");
        return;
      }
    }
    const sizes = new Set(packs.map((p) => p.size));
    if (sizes.size !== packs.length) {
      toast("Each bag size can only be listed once", "error");
      return;
    }

    setSaving(true);
    try {
      if (product) {
        await store.updateProduct(product.id, { name: name.trim(), type, packs });
        toast("Product updated");
      } else {
        await store.createProduct({ name: name.trim(), type, packs, active: true });
        toast("Product added");
      }
      onSaved();
    } catch {
      toast("Could not save product", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetFor(product);
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-name">Product name</Label>
              <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fighter" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProductType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "PELLET" ? "Pellet" : "Mash"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Bag sizes &amp; rates</Label>
            <div className="flex flex-col gap-2">
              {packs.map((pack, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={String(pack.size)} onValueChange={(v) => updatePack(idx, { size: Number(v) as PackSize })}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACK_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} KG
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="Rate ₹"
                    value={pack.rate || ""}
                    onChange={(e) => updatePack(idx, { rate: e.target.value === "" ? 0 : Number(e.target.value) })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removePack(idx)}
                    disabled={packs.length === 1}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {packs.length < PACK_SIZES.length && (
              <Button variant="secondary" size="sm" className="w-fit" onClick={addPackRow}>
                <Plus className="h-3.5 w-3.5" /> Add bag size
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Package className="h-6 w-6" />
        </div>
        <div>
          <div className="font-display text-base font-semibold text-ink">No products yet</div>
          <div className="text-sm text-ink-soft">Add your product master to start building orders.</div>
        </div>
        <Button onClick={onAdd}>
          <Plus /> Add Product
        </Button>
      </CardContent>
    </Card>
  );
}

function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-paper-dim" />
      ))}
    </div>
  );
}
