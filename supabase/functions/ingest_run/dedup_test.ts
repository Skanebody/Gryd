/**
 * GRYD — DÉDUPLICATION TRANS-DISCIPLINE (AMENDEMENT-06 §4, E14 vélo).
 * Purs : aucun réseau, aucune base — le lecteur est un faux, instrumenté.
 *
 * ═══ CE QUI EST VERROUILLÉ, ET POURQUOI CETTE FORME DE TEST ═════════════════
 * Le défaut n'était pas dans `dedupeActivity` (qui n'a JAMAIS regardé la
 * discipline, et c'est bien) : il était dans la LECTURE qui lui donne ses
 * candidats. Elle bornait la recherche à ±2 jours autour du `started_at`
 * DÉCLARÉ PAR LE CLIENT. Redater le même fichier suffisait donc à le sortir du
 * champ de vision, et la branche « empreinte identique » ne pouvait plus
 * s'exprimer.
 *
 * Un test de `dedupeActivity` n'aurait rien vu — il passait déjà. On teste donc
 * la COMPOSITION lecture + verdict, avec un faux lecteur qui JOURNALISE ce
 * qu'on lui demande. C'est le seul moyen de prouver une NÉGATION (« la
 * recherche d'empreinte n'est pas bornée ») : on ne peut pas observer un filtre
 * absent, on peut observer que la question posée ne permet pas de l'exprimer.
 *
 * Le scénario d'attaque, exécuté tel quel :
 *   lundi  → GPX importé en `run`  (course d'origine)
 *   jeudi  → MÊME fichier, redaté hors fenêtre, réétiqueté `bike`, nouveau
 *            clientRunId. Le monde vélo est vierge : sans ce correctif, chaque
 *            hexagone déjà couru repartait en `pioneer`.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { DEDUP_START_TOLERANCE_MIN } from '../_shared/badges.ts';
import {
  type DedupCandidate,
  type DedupReader,
  FINGERPRINT_MIN_DISTINCT_POINTS,
  findDuplicateRun,
  traceShape,
} from './dedup.ts';

const MONDAY = '2026-07-20T06:00:00.000Z';
const THURSDAY = '2026-07-23T18:12:00.000Z'; // +3 j 12 h : bien au-delà de ±2 j

/** Empreinte du GPX (sha-256 serveur des points arrondis — jamais du client). */
const TRACE_HASH = 'a'.repeat(64);

/** Une trace de vraie sortie : des centaines de positions distinctes. */
const REAL_SHAPE = 420;

/** La course d'origine : 8,4 km en 42 min, importée le lundi en `run`. */
const ORIGINAL: DedupCandidate = {
  runId: 'run-lundi',
  startedAt: MONDAY,
  durationS: 2_520,
  distanceM: 8_400,
  polylineHash: TRACE_HASH,
};

/**
 * Faux lecteur : ne rend l'originale par `aroundStart` que si le départ demandé
 * tombe RÉELLEMENT dans ±2 jours — il reproduit fidèlement la fenêtre SQL, donc
 * le trou. `byFingerprint`, lui, voit tout l'historique : c'est le contrat de
 * l'interface.
 */
function reader(history: readonly DedupCandidate[]) {
  const calls = { fingerprint: [] as string[], aroundStart: [] as string[] };
  const WINDOW_MS = 2 * 86_400_000;
  const impl: DedupReader = {
    byFingerprint: (polylineHash) => {
      calls.fingerprint.push(polylineHash);
      return Promise.resolve(
        history.filter((r) => r.polylineHash === polylineHash)
          .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)),
      );
    },
    aroundStart: (startedAt) => {
      calls.aroundStart.push(startedAt);
      const t = Date.parse(startedAt);
      return Promise.resolve(
        history.filter((r) => Math.abs(Date.parse(r.startedAt) - t) <= WINDOW_MS),
      );
    },
  };
  return { impl, calls };
}

// ─── 1. L'ATTAQUE : même trace, autre jour, autre discipline ─────────────────

Deno.test('le MÊME fichier redaté et réétiqueté « bike » est un DOUBLON (le monde vélo ne se peuple pas d’un rejeu)', async () => {
  const { impl, calls } = reader([ORIGINAL]);
  // Le rejeu ment sur TOUT ce que le client contrôle : date, durée, distance.
  // Il ne peut pas mentir sur la géométrie — c'est elle qui le trahit.
  const replay = {
    startedAt: THURSDAY,
    durationS: 2_520,
    distanceM: 8_400,
    polylineHash: TRACE_HASH,
    distinctPoints: REAL_SHAPE,
  };
  assertEquals(
    await findDuplicateRun(impl, replay),
    'run-lundi',
    'un rejeu hors fenêtre doit pointer sur la course d’ORIGINE',
  );
  // Et il est attrapé par l'EMPREINTE, pas par la fenêtre : celle-ci ne voit rien.
  assertEquals(calls.fingerprint, [TRACE_HASH]);
  assertEquals(calls.aroundStart, [], 'l’empreinte tranche : la seconde lecture n’est pas payée');
});

