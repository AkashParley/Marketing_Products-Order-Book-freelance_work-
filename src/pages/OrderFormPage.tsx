import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, MessageCircle, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingCard } from "@/components/orders/LoadingCard";
import { WhatsAppDialog } from "@/components/orders/WhatsAppDialog";
import { useProducts } from "@/hooks/useProducts";
import { useParties } from "@/hooks/useParties";
import { useToast } from "@/components/ui/toast";
import { store } from "@/lib/store";
import { calculateOrderTotals, validateOrder } from "@/lib/calculations";
import { generateWhatsAppMessage, generateDraftLoadingMessage } from "@/lib/whatsapp";
import { formatCurrency, clientId, todayISO } from "@/lib/utils";
import type { DraftLoading, DraftOrder, Order } from "@/types";

function emptyLoading(): DraftLoading {
  return {
    clientId: clientId(),
    loading_type: "Driver Side",
    loading_party: "",
    location: "",
    contact: "",
    items: [],
  };
}

function emptyDraft(): DraftOrder {
  return {
    order_date: todayISO(),
    party_id: null,
    party_name_snapshot: "",
    party_contact_snapshot: "",
    adjustments: { difference: 0, freight: 0, cd_percent: 0 },
    loadings: [],
  };
}

function orderToDraft(order: Order): DraftOrder {
  return {
    order_date: order.order_date,
    party_id: order.party_id,
    party_name_snapshot: order.party_name_snapshot,
    party_contact_snapshot: order.party_contact_snapshot,
    adjustments: { ...order.adjustments },
    loadings: order.loadings.map((l) => ({
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
}

export default function OrderFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { products } = useProducts();
  const { parties } = useParties();

  const [draft, setDraft] = useState<DraftOrder>(emptyDraft());
  const [loadingOrder, setLoadingOrder] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [loadingWhatsappMsg, setLoadingWhatsappMsg] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && id) {
      store.getOrder(id).then((order) => {
        if (order) {
          setDraft(orderToDraft(order));
          setOrderNumber(order.order_number);
        } else {
          toast("Order not found", "error");
          navigate("/orders");
        }
        setLoadingOrder(false);
      });
    }
  }, [mode, id]);

  const activeProducts = products.filter((p) => p.active);
  const totals = calculateOrderTotals(draft);

  function updateAdjustment(key: keyof DraftOrder["adjustments"], value: string) {
    const num = value === "" ? 0 : Number(value);
    setDraft((d) => ({ ...d, adjustments: { ...d.adjustments, [key]: Number.isFinite(num) ? num : 0 } }));
  }

  function handlePartyNameChange(name: string) {
    const match = parties.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    setDraft((d) => ({
      ...d,
      party_id: match ? match.id : null,
      party_name_snapshot: name,
      party_contact_snapshot: match ? match.phone : d.party_contact_snapshot,
    }));
  }

  function addLoading() {
    setDraft((d) => ({ ...d, loadings: [...d.loadings, emptyLoading()] }));
  }

  function updateLoading(idx: number, next: DraftLoading) {
    setDraft((d) => ({
      ...d,
      loadings: d.loadings.map((l, i) => (i === idx ? next : l)),
    }));
  }

  function removeLoading(idx: number) {
    setDraft((d) => ({ ...d, loadings: d.loadings.filter((_, i) => i !== idx) }));
  }

  function copyLoadingWhatsapp(idx: number) {
    const loading = draft.loadings[idx];
    if (!loading) return;
    if (!draft.party_name_snapshot.trim()) {
      toast("Enter an order party first", "error");
      return;
    }
    const msg = generateDraftLoadingMessage(
      { order_date: draft.order_date, party_name_snapshot: draft.party_name_snapshot, party_contact_snapshot: draft.party_contact_snapshot },
      loading,
      idx
    );
    setLoadingWhatsappMsg(msg);
  }

  async function handleSave(andWhatsapp = false) {
    const err = validateOrder(draft);
    if (err) {
      setError(err);
      toast(err, "error");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let order: Order;
      if (mode === "edit" && id) {
        order = await store.updateOrder(id, draft);
        toast("Order updated");
      } else {
        order = await store.createOrder(draft);
        toast(`Order ${order.order_number} created`);
      }
      setSavedOrder(order);
      if (andWhatsapp) {
        setWhatsappOpen(true);
      } else {
        navigate(`/orders/${order.id}`);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save order", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loadingOrder) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-paper-dim" />
        <div className="h-40 animate-pulse rounded-2xl bg-paper-dim" />
        <div className="h-64 animate-pulse rounded-2xl bg-paper-dim" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {mode === "edit" ? `Edit ${orderNumber}` : "New Order"}
          </h1>
          <p className="text-sm text-ink-soft">Order number auto-generates on save.</p>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Order Date</Label>
            <Input
              type="date"
              value={draft.order_date}
              onChange={(e) => setDraft((d) => ({ ...d, order_date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Order Party</Label>
            <Input
              list="party-suggestions"
              value={draft.party_name_snapshot}
              onChange={(e) => handlePartyNameChange(e.target.value)}
              placeholder="Type or pick a party name"
            />
            <datalist id="party-suggestions">
              {parties.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            {parties.length === 0 ? (
              <p className="text-xs text-ink-soft">
                Type a new party name, or{" "}
                <Link to="/parties" className="text-brand-600 underline">
                  add one to your list
                </Link>{" "}
                to reuse it later.
              </p>
            ) : (
              <p className="text-xs text-ink-soft">
                Start typing to pick a saved party, or enter a new name.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Party Contact</Label>
            <Input
              value={draft.party_contact_snapshot ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, party_contact_snapshot: e.target.value }))}
              placeholder="Phone number"
              inputMode="tel"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {draft.loadings.map((loading, idx) => (
          <LoadingCard
            key={loading.clientId}
            loading={loading}
            index={idx}
            products={activeProducts}
            onChange={(next) => updateLoading(idx, next)}
            onRemove={() => removeLoading(idx)}
            onCopyWhatsapp={() => copyLoadingWhatsapp(idx)}
          />
        ))}

        {draft.loadings.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm text-ink-soft">No loadings yet. Add your first loading to begin.</p>
            </CardContent>
          </Card>
        )}

        <Button variant="secondary" onClick={addLoading} className="w-fit">
          <Plus /> Add Loading
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Order Summary</h2>

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-paper-dim p-4 text-sm sm:grid-cols-4">
            <SummaryStat label="Loadings" value={String(totals.totalLoadings)} />
            <SummaryStat label="Total Bags" value={String(totals.totalBags)} />
            <SummaryStat label="Free Bags" value={String(totals.freeBags)} />
            <SummaryStat label="Payable Bags" value={String(totals.payableBags)} />
          </div>

          <div className="flex items-center justify-between border-b border-line pb-4">
            <span className="text-sm font-medium text-ink-soft">Gross Amount</span>
            <span className="font-mono-num text-xl font-semibold text-ink">{formatCurrency(totals.grossAmount)}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Difference</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={draft.adjustments.difference || ""}
                onChange={(e) => updateAdjustment("difference", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Freight</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={draft.adjustments.freight || ""}
                onChange={(e) => updateAdjustment("freight", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>C.D. (% of Gross Amount)</Label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  value={draft.adjustments.cd_percent || ""}
                  onChange={(e) => updateAdjustment("cd_percent", e.target.value)}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">%</span>
              </div>
              <p className="text-xs text-ink-soft">
                = {formatCurrency(totals.cdAmount)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-brand-600 px-5 py-4 text-white">
            <span className="font-display text-base font-medium">Closing Balance</span>
            <span className="font-mono-num text-2xl font-semibold">{formatCurrency(totals.closingBalance)}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rust-500/10 px-4 py-2.5 text-sm text-rust-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
              <MessageCircle /> Save &amp; Copy WhatsApp
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving}>
              <Save /> {saving ? "Saving…" : "Save Order"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <WhatsAppDialog
        message={savedOrder ? generateWhatsAppMessage(savedOrder) : null}
        phone={savedOrder?.party_contact_snapshot}
        open={whatsappOpen}
        onOpenChange={(v) => {
          setWhatsappOpen(v);
          if (!v && savedOrder) navigate(`/orders/${savedOrder.id}`);
        }}
      />

      <WhatsAppDialog
        message={loadingWhatsappMsg}
        phone={draft.party_contact_snapshot}
        open={!!loadingWhatsappMsg}
        onOpenChange={(v) => !v && setLoadingWhatsappMsg(null)}
      />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="font-mono-num text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}
