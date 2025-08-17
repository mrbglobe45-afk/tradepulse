// lib/trades.ts
"use client";

import { supabase } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type DbTrade = {
  id: string;
  user_id: string;
  date: string; // "YYYY-MM-DD"
  symbol: string;
  direction: "LONG" | "SHORT";
  setup: string | null;
  r: number; // valeur en R stockée en base
};

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchTrades(): Promise<DbTrade[]> {
  const uid = await getUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("trades")
    .select("id,user_id,date,symbol,direction,setup,r")
    .eq("user_id", uid) // redondant si RLS filtre déjà, mais évite les surprises
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbTrade[];
}

type SaveInput = {
  id?: string;
  date: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  setup: string | null;
  R: number;
};

export async function saveTrade(input: SaveInput): Promise<DbTrade> {
  const uid = await getUserId();
  if (!uid) throw new Error("Not authenticated");

  const payload = {
    id: input.id, // si présent → update via upsert
    user_id: uid,
    date: input.date,
    symbol: input.symbol,
    direction: input.direction,
    setup: input.setup,
    r: Number(input.R) || 0,
  };

  const { data, error } = await supabase
    .from("trades")
    .upsert(payload, { onConflict: "id" })
    .select("id,user_id,date,symbol,direction,setup,r")
    .single();

  if (error) throw new Error(error.message);
  return data as DbTrade;
}

export async function deleteTrade(id: string): Promise<void> {
  const uid = await getUserId();
  if (!uid) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", id)
    .eq("user_id", uid); // cohérent avec des policies RLS strictes
  if (error) throw new Error(error.message);
}

export function subscribeTrades(
  uid: string,
  onChange: () => void
): () => void {
  // Assurez-vous que la réplication Realtime est activée côté Supabase pour la table 'trades'
  const channel: RealtimeChannel = supabase
    .channel(`realtime:trades:${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${uid}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
