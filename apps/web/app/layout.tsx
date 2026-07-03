import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Josefin_Sans, Lora, Space_Mono } from 'next/font/google';
import './globals.css';

/**
 * Typo Outcrowd (AMENDEMENT-03) : ITC Avant Garde Gothic Std (Md titres/UI, Bk texte) + Lora (éditorial).
 * ITC Avant Garde est commerciale (Monotype/Adobe Fonts) — impossible de redistribuer les fichiers.
 * QUAND la licence est acquise : déposer les .woff2 dans app/fonts/ puis remplacer `josefin` par :
 *
 *   import localFont from 'next/font/local';
 *   const avantGarde = localFont({
 *     src: [
 *       { path: './fonts/ITCAvantGardeStd-Bk.woff2', weight: '400' },
 *       { path: './fonts/ITCAvantGardeStd-Md.woff2', weight: '500' },
 *       { path: './fonts/ITCAvantGardeStd-Demi.woff2', weight: '700' },
 *     ],
 *     variable: '--font-avant-garde',
 *     display: 'swap',
 *   });
 *
 * et pointer --font-display/--font-text sur --font-avant-garde dans globals.css.
 * En attendant : Josefin Sans, l'alternative libre la plus proche d'Avant Garde.
 */
const josefin = Josefin_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-josefin',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

// Exception fonctionnelle à la typo Outcrowd : timers/codes/étiquettes exigent des chiffres mono.
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-space-mono',
  display: 'swap',
});

// TODO(légal) : « GRYD » est un nom de code — aucun usage public sans clearance INPI (CLAUDE.md).
export const metadata: Metadata = {
  title: 'GRYD — Cours. Capture. Défends.',
  description:
    'Chaque course capture du territoire réel. Conquiers ton quartier hexagone par hexagone — Paris et Lille, Saison 0. Ton quartier ouvre à 500 inscrits.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${josefin.variable} ${lora.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
