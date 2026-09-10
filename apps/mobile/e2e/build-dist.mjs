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
 * ═══ LE PARCOURS TESTE EST LE LIEN MAGIQUE, PARCE QUE C'EST LE PRODUIT ═════
 * Cet export posait `EXPO_PUBLIC_EMAIL_AUTH_MODE=code` et le harnais tapait un
 * code a six chiffres. Depuis le 10/09/2026 l'app REFUSE ce mode sans preuve
 * serveur : `emailDelivery2026(raw, otpTemplateProven)` (features/account/
 * authCallback2026.ts) exige un second argument que PERSONNE ne sait mettre a
 * `true` — le gabarit e-mail est global au projet Supabase, il porte un LIEN, et
 * l'API de gestion refuse de le changer sur le plan heberge avec l'expediteur
 * par defaut. Les deux appelants (`lib/auth.ts`, `lib/auth.web.ts`) passent un
 * `false` litteral. Poser la variable ne changeait donc plus RIEN a l'ecran :
 * elle decrivait un parcours que le produit ne sert pas.
 *
 * On ne la pose plus. Le defaut du depot est `link`, l'ecran demande « Recevoir
 * le lien », et le harnais joue le retour du lien (`/callback#access_token=…`)
 * — c'est-a-dire exactement ce qu'un joueur vit aujourd'hui. Le jour ou un SMTP
 * personnalise et un gabarit `{{ .Token }}` existeront, c'est la PREUVE serveur
 * qui basculera `EMAIL_DELIVERY`, pas cette ligne d'environnement.
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
      EXPO_PUBLIC_POSTHOG_KEY: '',
      EXPO_PUBLIC_POSTHOG_HOST: '',
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: '',
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: '',
    },
  },
);

process.exit(result.status ?? 1);
