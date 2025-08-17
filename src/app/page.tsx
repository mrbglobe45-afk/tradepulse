// src/app/page.tsx
import Link from "next/link";

export const dynamic = "force-static"; // rendu 100% statique côté serveur

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        TradePulse
      </h1>

      <p style={{ marginBottom: 16, opacity: 0.75, maxWidth: 720, lineHeight: 1.5 }}>
        Page d’accueil minimale. Si tu vois cette page en production, le crash SSR
        était bien lié à un composant client. On garde cette page simple et on
        rend les graphiques uniquement côté client dans le dashboard.
      </p>

      <ul style={{ display: "flex", gap: 16, fontWeight: 600 }}>
        <li><Link href="/auth">Se connecter</Link></li>
        <li><Link href="/dashboard">Aller au dashboard</Link></li>
      </ul>
    </main>
  );
}

