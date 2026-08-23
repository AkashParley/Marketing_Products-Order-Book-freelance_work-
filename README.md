# Order Book — Personal Marketing Order Management

A fast, single-user web app that replaces the notebook + calculator + WhatsApp
formatting workflow for marketing orders: order → loadings → products →
automatic rate/amount → free/scheme handling → totals → adjustments →
closing balance → professional WhatsApp message.

## Stack

React + TypeScript + Vite, Tailwind CSS v4, Radix-based UI primitives
(shadcn-style), Supabase Postgres (optional), hand-rolled validation, Vitest.

## Running it

```bash
npm install
npm run dev
```

That's it — **no Supabase setup is required to use the app.** Without
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set, the app runs fully
offline against `localStorage`, seeded with the Geeta Ram & Sons demo order
so it's immediately usable.

### Connecting Supabase (optional, for real persistence)

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor (creates tables,
   seeds the product master, enables RLS with an open policy since there's
   no auth).
3. Copy `.env.example` to `.env` and fill in your project URL and anon key.
4. Restart `npm run dev`. The app now persists to Postgres — the local
   `localStorage` data does not migrate automatically.

## Testing

```bash
npm run test        # watch mode
npx vitest run       # single run
```

37 tests cover the calculation engine (line/loading/order totals, free/scheme
handling, closing balance, validation), the WhatsApp message generator, and a
full end-to-end workflow (create → persist → reload → edit → recalculate →
duplicate → delete) against the Geeta Ram & Sons sample order, including a
check that a changed product rate never alters historical order snapshots.

## Project structure

```
src/
  lib/calculations.ts     ← single source of truth for all order math
  lib/whatsapp.ts          ← WhatsApp message generator (uses calculations.ts)
  lib/store/                ← DataStore interface + localStorage/Supabase impls
  components/orders/        ← LoadingCard (collapsible), WhatsAppDialog
  components/ui/            ← Button, Card, Dialog, Select, etc.
  pages/                     ← Orders, OrderForm (create/edit), OrderView,
                                Products, Parties
supabase/schema.sql        ← Postgres schema + seed data
```

## Business rules implemented

- Product master with auto-filled rate; quantity-only entry on order lines.
- Historical rate snapshot per order item — editing the product master never
  changes past orders.
- Free/Scheme line items: quantity counts toward Total Bags, amount is
  always ₹0.
- Unlimited loadings per order, each collapsible, showing party/type/bags/
  amount when collapsed.
- Order totals: total loadings, total bags, free bags, payable bags, gross
  amount.
- Adjustments (Difference / Freight / C.D.) → Closing Balance, calculated
  live.
- Auto-generated order numbers: `ORD-2026-0001`, incrementing per year.
- WhatsApp message generated entirely from calculated values, with a preview
  dialog offering Copy Message / Open WhatsApp.
