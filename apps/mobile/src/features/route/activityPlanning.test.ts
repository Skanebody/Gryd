/**
 * GRYD — tests des BORNES DE DISTANCE PAR DISCIPLINE du planificateur.
 *
 * DEUX invariants, et il faut les deux — le chantier vélo a tenu le premier en
 * cassant le second :
 *
 *  1. AUCUNE distance proposée à vélo ne peut tomber sous le périmètre minimal
 *     d'une boucle vélo. Sinon le planificateur propose une sortie que le moteur
 *     ne peut PAS récompenser — un effort réel, zéro zone, et personne pour le
 *     dire avant la fin.
 *  2. LES BORNES DE LA COURSE À PIED SONT CELLES D'AVANT LE VÉLO. Faire lire au
 *     planificateur les bornes de la préférence enregistrée avait retiré au
 *     coureur sa boucle de 2 km (débutant, récupération) et son trail au-delà du
 *     marathon. Rendre le vélo honnête ne se paie pas sur la course.
 *
 * Les valeurs attendues ne sont pas recopiées à la main : elles sont confrontées
 * à `activityRouting()` et aux constantes de game-rules. Un test qui réécrirait
 * « 15 » ou « 5 000 » cesserait de protéger le jour où la règle bouge. LA SEULE
 * EXCEPTION est le verrou de non-régression en fin de fichier, qui écrit ses
 * quatre nombres EXPRÈS : son rôle est justement d'empêcher game-rules de les
 * déplacer en silence, il ne peut donc pas les lui demander.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  ACTIVITIES,
  activityRouting,
  activityRules,
  BIKE_LOOP_MIN_PERIMETER_M,
  BIKE_ROUTING_PROFILE,
  DEFAULT_ACTIVITY,
  LOOP_MIN_PERIMETER_M,
  ROUTE_PEDESTRIAN_PROFILE,
} from '@klaim/shared';
import {
  clampPlannerKm,
  formatBandsKm,
  plannerBounds,
  plannerChoicesKm,
  plannerFormatsKm,
  plannerMaxKm,
  plannerMinKm,
  plannerRoutingProfile,
  plannerStepKm,
  proposalMakesZone,
} from './activityPlanning.ts';

/**
 * TOUTES les distances qu'un écran peut PROPOSER dans une discipline : les
 * choix en un tap, les deux formats fixes, le plancher, le défaut, et ce que la
 * borne rend d'une saisie absurde. Si une seule d'entre elles passe sous le
 * plancher de boucle, le planificateur ment.
 */
function everyProposedKm(activity: (typeof ACTIVITIES)[number]): number[] {
  const b = plannerBounds(activity);
  const f = plannerFormatsKm(activity);
  return [
    ...plannerChoicesKm(activity),
    b.minKm,
    b.maxKm,
    b.fallbackKm,
    f.shortKm,
    f.longKm,
    // Saisies hostiles : champ vidé, zéro, négatif, valeur délirante.
    clampPlannerKm(activity, Number.NaN),
    clampPlannerKm(activity, 0),
    clampPlannerKm(activity, -42),
    clampPlannerKm(activity, 1),
    clampPlannerKm(activity, 1e9),
  ];
}

Deno.test('VÉLO : toute distance proposée dépasse BIKE_LOOP_MIN_PERIMETER_M', () => {
  const minKm = BIKE_LOOP_MIN_PERIMETER_M / 1000;
  for (const km of everyProposedKm('bike')) {
    assert(
      km > minKm,
      `une boucle vélo de ${km} km ne dépasse pas le plancher de périmètre ` +
        `(${minKm} km) : elle serait INCAPTURABLE`,
    );
    // Et la même chose dite par la fonction que l'app utilisera pour l'affirmer.
    assert(proposalMakesZone('bike', km), `proposalMakesZone('bike', ${km}) doit être vrai`);
  }
});

Deno.test('la garantie vaut dans CHAQUE discipline, contre SON propre plancher', () => {
  for (const activity of ACTIVITIES) {
    const floorKm = activityRouting(activity).loopMinPerimeterM / 1000;
    for (const km of everyProposedKm(activity)) {
      assert(
        km > floorKm,
        `[${activity}] ${km} km ≤ plancher de boucle ${floorKm} km`,
      );
    }
  }
});

