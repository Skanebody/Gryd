/**
 * GRYD — LE GABARIT DU SITE PUBLIC (lot W2, 12/09/2026).
 *
 * ─── LES TROIS FAMILLES SONT CELLES DE L'APPLICATION ────────────────────────
 * `apps/mobile/src/lib/fonts.ts` charge Manrope (titres et chiffres), Inter
 * (lecture) et JetBrains Mono (repères). Le site charge exactement les mêmes :
 * une page web dans une autre fonte que l'app n'est pas « le même produit ».
 * L'ancien gabarit servait Poppins et Lora, choisies en juillet pour imiter une
 * fonte commerciale qui n'a jamais été acquise ; ce détour n'a plus d'objet.
 *
 * ─── « POLICES LOCALES », CE QUE ÇA VEUT DIRE ICI ───────────────────────────
 * `next/font/google` TÉLÉCHARGE les fichiers AU BUILD et les émet dans le
 * bundle : la page servie n'appelle NI `fonts.googleapis.com`, NI
 * `fonts.gstatic.com`. Les `.woff2` sont servis depuis `gryd.run`. C'est bien
 * un hébergement local, obtenu sans commiter 2 Mo de `.ttf` (les binaires
 * disponibles dans le dépôt, ceux d'`@expo-google-fonts`, ne sont pas
 * sous-découpés : Inter Regular pèse 342 Ko à lui seul, contre ~15 Ko une fois
 * réduit au latin).
 *
 * ─── AUCUN SCRIPT TIERS, AUCUN COOKIE ───────────────────────────────────────
 * `PostHogProvider` a été retiré du gabarit : il chargeait un script d'analyse
 * tiers et posait des cookies sur un site qui n'a aucune bannière de consentement
 * à proposer. Un site public qui mesure ses visiteurs sans le leur dire n'est
 * pas conforme, et le gabarit d'un site honnête ne peut pas commencer par là.
 * Le fichier `app/components/PostHogProvider.tsx` reste sur le disque, et plus
 * rien ne l'importe : `app/components/` n'appartient pas à ce lot, et le
 * supprimer emporterait avec lui `app/lib/analytics.ts`. Le lot pages le retire
 * en même temps que le reste de `app/components/landing/`. La dépendance
 * `posthog-js` reste déclarée ; elle ne charge plus rien.
 *
 * ─── CE QUE CE FICHIER NE FAIT PAS ──────────────────────────────────────────
 *  · Il ne rend NI en-tête NI pied de page. Chaque page les compose elle-même
 *    (`SiteHeader` / `<main id="contenu">` / `SiteFooter`) : le gabarit couvre
 *    aussi `/admin/`, qui a sa propre coque, et `/callback/`, qui doit rester
 *    une page d'arrivée sobre.
 *  · Il ne pose AUCUNE donnée structurée. `Organization` appartient à `/`, et
 *    à elle seule : posé ici, il serait émis dix fois (cahier §3.10, « trois
 *    blocs, pas un de plus »).
 *
 * Le favicon existant (`app/icon.png`, `app/apple-icon.png` : le G noir sur
 * carré chartreuse) est repris tel quel — Next les détecte par convention de
 * nom. On ne change pas l'icône d'un onglet que des gens ont déjà en favori.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { SITE_DESCRIPTION, SITE_OG_IMAGE, SITE_ORIGIN, SITE_TITLE } from '../lib/site2026';

/** Titres, chiffres, lettrages. Les graisses réellement employées, pas une de plus. */
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

/** Le texte courant, les libellés, les boutons. */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

/** Les repères : étiquettes de section, numéros d'étape. Comme sur la carte de l'app. */
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  // Sert de base aux URL canoniques et aux images sociales : sans elle, une
  // image d'aperçu relative n'est jamais résolue par un réseau social.
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_TITLE,
    // Les pages posent leur propre titre ; celui du cahier fait 41 à 48
    // caractères, un suffixe de marque le pousserait au delà de la limite
    // d'affichage. Le gabarit n'en ajoute donc aucun.
    template: '%s',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Gryd',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Gryd',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `${SITE_ORIGIN}/`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    // `summary_large_image` décrit la CARTE, pas un compte : aucun `site` ni
    // `creator` n'est déclaré, puisque aucun compte au nom de Gryd n'existe.
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // La couleur de la barre d'adresse suit le fond : l'écran ne clignote pas en
  // blanc avant de peindre le carbone.
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
