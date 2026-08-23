import { isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "./local";
import { supabaseStore } from "./supabase-store";
import type { DataStore } from "./types";

/**
 * The rest of the app only ever imports `store` from here — it never talks
 * to localStorage or the Supabase client directly. When VITE_SUPABASE_URL
 * and VITE_SUPABASE_ANON_KEY are set (see .env.example), orders/products/
 * parties persist to Postgres. Without them, the app runs fully offline
 * against localStorage using the exact same interface, seeded with the
 * Geeta Ram & Sons demo order so the app is usable immediately.
 */
export const store: DataStore = isSupabaseConfigured ? supabaseStore : localStore;
export const usingSupabase = isSupabaseConfigured;

export type { DataStore } from "./types";