Deno.test('le plancher course reste celui de la course (aucune contagion vélo)', () => {
  assertEquals(plannerMinKm('run') * 1000, activityRouting('run').plannerMinM);
  assertEquals(plannerMinKm('run') * 1000 > LOOP_MIN_PERIMETER_M, true);
  // Les deux mondes ne se confondent pas : le vélo propose PLUS LOIN, toujours.
  assert(plannerMinKm('bike') > plannerMinKm('run'));
  assert(plannerMaxKm('bike') > plannerMaxKm('run'));
});

Deno.test('les bornes sont SOURCÉES (aucun nombre écrit dans le module)', () => {
  for (const activity of ACTIVITIES) {
    const rules = activityRouting(activity);
    assertEquals(plannerMinKm(activity) * 1000, rules.plannerMinM);
    assertEquals(plannerMaxKm(activity) * 1000, rules.plannerMaxM);
    // Le défaut n'est PAS le plancher : proposer d'office la plus petite boucle
    // atteignable à quelqu'un dont on ne sait rien reviendrait à le supposer
    // débutant. Il vaut `plannerDefaultM`, et il tient dans la plage.
    assertEquals(plannerBounds(activity).fallbackKm, rules.plannerDefaultM / 1000);
    assert(plannerBounds(activity).fallbackKm > plannerMinKm(activity));
    assert(plannerBounds(activity).fallbackKm < plannerMaxKm(activity));
  }
});

Deno.test(
  'le SÉLECTEUR et la PRÉFÉRENCE ENREGISTRÉE ne sont pas les mêmes bornes',
  () => {
    // La confusion des deux EST la régression du 26/07 : le planificateur avait
    // hérité des bornes de `route_preferences`, bornées par une contrainte SQL
    // en production (0054 : 1 000 … 42 195 m) qui ne le concerne pas — il n'écrit
    // rien. Le test verrouille la séparation, pas des valeurs.
    const run = activityRouting('run');
    assert(
      run.plannerMinM < run.targetDistanceChoicesM[0]!,
      'le sélecteur doit descendre SOUS la plus petite pastille (boucle de récup)',
    );
    assert(
      run.plannerMaxM > run.targetDistanceMaxM,
      'le sélecteur doit monter AU-DESSUS du plafond enregistrable (trail)',
    );
    // Et il ne doit jamais proposer plus que ce que l'ingestion accepterait.
    for (const activity of ACTIVITIES) {
      assert(activityRouting(activity).plannerMaxM < activityRules(activity).maxDistanceM);
    }
  },
);

Deno.test(
  'NON-RÉGRESSION COUREUR : les bornes d’avant le chantier vélo, au chiffre près',
  () => {
    // ─── POURQUOI CE TEST ÉCRIT SES NOMBRES EN CLAIR ────────────────────────
    // Tout le reste de ce fichier confronte le module à game-rules, exprès. Ici
    // c'est l'inverse ET c'est volontaire : ces quatre valeurs sont celles que
    // le planificateur SERVAIT AUX COUREURS avant que le vélo existe —
    // `GEN_MIN_KM = 1.5`, `GEN_MAX_KM = 50`, `GEN_STEP_KM = 0.5` (supprimées de
    // `features/route/generator.ts` le 26/07/2026, cf. son en-tête) et la
    // « boucle courte » de 2 km de l'écran. Un verrou de non-régression doit
    // être lisible sans ouvrir game-rules : si l'un de ces nombres bouge,
    // quelqu'un doit venir ICI l'assumer, au lieu de le déplacer sans s'en
    // rendre compte — ce qui est exactement ce qui s'est passé le 26/07.
    assertEquals(plannerMinKm('run'), 1.5, 'la boucle courte du débutant a re-disparu');
    assertEquals(plannerMaxKm('run'), 50, 'le trail au-delà du marathon a re-disparu');
    assertEquals(plannerStepKm('run'), 0.5, 'le pas du sélecteur a bougé');
    assertEquals(plannerFormatsKm('run').shortKm, 2, 'le format « courte » n’est plus 2 km');
    // La boucle de 2 km doit être ATTEIGNABLE au sélecteur, pas seulement citée.
    assertEquals(clampPlannerKm('run', 2), 2);
    // …et elle doit faire une zone, sinon on aurait rendu au coureur un mensonge.
    assert(proposalMakesZone('run', 2));
    // Le défaut reste une sortie de semaine ordinaire (3 km), jamais le plancher.
    assertEquals(plannerBounds('run').fallbackKm, 3);
  },
);

