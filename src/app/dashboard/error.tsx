'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('DASHBOARD CRASH:', error);
  }, [error]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Oups — erreur sur le dashboard</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Un composant a planté en production. Regarde la console du navigateur pour le détail.
      </p>
      <button
        onClick={() => reset()}
        style={{
          border: '1px solid #888',
          padding: '8px 12px',
          borderRadius: 8,
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
