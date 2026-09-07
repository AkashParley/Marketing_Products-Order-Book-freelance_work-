import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { WhatsAppDialog } from "@/components/orders/WhatsAppDialog";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { store } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { calculateLineAmount, calculateLoadingTotals, calculateOrderTotals } from "@/lib/calculations";
import { generateWhatsAppMessage, generateLoadingMessage } from "@/lib/whatsapp";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [loadingWhatsappIdx, setLoadingWhatsappIdx] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    store.getOrder(id).then((o) => {
      setOrder(o);
      setLoading(false);
      if (!o) toast("Order not found", "error");
    });
  }, [id]);

  async function handleDuplicate() {
    if (!order) return;
    try {
      const created = await store.duplicateOrder(order.id);
      toast(`Duplicated as ${created.order_number}`);
      navigate(`/orders/${created.id}/edit`);
    } catch {
      toast("Could not duplicate order", "error");
    }
  }

  async function handleDelete() {
    if (!order) return;
    try {
      await store.deleteOrder(order.id);
      toast("Order deleted");
      navigate("/orders");
    } catch {
      toast("Could not delete order", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-paper-dim" />
        <div className="h-40 animate-pulse rounded-2xl bg-paper-dim" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-ink-soft">This order doesn't exist or was deleted.</p>
        <Button asChild>
          <Link to="/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const totals = calculateOrderTotals(order);

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono-num font-display text-2xl font-semibold text-ink">{order.order_number}</h1>
              <span className="text-sm text-ink-soft">{formatDate(order.order_date)}</span>
            </div>
            <p className="text-sm text-ink-soft">{order.party_name_snapshot}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setWhatsappOpen(true)}>
            <WhatsAppIcon className="h-4 w-4" /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy /> Duplicate
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/orders/${order.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="text-rust-500 hover:bg-rust-500/10 hover:text-rust-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Order Party</div>
            <div className="font-display text-base font-semibold text-ink">{order.party_name_snapshot}</div>
            {order.party_contact_snapshot && <div className="text-sm text-ink-soft">{order.party_contact_snapshot}</div>}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {order.loadings.map((loading, idx) => {
          const t = calculateLoadingTotals(loading);
          return (
            <Card key={loading.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-semibold text-ink">Loading {idx + 1}</span>
                    <span className="text-sm text-ink-soft">{loading.loading_party}</span>
                    <Badge variant="outline">{loading.loading_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-sm font-semibold text-brand-700">{formatCurrency(t.loadingAmount)}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Copy this loading to WhatsApp"
                      onClick={() => setLoadingWhatsappIdx(idx)}
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(loading.location || loading.contact) && (
                  <div className="text-xs text-ink-soft">
                    {[loading.location, loading.contact].filter(Boolean).join(" · ")}
                  </div>
                )}
                <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
                  {loading.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-ink">{item.product_name_snapshot}</span>
                        <span className="text-xs text-ink-soft">({item.pack_size}kg)</span>
                        {item.pricing_type === "FREE" && <Badge variant="amber">Free/Scheme</Badge>}
                      </div>
                      <div className="flex items-center gap-4 font-mono-num text-ink-soft">
                        <span>{formatNumber(item.quantity)} bags</span>
                        <span>{item.pricing_type === "FREE" ? "FREE" : formatCurrency(item.rate_snapshot)}</span>
                        <span className="w-20 text-right font-semibold text-ink">{formatCurrency(calculateLineAmount(item))}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-6 text-sm text-ink-soft">
                  <span>Total Bags: <strong className="font-mono-num text-ink">{t.totalBags}</strong></span>
                  {t.freeBags > 0 && <span>Free: <strong className="font-mono-num text-amber-600">{t.freeBags}</strong></span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Order Summary</h2>
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-paper-dim p-4 text-sm sm:grid-cols-4">
            <SummaryStat label="Loadings" value={String(totals.totalLoadings)} />
            <SummaryStat label="Total Bags" value={String(totals.totalBags)} />
            <SummaryStat label="Free Bags" value={String(totals.freeBags)} />
            <SummaryStat label="Payable Bags" value={String(totals.payableBags)} />
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Gross Amount" value={formatCurrency(totals.grossAmount)} />
            <Row label="Difference" value={`− ${formatCurrency(order.adjustments.difference)}`} muted />
            <Row label="Freight" value={`− ${formatCurrency(order.adjustments.freight)}`} muted />
            <Row label="Base Amount" value={formatCurrency(totals.baseAmount)} />
            <Row label={`C.D. (${formatNumber(order.adjustments.cd_percent)}%)`} value={`− ${formatCurrency(totals.cdAmount)}`} muted />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-brand-600 px-5 py-4 text-white">
            <span className="font-display text-base font-medium">Closing Balance</span>
            <span className="font-mono-num text-2xl font-semibold">{formatCurrency(totals.closingBalance)}</span>
          </div>
        </CardContent>
      </Card>

      <WhatsAppDialog
        message={generateWhatsAppMessage(order)}
        phone={order.party_contact_snapshot}
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
      />
      <WhatsAppDialog
        message={loadingWhatsappIdx !== null ? generateLoadingMessage(order, loadingWhatsappIdx) : null}
        phone={order.party_contact_snapshot}
        open={loadingWhatsappIdx !== null}
        onOpenChange={(v) => !v && setLoadingWhatsappIdx(null)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {order.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the order and all its loadings. This can't be undone.</AlertDialogDescription>
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="font-mono-num text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className={`font-mono-num font-medium ${muted ? "text-ink-soft" : "text-ink"}`}>{value}</span>
    </div>
  );
}