Deno.test("le profil de routage est celui de la discipline, et JAMAIS 'car'", () => {
  assertEquals(plannerRoutingProfile('run'), ROUTE_PEDESTRIAN_PROFILE);
  assertEquals(plannerRoutingProfile('bike'), BIKE_ROUTING_PROFILE);
  for (const activity of ACTIVITIES) {
    assert(
      plannerRoutingProfile(activity) !== 'car',
      'aucune route GRYD n’est produite au profil automobile, dans aucune discipline',
    );
  }
});

Deno.test('le pas suit l’ÉCHELLE de la discipline, dans le rapport de game-rules', () => {
  const runStep = plannerStepKm('run');
  const bikeStep = plannerStepKm('bike');
  assert(runStep > 0 && bikeStep > 0, 'un pas nul figerait les boutons − / +');
  // Rapport ATTENDU = celui des deux tables de distances, pas un second chiffre.
  const ratio =
    activityRouting('bike').targetDistanceChoicesM[0]! /
    activityRouting('run').targetDistanceChoicesM[0]!;
  assertEquals(bikeStep, Math.round(runStep * ratio * 10) / 10);
  // Un pas doit rester utilisable : traverser la plage en moins de 200 taps.
  for (const activity of ACTIVITIES) {
    const b = plannerBounds(activity);
    assert(
      (b.maxKm - b.minKm) / b.stepKm < 200,
      `[${activity}] la plage demanderait trop de taps au pas courant`,
    );
  }
});

Deno.test('les bandes de format sont à l’échelle : 10 km à vélo est un format COURT', () => {
  const bike = formatBandsKm('bike');
  assert(
    plannerMinKm('bike') <= bike.shortMaxKm,
    'la plus PETITE sortie vélo proposée ne peut pas s’annoncer « grande boucle »',
  );
  const run = formatBandsKm('run');
  assert(plannerMinKm('run') <= run.shortMaxKm);
  // Les bandes restent ordonnées (sinon le `else if` de `generatedReasons` ne
  // pourrait jamais atteindre « format moyen »).
  for (const activity of ACTIVITIES) {
    const bands = formatBandsKm(activity);
    assert(bands.shortMaxKm < bands.mediumMaxKm);
  }
});

Deno.test('la borne ne laisse JAMAIS passer un NaN jusqu’au routeur', () => {
  for (const activity of ACTIVITIES) {
    const b = plannerBounds(activity);
    // Une valeur NON FINIE n'est pas « une distance trop grande » : ce n'est
    // pas une distance du tout. On retombe donc sur le défaut plutôt que
    // d'épingler silencieusement une borne que personne n'a demandée.
    assertEquals(clampPlannerKm(activity, Number.NaN), b.fallbackKm);
    assertEquals(clampPlannerKm(activity, Number.POSITIVE_INFINITY), b.fallbackKm);
    assertEquals(clampPlannerKm(activity, Number.NEGATIVE_INFINITY), b.fallbackKm);
    assertEquals(clampPlannerKm(activity, b.minKm), b.minKm);
    assertEquals(clampPlannerKm(activity, b.maxKm), b.maxKm);
  }
});

Deno.test('la discipline par défaut est bien celle du planificateur historique', () => {
  // Un appelant qui ignore la notion de discipline doit obtenir la course.
  assertEquals(plannerRoutingProfile(DEFAULT_ACTIVITY), ROUTE_PEDESTRIAN_PROFILE);
});

Deno.test(
  'LES DEUX À LA FOIS : le vélo capture toujours ET la course n’a rien perdu',
  () => {
    // Un seul test, parce que c'est un seul arbitrage : la correction du vélo ne
    // doit pas se payer sur la course. Les deux moitiés séparées avaient déjà
    // passé le 26/07 au matin — l'une existait, l'autre n'avait jamais été
    // écrite, et c'est précisément par là que la régression est passée.

    // ① VÉLO : rien de proposable ne descend sous le périmètre de capture vélo.
    for (const km of everyProposedKm('bike')) {
      assert(
        km * 1000 > BIKE_LOOP_MIN_PERIMETER_M,
        `une boucle vélo de ${km} km serait INCAPTURABLE`,
      );
    }

    // ② COURSE : les bornes d'avant le chantier vélo, au chiffre près.
    assertEquals(
      [plannerMinKm('run'), plannerMaxKm('run'), plannerStepKm('run')],
      [1.5, 50, 0.5],
      'les bornes course à pied ne sont plus celles d’avant le chantier vélo',
    );
    assertEquals(plannerFormatsKm('run').shortKm, 2);
  },
);