Deno.test('la fenêtre de ±2 jours, SEULE, ne voit pas le rejeu (le défaut, reproduit)', async () => {
  const { impl } = reader([ORIGINAL]);
  // Même scénario, mais sans empreinte (comme si le hash n'était pas calculé) :
  // on retrouve EXACTEMENT le comportement fautif. C'est la preuve que le
  // correctif porte bien sur l'empreinte, et pas sur un effet de bord du test.
  const replayWithoutFingerprint = {
    startedAt: THURSDAY,
    durationS: 2_520,
    distanceM: 8_400,
    polylineHash: null,
    distinctPoints: REAL_SHAPE,
  };
  assertEquals(await findDuplicateRun(impl, replayWithoutFingerprint), null);
});

Deno.test('le contrat du lecteur ne PERMET PAS de borner l’empreinte (ni temps, ni discipline)', () => {
  // Une négation ne se lit pas dans un résultat : elle se lit dans la SIGNATURE.
  // `byFingerprint` ne reçoit QU'UN hash — aucun paramètre de date, aucun
  // paramètre de discipline n'est disponible pour restreindre par accident.
  const { impl } = reader([ORIGINAL]);
  assertEquals(
    impl.byFingerprint.length,
    1,
    'byFingerprint(hash) — un seul argument, et c’est le hash',
  );
});

// ─── 2. NON-RÉGRESSION : l'appariement approché reste ce qu'il était ─────────

Deno.test('même effort importé par deux sources (traces différentes, même instant) → toujours un doublon', async () => {
  const { impl, calls } = reader([ORIGINAL]);
  // GRYD Live puis HealthKit : les points diffèrent (donc l'empreinte aussi),
  // seul l'appariement départ ±3 min / durée ±10 % / distance ±10 % les relie.
  const sameEffortOtherSource = {
    startedAt: new Date(Date.parse(MONDAY) + (DEDUP_START_TOLERANCE_MIN - 1) * 60_000)
      .toISOString(),
    durationS: 2_600,
    distanceM: 8_500,
    polylineHash: 'b'.repeat(64),
    distinctPoints: REAL_SHAPE,
  };
  assertEquals(await findDuplicateRun(impl, sameEffortOtherSource), 'run-lundi');
  assert(calls.aroundStart.length === 1, 'la seconde lecture est bien celle qui a tranché');
});

Deno.test('refaire RÉELLEMENT la même boucle un autre jour n’est PAS un doublon', async () => {
  const { impl } = reader([ORIGINAL]);
  // Une sortie réelle produit toujours une trace différente (bruit GPS, points
  // distincts) : l'empreinte diverge. On refuse le fichier rejoué, pas l'habitude.
  assertEquals(
    await findDuplicateRun(impl, {
      startedAt: THURSDAY,
      durationS: 2_490,
      distanceM: 8_380,
      polylineHash: 'c'.repeat(64),
      distinctPoints: REAL_SHAPE,
    }),
    null,
  );
});

Deno.test('historique vide → aucun doublon fabriqué', async () => {
  const { impl } = reader([]);
  assertEquals(
    await findDuplicateRun(impl, {
      startedAt: MONDAY,
      durationS: 2_520,
      distanceM: 8_400,
      polylineHash: TRACE_HASH,
      distinctPoints: REAL_SHAPE,
    }),
    null,
  );
});

Deno.test('plusieurs rejeux de la même trace → tous pointent sur la PLUS ANCIENNE', async () => {
  const secondReplay: DedupCandidate = {
    runId: 'run-mardi',
    startedAt: '2026-07-21T06:00:00.000Z',
    durationS: 2_520,
    distanceM: 8_400,
    polylineHash: TRACE_HASH,
  };
  const { impl } = reader([secondReplay, ORIGINAL]); // ordre d'entrée volontairement inversé
  assertEquals(
    await findDuplicateRun(impl, {
      startedAt: THURSDAY,
      durationS: 2_520,
      distanceM: 8_400,
      polylineHash: TRACE_HASH,
      distinctPoints: REAL_SHAPE,
    }),
    'run-lundi',
    'l’origine est la plus ancienne, pas le dernier rejeu en date',
  );
});

