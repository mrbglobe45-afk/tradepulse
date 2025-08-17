// app/auth/page.tsx
"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function AuthPage() {
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) window.location.href = "/";
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg,#0b0b10,#141421 60%,#0b0b10)" }}>
      <div className="w-full max-w-md">
        <h1 className="mb-4 text-center text-2xl font-semibold text-white">Connexion</h1>

        <Auth
          supabaseClient={supabase}
          providers={[]}
          localization={{ lang: "fr" }}
          redirectTo={typeof window !== "undefined" ? window.location.origin : undefined}
          appearance={{
            theme: ThemeSupa,
            className: "tp-auth",
            variables: {
              default: {
                colors: {
                  // Branding
                  brand: "#ff008e",
                  brandAccent: "#ff4db3",
                  brandButtonText: "#ffffff",
                  // Inputs
                  inputBackground: "rgba(255,255,255,0.07)",
                  inputBorder: "rgba(255,255,255,0.28)",
                  inputBorderHover: "rgba(255,255,255,0.45)",
                  inputText: "#ffffff",
                  inputLabelText: "#ffffff",
                  inputPlaceholder: "rgba(255,255,255,0.70)",
                  // Divers
                  defaultButtonBackground: "rgba(255,255,255,0.06)",
                  defaultButtonBackgroundHover: "rgba(255,255,255,0.12)",
                  defaultButtonBorder: "rgba(255,255,255,0.28)",
                  messageText: "#ffffff",
                  anchorTextColor: "#ffa0cf",
                },
                // coins arrondis
                radii: {
                  inputBorderRadius: "12px",
                  buttonBorderRadius: "12px",
                },
                // police facultative
                fonts: {
                  bodyFontFamily:
                    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                },
              },
            },
            // Styles en dernier recours (inline) : garantit le texte clair dans les champs
            style: {
              container: { background: "transparent" },
              input: {
                color: "#ffffff",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.28)",
              },
              label: { color: "#ffffff" },
              button: {
                backgroundColor: "#ff008e",
                color: "#ffffff",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
              },
              anchor: { color: "#ffa0cf" },
            },
          }}
        />
      </div>
      {/* Hover du bouton (petit script CSS global local) */}
      <style jsx global>{`
        .tp-auth button:hover {
          background-color: #ff4db3 !important;
        }
        .tp-auth input::placeholder {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .tp-auth input {
          color: #fff !important;
        }
      `}</style>
    </main>
  );
}
