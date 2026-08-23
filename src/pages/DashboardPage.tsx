import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { IndianRupee, Package, Gift, Wallet, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOrders } from "@/hooks/useOrders";
import { getKpis, getMonthlyRevenue, getTopProducts, getTopParties } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/utils";

const BRAND = "#245740";
const AMBER = "#C1811A";

export default function DashboardPage() {
  const { orders, loading } = useOrders();

  const kpis = useMemo(() => getKpis(orders), [orders]);
  const monthly = useMemo(() => getMonthlyRevenue(orders, 6), [orders]);
  const topProducts = useMemo(() => getTopProducts(orders, 5), [orders]);
  const topParties = useMemo(() => getTopParties(orders, 5), [orders]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-paper-dim" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-paper-dim" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-paper-dim" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-soft">Business overview across all orders.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-base font-semibold text-ink">Nothing to show yet</div>
              <div className="text-sm text-ink-soft">Create your first order to start seeing KPIs here.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-soft">Business overview across all {kpis.totalOrders} orders.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard icon={ClipboardList} label="Orders" value={formatNumber(kpis.totalOrders)} />
        <KpiCard icon={IndianRupee} label="Gross Revenue" value={formatCurrency(kpis.totalGrossAmount)} accent />
        <KpiCard icon={Package} label="Total Bags" value={formatNumber(kpis.totalBags)} />
        <KpiCard icon={Gift} label="Free/Scheme Bags" value={formatNumber(kpis.freeBags)} />
        <KpiCard icon={Wallet} label="Net Closing Balance" value={formatCurrency(kpis.totalClosingBalance)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue — last 6 months</CardTitle>
          <CardDescription>Gross amount by order month.</CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#E4E0D6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#4B564F" }} axisLine={{ stroke: "#E4E0D6" }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#4B564F" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                width={40}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: 10, borderColor: "#E4E0D6", fontSize: 13 }}
              />
              <Bar dataKey="grossAmount" name="Gross Amount" fill={BRAND} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>By revenue, all-time.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#E4E0D6" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#4B564F" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#17201B" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: 10, borderColor: "#E4E0D6", fontSize: 13 }}
                />
                <Bar dataKey="revenue" name="Revenue" fill={BRAND} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top parties</CardTitle>
            <CardDescription>By revenue, all-time.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topParties}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#E4E0D6" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#4B564F" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#17201B" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: 10, borderColor: "#E4E0D6", fontSize: 13 }}
                />
                <Bar dataKey="revenue" name="Revenue" fill={AMBER} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            accent ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-mono-num text-lg font-semibold leading-tight text-ink sm:text-xl">{value}</div>
        <div className="text-xs font-medium text-ink-soft">{label}</div>
      </CardContent>
    </Card>
  );
}
