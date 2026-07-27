/**
 * GRYD — E49 · CRÉER UNE SORTIE CREW : les décisions du formulaire, prouvées.
 *
 * Quatre familles, et les quatre couvrent une faute qui ne se lit pas :
 *
 *   1. LA COMPOSITION DE L'INSTANT. « Demain 19 h » est une soustraction de
 *      calendrier, pas une constante : sans test, un `setDate` posé après un
 *      `setHours` fait basculer un jour au changement d'heure d'été, et la
 *      sortie se publie 60 minutes à côté. Les assertions sont RELATIVES (pas
 *      d'heure absolue) pour rester vraies dans n'importe quel fuseau — sinon
 *      le test serait vert à Paris et rouge sur une machine en UTC.
 *
 *   2. LA GARDE DE VIE PRIVÉE. `MEETING_POINT_FIXTURES` est la liste partagée
 *      avec le serveur (le test PGlite la relit et exige le MÊME verdict de
 *      `crew_outing_place_refusal`). Ce test-ci prouve le côté client. Les deux
 *      ensemble interdisent la divergence : un écran qui accepterait « 12 rue
 *      X » peindrait un CTA que le serveur refuse — un bouton mort.
 *
 *   3. « AUCUN BOUTON MORT » (§A4) en fonction pure. `outingBlockReason` doit
 *      refuser AVANT l'envoi ce que le serveur refusera : date passée, places
 *      négatives, titre vide, horizon dépassé, droit absent.
 *
 *   4. LA LECTURE DÉFENSIVE du jsonb : une réponse partielle ne devient JAMAIS
 *      une sortie à moitié inventée affichée au crew.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CREW_OUTING_CAPACITY_MAX,
  CREW_OUTING_CAPACITY_MIN,
  CREW_OUTING_HORIZON_DAYS,
  CREW_OUTING_PLACE_LABEL_MAX,
  CREW_OUTING_TITLE_MAX,
  CREW_OUTING_ZONE_LABEL_MAX,
} from '@klaim/shared';
import {
  MEETING_POINT_FIXTURES,
  OUTING_MINUTE_STEPS,
  defaultWhenDraft,
  emptyOutingDraft,
  meetingPointRefusal,
  outingBlockReason,
  outingLeadHours,
  outingPayloadOf,
  outingRefusalOf,
  outingStartsAtMs,
  parseCapacity,
  parseCrewOuting,
  parseOutingContext,
  type OutingDraft,
} from './crewOuting.ts';

/** Un instant fixe et arbitraire — jamais `Date.now()` (un test ne dérive pas). */
const NOW = new Date('2026-08-03T12:00:00Z').getTime();
const H = 3_600_000;

const draftOf = (over: Partial<OutingDraft> = {}): OutingDraft => ({
  ...emptyOutingDraft(NOW),
  title: 'Sortie du mardi',
  // La discipline est CHOISIE ici parce que le brouillon d'ouverture n'en a
  // aucune : c'est précisément ce que le test « aucune présélection » vérifie.
  activity: 'run',
  placeLabel: 'Place de la République',
  ...over,
});

// ═══ 1. L'INSTANT ═══════════════════════════════════════════════════════════

Deno.test('outingStartsAtMs : +1 jour avance d’exactement un jour de calendrier', () => {
  const base = { dayOffset: 0, hour: 19, minute: 30 };
  const today = outingStartsAtMs(base, NOW);
  const tomorrow = outingStartsAtMs({ ...base, dayOffset: 1 }, NOW);
  const d1 = new Date(today);
  const d2 = new Date(tomorrow);
  // On compare des CHAMPS de calendrier, pas un delta en ms : un passage à
  // l'heure d'été fait 23 ou 25 heures, et une assertion en ms serait fausse
  // deux jours par an — exactement le bug qu'on veut ne PAS introduire.
  assertEquals(d2.getHours(), d1.getHours(), 'l’heure locale doit être identique');
  assertEquals(d2.getMinutes(), d1.getMinutes(), 'les minutes doivent être identiques');
  assertEquals(d2.getDate(), new Date(today + 24 * H).getDate(), 'le jour civil doit avancer de 1');
});

Deno.test('outingStartsAtMs ne lit AUCUNE horloge : même entrée, même sortie', () => {
  const d = { dayOffset: 2, hour: 7, minute: 15 };
  assertEquals(outingStartsAtMs(d, NOW), outingStartsAtMs(d, NOW));
});

