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

const nextConfig: NextConfig = {
  // @klaim/shared est publié en sources TS (main: src/index.ts) → transpilation par Next.
  transpilePackages: ['@klaim/shared', '@klaim/engine'],
  // Monorepo : le tracing doit partir de la racine du workspace.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
