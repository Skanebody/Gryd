/**
 * GRYD — LA COUTURE DU CENTRE DE NOTIFICATIONS.
 *
 * Ce fichier ne teste pas une fonction : il teste que les MORCEAUX SE TIENNENT.
 * La cloche ouvre bien le centre, le centre lit bien les trois RPC ouvertes au
 * client et rien d'autre, `/activite` ne laisse pas une route morte derrière
 * elle, et la barre de navigation n'a pas gagné un quatrième onglet au passage.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ───────────────────────────────────────────
 * Au 11/09/2026, `useActivityBell` n'était importé NULLE PART et aucun
 * `router.push('/activite')` n'existait dans le dépôt : le centre d'activité
 * était injoignable. Les deux premiers tests verrouillent la porte neuve ; le
 * jour où quelqu'un retire la cloche de la carte, ils tombent.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { NOTIFICATION_INBOX_2026 } from '@klaim/shared';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};

/** Le code HORS commentaires : citer un défaut dans un docblock ne le recrée pas. */
function codeSeul(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}
function lire(chemin: string, minimum = 500): string {
  const source = Deno.readTextFileSync(new URL(chemin, import.meta.url));
  assert(source.length > minimum, `${chemin} : source trop courte, le chemin est faux`);
  return source;
}

const ECRAN = './NotificationCenter2026.tsx';
const PUR = './notificationInbox2026.ts';
const HOOK = './useNotificationCenter2026.ts';
const CLOCHE = './useUnreadNotifications2026.ts';
const ROUTE = '../../../app/notifications.tsx';
const LEGACY = '../../../app/activite.tsx';
const CARTE = '../refonte/MapHome.tsx';
const PROFIL = '../refonte/ProfileHomeScreen.tsx';

// ─── ① LES PORTES ────────────────────────────────────────────────────────────

Deno.test('couture : /notifications sert le centre, /activite y redirige', () => {
  assert(lire(ROUTE, 40).includes('NotificationCenter2026'), '/notifications doit servir l’écran');
  const legacy = codeSeul(lire(LEGACY, 40));
  assert(legacy.includes('Redirect'), '/activite doit rediriger, pas rendre un écran mort');
  assert(legacy.includes('/notifications'), '/activite doit rediriger vers /notifications');
  assertEquals(legacy.includes('useActivityEvents'), false,
    '/activite ne doit plus lire les sources d’avant la refonte');
});

Deno.test('couture : la cloche de la Carte ouvre le centre', () => {
  const carte = codeSeul(lire(CARTE));
  assert(carte.includes("router.push('/notifications')"), 'la Carte doit ouvrir le centre');
  assert(carte.includes('useUnreadNotifications2026'), 'la cloche doit lire un vrai compteur');
  assert(carte.includes('name="bell"'), 'la cloche doit être une cloche');
});

Deno.test('couture : le Profil ouvre le centre, pas les réglages', () => {
  const profil = codeSeul(lire(PROFIL));
  assert(profil.includes("router.push('/notifications')"), 'le Profil doit ouvrir le centre');
});

// ─── ② LA PASTILLE N'EST JAMAIS PERMANENTE (G24) ─────────────────────────────

Deno.test('couture : le compteur de la cloche est conditionné à unread > 0', () => {
  const carte = codeSeul(lire(CARTE));
  // Le badge ne se peint QUE derrière `unreadBadge === null ? null :`, et
  // `unreadBadge2026` rend `null` sur 0. Deux verrous pour un seul interdit.
  assert(carte.includes('unreadBadge === null ? null :'),
    'le badge doit être conditionné, jamais peint d’office');
  assert(carte.includes('unreadBadge2026('), 'le badge doit venir de la règle pure');
  const pur = codeSeul(lire(PUR));
  assert(pur.includes('unread <= 0) return null'),
    'unreadBadge2026 doit rendre null sur zéro — pas de « 0 » nu (L14)');
});