// ─── 2 bis. LA TRACE DÉGÉNÉRÉE — ce que « sans borne de temps » avait ouvert ─
//
// Retirer la borne de temps était juste, mais l'hypothèse « une empreinte
// identifie une trace » ne tient que si la trace A UNE FORME. `runs` porte
// `polyline_hash` même sur les courses rejetées, et le payload accepte une
// trace d'un seul point : le hash ne dépend alors QUE des coordonnées
// arrondies. Deux arrêts au même endroit à six mois d'écart le partagent.

/** L'empreinte d'un point unique — la MÊME en janvier et en juillet. */
const ONE_POINT_HASH = 'd'.repeat(64);
const JANUARY = '2026-01-14T07:30:00.000Z';
const JULY = '2026-07-14T19:02:00.000Z';

/**
 * La course de janvier : le joueur a lancé GO et s'est arrêté aussitôt. Elle a
 * été REJETÉE (trace insuffisante) — mais elle est bien en base, avec son hash.
 */
const JANUARY_REJECTED: DedupCandidate = {
  runId: 'run-janvier-rejete',
  startedAt: JANUARY,
  durationS: 4,
  distanceM: 0,
  polylineHash: ONE_POINT_HASH,
};

Deno.test('un seul point au même endroit, six mois plus tard, n’est PAS un doublon (« trace insuffisante », pas « doublon »)', async () => {
  const { impl, calls } = reader([JANUARY_REJECTED]);
  // Le scénario exact rapporté : GO puis arrêt immédiat, même trottoir.
  assertEquals(
    await findDuplicateRun(impl, {
      startedAt: JULY,
      durationS: 6,
      distanceM: 0,
      polylineHash: ONE_POINT_HASH,
      distinctPoints: 1,
    }),
    null,
    'sinon l’app dit « doublon », aucune ligne runs n’est créée, et awardRejectedRun ' +
      'n’est jamais appelé (Clean Runner faussé)',
  );
  assertEquals(
    calls.fingerprint,
    [],
    'une trace sans forme n’interroge même pas l’empreinte',
  );
  assertEquals(calls.aroundStart, [JULY], 'elle retombe sur le SEUL appariement approché');
});

Deno.test('deux traces dégénérées identiques DANS la fenêtre ne se dédoublonnent pas non plus par le hash', async () => {
  // Deuxième moitié du correctif : sauter la lecture ne suffisait pas.
  // `dedupeActivity` court-circuite sur l'égalité de hash — sans retirer
  // l'empreinte du VERDICT, la trace dégénérée rentrait par la fenêtre de ±2 j.
  const sameSpotYesterday: DedupCandidate = {
    ...JANUARY_REJECTED,
    runId: 'run-hier',
    startedAt: '2026-07-13T07:00:00.000Z', // 1 j 12 h : dans la fenêtre
  };
  const { impl } = reader([sameSpotYesterday]);
  assertEquals(
    await findDuplicateRun(impl, {
      startedAt: JULY,
      durationS: 6,
      distanceM: 0,
      polylineHash: ONE_POINT_HASH,
      distinctPoints: 1,
    }),
    null,
    'départ à 36 h d’écart : l’appariement approché refuse, et le hash ne doit pas le contredire',
  );
});

Deno.test('une trace VIDE (points: []) ne peut rien apparier — son hash est une constante', async () => {
  const emptyHash = 'e'.repeat(64); // sha-256 de la chaîne vide, identique pour tous
  const { impl, calls } = reader([{
    runId: 'run-vide-de-mars',
    startedAt: '2026-03-01T09:00:00.000Z',
    durationS: 0,
    distanceM: 0,
    polylineHash: emptyHash,
  }]);
  assertEquals(
    await findDuplicateRun(impl, {
      startedAt: JULY,
      durationS: 0,
      distanceM: 0,
      polylineHash: emptyHash,
      distinctPoints: 0,
    }),
    null,
  );
  assertEquals(calls.fingerprint, []);
});

Deno.test('le seuil est bien à FINGERPRINT_MIN_DISTINCT_POINTS : deux positions distinctes REDONNENT son pouvoir à l’empreinte', async () => {
  // La borne exacte, dans les deux sens — un seuil qu'on ne teste que d'un côté
  // n'est pas un seuil, c'est une direction.
  const shaped = { ...JANUARY_REJECTED, runId: 'run-segment' };
  const { impl, calls } = reader([shaped]);
  const subject = {
    startedAt: JULY,
    durationS: 6,
    distanceM: 30,
    polylineHash: ONE_POINT_HASH,
    distinctPoints: FINGERPRINT_MIN_DISTINCT_POINTS,
  };
  assertEquals(await findDuplicateRun(impl, subject), 'run-segment');
  assertEquals(calls.fingerprint, [ONE_POINT_HASH]);

  const { impl: below, calls: belowCalls } = reader([shaped]);
  assertEquals(
    await findDuplicateRun(below, {
      ...subject,
      distinctPoints: FINGERPRINT_MIN_DISTINCT_POINTS - 1,
    }),
    null,
  );
  assertEquals(belowCalls.fingerprint, []);
});

