'use client';

import { supabase } from './supabaseClient';

export type DbTrade = {
  id: string;                 // uuid
  user_id: string;            // attribué à l'utilisateur connecté
  date: string;               // 'YYYY-MM-DD'
  symbol: string;
  direction: 'LONG' | 'SHORT';
  setup: string | null;
  r: number;                  // résultat en R
  created_at: string;
};

/** Récupère l'utilisateur connecté (ou null) */
export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Lit tous les trades de l'utilisateur, triés par date ASC */
export async function fetchTrades(): Promise<DbTrade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;
  return data as DbTrade[];
}

/** Crée / met à jour un trade (upsert).
 *  Si t.id est absent, on génère un uuid côté navigateur (compatible Postgres).
 */
export async function saveTrade(t: {
  id?: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  setup?: string | null;
  R: number; // on mappe R (UI) -> r (DB)
}): Promise<DbTrade> {
  const uid = await getUserId();
  if (!uid) throw new Error('Not signed in');

  const payload = {
    id: t.id && t.id.length === 36 ? t.id : crypto.randomUUID(),
    user_id: uid,
    date: t.date,
    symbol: t.symbol,
    direction: t.direction,
    setup: t.setup ?? null,
    r: Number.isFinite(t.R) ? t.R : 0,
  };

  const { data, error } = await supabase
    .from('trades')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data as DbTrade;
}

/** Supprime un trade par id */
export async function deleteTrade(id: string): Promise<void> {
  const { error } = await supabase.from('trades').delete().eq('id', id);
  if (error) throw error;
}

/** Abonnement temps réel : on écoute toutes les modifs sur la table 'trades' */
export function subscribeTrades(
  userId: string,
  onChange: (evt: { type: 'INSERT' | 'UPDATE' | 'DELETE' }) => void
) {
  const channel = supabase
    .channel('trades-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` },
      (payload) => {
        const t = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        onChange({ type: t });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
