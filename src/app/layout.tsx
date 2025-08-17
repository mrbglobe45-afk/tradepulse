'use client';
import './globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-[#0b0b10]">{children}</body>
    </html>
  );
}
