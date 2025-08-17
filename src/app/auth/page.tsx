'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b10]">
      {/* petit override de styles du bouton */}
      <style jsx global>{`
        .sbui-btn-primary, .sbui-btn-primary:hover {
          background-color: #ff008e !important;
          border-color: #ff008e !important;
        }
      `}</style>

      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]}
        theme="dark"
        // pas de 'lang' ici ; si tu veux du français, on fera la localisation plus tard
        redirectTo={
          typeof window === 'undefined' ? undefined : `${window.location.origin}/`
        }
      />
    </div>
  );
}