Deno.test('le brouillon par défaut est dans le FUTUR (jamais une erreur à l’ouverture)', () => {
  // À toute heure de la journée, y compris à 23 h 50 (le +1 h franchit minuit).
  for (const offset of [0, 6 * H, 11.9 * H, 23.9 * H]) {
    const now = NOW + offset;
    const when = defaultWhenDraft(now);
    const at = outingStartsAtMs(when, now);
    assertEquals(at > now, true, `défaut dans le passé pour un décalage de ${offset} ms`);
    assertEquals(
      OUTING_MINUTE_STEPS.includes(when.minute),
      true,
      'la minute par défaut doit être un pas proposé par l’écran',
    );
  }
});

Deno.test('outingLeadHours arrondit vers le BAS et ne rend jamais un négatif', () => {
  assertEquals(outingLeadHours(NOW + 3 * H + 59 * 60_000, NOW), 3);
  assertEquals(outingLeadHours(NOW - 5 * H, NOW), 0, 'un passé ne devient pas un délai négatif');
});

Deno.test('AUCUNE DISCIPLINE PRÉSÉLECTIONNÉE : le brouillon s’ouvre sans monde', () => {
  // Le piège que ce test ferme : ouvrir sur « run » publierait « course à pied »
  // pour un crew de cyclistes qui n'aurait jamais touché le segment — l'app
  // affirmerait un choix que personne n'a fait. Même règle qu'E09.
  assertEquals(emptyOutingDraft(NOW).activity, null);
  assertEquals(outingBlockReason(true, draftOf({ activity: null }), NOW), 'activity_unset');
  // …et le choix explicite débloque, dans les DEUX mondes.
  assertEquals(outingBlockReason(true, draftOf({ activity: 'run' }), NOW), null);
  assertEquals(outingBlockReason(true, draftOf({ activity: 'bike' }), NOW), null);
});

Deno.test('sans discipline, la charge utile ne SUBSTITUE pas « run »', () => {
  // Un appelant fautif doit se faire refuser par le serveur (`bad_activity`),
  // pas publier silencieusement une discipline que personne n'a choisie.
  assertEquals(outingPayloadOf(draftOf({ activity: null }), NOW).p_activity, null);
});

// ═══ 2. LA VIE PRIVÉE DU POINT DE RENDEZ-VOUS ═══════════════════════════════

Deno.test('les cas de référence partagés avec le serveur donnent le verdict attendu', () => {
  const wrong: string[] = [];
  for (const [label, expected] of MEETING_POINT_FIXTURES) {
    const got = meetingPointRefusal(label);
    if (got !== expected) wrong.push(`« ${label} » : attendu ${expected}, obtenu ${got}`);
  }
  assertEquals(wrong, [], 'divergence client vs verdict déclaré (le serveur relit cette liste)');
});

Deno.test('la liste de référence couvre les deux motifs ET les cas qui PASSENT', () => {
  // Sans cette garde, quelqu'un pourrait vider la liste de ses cas négatifs et
  // le test resterait vert en ne prouvant plus rien.
  const kinds = new Set(MEETING_POINT_FIXTURES.map(([, k]) => k));
  assertEquals(kinds.has(null), true, 'aucun lieu public dans les cas de référence');
  assertEquals(kinds.has('street_address'), true, 'aucune adresse numérotée');
  assertEquals(kinds.has('door_detail'), true, 'aucun détail de porte');
});

Deno.test('un nom de voie SANS numéro n’est pas une adresse (on ne refuse pas une rue)', () => {
  for (const label of ['Rue Oberkampf', 'Bergmannstrasse', 'Avenue de Flandre']) {
    assertEquals(meetingPointRefusal(label), null, label);
  }
});

Deno.test('un horaire suivi d’un mot de voie n’est PAS refusé (fenêtre de 2 mots)', () => {
  // Le faux refus que la fenêtre {0,2} évite : « 18 h devant la rue X ».
  assertEquals(meetingPointRefusal('18 h devant la rue Oberkampf'), null);
});

Deno.test('les accents et la casse ne contournent pas la garde', () => {
  assertEquals(meetingPointRefusal('12 RUE de la Paix'), 'street_address');
  assertEquals(meetingPointRefusal('Hauptstraße 4'), 'street_address');
  assertEquals(meetingPointRefusal('3e étage'), 'door_detail');
});

Deno.test('un champ vide n’est pas un refus de vie privée (c’est un champ vide)', () => {
  // Confondre les deux ferait afficher « écris un lieu public » à quelqu'un qui
  // n'a encore rien écrit : un reproche à l'ouverture de l'écran.
  assertEquals(meetingPointRefusal(''), null);
  assertEquals(meetingPointRefusal('   '), null);
});

// ═══ 3. AUCUN BOUTON MORT ═══════════════════════════════════════════════════

Deno.test('sans le droit de créer, le formulaire est bloqué AVANT tout le reste', () => {
  assertEquals(outingBlockReason(false, draftOf(), NOW), 'forbidden');
});

