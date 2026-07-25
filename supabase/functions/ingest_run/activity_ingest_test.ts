/**
 * GRYD — INGESTION PAR DISCIPLINE (E14, étape 3 : schéma + ingestion).
 * Purs : aucun réseau, aucune I/O, aucune base.
 *
 * L'étape 2 a prouvé que CHAQUE BORNE prise isolément connaît sa discipline.
 * Ce fichier prouve la chose d'après, qui n'est pas la même : que le PIPELINE
 * D'INGESTION les enchaîne toutes avec la MÊME discipline. Une seule de ces
 * quatre étapes laissée en `run` par distraction (filtrage point à point,
 * allure moyenne, cohérence pas/distance, allure par tronçon) suffirait à
 * rejeter un cycliste honnête — et aucun test de borne unitaire ne le verrait,
 * puisque chacune, prise seule, resterait juste.
 *
 * Ce qui est verrouillé ici :
 *  1. DISCIPLINE ABSENTE = COURSE À PIED, à l'octet près (rétro-compatibilité
 *     du contrat client ↔ serveur : un client d'avant le vélo ne change pas de
 *     comportement) ;
 *  2. un cycliste RÉEL est accepté en `bike` et refusé en `run` — les DEUX
 *     manières dont il était refusé (chaque point trop rapide, puis l'allure
 *     moyenne sous la borne « anti-vélo ») ;
 *  3. un coureur RÉEL reste accepté en `run` ;
 *  4. un véhicule LANCÉ est refusé dans les DEUX disciplines ;
 *  5. la forme de `activity` à la frontière HTTP : inconnue = refus, jamais un
 *     repli silencieux sur la course.
 *
 * La séparation des TERRITOIRES (deux propriétaires sur le même hexagone) est
 * du SQL : elle est prouvée par `supabase/tests/activity_dimension.pglite.test.mjs`,
 * qui exécute la vraie migration 0070 sur un vrai Postgres.
 */
import { assert, assertEquals, assertNotEquals } from 'jsr:@std/assert@^1';
import { DEFAULT_ACTIVITY } from '../_shared/game-rules.ts';
import { effectiveActivity, isActivityShape } from './activity.ts';
import { verdictForRequest } from './validate.ts';
import type { RunPoint } from '../_shared/types.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;

/**
 * Ligne droite plein nord à VITESSE CONSTANTE : le générateur de « pratiquant
 * honnête ». `n` points régulièrement espacés en temps ET en distance.
 */
function trace(
  { distanceM, durationS, n }: { distanceM: number; durationS: number; n: number },
): RunPoint[] {
  const points: RunPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      lat: LAT0 + (distanceM * (i / (n - 1))) / M_PER_DEG_LAT,
      lng: LNG0,
      t: Math.round(durationS * 1000 * (i / (n - 1))),
    });
  }
  return points;
}

/**
 * Trace parcourue à `kmh` pendant `minutes`, ÉCHANTILLONNÉE COMME UN VRAI
 * APPAREIL : un point toutes les 2 s (GPS_SAMPLE_INTERVAL_MS). Ce détail n'est
 * pas cosmétique — à 24 km/h, un échantillon toutes les 20 s produirait des
 * bonds de 135 m qui déclencheraient POINT_MAX_JUMP_M (100 m en course) et
 * feraient « rejeter » la trace pour la mauvaise raison. Un test qui passe pour
 * la mauvaise raison ne prouve rien.
 */
const at = (kmh: number, minutes: number): RunPoint[] => {
  const durationS = minutes * 60;
  return trace({
    distanceM: (kmh * 1000 * minutes) / 60,
    durationS,
    n: Math.round(durationS / 2) + 1,
  });
};

// ─── 1. La forme de la discipline à la frontière HTTP ────────────────────────

