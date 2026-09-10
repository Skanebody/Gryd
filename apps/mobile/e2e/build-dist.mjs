/**
 * GRYD — export du bundle web utilise par le harnais E2E du PARCOURS CLIENT.
 *
 * ═══ POURQUOI CET EXPORT NE POINTE PAS SUR LE VRAI PROJET SUPABASE ═════════
 * Le harnais simule 100 % du reseau Supabase (`e2e/fixtures/supabase-mock.ts`).
 * Mais un mock est une interception : si une seule requete echappait au filet,
 * elle partirait vers la PROD du fondateur — base reelle, 3 comptes reels,
 * quota e-mail reel. On retire donc le risque a la RACINE : le bundle E2E est
 * compile avec une URL Supabase FICTIVE (`e2e-mock.supabase.co`). Meme un trou
 * dans le filet ne peut plus atteindre la production, et le motif du mock
 * (`*.supabase.co`) continue de matcher.
 *
 * `EXPO_PUBLIC_EMAIL_AUTH_MODE=code` : le parcours teste est l'OTP PAR CODE
 * (saisie a 6 chiffres dans l'onglet ouvert). C'est le mode que le fondateur
 * activera quand les gabarits Supabase porteront `{{ .Token }}`
 * (docs/product/GRYD_AUTH_2026_IMPLEMENTATION.md). Le defaut du depot reste
 * `link`, et ce harnais ne le change nulle part ailleurs.
 *
 * PostHog et RevenueCat sont neutralises (cle vide) : leur client n'est meme
 * pas construit, donc aucun evenement de test ne pollue le funnel du pilote.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const MOBILE = resolve(import.meta.dirname, '..');

const result = spawnSync(
  'npx',
  ['expo', 'export', '--platform', 'web', '--output-dir', 'dist', '--clear'],
  {
    cwd: MOBILE,
    stdio: 'inherit',
    env: {
      ...process.env,
      EXPO_PUBLIC_SUPABASE_URL: 'https://e2e-mock.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key-not-a-real-secret',
      EXPO_PUBLIC_EMAIL_AUTH_MODE: 'code',
      EXPO_PUBLIC_POSTHOG_KEY: '',
      EXPO_PUBLIC_POSTHOG_HOST: '',
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: '',
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: '',
    },
  },
);

process.exit(result.status ?? 1);
