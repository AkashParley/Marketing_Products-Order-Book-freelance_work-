import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Copy,
  MessageCircle,
  Trash2,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useOrders } from "@/hooks/useOrders";
import { store } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { calculateOrderTotals } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WhatsAppDialog } from "@/components/orders/WhatsAppDialog";
import { generateWhatsAppMessage } from "@/lib/whatsapp";
import type { Order } from "@/types";

export default function OrdersPage() {
  const { orders, loading, refetch } = useOrders();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [whatsappOrder, setWhatsappOrder] = useState<Order | null>(null);

  const partyOptions = useMemo(() => {
    const names = new Set(orders.map((o) => o.party_name_snapshot));
    return Array.from(names).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          o.order_number.toLowerCase().includes(q) ||
          o.party_name_snapshot.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (dateFilter && o.order_date !== dateFilter) return false;
      if (partyFilter !== "all" && o.party_name_snapshot !== partyFilter) return false;
      return true;
    });
  }, [orders, search, dateFilter, partyFilter]);

  async function handleDuplicate(order: Order) {
    try {
      const created = await store.duplicateOrder(order.id);
      toast(`Duplicated as ${created.order_number}`);
      refetch();
      navigate(`/orders/${created.id}/edit`);
    } catch {
      toast("Could not duplicate order", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await store.deleteOrder(deleteTarget.id);
      toast("Order deleted");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast("Could not delete order", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Orders</h1>
          <p className="text-sm text-ink-soft">{orders.length} total order{orders.length === 1 ? "" : "s"}</p>
        </div>
        <Button asChild size="lg">
          <Link to="/orders/new">
            <Plus /> New Order
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number or party…"
              className="pl-9"
            />
          </div>
          <div className="relative w-full sm:w-44">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-52">
            <Select value={partyFilter} onValueChange={setPartyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All parties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All parties</SelectItem>
                {partyOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <OrdersSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState hasOrders={orders.length > 0} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => {
            const totals = calculateOrderTotals(order);
            return (
              <Card key={order.id} className="transition-shadow hover:shadow-[var(--shadow-card-hover)]">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono-num text-sm font-semibold text-brand-700">{order.order_number}</span>
                      <span className="text-xs text-ink-soft">{formatDate(order.order_date)}</span>
                    </div>
                    <div className="mt-1 truncate font-display text-base font-semibold text-ink">
                      {order.party_name_snapshot}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                      <span>{totals.totalLoadings} loading{totals.totalLoadings === 1 ? "" : "s"}</span>
                      <span>{totals.totalBags} bags{totals.freeBags ? ` (${totals.freeBags} free)` : ""}</span>
                      <span className="font-mono-num font-medium text-ink">{formatCurrency(totals.closingBalance)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button variant="ghost" size="icon-sm" title="View" asChild>
                      <Link to={`/orders/${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Edit" asChild>
                      <Link to={`/orders/${order.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Duplicate" onClick={() => handleDuplicate(order)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="WhatsApp" onClick={() => setWhatsappOrder(order)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => setDeleteTarget(order)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <WhatsAppDialog
        message={whatsappOrder ? generateWhatsAppMessage(whatsappOrder) : null}
        phone={whatsappOrder?.party_contact_snapshot}
        open={!!whatsappOrder}
        onOpenChange={(v) => !v && setWhatsappOrder(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.order_number}?</AlertDialogTitle>
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

function EmptyState({ hasOrders }: { hasOrders: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <div className="font-display text-base font-semibold text-ink">
            {hasOrders ? "No orders match your filters" : "No orders yet"}
          </div>
          <div className="text-sm text-ink-soft">
            {hasOrders ? "Try clearing search or filters." : "Create your first order to get started."}
          </div>
        </div>
        {!hasOrders && (
          <Button asChild>
            <Link to="/orders/new">
              <Plus /> New Order
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-paper-dim" />
      ))}
    </div>
  );
}