Deno.test('isActivityShape accepte les disciplines du jeu, et RIEN d’autre', () => {
  assertEquals(isActivityShape('run'), true);
  assertEquals(isActivityShape('bike'), true);
  // Une discipline inventée n'est pas repliée sur la course : elle est refusée
  // en amont (400). Replier, ce serait décider à la place du joueur.
  assertEquals(isActivityShape('scooter'), false);
  assertEquals(isActivityShape('RUN'), false); // pas de tolérance de casse
  assertEquals(isActivityShape(''), false);
  assertEquals(isActivityShape(undefined), false);
  assertEquals(isActivityShape(null), false);
  assertEquals(isActivityShape(42), false);
  assertEquals(isActivityShape({ activity: 'run' }), false);
});

Deno.test('discipline ABSENTE ⇒ course à pied (fait historique, pas repli)', () => {
  assertEquals(effectiveActivity(undefined), 'run');
  assertEquals(effectiveActivity(undefined), DEFAULT_ACTIVITY);
  assertEquals(effectiveActivity('run'), 'run');
  assertEquals(effectiveActivity('bike'), 'bike');
});

// ─── 2. Rétro-compatibilité : ne rien envoyer = le comportement d'avant ──────

Deno.test('le verdict SANS discipline est IDENTIQUE au verdict « run »', () => {
  for (const points of [at(11, 30), at(24, 20), at(28, 25), at(6, 40), at(90, 15)]) {
    const implicit = verdictForRequest({ points });
    const explicit = verdictForRequest({ points }, 'run');
    assertEquals(
      JSON.stringify(implicit),
      JSON.stringify(explicit),
      'un client qui ignore le vélo doit obtenir EXACTEMENT le comportement d’avant',
    );
  }
});

// ─── 3. Le cycliste réel : accepté à vélo, refusé à pied ─────────────────────

Deno.test('cycliste à 28 km/h : CAPTURE en bike, ANÉANTI en run', () => {
  const points = at(28, 25); // 11,7 km en 25 min — une sortie ordinaire

  const bike = verdictForRequest({ points }, 'bike');
  assertEquals(bike.kind, 'claimable', 'une sortie vélo normale doit capturer');

  // En course, chaque point dépasse POINT_MAX_SPEED_KMH (25) : tous les points
  // sont jetés un par un, il ne reste RIEN à valider.
  const run = verdictForRequest({ points }, 'run');
  assertEquals(run.kind, 'rejected', 'la même trace en course est de la triche');
  assertNotEquals(run.kind, bike.kind, 'les deux disciplines ne peuvent pas juger pareil');
});

Deno.test(
  'cycliste à 24 km/h (SOUS la borne point de la course) : rejeté à l’allure en run, valide en bike',
  () => {
    // Le second barrage, et le plus insidieux : les points passent le filtre
    // (24 < 25 km/h) mais l'allure MOYENNE (150 s/km) tombe sous
    // RUN_AVG_PACE_MIN_S_KM (170 s/km) — la borne qui portait littéralement le
    // commentaire « anti-vélo ».
    const points = at(24, 20);

    const run = verdictForRequest({ points }, 'run');
    assertEquals(run.kind, 'rejected');
    if (run.kind === 'rejected') assertEquals(run.reason, 'pace_too_fast');

    assertEquals(verdictForRequest({ points }, 'bike').kind, 'claimable');
  },
);

Deno.test('descente à 50 km/h : normale à vélo, impossible à pied', () => {
  const points = at(50, 12);
  assertEquals(verdictForRequest({ points }, 'bike').kind, 'claimable');
  assertEquals(verdictForRequest({ points }, 'run').kind, 'rejected');
});

// ─── 4. Le coureur réel n'a rien perdu ───────────────────────────────────────

Deno.test('coureur à 11 km/h : toujours valide, sans exclusion de tronçon', () => {
  const v = verdictForRequest({ points: at(11, 30) }, 'run');
  assertEquals(v.kind, 'claimable');
  if (v.kind === 'claimable') {
    assertEquals(v.status, 'valid', 'aucun tronçon ne doit être écarté');
    assertEquals(v.gpsTrust, 100, 'aucun point ne doit être jeté');
  }
});

Deno.test('coureur lent à 7 km/h : valide (le jeu n’est pas réservé aux rapides)', () => {
  assertEquals(verdictForRequest({ points: at(7, 45) }, 'run').kind, 'claimable');
});

