'use client';

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b10] via-[#141421] to-[#0b0b10] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm p-6">
        <h1 className="text-white text-xl font-bold mb-4 text-center">
          Connexion / Inscription
        </h1>

        <Auth
          supabaseClient={supabase}
          providers={[]}
          magicLink
          redirectTo={redirectTo}
          appearance={{
            theme: ThemeSupa,
            className: {
              container: 'text-white',
              input:
                'bg-white/5 text-white placeholder:text-white/60 border-white/20',
              label: 'text-white/80',
              button: 'rounded-2xl',
              anchor: 'text-white underline',
              message: 'text-white',
            },
            variables: {
              default: {
                colors: {
                  brand: '#ff008e',
                  brandAccent: '#7E6DFF',
                  inputBackground: 'rgba(255,255,255,0.05)',
                  inputBorder: 'rgba(255,255,255,0.20)',
                  inputText: 'white',
                  anchorTextColor: 'white',
                  messageText: 'white',
                },
                radii: {
                  inputBorderRadius: '12px',
                  buttonBorderRadius: '16px',
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
