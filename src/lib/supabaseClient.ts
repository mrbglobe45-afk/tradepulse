// lib/supabaseClient.ts
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ⚠️ Ces deux variables DOIVENT exister en prod et preview.
// Vercel: Project Settings → Environment Variables
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error("Env manquantes: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

function makeClient(): SupabaseClient {
  return createClient(url, anon, {
    auth: {
      persistSession: true,
      storageKey: "tradepulse.auth.v1",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
    global: {
      headers: { "x-application-name": "tradepulse" },
    },
  });
}

// Singleton côté navigateur (évite de dupliquer le client en HMR)
export const supabase: SupabaseClient =
  (globalThis as any).__tp_supabase__ ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__tp_supabase__ = supabase;
}
