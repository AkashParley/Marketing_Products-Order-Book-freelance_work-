import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, Package, Users, NotebookPen, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { usingSupabase } from "@/lib/store";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/products", label: "Products", icon: Package },
  { to: "/parties", label: "Parties", icon: Users },
];

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <NotebookPen className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-semibold text-ink">Order Book</div>
              <div className="hidden text-[11px] text-ink-soft sm:block">
                {usingSupabase ? "Connected to Supabase" : "Local mode — data stays on this device"}
              </div>
            </div>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-600 text-white"
                      : "text-ink-soft hover:bg-brand-50 hover:text-brand-700"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 backdrop-blur-sm sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium",
                isActive ? "text-brand-600" : "text-ink-soft"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="pb-24 pt-6 text-center text-[11px] text-ink-soft/60 sm:pb-4">
        Developed by <span className="font-medium text-ink-soft">PARLE</span>
      </div>
    </div>
  );
}