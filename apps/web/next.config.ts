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
 *   site 100 % statique servi sous /Gryd. Le formulaire waitlist appelle la RPC
 *   `waitlist_join` depuis le client (`lib/waitlistJoin.ts`) — aucune partie
 *   serveur requise. `/admin` est EXCLU du build par le script de déploiement
 *   (outil fondateur : server actions + cookies, rien à faire sur un site
 *   public statique — un login qui ne peut pas aboutir serait un bouton mort).
 *   `headers()` est ignoré par l'export : les en-têtes de sécurité ne
 *   s'appliquent qu'au mode serveur ; GitHub Pages ne sert pas d'en-têtes
 *   personnalisés de toute façon.
 */
const STATIC_EXPORT = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  // @klaim/shared est publié en sources TS (main: src/index.ts) → transpilation par Next.
  transpilePackages: ['@klaim/shared', '@klaim/engine'],
  // Monorepo : le tracing doit partir de la racine du workspace.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  ...(STATIC_EXPORT
    ? {
        output: 'export' as const,
        // Pages sert le site sous /Gryd — sans basePath, tous les assets 404.
        basePath: '/Gryd',
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
