'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible dans la console du navigateur en prod
    console.error('TradePulse – client error:', error);
  }, [error]);

  return (
    <main className="min-h-screen grid place-items-center bg-[#0b0b10] text-white p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Oups, une erreur a été capturée</h1>
        <p className="text-white/70">
          Le rendu client a levé une exception. Ouvre la console (F12 → “Console”)
          pour voir le détail exact (plus de “rectangle blanc” silencieux).
        </p>
        <button
          onClick={() => reset()}
          className="rounded-xl bg-white/10 px-4 py-2 border border-white/20 hover:bg-white/15"
        >
          Recharger la page
        </button>
      </div>
    </main>
  );
}
