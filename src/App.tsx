import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "@/components/ui/toast";
import { AppLayout } from "@/components/AppLayout";
import OrdersPage from "@/pages/OrdersPage";
import OrderFormPage from "@/pages/OrderFormPage";
import OrderViewPage from "@/pages/OrderViewPage";
import ProductsPage from "@/pages/ProductsPage";
import PartiesPage from "@/pages/PartiesPage";

// Charting library is heavy — keep it out of the main bundle so the
// fast order-entry flow doesn't pay for it on first load.
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-paper-dim" />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<OrderFormPage mode="create" />} />
            <Route path="/orders/:id" element={<OrderViewPage />} />
            <Route path="/orders/:id/edit" element={<OrderFormPage mode="edit" />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/parties" element={<PartiesPage />} />
            <Route path="*" element={<Navigate to="/orders" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
