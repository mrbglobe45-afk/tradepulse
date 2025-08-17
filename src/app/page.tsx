'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function HomeSafe() {
  const [envOk, setEnvOk] = useState<'ok' | 'missing' | 'unknown'>('unknown');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // Petit check “debug” pour vérifier que les variables d’env arrivent bien au client
  useEffect(() => {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setEnvOk(hasUrl && hasKey ? 'ok' : 'missing');

    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null);
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#0b0b10] text-white p-8">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-3xl font-extrabold">TradePulse — Build OK</h1>
        <p className="text-white/70">
          Cette page est volontairement minimaliste pour valider le déploiement en production.
        </p>

        <div className="rounded-xl border border-white/15 p-4">
          <div className="font-semibold mb-2">Debug rapide</div>
          <ul className="text-sm space-y-1">
            <li>
              Variables d’environnement côté client :{' '}
              <strong className={envOk === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>
                {envOk === 'ok' ? 'OK' : envOk === 'missing' ? 'MANQUANTES' : '…'}
              </strong>
            </li>
            <li>
              Session Supabase :{' '}
              <strong className={sessionEmail ? 'text-emerald-400' : 'text-white/60'}>
                {sessionEmail ?? 'aucune'}
              </strong>
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Link
            href="/auth"
            className="rounded-xl bg-white/10 px-4 py-2 border border-white/20 hover:bg-white/15"
          >
            Se connecter
          </Link>
          <button
            className="rounded-xl bg-white/10 px-4 py-2 border border-white/20 hover:bg-white/15"
            onClick={async () => {
              await supabase.auth.signOut();
              location.reload();
            }}
          >
            Se déconnecter
          </button>
        </div>

        <p className="text-xs text-white/50">
          Quand cette page s’affiche bien en prod, on réactive les graphes/composants petit à petit.
        </p>
      </div>
    </main>
  );
}