Deno.test('titre : vide et trop long sont refusés, la borne exacte passe', () => {
  assertEquals(outingBlockReason(true, draftOf({ title: '   ' }), NOW), 'title_empty');
  assertEquals(
    outingBlockReason(true, draftOf({ title: 'x'.repeat(CREW_OUTING_TITLE_MAX + 1) }), NOW),
    'title_too_long',
  );
  assertEquals(
    outingBlockReason(true, draftOf({ title: 'x'.repeat(CREW_OUTING_TITLE_MAX) }), NOW),
    null,
  );
});

Deno.test('DATE PASSÉE : une heure déjà écoulée aujourd’hui bloque le CTA', () => {
  const now = new Date('2026-08-03T20:00:00').getTime(); // 20 h LOCALES
  const draft = draftOf({ when: { dayOffset: 0, hour: 7, minute: 0 } });
  assertEquals(outingBlockReason(true, draft, now), 'when_past');
});

Deno.test('l’instant PRÉSENT exact est refusé (une sortie commencée est une archive)', () => {
  const when = { dayOffset: 0, hour: 12, minute: 0 };
  const now = outingStartsAtMs(when, NOW);
  assertEquals(outingBlockReason(true, draftOf({ when }), now), 'when_past');
});

Deno.test('au-delà de l’horizon : bloqué ; juste en deçà : accepté', () => {
  const over = draftOf({ when: { dayOffset: CREW_OUTING_HORIZON_DAYS + 1, hour: 12, minute: 0 } });
  assertEquals(outingBlockReason(true, over, NOW), 'when_too_far');
  const inside = draftOf({ when: { dayOffset: CREW_OUTING_HORIZON_DAYS - 1, hour: 12, minute: 0 } });
  assertEquals(outingBlockReason(true, inside, NOW), null);
});

Deno.test('point de rendez-vous : vide, trop long, ou désignant une porte', () => {
  assertEquals(outingBlockReason(true, draftOf({ placeLabel: ' ' }), NOW), 'place_empty');
  assertEquals(
    outingBlockReason(
      true,
      draftOf({ placeLabel: 'x'.repeat(CREW_OUTING_PLACE_LABEL_MAX + 1) }),
      NOW,
    ),
    'place_too_long',
  );
  assertEquals(
    outingBlockReason(true, draftOf({ placeLabel: '12 rue de la Paix' }), NOW),
    'place_street_address',
  );
  assertEquals(
    outingBlockReason(true, draftOf({ placeLabel: 'Interphone Martin' }), NOW),
    'place_door_detail',
  );
});

Deno.test('la zone est facultative, mais bornée quand elle est écrite', () => {
  assertEquals(outingBlockReason(true, draftOf({ zoneLabel: '' }), NOW), null);
  assertEquals(
    outingBlockReason(true, draftOf({ zoneLabel: 'x'.repeat(CREW_OUTING_ZONE_LABEL_MAX + 1) }), NOW),
    'zone_too_long',
  );
});

Deno.test('PLACES NÉGATIVES et autres saisies impossibles sont refusées', () => {
  for (const bad of ['-3', '0', '1', '3,5', '3.5', 'douze', '12a', ' 12 12 ', '½']) {
    assertEquals(parseCapacity(bad).ok, false, `« ${bad} » aurait dû être refusé`);
  }
  assertEquals(
    outingBlockReason(true, draftOf({ capacityText: '-3' }), NOW),
    'capacity_invalid',
  );
});

Deno.test('places : vide = pas de limite (un facultatif n’est pas une faute)', () => {
  assertEquals(parseCapacity(''), { ok: true, value: null });
  assertEquals(parseCapacity('   '), { ok: true, value: null });
  assertEquals(outingBlockReason(true, draftOf({ capacityText: '' }), NOW), null);
});

Deno.test('places : les bornes de game-rules sont inclusives, au-delà c’est refusé', () => {
  assertEquals(parseCapacity(String(CREW_OUTING_CAPACITY_MIN)), {
    ok: true,
    value: CREW_OUTING_CAPACITY_MIN,
  });
  assertEquals(parseCapacity(String(CREW_OUTING_CAPACITY_MAX)), {
    ok: true,
    value: CREW_OUTING_CAPACITY_MAX,
  });
  assertEquals(parseCapacity(String(CREW_OUTING_CAPACITY_MAX + 1)).ok, false);
});

Deno.test('l’ordre des motifs suit la LECTURE de l’écran, pas le coût de calcul', () => {
  // Tout est faux à la fois : le motif rendu doit désigner le PREMIER champ que
  // l'œil rencontre (le titre), sinon on renvoie quelqu'un en bas de page.
  const allWrong = draftOf({
    title: '',
    placeLabel: '12 rue de la Paix',
    capacityText: '-1',
    when: { dayOffset: -5, hour: 12, minute: 0 },
  });
  assertEquals(outingBlockReason(true, allWrong, NOW), 'title_empty');
});

