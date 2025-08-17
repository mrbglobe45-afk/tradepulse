// src/app/dashboard/page.tsx
import Link from "next/link";

export const dynamic = "force-static"; // on s'assure qu'aucun code client n'est exécuté ici

export default function DashboardSafe() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>TradePulse — Dashboard (safe)</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Page de test minimale pour confirmer que le crash venait d’un composant client.
      </p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <Link href="/auth">Aller à /auth</Link>
        </li>
        <li>
          <Link href="/">Retour à l’accueil</Link>
        </li>
      </ul>
    </main>
  );
}
