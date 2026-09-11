/**
 * GRYD — « Félicitations » ne se dit qu'à ceux qui viennent de s'inscrire.
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT ROUGE ═══════════════════════════════════════════
 * `app/(auth)/callback.tsx` faisait `router.replace('/')` dès que la session
 * prenait : AUCUNE phrase, aucun accusé de réception, et donc aucun verdict à
 * tester — c'est le défaut que le fondateur a vu (« il faudrait qu'appuyer sur
 * le lien dise félicitations, vous êtes inscrit »). Ce fichier fige la règle
 * qui manquait, ET son revers : on ne félicite jamais quelqu'un qui revient.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  FRESH_ACCOUNT_WINDOW_MS,
  WELCOME_MAP_ROUTE,
  WELCOME_READ_TIMEOUT_MS,
  WELCOME_SETUP_ROUTE,
  callbackType2026,
  welcomeDestination2026,
  welcomeHandle2026,
  welcomeKind2026,
  type WelcomeRead2026,
} from './welcome2026.ts';

const NOW = Date.parse('2026-09-12T10:00:00.000Z');
const READING: WelcomeRead2026 = { state: 'reading' };
const FAILED: WelcomeRead2026 = { state: 'failed' };
const NAMED: WelcomeRead2026 = { state: 'ready', handle: 'koro', handleChosen: true };
const LABELLED: WelcomeRead2026 = {
  state: 'ready',
  handle: 'runner_5f3a91c0d4e2',
  handleChosen: false,
};

// ─── 1. `type`, tel que GoTrue l'écrit ───────────────────────────────────────

Deno.test('le type du retour se lit dans le fragment comme dans la query', () => {
  assertEquals(
    callbackType2026('https://gryd.run/callback#access_token=a&type=signup'),
    'signup',
  );
  assertEquals(callbackType2026('gryd://callback#type=magiclink'), 'magiclink');
  assertEquals(callbackType2026('https://gryd.run/callback?type=recovery'), 'recovery');
  assertEquals(callbackType2026('https://gryd.run/callback'), null);
  assertEquals(callbackType2026(null), null);
  assertEquals(callbackType2026('pas une url'), null);
  // Une valeur hors contrat ne devient jamais un verdict.
  assertEquals(callbackType2026('https://gryd.run/callback#type=quelque_chose'), null);
});

// ─── 2. Le verdict ───────────────────────────────────────────────────────────

Deno.test('`type=signup` félicite immédiatement, sans attendre aucune lecture', () => {
  assertEquals(
    welcomeKind2026({
      callbackType: 'signup',
      read: READING,
      accountCreatedAt: null,
      now: NOW,
    }),
    'fresh',
  );
});

Deno.test('un lien de récupération ne crée jamais un compte', () => {
  for (const type of ['recovery', 'email_change'] as const) {
    assertEquals(
      welcomeKind2026({ callbackType: type, read: READING, accountCreatedAt: null, now: NOW }),
      'returning',
    );
  }
});

Deno.test('tant que la lecture court, il n’y a PAS de verdict — et ce n’est pas « unknown »', () => {
  const verdict = welcomeKind2026({
    callbackType: 'magiclink',
    read: READING,
    accountCreatedAt: new Date(NOW).toISOString(),
    now: NOW,
  });
  assertEquals(verdict, null, 'un chargement n’affirme rien : l’écran doit attendre');
});

Deno.test('`handle_chosen_2026` tranche quand le type manque (0154 / 0175)', () => {
  // Étiquette posée à l'inscription : ce joueur n'a jamais fini de s'inscrire.
  assertEquals(
    welcomeKind2026({ callbackType: null, read: LABELLED, accountCreatedAt: null, now: NOW }),
    'fresh',
  );
  // Pseudo NOMMÉ par le joueur : il revient.
  assertEquals(
    welcomeKind2026({ callbackType: 'magiclink', read: NAMED, accountCreatedAt: null, now: NOW }),
    'returning',
  );
});

Deno.test('`handle_chosen_2026` prime sur une horloge d’appareil décalée', () => {
  // Compte créé il y a un an, mais jamais nommé : on le félicite quand même,
  // parce que le SERVEUR dit qu'il n'a jamais choisi son pseudo.
  assertEquals(
    welcomeKind2026({
      callbackType: null,
      read: LABELLED,
      accountCreatedAt: new Date(NOW - 365 * 24 * 3600 * 1000).toISOString(),
      now: NOW,
    }),
    'fresh',
  );
  // Compte créé « à l'instant » mais déjà nommé (impossible en pratique) :
  // le fait serveur gagne, la date ne sert qu'en dernier recours.
  assertEquals(
    welcomeKind2026({
      callbackType: null,
      read: NAMED,
      accountCreatedAt: new Date(NOW).toISOString(),
      now: NOW,
    }),
    'returning',
  );
});

Deno.test('lecture échouée : la date de création tranche, dans les deux sens', () => {
  assertEquals(
    welcomeKind2026({
      callbackType: null,
      read: FAILED,
      accountCreatedAt: new Date(NOW - 10_000).toISOString(),
      now: NOW,
    }),
    'fresh',
  );
  assertEquals(
    welcomeKind2026({
      callbackType: null,
      read: FAILED,
      accountCreatedAt: new Date(NOW - FRESH_ACCOUNT_WINDOW_MS - 1).toISOString(),
      now: NOW,
    }),
    'returning',
  );
});

Deno.test('sans aucune source fiable, on ne devine pas : « unknown »', () => {
  assertEquals(
    welcomeKind2026({ callbackType: null, read: FAILED, accountCreatedAt: null, now: NOW }),
    'unknown',
  );
  assertEquals(
    welcomeKind2026({ callbackType: null, read: FAILED, accountCreatedAt: 'n’importe quoi', now: NOW }),
    'unknown',
  );
  // Horloge de l'appareil EN RETARD sur le serveur : l'âge du compte est
  // négatif, donc inexploitable. On ne conclut rien plutôt que de féliciter.
  assertEquals(
    welcomeKind2026({
      callbackType: null,
      read: FAILED,
      accountCreatedAt: new Date(NOW + 60_000).toISOString(),
      now: NOW,
    }),
    'unknown',
  );
});

// ─── 3. Le pseudo affiché ────────────────────────────────────────────────────

Deno.test('on n’affiche un pseudo que s’il a été CHOISI', () => {
  assertEquals(welcomeHandle2026(NAMED), 'koro');
  assertEquals(welcomeHandle2026(LABELLED), null, 'runner_… n’est pas un pseudo');
  assertEquals(welcomeHandle2026(READING), null);
  assertEquals(welcomeHandle2026(FAILED), null);
  assertEquals(welcomeHandle2026({ state: 'ready', handle: '   ', handleChosen: true }), null);
});

// ─── 4. La destination du bouton unique ──────────────────────────────────────

Deno.test('un compte neuf va configurer son profil, les autres vont à la carte', () => {
  assertEquals(welcomeDestination2026('fresh'), WELCOME_SETUP_ROUTE);
  assertEquals(welcomeDestination2026('returning'), WELCOME_MAP_ROUTE);
  assertEquals(welcomeDestination2026('unknown'), WELCOME_MAP_ROUTE);
});

Deno.test('le plafond de patience de l’accueil reste court : il ne débloque rien', () => {
  assert(WELCOME_READ_TIMEOUT_MS > 0);
  assert(
    WELCOME_READ_TIMEOUT_MS <= 3000,
    'attendre plus longtemps qu’une lecture de disque pour choisir une phrase serait absurde',
  );
});