// ─── 5. Le véhicule lancé est refusé PARTOUT ─────────────────────────────────

Deno.test('véhicule à 90 km/h : refusé dans les DEUX disciplines', () => {
  const points = at(90, 15);
  assertEquals(verdictForRequest({ points }, 'run').kind, 'rejected');
  assertEquals(
    verdictForRequest({ points }, 'bike').kind,
    'rejected',
    'ouvrir le vélo ne doit pas ouvrir la voiture',
  );
});

// ─── 6. Pas/distance : la même frontière, lue dans les deux sens ─────────────

Deno.test('un cycliste sans aucun pas n’est jamais suspecté (pédaler n’en produit pas)', () => {
  const v = verdictForRequest({ points: at(28, 25), stepCount: 0 }, 'bike');
  assertEquals(v.kind, 'claimable', 'zéro pas est la NORME à vélo');
  if (v.kind === 'claimable') assertEquals(v.motionTrust, 100);
});

Deno.test('un COUREUR déclaré « bike » est démasqué par sa cadence de foulée', () => {
  // 5 km à 11 km/h avec une vraie cadence pédestre (~1,4 pas/m). Déclaré vélo,
  // le podomètre dit le contraire : capture gelée (stats conservées).
  const points = at(11, 27);
  const stepCount = 7_000;
  assertEquals(
    verdictForRequest({ points, stepCount }, 'run').kind,
    'claimable',
    'en course, cette cadence est parfaitement normale',
  );
  assertEquals(
    verdictForRequest({ points, stepCount }, 'bike').kind,
    'flagged',
    'déclarée vélo, la même cadence n’est pas plausible',
  );
});

// ─── 7. Le GPS Trust client ne peut toujours que BAISSER la confiance ────────

Deno.test('le gpsTrust client borne par le bas, dans les deux disciplines', () => {
  for (const [activity, points] of [['run', at(11, 30)], ['bike', at(28, 25)]] as const) {
    const honest = verdictForRequest({ points }, activity);
    const lowered = verdictForRequest({ points, gpsTrust: 42 }, activity);
    assertEquals(honest.gpsTrust, 100);
    assertEquals(lowered.gpsTrust, 42, 'le client peut abaisser');
    const inflated = verdictForRequest({ points, gpsTrust: 100 }, activity);
    assertEquals(inflated.gpsTrust, 100, 'mais jamais gonfler au-delà du calcul serveur');
  }
});

// ─── 8. AUCUN DÉFAUT DE DISCIPLINE EN LITTÉRAL ──────────────────────────────

Deno.test('index.ts n’écrit JAMAIS `activity: Activity = \'run\'` en dur — toujours DEFAULT_ACTIVITY', async () => {
  // Six fonctions d'`index.ts` portent une discipline par défaut, dont
  // `loadHexStates` (l'univers de territoire LU) et `handleContested`
  // (l'anti-collusion). Aujourd'hui tous les sites d'appel passent la
  // discipline : ces défauts sont inatteignables, et c'est précisément ce qui
  // rend le défaut dangereux — le jour où DEFAULT_ACTIVITY change, six
  // fonctions divergeraient EN SILENCE, sans qu'aucun test de comportement ne
  // tombe. Seule une garde sur la SOURCE peut l'attraper.
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  const literals = [...source.matchAll(/activity: Activity = '(\w+)'/g)].map((m) => m[0]);
  assertEquals(literals, [], 'la valeur par défaut vient de game-rules, jamais d’un littéral');

  // Non-vacuité : les six défauts existent bien, et ils citent la constante.
  assertEquals(
    [...source.matchAll(/activity: Activity = DEFAULT_ACTIVITY/g)].length,
    6,
    'six paramètres à discipline par défaut — s’ils changent de nombre, relire cette garde',
  );
  assert(
    source.includes('  DEFAULT_ACTIVITY,\n'),
    'DEFAULT_ACTIVITY doit être importé de ../_shared/game-rules.ts, pas redéclaré',
  );
});
