/**
 * GRYD — tests E14 (détail d'un territoire). Ce qu'ils verrouillent :
 *   · la PROPRIÉTÉ se lit sur les ids, jamais sur la couleur déjà calculée —
 *     c'est le défaut qui faisait passer MA zone contestée pour une zone rivale ;
 *   · l'inconnu reste l'inconnu (aucun CTA, aucun propriétaire affirmé) ;
 *   · la métrique temporelle et la frontière changent de SENS avec la source,
 *     et le module le dit au lieu de fondre les deux.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  zoneBorderKind,
  zoneCta,
  zoneOwnership,
  zoneProtectionLevel,
  zoneRole,
  zoneShowsPrivacyNote,
  zoneTimeMetric,
  type ZoneOwnershipFacts,
} from './zoneDetail.ts';

const ME = 'me-uuid';
const MATE = 'mate-uuid';
const CREW = 'crew-uuid';
const RIVAL = 'rival-uuid';
const crew = new Set([MATE, CREW]);
const viewer = { meId: ME, crewIds: crew };

const facts = (o: Partial<ZoneOwnershipFacts>): ZoneOwnershipFacts => ({
  status: 'rival',
  ownerType: 'user',
  ownerId: RIVAL,
  ...o,
});

Deno.test('E14 — les quatre propriétés qui ont une source', () => {
  // Ma ligne `owned_personal`.
  assertEquals(
    zoneOwnership(facts({ status: 'crew', ownerId: ME, ownerType: 'user' }), viewer),
    'personal',
  );
  // Un coéquipier.
  assertEquals(
    zoneOwnership(facts({ status: 'crew', ownerId: MATE, ownerType: 'user' }), viewer),
    'crew',
  );
  // Le crew LUI-MÊME (`owned_crew`) — le cas que `status: 'crew'` ne distinguait pas.
  assertEquals(
    zoneOwnership(facts({ status: 'crew', ownerId: CREW, ownerType: 'crew' }), viewer),
    'crew',
  );
  assertEquals(zoneOwnership(facts({}), viewer), 'rival');
});

Deno.test('E14 — LE DÉFAUT CORRIGÉ : `contested` ne dit rien du propriétaire', () => {
  // territoryRole rend 'contested' quel que soit le tenant : c'est ici qu'on
  // retrouve QUI tient la zone. Avant, `status !== 'crew'` ⇒ rival ⇒ MA zone
  // attaquée s'ouvrait « ZONE RIVALE · Reprendre » et la sheet de DÉFENSE
  // (isDefenseZone exige role 'mine') ne pouvait jamais s'ouvrir.
  const mine = facts({ status: 'contested', ownerId: ME, ownerType: 'user' });
  assertEquals(zoneOwnership(mine, viewer), 'personal');
  assertEquals(zoneRole('contested', zoneOwnership(mine, viewer)), 'mine');

  const crewZone = facts({ status: 'contested', ownerId: CREW, ownerType: 'crew' });
  assertEquals(zoneOwnership(crewZone, viewer), 'crew');
  assertEquals(zoneRole('contested', zoneOwnership(crewZone, viewer)), 'mine');

  const theirs = facts({ status: 'contested', ownerId: RIVAL, ownerType: 'user' });
  assertEquals(zoneOwnership(theirs, viewer), 'rival');
  assertEquals(zoneRole('contested', zoneOwnership(theirs, viewer)), 'rival');
});

Deno.test('E14 — `status` reste autoritaire quand il TRANCHE (aucune régression)', () => {
  // Un appelant qui ne passe pas de `viewer` ne doit pas faire reculer une
  // réponse déjà juste : `crew`/`rival` ont été décidés contre `meId` en amont.
  assertEquals(zoneRole('crew', 'unknown'), 'mine');
  assertEquals(zoneRole('rival', 'unknown'), 'rival');
  // Seul `contested` retombe sur la propriété — et son inconnu se peint rival.
  assertEquals(zoneRole('contested', 'unknown'), 'rival');
  assertEquals(zoneRole('contested', 'personal'), 'mine');
});

Deno.test('E14 — sans identité connue, on n’affirme AUCUN propriétaire', () => {
  const contested = facts({ status: 'contested', ownerId: ME, ownerType: 'user' });
  assertEquals(zoneOwnership(contested, null), 'unknown');
  assertEquals(zoneOwnership(contested, { meId: null }), 'unknown');
  // …et l'inconnu ne propose RIEN : « Reprendre » sur une zone peut-être mienne
  // déciderait à la place d'un fait qu'on n'a pas.
  assertEquals(zoneCta('rival', 'unknown'), null);
  // Il se peint en rival plutôt qu'en chartreuse : annoncer à tort « c'est à
  // toi » ferait manquer une défense.
  assertEquals(zoneRole('contested', 'unknown'), 'rival');
  assertEquals(zoneShowsPrivacyNote('rival'), true);
});

Deno.test('E14 — un crew dont l’uuid vaudrait le mien ne devient pas « à toi »', () => {
  // 0074 n'impose aucune contrainte croisée entre les uuid de `profiles` et ceux
  // de `crews` : la collision est improbable mais rien ne l'interdit. Avec
  // `owner_type = 'crew'`, le raccourci « personnel » est fermé, et sans roster
  // de crew pour rattacher la ligne, la zone reste celle de quelqu'un d'autre.
  assertEquals(
    zoneOwnership(facts({ status: 'contested', ownerId: ME, ownerType: 'crew' }), { meId: ME }),
    'rival',
  );
  // Avec le roster, elle redevient — correctement — une zone de MON crew.
  assertEquals(
    zoneOwnership(facts({ status: 'contested', ownerId: CREW, ownerType: 'crew' }), viewer),
    'crew',
  );
});

Deno.test('E14 — chemin HEXAGONAL : le statut déjà tranché est respecté', () => {
  // `stateFor` a comparé à meId en amont ; ici ownerType vaut 'neutral' et le
  // Set de crew peut être absent. On ne re-tranche pas avec moins d'information.
  const hex = facts({ status: 'crew', ownerType: 'neutral', ownerId: MATE });
  assertEquals(zoneOwnership(hex, { meId: ME }), 'crew');
  assertEquals(zoneOwnership(facts({ ownerType: 'neutral' }), { meId: ME }), 'rival');
  // Sans session, même un statut 'crew' ne s'affirme pas.
  assertEquals(zoneOwnership(hex, { meId: null }), 'unknown');
});

Deno.test('E14 — protection : 0 n’est pas « niveau 0 », c’est aucune fortification', () => {
  assertEquals(zoneProtectionLevel(0), null);
  assertEquals(zoneProtectionLevel(null), null);
  assertEquals(zoneProtectionLevel(undefined), null);
  assertEquals(zoneProtectionLevel(1.5), null);
  assertEquals(zoneProtectionLevel(-1), null);
  // Hors contrainte SQL (0-3) : valeur illisible ⇒ absence, jamais un chiffre.
  assertEquals(zoneProtectionLevel(4), null);
  assertEquals(zoneProtectionLevel(1), 1);
  assertEquals(zoneProtectionLevel(3), 3);
});

Deno.test('E14 — la frontière dit ce qu’elle est, hexagone compris', () => {
  assertEquals(zoneBorderKind({ geometrySource: 'polygon', precision: 'exact' }), 'exact');
  assertEquals(
    zoneBorderKind({ geometrySource: 'polygon', precision: 'generalized' }),
    'generalized',
  );
  // Précision absente sur un polygone : on ne promet pas « exact ».
  assertEquals(zoneBorderKind({ geometrySource: 'polygon' }), 'generalized');
  assertEquals(zoneBorderKind({ geometrySource: 'polygon', precision: null }), 'generalized');
  // Le repli de transition est un contour d'HEXAGONES : l'app l'avoue.
  assertEquals(zoneBorderKind({ geometrySource: 'h3cells', precision: 'exact' }), 'approx');
});

Deno.test('E14 — « Tenue depuis » n’est vrai que sur le chemin polygonal', () => {
  assertEquals(zoneTimeMetric('polygon'), 'held');
  assertEquals(zoneTimeMetric('h3cells'), 'lastCapture');
});

Deno.test('E14 — un seul CTA par variante, et jamais un bouton mort', () => {
  assertEquals(zoneCta('rival', 'rival'), 'reprendre');
  assertEquals(zoneCta('mine', 'personal'), 'plan-outing');
  assertEquals(zoneCta('mine', 'crew'), 'plan-outing');
  // Zone à moi dont on ne sait pas si elle est personnelle ou du crew : le CTA
  // reste valable, c'est la COPIE qui reste prudente.
  assertEquals(zoneCta('mine', 'unknown'), 'plan-outing');
  // RENFORCER n'est proposé NULLE PART : defense_level ne monte que sur une
  // contestation repoussée (ingest_run/index.ts:3604), donc rien ne « renforce »
  // une zone tranquille.
  assertEquals(zoneShowsPrivacyNote('mine'), false);
  assertEquals(zoneShowsPrivacyNote('rival'), true);
});
