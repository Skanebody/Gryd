import path from 'node:path';
import type { NextConfig } from 'next';

// En-têtes de sécurité (audit sécurité §client-web) : anti-clickjacking (crucial pour
// /admin), anti-MIME-sniffing, HSTS, fuite de référent limitée, capteurs coupés par défaut.
// Pas de CSP complète ici : elle casserait MapLibre/styles inline sans test par page —
// à ajouter séparément après vérification. `frame-ancestors 'none'` double X-Frame-Options.
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

/**
 * DEUX MODES DE BUILD (AMENDEMENT-47 : le lien public sert `apps/web`).
 *
 * · Mode SERVEUR (défaut) — Vercel/local : headers de sécurité, /admin vivant.
 * · Mode EXPORT (`STATIC_EXPORT=1`) — GitHub Pages (`scripts/deploy-web-ghpages.sh`) :
 *   site 100 % statique servi à la RACINE de `gryd.run`. Le formulaire waitlist
 *   appelle la RPC `waitlist_join` depuis le client (`lib/waitlistJoin.ts`) —
 *   aucune partie serveur requise. `/admin` est EXCLU du build par le script de
 *   déploiement (outil fondateur : server actions + cookies, rien à faire sur un
 *   site public statique — un login qui ne peut pas aboutir serait un bouton
 *   mort). `headers()` est ignoré par l'export : les en-têtes de sécurité ne
 *   s'appliquent qu'au mode serveur ; GitHub Pages ne sert pas d'en-têtes
 *   personnalisés de toute façon.
 */
const STATIC_EXPORT = process.env.STATIC_EXPORT === '1';

/**
 * LA RACINE DU SITE PUBLIC — `''` DEPUIS LE 12/09/2026, ET POURQUOI.
 *
 * Le site vivait sous `https://skanebody.github.io/Gryd/`, d'où un `basePath`
 * de `/Gryd` sans lequel tous les assets renvoyaient 404. Il vit désormais sur
 * le DOMAINE `gryd.run` (`public/CNAME`), où le préfixe n'existe plus — et il ne
 * s'agit pas d'un déménagement cosmétique : trois chemins doivent être servis à
 * la racine, sans quoi ils ne fonctionnent pas du tout.
 *
 *  1. `/.well-known/apple-app-site-association` — Apple ne le cherche QU'À la
 *     racine du domaine. Sous `/Gryd/`, aucun lien universel n'est vérifié.
 *  2. `/callback` — l'adresse que Supabase met dans l'e-mail
 *     (`apps/mobile/src/lib/links.ts`, `AUTH_CALLBACK_URL`). Elle est écrite
 *     sans préfixe des deux côtés ; un `basePath` la ferait tomber sur le 404.
 *  3. `/c/*`, `/r/*`, `/u/*` — les liens partagés, déjà imprimés sur des QR.
 *
 * `PAGES_BASE_PATH` reste une porte de secours (« republier temporairement sous
 * un sous-chemin GitHub »), vide par défaut. Un `basePath: ''` n'est pas accepté
 * par Next : la clé n'est posée que lorsqu'un préfixe est réellement demandé.
 */
const BASE_PATH = (process.env.PAGES_BASE_PATH ?? '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // @klaim/shared est publié en sources TS (main: src/index.ts) → transpilation par Next.
  transpilePackages: ['@klaim/shared', '@klaim/engine'],
  // Monorepo : le tracing doit partir de la racine du workspace.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  ...(STATIC_EXPORT
    ? {
        output: 'export' as const,
        // Racine du domaine par défaut (cf. BASE_PATH ci-dessus). `assetPrefix`
        // suit le `basePath` : sous un sous-chemin, les deux doivent s'accorder,
        // sinon le HTML est servi et le JS 404.
        ...(BASE_PATH ? { basePath: BASE_PATH, assetPrefix: BASE_PATH } : {}),
        // `next/image` n'est pas utilisé, mais l'export l'exige explicitement.
        images: { unoptimized: true },
        // /conditions → /conditions/index.html : la forme que Pages sait servir.
        trailingSlash: true,
      }
    : {
        async headers() {
          return [{ source: '/:path*', headers: SECURITY_HEADERS }];
        },
      }),
};

export default nextConfig;
