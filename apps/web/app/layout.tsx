import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Lora, Poppins, Space_Mono } from 'next/font/google';
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
 * En attendant : Poppins — le sosie libre le plus fidèle d'Avant Garde (cercles parfaits,
 * grande hauteur d'x, « a » à un étage). Comme Outcrowd, les titres restent en graisse
 * Book/Medium (400/500), jamais en Bold lourd.
 */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
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
    'Chaque course capture du territoire réel. Conquiers ton quartier rue après rue — Paris et Lille, Saison 0. Ton quartier ouvre à 500 inscrits.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${poppins.variable} ${lora.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
