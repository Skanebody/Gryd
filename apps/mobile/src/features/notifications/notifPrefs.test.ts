/**
 * GRYD — tests du moteur PUR des réglages de notifications (E71, spec §13).
 *
 * Ce qu'ils protègent, dans l'ordre de gravité :
 *  1. une urgence n'est JAMAIS regroupée ni silencée par un réglage de confort
 *     (§13.1) — c'est la règle qui protège le joueur, et celle qu'un bug de
 *     tri ou de seuil casserait en premier ;
 *  2. les événements non urgents sont regroupés au-delà de
 *     NOTIF_NON_URGENT_DAILY_THRESHOLD par jour (§13, fréquence) ;
 *  3. les défauts EXIGÉS par la spec (défense/crew/progression activées,
 *     rivalité regroupée = activée, produit désactivée) ;
 *  4. la persistance : lecture tolérante (vide/corrompu/partiel/mauvais type),
 *     migration en lecture seule depuis l'ancien magasin motivation, et le
 *     mapping vers les canaux serveur RÉELS (`notifPrefsToChannels`).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { NOTIF_NON_URGENT_DAILY_THRESHOLD } from '@klaim/shared';
import {
  applyNotificationPrefsPatch,
  categoryOf,
  DEFAULT_NOTIFICATION_PREFS,
  deriveFromLegacyChannels,
  isUrgentKind,
  notifPrefsToChannels,
  parseNotificationPrefs,
  planDailyDelivery,
  type DeliverableEvent,
  type NotificationPrefs,
} from './notifPrefs.ts';

const ALL_ON: NotificationPrefs = {
  defense: true,
  crew: true,
  rivalite: true,
  progression: true,
  produit: true,
};

// ─── 1. Défauts exigés par la spec ───────────────────────────────────────────

Deno.test('DEFAULT_NOTIFICATION_PREFS : exactement les défauts E71 §13', () => {
  assertEquals(DEFAULT_NOTIFICATION_PREFS, {
    defense: true,
    crew: true,
    rivalite: true, // « regroupée » = activée, dans son seul mode existant
    progression: true,
    produit: false, // désactivée tant qu'aucun consentement explicite n'existe
  });
});

// ─── 2. Urgence : jamais regroupée, jamais silencée ──────────────────────────

Deno.test('isUrgentKind : les QUATRE types §13.1, et seulement eux', () => {
  assertEquals(isUrgentKind('territoire_conteste'), true);
  assertEquals(isUrgentKind('defense_expirant'), true);
  assertEquals(isUrgentKind('activite_interrompue'), true);
  assertEquals(isUrgentKind('securite_compte'), true);
  assertEquals(isUrgentKind('crew'), false);
  assertEquals(isUrgentKind('rivalite'), false);
  assertEquals(isUrgentKind('badge'), false);
  assertEquals(isUrgentKind('saison'), false);
  assertEquals(isUrgentKind('resume'), false);
});

Deno.test('planDailyDelivery : une urgence reste immédiate même catégorie DÉSACTIVÉE', () => {
  const allOff: NotificationPrefs = {
    defense: false,
    crew: false,
    rivalite: false,
    progression: false,
    produit: false,
  };
  const events: DeliverableEvent[] = [
    { id: 'u1', kind: 'defense_expirant', atMs: 1000 },
    { id: 'u2', kind: 'territoire_conteste', atMs: 2000 },
    { id: 'u3', kind: 'activite_interrompue', atMs: 3000 },
    { id: 'u4', kind: 'securite_compte', atMs: 4000 },
  ];
  const plan = planDailyDelivery(events, allOff);
  assertEquals(
    plan.every((d) => d.mode === 'immediate'),
    true,
    'une urgence ne doit JAMAIS être `grouped` ni `suppressed`, quel que soit le réglage de confort',
  );
});

Deno.test('planDailyDelivery : une urgence reste immédiate même noyée au-delà du seuil', () => {
  // 5 événements non urgents (au-delà du seuil de 3) + une urgence en dernière
  // position chronologique : elle ne doit PAS hériter du sort « grouped » de
  // ses voisins, même si elle arrive après le seuil.
  const events: DeliverableEvent[] = [
    { id: 'b1', kind: 'badge', atMs: 1 },
    { id: 'b2', kind: 'badge', atMs: 2 },
    { id: 'b3', kind: 'badge', atMs: 3 },
    { id: 'b4', kind: 'badge', atMs: 4 },
    { id: 'b5', kind: 'badge', atMs: 5 },
    { id: 'urgent', kind: 'defense_expirant', atMs: 6 },
  ];
  const plan = planDailyDelivery(events, ALL_ON);
  const urgent = plan.find((d) => d.id === 'urgent');
  assertEquals(urgent?.mode, 'immediate');
});

// ─── 3. Regroupement au-delà de 3/jour (§13, non urgents) ───────────────────

Deno.test('planDailyDelivery : les 3 premiers non urgents immédiats, le reste regroupé', () => {
  assertEquals(NOTIF_NON_URGENT_DAILY_THRESHOLD, 3);
  const events: DeliverableEvent[] = [
    { id: 'b1', kind: 'badge', atMs: 5 },
    { id: 'b2', kind: 'badge', atMs: 1 }, // plus tôt dans la journée
    { id: 'b3', kind: 'badge', atMs: 3 },
    { id: 'b4', kind: 'badge', atMs: 4 },
    { id: 'b5', kind: 'badge', atMs: 2 },
  ];
  const plan = planDailyDelivery(events, ALL_ON);
  const byId = new Map(plan.map((d) => [d.id, d.mode]));
  // Triés par heure : b2(1) b5(2) b3(3) b4(4) b1(5) → les 3 premiers immédiats.
  assertEquals(byId.get('b2'), 'immediate');
  assertEquals(byId.get('b5'), 'immediate');
  assertEquals(byId.get('b3'), 'immediate');
  assertEquals(byId.get('b4'), 'grouped');
  assertEquals(byId.get('b1'), 'grouped');
});

Deno.test('planDailyDelivery : le seuil se compte PAR CATÉGORIE VIVANTE, pas par les supprimés', () => {
  // 2 événements crew (catégorie coupée → supprimés, ne comptent pas) + 4
  // événements rivalité (catégorie active) : les 3 premiers rivalité doivent
  // rester immédiats malgré les 2 crew qui les précèdent chronologiquement.
  const prefs: NotificationPrefs = { ...ALL_ON, crew: false };
  const events: DeliverableEvent[] = [
    { id: 'c1', kind: 'crew', atMs: 1 },
    { id: 'c2', kind: 'crew', atMs: 2 },
    { id: 'r1', kind: 'rivalite', atMs: 3 },
    { id: 'r2', kind: 'rivalite', atMs: 4 },
    { id: 'r3', kind: 'rivalite', atMs: 5 },
    { id: 'r4', kind: 'rivalite', atMs: 6 },
  ];
  const plan = planDailyDelivery(events, prefs);
  const byId = new Map(plan.map((d) => [d.id, d.mode]));
  assertEquals(byId.get('c1'), 'suppressed');
  assertEquals(byId.get('c2'), 'suppressed');
  assertEquals(byId.get('r1'), 'immediate');
  assertEquals(byId.get('r2'), 'immediate');
  assertEquals(byId.get('r3'), 'immediate');
  assertEquals(byId.get('r4'), 'grouped');
});

Deno.test('planDailyDelivery : aucun événement -> aucune décision (état calme)', () => {
  assertEquals(planDailyDelivery([], ALL_ON), []);
});

Deno.test('categoryOf : chaque type non urgent -> exactement une catégorie', () => {
  assertEquals(categoryOf('crew'), 'crew');
  assertEquals(categoryOf('rivalite'), 'rivalite');
  assertEquals(categoryOf('badge'), 'progression');
  assertEquals(categoryOf('saison'), 'progression');
  assertEquals(categoryOf('resume'), 'progression');
});

// ─── 4. Persistance : lecture tolérante ──────────────────────────────────────

Deno.test('parseNotificationPrefs : stockage vide -> les défauts', () => {
  assertEquals(parseNotificationPrefs(null), DEFAULT_NOTIFICATION_PREFS);
  assertEquals(parseNotificationPrefs(''), DEFAULT_NOTIFICATION_PREFS);
});

Deno.test('parseNotificationPrefs : JSON illisible -> les défauts, jamais une exception', () => {
  assertEquals(parseNotificationPrefs('{oops'), DEFAULT_NOTIFICATION_PREFS);
  assertEquals(parseNotificationPrefs('null'), DEFAULT_NOTIFICATION_PREFS);
  assertEquals(parseNotificationPrefs('42'), DEFAULT_NOTIFICATION_PREFS);
  assertEquals(parseNotificationPrefs('"texte"'), DEFAULT_NOTIFICATION_PREFS);
});

Deno.test('parseNotificationPrefs : partiel -> les clés manquantes retombent sur le défaut', () => {
  const prefs = parseNotificationPrefs(JSON.stringify({ produit: true }));
  assertEquals(prefs, { ...DEFAULT_NOTIFICATION_PREFS, produit: true });
});

Deno.test('parseNotificationPrefs : mauvais type par clé -> défaut de CETTE clé seulement', () => {
  const prefs = parseNotificationPrefs(
    JSON.stringify({ defense: 'oui', crew: 0, rivalite: null, progression: true, produit: true }),
  );
  assertEquals(prefs, {
    defense: DEFAULT_NOTIFICATION_PREFS.defense,
    crew: DEFAULT_NOTIFICATION_PREFS.crew,
    rivalite: DEFAULT_NOTIFICATION_PREFS.rivalite,
    progression: true,
    produit: true,
  });
});

Deno.test('un aller-retour sérialisation -> lecture est stable', () => {
  const prefs: NotificationPrefs = {
    defense: true,
    crew: false,
    rivalite: true,
    progression: false,
    produit: true,
  };
  assertEquals(parseNotificationPrefs(JSON.stringify(prefs)), prefs);
});

Deno.test('applyNotificationPrefsPatch : ne crée ni ne perd aucune clé, ne mute pas la base', () => {
  const next = applyNotificationPrefsPatch(DEFAULT_NOTIFICATION_PREFS, { produit: true });
  assertEquals(next, { ...DEFAULT_NOTIFICATION_PREFS, produit: true });
  assertEquals(DEFAULT_NOTIFICATION_PREFS.produit, false);
});

// ─── Migration legacy (lecture seule depuis motivation/store.ts) ────────────

Deno.test('deriveFromLegacyChannels : rien à lire -> null (les défauts E71 s’appliquent)', () => {
  assertEquals(deriveFromLegacyChannels(null), null);
  assertEquals(deriveFromLegacyChannels(''), null);
  assertEquals(deriveFromLegacyChannels('{oops'), null);
  assertEquals(deriveFromLegacyChannels('{}'), null);
  assertEquals(deriveFromLegacyChannels(JSON.stringify({ notifChannels: 'solo' })), null);
});

Deno.test('deriveFromLegacyChannels : solo+competition -> defense et rivalite activées', () => {
  const raw = JSON.stringify({ notifChannels: ['solo', 'crew', 'competition'] });
  assertEquals(deriveFromLegacyChannels(raw), { defense: true, rivalite: true });
});

Deno.test('deriveFromLegacyChannels : seul crew -> les deux réels restent coupés', () => {
  const raw = JSON.stringify({ notifChannels: ['crew'] });
  assertEquals(deriveFromLegacyChannels(raw), { defense: false, rivalite: false });
});

Deno.test('deriveFromLegacyChannels : off explicite -> les deux réels coupés', () => {
  const raw = JSON.stringify({ notifChannels: ['off'] });
  assertEquals(deriveFromLegacyChannels(raw), { defense: false, rivalite: false });
});

// ─── Mapping vers le canal serveur RÉEL ──────────────────────────────────────

Deno.test('notifPrefsToChannels : les deux réels activés -> solo + competition', () => {
  assertEquals(notifPrefsToChannels(ALL_ON), ['solo', 'competition']);
});

Deno.test('notifPrefsToChannels : un seul réel activé -> un seul canal', () => {
  assertEquals(notifPrefsToChannels({ ...ALL_ON, rivalite: false }), ['solo']);
  assertEquals(notifPrefsToChannels({ ...ALL_ON, defense: false }), ['competition']);
});

Deno.test('notifPrefsToChannels : les deux réels coupés -> [off], jamais un tableau vide', () => {
  assertEquals(notifPrefsToChannels({ ...ALL_ON, defense: false, rivalite: false }), ['off']);
});

Deno.test('notifPrefsToChannels : crew/progression/produit ne fabriquent AUCUN canal', () => {
  // `crew` activé seul (aucun canal réel) doit produire EXACTEMENT ['off'] :
  // aucun canal serveur n'existe pour lui, l'inclure mentirait sur un choix
  // explicite jamais fait.
  assertEquals(
    notifPrefsToChannels({
      defense: false,
      crew: true,
      rivalite: false,
      progression: true,
      produit: true,
    }),
    ['off'],
  );
});
