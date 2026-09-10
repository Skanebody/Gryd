/**
 * GRYD — LE CENTRE DE NOTIFICATIONS, PARTIE PURE.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ───────────────────────────────────────────
 * Le premier test ne teste pas mon code : il fixe l'écart qui a motivé ce lot.
 * `NOTIFICATION_EVENTS_2026` fige 21 faits ; avant le 11/09/2026 aucun d'eux
 * n'avait de phrase, et aucun écran ne lisait la boîte. Le test de COUVERTURE
 * ci-dessous tombe le jour où un fait arrive au catalogue serveur sans arriver
 * au catalogue de langue : une notification muette est pire qu'aucune.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { NOTIFICATION_EVENTS_2026, NOTIFICATION_INBOX_2026 } from '@klaim/shared';
import { LOCALES } from '../../i18n/types';
import { C, FAITS } from '../../i18n/catalog/notifications';
import {
  dayKey2026,
  formatDayLabel2026,
  groupNotificationsByDay2026,
  parseNotificationPage2026,
  renderNotification2026,
  safeDeepLink2026,
  shouldRefresh2026,
  unreadBadge2026,
} from './notificationInbox2026';

const ligne = (extra: Record<string, unknown> = {}) => ({
  id: 'n1', kind: 'crew_joined', family: 'crew', emoji: '👋',
  deepLink: '/crew', params: { crewName: 'Les Foulées du Canal' },
  title: null, body: null,
  createdAt: '2026-09-11T12:00:00+00:00', readAt: null, ...extra,
});
const page = (items: unknown[], extra: Record<string, unknown> = {}) =>
  parseNotificationPage2026({ hasAccount: true, unread: 1, items, hasMore: false, ...extra });

// ─── LE CATALOGUE ────────────────────────────────────────────────────────────

Deno.test('chaque fait du serveur a une phrase, et aucune phrase n’est orpheline', () => {
  const serveur = Object.keys(NOTIFICATION_EVENTS_2026).sort();
  const mobile = Object.keys(FAITS).sort();
  assertEquals(mobile, serveur,
    'le catalogue de langue et le catalogue serveur ne nomment pas les mêmes faits');
});

Deno.test('les textes sont COURTS, dans les cinq langues (mesuré, pas espéré)', () => {
  for (const [kind, fait] of Object.entries(FAITS)) {
    for (const locale of LOCALES) {
      const titre = fait.titre[locale];
      assert(titre.length > 0, `${kind}/${locale} : titre vide`);
      assert(titre.length <= NOTIFICATION_INBOX_2026.maximumTitleCharacters,
        `${kind}/${locale} : titre de ${titre.length} caractères`);
      if (fait.corps !== null) {
        const corps = fait.corps[locale];
        assert(corps.length > 0, `${kind}/${locale} : corps vide`);
        assert(corps.length <= NOTIFICATION_INBOX_2026.maximumBodyCharacters,
          `${kind}/${locale} : corps de ${corps.length} caractères`);
      }
    }
  }
});

Deno.test('l’emoji vient du SERVEUR : aucune phrase n’en porte un', () => {
  // Un emoji dans le texte en ferait deux à l'écran, et deux vérités sur le
  // même fait le jour où le catalogue serveur change le sien.
  const emoji = /\p{Extended_Pictographic}/u;
  for (const [kind, fait] of Object.entries(FAITS)) {
    for (const locale of LOCALES) {
      assertEquals(emoji.test(fait.titre[locale]), false, `${kind}/${locale} : emoji dans le titre`);
      if (fait.corps !== null) {
        assertEquals(emoji.test(fait.corps[locale]), false, `${kind}/${locale} : emoji dans le corps`);
      }
    }
  }
  for (const kind of Object.keys(FAITS) as (keyof typeof NOTIFICATION_EVENTS_2026)[]) {
    assert(emoji.test(NOTIFICATION_EVENTS_2026[kind].emoji), `${kind} : le serveur n’a pas d’emoji`);
  }
});

// ─── LA LECTURE ──────────────────────────────────────────────────────────────

Deno.test('hors session, la page est null : « pas connecté » n’est pas « vide »', () => {
  assertEquals(parseNotificationPage2026(null), null);
  assertEquals(parseNotificationPage2026({ items: [] }), null);
  assertEquals(page([])?.items.length, 0);
});

Deno.test('une ligne d’avant ce lot garde son texte ; une ligne muette est écartée', () => {
  const lu = page([
    ligne({ id: 'legacy', kind: 'digest', title: 'Ta semaine', body: 'Deux sorties.' }),
    ligne({ id: 'muette', kind: null, title: null, body: null }),
  ]);
  assertEquals(lu?.items.map((i) => i.id), ['legacy']);
  assertEquals(lu?.items[0].kind, null);
  assertEquals(lu?.items[0].legacyTitle, 'Ta semaine');
});

Deno.test('un lien ne sort JAMAIS de l’application, et un modèle non résolu est refusé', () => {
  assertEquals(safeDeepLink2026('/course/abc'), '/course/abc');
  assertEquals(safeDeepLink2026('https://exemple.test'), null);
  assertEquals(safeDeepLink2026('//exemple.test'), null);
  assertEquals(safeDeepLink2026('/course/{runId}'), null);
  assertEquals(safeDeepLink2026(null), null);
});

Deno.test('une date illisible écarte la ligne plutôt que de la dater d’aujourd’hui', () => {
  assertEquals(page([ligne({ createdAt: 'jamais' })])?.items.length, 0);
});

Deno.test('le compte de non-lus se déduit quand le serveur ne le donne pas', () => {
  const lu = page([ligne(), ligne({ id: 'n2', readAt: '2026-09-11T13:00:00+00:00' })],
    { unread: 'beaucoup' });
  assertEquals(lu?.unread, 1);
});

// ─── LE RENDU ────────────────────────────────────────────────────────────────

Deno.test('le nom du crew entre dans la phrase, dans les cinq langues', () => {
  const item = page([ligne()])!.items[0];
  for (const locale of LOCALES) {
    const rendu = renderNotification2026(item, locale);
    assert(rendu.title.includes('Les Foulées du Canal'), `${locale} : le crew manque`);
    assertEquals(rendu.body, null, `${locale} : ce fait tient sur une ligne`);
    assertEquals(rendu.emoji, '👋');
  }
});

Deno.test('un paramètre manquant ne fait pas de phrase à trou', () => {
  const item = page([ligne({ params: {} })])!.items[0];
  const rendu = renderNotification2026(item, 'fr');
  assert(rendu.title.includes(C.crewDefaut.fr), `« ${rendu.title} » n’a pas de substitut`);
  assertEquals(rendu.title.includes('{'), false, 'un modèle est resté visible');
});

Deno.test('aucune phrase rendue ne laisse de modèle {…} visible, quel que soit le fait', () => {
  for (const kind of Object.keys(FAITS)) {
    const item = page([ligne({ kind, params: { crewName: 'Le Quai', handle: 'Léa' } })])!.items[0];
    for (const locale of LOCALES) {
      const rendu = renderNotification2026(item, locale);
      assertEquals(rendu.title.includes('{'), false, `${kind}/${locale} : titre à trou`);
      assertEquals(rendu.body?.includes('{') ?? false, false, `${kind}/${locale} : corps à trou`);
    }
  }
});

// ─── LE GROUPEMENT ───────────────────────────────────────────────────────────

Deno.test('les lignes se groupent par jour, du plus récent au plus ancien', () => {
  const now = Date.parse('2026-09-11T12:00:00Z');
  const jour = 86_400_000;
  const items = page([
    ligne({ id: 'a', createdAt: new Date(now - 60_000).toISOString() }),
    ligne({ id: 'b', createdAt: new Date(now - 120_000).toISOString() }),
    ligne({ id: 'c', createdAt: new Date(now - jour).toISOString() }),
    ligne({ id: 'd', createdAt: new Date(now - 5 * jour).toISOString() }),
  ])!.items;
  const groupes = groupNotificationsByDay2026(items, now);
  assertEquals(groupes.map((g) => g.label), ['today', 'yesterday', 'date']);
  assertEquals(groupes[0].items.map((i) => i.id), ['a', 'b'], 'l’ordre du serveur est conservé');
  assertEquals(groupes[2].items.map((i) => i.id), ['d']);
});

Deno.test('la clé de jour et son libellé ne dépendent d’aucun Intl', () => {
  const key = dayKey2026(Date.parse('2026-09-11T12:00:00Z'));
  assertEquals(key.length, 10);
  assertEquals(formatDayLabel2026('2026-09-11', 'fr'), '11/09/2026');
  assertEquals(formatDayLabel2026('2026-09-11', 'en'), '09/11/2026');
});

// ─── LA CLOCHE ───────────────────────────────────────────────────────────────

Deno.test('zéro non-lu ne peint AUCUNE pastille (G24)', () => {
  assertEquals(unreadBadge2026(0), null);
  assertEquals(unreadBadge2026(-3), null);
  assertEquals(unreadBadge2026(Number.NaN), null);
  assertEquals(unreadBadge2026(1), '1');
  assertEquals(unreadBadge2026(NOTIFICATION_INBOX_2026.unreadBadgeMaximum + 1),
    `${NOTIFICATION_INBOX_2026.unreadBadgeMaximum}+`);
});

Deno.test('la relecture est bornée : aucun sondage en boucle', () => {
  const now = 1_000_000;
  assertEquals(shouldRefresh2026(null, now), true, 'la première lecture passe toujours');
  assertEquals(shouldRefresh2026(now - 1_000, now), false, 'une seconde après, non');
  assertEquals(
    shouldRefresh2026(now - NOTIFICATION_INBOX_2026.refreshMinimumIntervalMs, now), true);
});
