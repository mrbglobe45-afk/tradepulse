'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[#0b0b10] text-white p-8">
      <h1 className="text-2xl font-bold mb-4">TradePulse</h1>

      {email ? (
        <div className="flex items-center gap-3">
          <span>Connecté en tant que <strong>{email}</strong></span>
          <button
            className="border border-white/30 rounded px-3 py-1 hover:bg-white/10"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace('/auth');
            }}
          >
            Se déconnecter
          </button>
        </div>
      ) : (
        <Link href="/auth" className="underline">
          Se connecter
        </Link>
      )}

      <p className="mt-6 text-white/70">
        Page de test minimale. Si tu vois cette page en production, le “blanc” est réglé et
        le crash venait d’un composant (très probablement les charts). On les réactivera ensuite.
      </p>
    </main>
  );
}