// ─── 2 ter. `traceShape` — le hash et la forme viennent de la MÊME chaîne ────

Deno.test('traceShape : la forme canonique reste l’entrée EXACTE du sha-256 (aucun hash existant ne change)', () => {
  const points = [
    { lat: 48.8566, lng: 2.3522, t: 2_000 },
    { lat: 48.857012, lng: 2.352899, t: 1_000 }, // désordonné : le tri est par `t`
  ];
  assertEquals(traceShape(points).canonical, '48.857012,2.352899;48.856600,2.352200');
});

Deno.test('traceShape : la sonde de la contre-revue — un point, autre horodatage, MÊME empreinte', () => {
  // C'est précisément ce fait qui rendait la recherche par empreinte dangereuse
  // sur une trace dégénérée : le temps n'entre pas dans la chaîne canonique.
  const janvier = traceShape([{ lat: 48.8566, lng: 2.3522, t: 1_736_845_800_000 }]);
  const juillet = traceShape([{ lat: 48.8566, lng: 2.3522, t: 1_752_519_720_000 }]);
  assertEquals(janvier.canonical, juillet.canonical, 'même point, autre timestamp → même hash');
  assertEquals(janvier.distinctPoints, 1, 'et c’est le COMPTE qui le rattrape');
});

Deno.test('traceShape : compte les positions DISTINCTES APRÈS arrondi, pas les points reçus', () => {
  assertEquals(traceShape([]).distinctPoints, 0);
  assertEquals(traceShape([]).canonical, '', 'trace vide → chaîne vide → hash constant');
  // 300 relevés d'un coureur à l'arrêt : autant de points, une seule position.
  const stopped = Array.from({ length: 300 }, (_, i) => ({ lat: 48.8566, lng: 2.3522, t: i }));
  assertEquals(traceShape(stopped).distinctPoints, 1, '300 points immobiles ne font pas une forme');
  // Écart sous l'arrondi à 6 décimales (~11 cm) : toujours la même position.
  assertEquals(
    traceShape([
      { lat: 48.8566, lng: 2.3522, t: 0 },
      { lat: 48.85660001, lng: 2.35220001, t: 1 },
    ]).distinctPoints,
    1,
    'la forme se mesure sur ce que le hash voit — les décimales jetées ne comptent pas',
  );
  assertEquals(
    traceShape([
      { lat: 48.8566, lng: 2.3522, t: 0 },
      { lat: 48.8570, lng: 2.3529, t: 1 },
    ]).distinctPoints,
    2,
  );
});

// ─── 3. LE CÂBLAGE — la lecture réelle d'index.ts ────────────────────────────

Deno.test('la lecture d’empreinte d’index.ts ne borne NI le temps NI la discipline', async () => {
  // Les tests ci-dessus prouvent la DÉCISION ; celui-ci prouve la REQUÊTE, qui
  // est l'endroit exact où le défaut vivait et que le faux lecteur ne peut pas
  // atteindre. On isole le corps de `byFingerprint` dans le vrai `index.ts`.
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  const start = source.indexOf('byFingerprint: async');
  const end = source.indexOf('aroundStart: async');
  assert(start > 0 && end > start, 'dedupReader(userId) introuvable dans index.ts');
  const body = source.slice(start, end);

  assert(body.includes(".eq('polyline_hash'"), 'l’empreinte doit être le prédicat de la lecture');
  assertEquals(
    body.includes(".eq('activity'"),
    false,
    'filtrer la discipline rendrait au rejeu son monde vierge',
  );
  for (const bound of [".gte('started_at'", ".lte('started_at'", ".lt('started_at'"]) {
    assertEquals(
      body.includes(bound),
      false,
      `borner l’empreinte par ${bound} rendrait la clé au client (started_at est déclaré)`,
    );
  }
});

Deno.test('index.ts dérive le hash ET la forme de la MÊME chaîne, et transmet la forme à la dédup', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assert(
    source.includes('const shape = traceShape(request.points);') &&
      source.includes('await polylineHash(shape.canonical)'),
    'le digest doit porter sur la chaîne canonique produite par traceShape (une seule canonisation)',
  );
  assert(
    source.includes('distinctPoints: shape.distinctPoints,'),
    'sans ce champ, la dédup ne peut pas savoir si l’empreinte identifie quoi que ce soit',
  );
  // Non-vacuité : la canonisation ne doit plus exister en double dans index.ts.
  assertEquals(
    source.includes(".map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)"),
    false,
    'une seconde canonisation pourrait dériver de celle qui produit le hash',
  );
});
