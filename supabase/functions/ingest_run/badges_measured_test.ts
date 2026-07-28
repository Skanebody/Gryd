/**
 * GRYD — E62/E63 · « UN BADGE VERROUILLÉ NE MENT PAS SUR SA CONDITION ».
 *
 * `UNMEASURED_BADGE_METRICS` (packages/shared/src/badges.ts) prétend savoir ce
 * que le produit COMPTE réellement. Une liste écrite à la main se périme au
 * premier chantier venu — et une liste périmée redeviendrait exactement le
 * mensonge qu'elle sert à empêcher (une jauge « 0 / 25 » qui n'avancera jamais,
 * ou l'inverse : une jauge cachée alors que la métrique est enfin comptée).
 *
 * Ce test la REVÉRIFIE contre le code, à chaque exécution :
 *  1. chaque métrique déclarée non mesurée est bien une métrique du catalogue ;
 *  2. `applyRunToStats` — seul écrivain de `user_stats` sur le chemin de la
 *     course — n'en bouge AUCUNE, même avec une course « tout à la fois » ;
 *  3. les métriques déclarées mesurées bougent bien (échantillon représentatif
 *     des familles) : sinon la promesse inverse serait creuse ;
 *  4. `offensivesJoined` reste HORS de la liste : elle est incrémentée en SQL
 *     par `finalize_offensive` (0064_offensive_lifecycle.sql:402), pas par la
 *     course — c'est la seule exception, et elle est nommée.
 *
 * Si un jour un job alimente une colonne, (2) casse ici : le correctif est de
 * retirer la métrique de la liste, et la jauge réapparaît d'elle-même dans
 * /badges. C'est le sens du test — forcer la mise à jour, pas la bloquer.
 *
 * AUCUN réseau, aucune horloge : tout est pur.
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  BADGES,
  UNMEASURED_BADGE_METRICS,
  badgeGauge,
  badgeProgress,
  isBadgeProgressMeasured,
  isMetricMeasured,
  type BadgeMetric,
} from '../_shared/badges.ts';
import {
  applyRunToStats,
  emptyLifetimeStats,
  type BadgeRunInput,
} from '../_shared/engine/badges.ts';

/** Métriques réellement portées par au moins un badge de la collection. */
const CATALOG_METRICS: ReadonlySet<BadgeMetric> = new Set(BADGES.map((b) => b.metric));

const PARIS = { lat: 48.8566, lng: 2.3522 };

/**
 * Une course qui coche TOUT ce qu'une course peut cocher : crew, partage, vols,
 * défenses, pionniers, avant-postes, routes, mode facile, run groupé, boucle,
 * 10 km pile, départ à l'heure du loup un 1ᵉʳ janvier, 100 hexes. Si une
 * métrique ne bouge pas ici, aucune course ne la fait bouger.
 */
function courseQuiCocheTout(): BadgeRunInput {
  return {
    status: 'valid',
    startedAt: '2026-01-01T03:30:00+01:00',
    distanceM: 10_000,
    durationS: 3_000,
    avgPaceSKm: 300,
    hexes: { claimed: 50, stolen: 50, defended: 20, pioneer: 30 },
    startPoint: PARIS,
    endPoint: PARIS,
    crewSize: 5,
    duringSeasonZero: true,
    inPioneerZone: true,
    shared: true,
    motionTrust: 100,
    flagged: false,
    allPioneer: true,
    newOutposts: 2,
    newRoutes: 3,
    easyMode: true,
    groupRun: true,
  };
}

Deno.test('les métriques déclarées non mesurées existent bien dans le catalogue', () => {
  for (const metric of UNMEASURED_BADGE_METRICS) {
    assert(
      CATALOG_METRICS.has(metric),
      `${metric} est déclarée non mesurée mais aucun badge ne la porte — liste à nettoyer`,
    );
  }
});

Deno.test('aucune course ne fait bouger une métrique déclarée non mesurée', () => {
  const avant = emptyLifetimeStats();
  // Deux courses : la seconde révèle aussi les compteurs qui n'incrémentent
  // qu'à partir du deuxième passage (records perso, jours/semaines suivants).
  const apres = applyRunToStats(
    applyRunToStats(avant, courseQuiCocheTout()),
    { ...courseQuiCocheTout(), startedAt: '2026-01-08T03:30:00+01:00', distanceM: 21_000 },
  );

  for (const metric of UNMEASURED_BADGE_METRICS) {
    assertEquals(
      apres[metric],
      0,
      `${metric} est DÉSORMAIS alimentée par la course : retire-la de UNMEASURED_BADGE_METRICS ` +
        `(sinon /badges cache une jauge qui serait devenue honnête)`,
    );
  }
});

Deno.test('les métriques déclarées mesurées bougent réellement', () => {
  const apres = applyRunToStats(emptyLifetimeStats(), courseQuiCocheTout());
  // Un représentant par grande famille run-fed (le reste est couvert par
  // badges_test.ts, qui teste les compteurs un par un).
  const temoins: BadgeMetric[] = [
    'runsValid',
    'totalDistanceM',
    'hexesCaptured',
    'steals',
    'defends',
    'pioneerHexes',
    'routes',
    'outposts',
    'crewContributions',
    'weeksActive',
    'verifiedRuns',
    'easyRuns',
    'groupRuns',
    'firstShares',
    'loopRuns',
  ];
  for (const metric of temoins) {
    assert(isMetricMeasured(metric), `${metric} devrait être déclarée mesurée`);
    assert(apres[metric] > 0, `${metric} est déclarée mesurée mais aucune course ne l'incrémente`);
  }
});

Deno.test('offensivesJoined reste mesurée : c’est le SQL qui l’écrit, pas la course', () => {
  // finalize_offensive (0064_offensive_lifecycle.sql:402) fait
  // `insert into user_stats (user_id, offensives_joined) … do update set +1`.
  // Elle ne bouge donc pas ici — et ce n'est PAS une raison de la déclarer
  // non mesurée : la seule exception du produit, nommée pour qu'on s'en souvienne.
  assertEquals(applyRunToStats(emptyLifetimeStats(), courseQuiCocheTout()).offensivesJoined, 0);
  assertFalse(UNMEASURED_BADGE_METRICS.has('offensivesJoined'));
  assert(isMetricMeasured('offensivesJoined'));
});

Deno.test('badgeGauge : silencieuse quand rien n’est compté, chiffrée sinon', () => {
  // Un badge « saison » : décernable (season_close écrit user_badges) mais sans
  // aucune progression comptée → pas de jauge, la condition parle seule.
  assertFalse(isBadgeProgressMeasured('season_rank_3'));
  assertEquals(badgeGauge('season_rank_3', 0), null);
  // …alors que badgeProgress, elle, répondrait « 0 / 3 » : c'est bien l'affichage
  // qu'on refuse, pas le calcul brut.
  assertEquals(badgeProgress('season_rank_3', 0)?.threshold, 3);

  // Un badge de distance : compté, donc jauge légitime.
  const distance = BADGES.find((b) => b.familySlug === 'lifetime_distance' && b.level === 1);
  assert(distance, 'famille lifetime_distance introuvable');
  assert(isBadgeProgressMeasured(distance.key));
  const gauge = badgeGauge(distance.key, distance.threshold / 2);
  assert(gauge, 'une famille comptée doit produire une jauge');
  assertEquals(gauge.ratio, 0.5);

  // Clé inconnue : on ne chiffre pas ce qu'on ne connaît pas.
  assertFalse(isBadgeProgressMeasured('badge_qui_n_existe_pas'));
  assertEquals(badgeGauge('badge_qui_n_existe_pas', 42), null);
});