// ═══ 4. LA CHARGE UTILE ═════════════════════════════════════════════════════

Deno.test('la charge utile envoie un INSTANT ISO, pas « 19 h »', () => {
  const p = outingPayloadOf(draftOf({ when: { dayOffset: 1, hour: 19, minute: 30 } }), NOW);
  assertEquals(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(p.p_starts_at),
    true,
    `pas un instant ISO : ${p.p_starts_at}`,
  );
});

Deno.test('les facultatifs partent en null, jamais en chaîne vide', () => {
  const p = outingPayloadOf(draftOf({ zoneLabel: '  ', capacityText: '' }), NOW);
  assertEquals(p.p_zone_label, null);
  assertEquals(p.p_capacity, null);
});

Deno.test('les textes sont rognés : une espace en bordure n’est pas du contenu', () => {
  const p = outingPayloadOf(
    draftOf({ title: '  Footing  ', placeLabel: '  Le kiosque  ', zoneLabel: '  Nord  ' }),
    NOW,
  );
  assertEquals(p.p_title, 'Footing');
  assertEquals(p.p_place_label, 'Le kiosque');
  assertEquals(p.p_zone_label, 'Nord');
});

// ═══ 5. LECTURE DÉFENSIVE DES RÉPONSES SERVEUR ══════════════════════════════

Deno.test('un refus n’est JAMAIS lu comme un contexte', () => {
  assertEquals(parseOutingContext({ ok: false, reason: 'no_crew' }), null);
  assertEquals(outingRefusalOf({ ok: false, reason: 'no_crew' }), 'no_crew');
});

Deno.test('un motif de refus INCONNU de ce build n’est pas rendu en clair', () => {
  // Afficher « reason: foo_bar_v2 » serait pire que de dire « refusé » : le
  // lecteur n'a aucun moyen d'agir sur une clé technique.
  assertEquals(outingRefusalOf({ ok: false, reason: 'quelque_chose_de_neuf' }), null);
  assertEquals(outingRefusalOf({ ok: true }), null);
  assertEquals(outingRefusalOf(null), null);
});

Deno.test('une sortie sans objectif LISIBLE est écartée, jamais devinée', () => {
  assertEquals(parseCrewOuting({ id: 'a', title: 'T', objective: 'raid_v2' }), null);
  assertEquals(parseCrewOuting({ id: 'a', objective: 'defense' }), null, 'sans titre');
  assertEquals(parseCrewOuting({ title: 'T', objective: 'defense' }), null, 'sans id');
});

Deno.test('une ligne illisible est ÉCARTÉE de la liste, elle ne la vide pas', () => {
  const ctx = parseOutingContext({
    ok: true,
    role: 'captain',
    canCreate: true,
    maxUpcoming: 20,
    upcoming: [
      { id: 'a', title: 'Bonne', objective: 'defense', startsAt: '2026-08-04T17:00:00Z' },
      { id: 'b', title: 'Cassée', objective: 'inconnu' },
    ],
  });
  assertEquals(ctx?.upcoming.length, 1, 'la ligne saine doit survivre');
  assertEquals(ctx?.upcoming[0].id, 'a');
});

Deno.test('une discipline inconnue devient null — jamais « run » par défaut', () => {
  // Une sortie n'est pas une course enregistrée : le repli « run » de
  // DEFAULT_ACTIVITY n'a pas cours ici, et inventer une discipline ferait
  // afficher « course à pied » sur une sortie vélo.
  const o = parseCrewOuting({
    id: 'a', title: 'T', objective: 'defense', activity: 'trottinette',
  });
  assertEquals(o?.activity, null);
});

Deno.test('canCreate n’est JAMAIS déduit du rôle côté client', () => {
  // Le serveur dit `canCreate: false` alors que le rôle est « founder » : c'est
  // LUI qui gagne (un droit peut avoir été retiré entre deux lectures).
  const ctx = parseOutingContext({ ok: true, role: 'founder', canCreate: false, upcoming: [] });
  assertEquals(ctx?.canCreate, false);
});

Deno.test('les bornes du module viennent de game-rules, pas de nombres écrits ici', () => {
  // Garde-fou contre le retour d'un nombre magique : si quelqu'un remplace une
  // constante importée par un littéral, ce test ne le voit pas — mais le refus
  // à la borne exacte, si.
  assertEquals(
    outingBlockReason(true, draftOf({ title: 'x'.repeat(CREW_OUTING_TITLE_MAX) }), NOW),
    null,
  );
  assertEquals(
    outingBlockReason(true, draftOf({ title: 'x'.repeat(CREW_OUTING_TITLE_MAX + 1) }), NOW),
    'title_too_long',
  );
});