Deno.test('couture : la barre de navigation garde EXACTEMENT trois destinations', () => {
  // La cloche vit dans l'en-tête de la Carte, jamais en quatrième onglet
  // (spec §2.1). Ce test le dit ici aussi : c'est ce lot qui aurait pu glisser.
  const tabs = codeSeul(lire('../nav/tabs.ts', 200));
  const destinations = [...tabs.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
  assertEquals(destinations, ['/', '/crew', '/profil'], 'la barre a changé de destinations');
  assertEquals(tabs.includes('/notifications'), false, 'la cloche n’est pas un onglet');
});

// ─── ③ LE CLIENT NE S'OCTROIE RIEN ───────────────────────────────────────────

Deno.test('couture : les écrans n’appellent QUE les RPC ouvertes au client', () => {
  const AUTORISEES = [
    'my_notifications_2026', 'mark_notifications_read_2026', 'unread_notifications_count_2026',
  ];
  for (const chemin of [ECRAN, PUR, HOOK, CLOCHE]) {
    const source = codeSeul(lire(chemin, 200));
    for (const appel of source.matchAll(/\.rpc\(\s*'([a-z0-9_]+)'/g)) {
      assert(AUTORISEES.includes(appel[1]), `${chemin} appelle la RPC ${appel[1]}`);
    }
    // Le catalogue et l'écriture de la boîte sont des décisions SERVEUR : leur
    // seule mention côté client serait déjà une porte de trop.
    for (const interdite of ['notification_inbox_write_2026', 'claim_notification_2026',
      'notification_kinds_2026']) {
      assertEquals(source.includes(interdite), false, `${chemin} nomme ${interdite}`);
    }
    // `grant update (read_at)` existe (0006), mais on passe par la RPC : deux
    // chemins d'écriture, ce serait deux règles de « lisible » à tenir.
    assertEquals(source.includes(".from('notifications')"), false,
      `${chemin} écrit ou lit la table directement`);
  }
});

// ─── ④ LES QUATRE ÉTATS, ET AUCUN NOMBRE MAGIQUE ─────────────────────────────

Deno.test('couture : l’écran distingue les quatre états', () => {
  const ecran = codeSeul(lire(ECRAN));
  for (const etat of ['signed-out', 'unavailable', 'loading', 'ready']) {
    assert(ecran.includes(`'${etat}'`), `l’état ${etat} n’est pas distingué`);
  }
  for (const phrase of ['etatDeconnecte', 'etatIndisponible', 'etatLecture', 'etatEchec',
    'etatVide']) {
    assert(ecran.includes(phrase), `la phrase ${phrase} n’est pas dite`);
  }
  assert(ecran.includes('actionReessayer'), 'un échec sans « Réessayer » est une impasse');
  assert(ecran.includes('AccountDoor2026'), 'la porte de compte doit être offerte');
});

Deno.test('couture : aucun nombre magique — page, badge et cadence viennent de shared', () => {
  const sources = [PUR, HOOK, CLOCHE, ECRAN].map((c) => codeSeul(lire(c, 200))).join('\n');
  assert(sources.includes('NOTIFICATION_INBOX_2026'), 'les bornes doivent venir du dépôt partagé');
  for (const nombre of [
    NOTIFICATION_INBOX_2026.pageSize,
    NOTIFICATION_INBOX_2026.unreadBadgeMaximum,
    NOTIFICATION_INBOX_2026.refreshMinimumIntervalMs,
  ]) {
    assertEquals(new RegExp(`[^\\w.]${nombre}[^\\w]`).test(sources), false,
      `le nombre ${nombre} est écrit en dur quelque part`);
  }
});

Deno.test('couture : rien ne sonde le serveur en boucle', () => {
  for (const chemin of [HOOK, CLOCHE, ECRAN]) {
    const source = codeSeul(lire(chemin, 200));
    assertEquals(source.includes('setInterval'), false, `${chemin} sonde en boucle`);
  }
  assert(codeSeul(lire(HOOK)).includes('shouldRefresh2026'),
    'le retour au premier plan doit être borné');
});

// ─── ⑤ CE QUE L'ÉCRAN NE DIT JAMAIS ──────────────────────────────────────────

Deno.test('couture : aucune phrase de notification n’est écrite dans l’écran', () => {
  const ecran = lire(ECRAN);
  // Tout passe par le catalogue typé : `t(C.…)` ou `renderNotification2026`.
  // Un `text('…', '…')` ici rouvrirait la porte des deux langues.
  assertEquals(/\btext\(\s*'/.test(codeSeul(ecran)), false,
    'l’écran doit passer par le catalogue cinq langues, jamais par copy/text');
});
