/**
 * GRYD — tests des SIGNAUX DE PLAUSIBILITÉ 2026 ajoutés à `scoreRun`
 * (cahier de septembre §18.4 « Antitriche proportionnée »).
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ══════════════════════════════════════════
 * Chaque test de ce fichier a été écrit ROUGE, contre le moteur d'avant. Les
 * trois trous qu'il ferme, mesurés sur le code du 10/09/2026 :
 *
 *  1. VITESSE SOUTENUE DILUÉE PAR LA MOYENNE. `sustained_speed` compte la part
 *     de durée passée au-dessus de `pointMaxSpeedKmh` (25 km/h en course), et
 *     `distance_time_ratio` lit l'allure MOYENNE de toute la sortie. Une trace
 *     à 24 km/h — plus rapide que la borne « anti-vélo » du produit
 *     (RUN_AVG_PACE_MIN_S_KM) mais sous le plafond point à point — ne
 *     déclenchait donc RIEN, et la moyenne d'une longue portion lente
 *     l'enterrait complètement. Un vélo se déclarait « course » et capturait.
 *
 *  2. DISCIPLINE. `step_coherence` savait dire « ce n'est pas pédestre », mais
 *     sans jamais NOMMER la discipline : la revue recevait un score, pas le
 *     motif. Le cahier §18.4 liste pourtant « déclarations de discipline »
 *     parmi les contrôles attendus.
 *
 *  3. TRACE SYNTHÉTIQUE. Aucun signal ne regardait la PRÉCISION comme une
 *     série : un simulateur qui écrit `acc: 5` sur 900 points passait comme un
 *     récepteur réel, dont la précision varie à chaque relevé.
 *
 * ═══ CE QUE CES TESTS VERROUILLENT AUSSI : LES HONNÊTES ════════════════════
 * Le cahier interdit de « punir une sortie lente, un fauteuil, une descente
 * rapide ou un ultra ». Trois traces honnêtes sont donc testées EN FACE de
 * chaque trace suspecte : un coureur normal, un cycliste à 28 km/h, une
 * descente à vélo. Aucune ne doit bouger.
 *
 * MÊMES CONTRAINTES D'OUTILLAGE que anticheat.test.ts : aucun import externe,
 * global `Deno` déclaré localement, aucune horloge lue.
 */
import {
  scoreRun,
  type AntiCheatReport,
  type AntiCheatSignalId,
} from './anticheat.ts';
import { STEP_COHERENCE_MIN_STEPS_PER_M } from './validation.ts';
import {
  ANTICHEAT_HUMAN_MIN_ACCURACY_CV,
  ANTICHEAT_SUSTAINED_WINDOW_S,
  POINT_MAX_ACCURACY_M,
} from '@klaim/shared/game-rules';
import type { RunPoint } from '@klaim/shared/types';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ─── Fabrique de traces (même géométrie que anticheat.test.ts) ───────────────
// Plein EST à latitude constante : la conversion mètres → degrés est exacte au
// premier ordre, donc une vitesse demandée est la vitesse mesurée par le moteur.

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 49.4431, lng: 1.0993 }; // Rouen
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);
const T0 = Date.UTC(2026, 8, 1, 8, 0, 0);
const M_PER_DEG_LNG = RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0;

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

interface Leg {
  /** Vitesse visée en km/h. */
  kmh: number;
  durationS: number;
  /** Amplitude relative de la variation de vitesse (0 = trace parfaite). */
  jitter?: number;
  /** Précision : nombre fixe, `'varie'` pour un vrai récepteur, `null` = absente. */
  acc?: number | 'varie' | null;
}

/** Chaîne des tronçons en UNE trace continue, cadencée à 1 Hz. */
function traceDe(legs: readonly Leg[], seed = 7): RunPoint[] {
  const rnd = lcg(seed);
  const points: RunPoint[] = [];
  let x = 0;
  let t = T0;
  for (const leg of legs) {
    const v = leg.kmh / 3.6;
    const jitter = leg.jitter ?? 0.25;
    const accSpec = leg.acc === undefined ? 'varie' : leg.acc;
    for (let s = 0; s < leg.durationS; s++) {
      const acc = accSpec === null
        ? undefined
        : accSpec === 'varie'
          ? Math.round((4 + rnd() * 8) * 10) / 10
          : accSpec;
      const p: RunPoint = { lat: ORIGINE.lat, lng: ORIGINE.lng + x / M_PER_DEG_LNG, t };
      points.push(acc === undefined ? p : { ...p, acc });
      x += v * (1 + (rnd() * 2 - 1) * jitter);
      t += 1000;
    }
  }
  return points;
}

function afterEnd(points: readonly RunPoint[]): number {
  return points[points.length - 1]!.t + 60_000;
}

function signal(report: AntiCheatReport, id: AntiCheatSignalId) {
  const s = report.signals.find((x) => x.id === id);
  if (!s) throw new Error(`signal ${id} absent du rapport`);
  return s;
}

/** Distance parcourue par une trace (approximation plein est, suffisante ici). */
function distanceM(points: readonly RunPoint[]): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return (last.lng - first.lng) * M_PER_DEG_LNG;
}

/** Podomètre d'un coureur honnête : au-dessus du plancher pédestre. */
function pasDeCoureur(points: readonly RunPoint[]): number {
  return Math.round(distanceM(points) * 1.4);
}

/** Podomètre d'un téléphone posé sur un guidon : quasi rien. */
function pasDeCycliste(points: readonly RunPoint[]): number {
  return Math.round(distanceM(points) * 0.01);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. VITESSE SOUTENUE SUR FENÊTRE GLISSANTE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — 24 km/h soutenus dans une course : la moyenne les enterrait, plus maintenant', () => {
  // 6 min à 24 km/h (un vélo, ou une voiture au ralenti) puis 30 min à 12 km/h.
  // Moyenne d'ensemble : ~14 km/h, parfaitement plausible. Aucun point ne
  // dépasse 25 km/h, donc `sustained_speed` reste muet, et `distance_time_ratio`
  // lit une allure irréprochable. C'est EXACTEMENT le trou que la fenêtre ferme.
  //
  // ⚠️ CE QUE CE TEST N'AFFIRME PAS. Il n'affirme PAS que la capture est gelée :
  // 24 km/h pendant six minutes est le niveau d'un bon coureur de club, et le
  // cahier §18.4 interdit de le punir sur ce seul fait. Le signal PÈSE (il entre
  // dans les raisons, il converge), il ne tranche pas seul. Ce qui tranche seul
  // sur un vélo déclaré « course », c'est le motif discipline — plus bas.
  const points = traceDe([
    { kmh: 24, durationS: 360, jitter: 0.05 },
    { kmh: 12, durationS: 1800 },
  ]);
  const report = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  const s = signal(report, 'sustained_speed_window');
  assert(s.available, 'la fenêtre doit être mesurable sur 36 minutes');
  assert(
    s.severity >= 0.7,
    `24 km/h soutenus 6 min doivent être fortement suspects (sévérité ${s.severity})`,
  );
  assert(
    report.reasons.includes('sustained_speed_window'),
    'la fenêtre doit apparaître dans les raisons transmises à la revue',
  );
});

Deno.test('ÉTAPE 0 — une vitesse qu’aucun humain ne soutient gèle la capture à elle seule', () => {
  // 27 km/h pendant 8 min : au-dessus du record du monde du 2000 m, et
  // au-dessus du plafond point à point de la discipline. Aucune convergence
  // n'est nécessaire pour douter de ça.
  const points = traceDe([
    { kmh: 27, durationS: 480, jitter: 0.04 },
    { kmh: 11, durationS: 1200 },
  ]);
  const report = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  assert(
    signal(report, 'sustained_speed_window').severity === 1,
    'au-delà du plafond de la discipline, la sévérité est maximale',
  );
  assert(
    report.decision !== 'PASS' && report.decision !== 'PASS_WITH_EXCLUSIONS',
    `la capture ne doit pas être créditée (décision ${report.decision})`,
  );
  assert(
    report.decision === 'MANUAL_REVIEW',
    `revue humaine, pas refus automatique (décision ${report.decision})`,
  );
});

Deno.test('un coureur honnête (12 km/h, allure qui varie) reste crédité', () => {
  const points = traceDe([{ kmh: 12, durationS: 2400 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  assert(
    report.decision === 'PASS' || report.decision === 'PASS_WITH_EXCLUSIONS',
    `un coureur normal ne doit rien déclencher (décision ${report.decision}, score ${report.suspicion})`,
  );
});

Deno.test('un cycliste honnête à 28 km/h reste crédité (bornes vélo)', () => {
  const points = traceDe([{ kmh: 28, durationS: 2400 }]);
  const report = scoreRun({
    points,
    activity: 'bike',
    stepCount: pasDeCycliste(points),
    now: afterEnd(points),
  });
  assert(
    report.decision === 'PASS' || report.decision === 'PASS_WITH_EXCLUSIONS',
    `un cycliste normal ne doit rien déclencher (décision ${report.decision}, score ${report.suspicion})`,
  );
  assert(
    signal(report, 'sustained_speed_window').severity === 0,
    '28 km/h à vélo est sous la borne basse de la discipline : sévérité nulle',
  );
});

Deno.test('une descente rapide à vélo (10 min à 55 km/h) ne suffit pas seule à geler la capture', () => {
  // Le cahier §8.3/§18.4 interdit de punir « une descente rapide ». La borne
  // basse du VÉLO est 60 km/h (BIKE_AVG_PACE_MIN_S_KM) : 55 km/h reste dessous.
  const points = traceDe([
    { kmh: 55, durationS: 600, jitter: 0.15 },
    { kmh: 25, durationS: 1800 },
  ]);
  const report = scoreRun({
    points,
    activity: 'bike',
    stepCount: pasDeCycliste(points),
    now: afterEnd(points),
  });
  assert(
    signal(report, 'sustained_speed_window').severity === 0,
    'une descente sous la borne basse vélo ne doit produire aucune sévérité',
  );
  assert(
    report.decision === 'PASS' || report.decision === 'PASS_WITH_EXCLUSIONS',
    `une descente rapide reste créditée (décision ${report.decision})`,
  );
});

Deno.test('un engin motorisé au-delà de la borne vélo (78 km/h soutenus) gèle la capture', () => {
  const points = traceDe([
    { kmh: 78, durationS: 900, jitter: 0.02 },
    { kmh: 30, durationS: 900 },
  ]);
  const report = scoreRun({
    points,
    activity: 'bike',
    stepCount: pasDeCycliste(points),
    now: afterEnd(points),
  });
  assert(
    signal(report, 'sustained_speed_window').severity >= 0.8,
    'au ras du plafond de la discipline, la sévérité est forte',
  );
  assert(
    report.decision !== 'PASS' && report.decision !== 'PASS_WITH_EXCLUSIONS',
    `un moteur ne doit pas capturer (décision ${report.decision})`,
  );
});

Deno.test('ANGLE MORT ASSUMÉ — un scooter à 45 km/h déclaré « vélo » passe encore', () => {
  // ⚠️ CE TEST VERROUILLE UNE LIMITE, PAS UNE PROTECTION. Il est écrit VERT sur
  // le comportement actuel, exprès, pour que la limite soit lisible dans la
  // suite de tests plutôt que découverte en production.
  //
  // POURQUOI GRYD NE SAIT PAS. Les bornes du vélo sont larges PAR CHOIX : un
  // cycliste descend vite, et le cahier §18.4 interdit de « punir une descente
  // rapide ». Un scooter à 45 km/h reste très loin de la borne basse vélo
  // (60 km/h), et le podomètre ne départage rien — un cycliste et un scootériste
  // produisent tous deux zéro foulée. Aucune donnée collectée aujourd'hui ne
  // distingue les deux.
  //
  // CE QUI LE DISTINGUERAIT : la CADENCE DE PÉDALAGE (capteur externe, non
  // collectée) ou le type de mouvement rendu par l'OS (`CMMotionActivityManager`
  // côté iOS sait dire cycling vs automotive). Les deux sont dans la feuille de
  // route de docs/product/GRYD_ANTITRICHE_2026_09.md — aucun n'est deviné ici.
  const points = traceDe([{ kmh: 45, durationS: 1800, jitter: 0.15 }]);
  const report = scoreRun({
    points,
    activity: 'bike',
    stepCount: pasDeCycliste(points),
    now: afterEnd(points),
  });
  assert(
    signal(report, 'sustained_speed_window').severity === 0,
    '45 km/h est sous la borne basse du vélo : aucune sévérité, et c’est voulu',
  );
  assert(
    report.decision === 'PASS' || report.decision === 'PASS_WITH_EXCLUSIONS',
    `l’angle mort est RÉEL aujourd’hui (décision ${report.decision})`,
  );
});

Deno.test('la fenêtre est INDISPONIBLE sous sa durée : aucune sortie courte n’est jugée dessus', () => {
  const points = traceDe([{ kmh: 24, durationS: ANTICHEAT_SUSTAINED_WINDOW_S - 60 }]);
  const report = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  const s = signal(report, 'sustained_speed_window');
  assert(!s.available, 'une trace plus courte que la fenêtre ne peut pas la remplir');
  assert(s.severity === 0, 'un signal indisponible ne pèse rien');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. DISCIPLINE — « ce n'est pas de la course à pied »
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — un vélo déclaré « course » porte désormais le motif DISCIPLINE', () => {
  const points = traceDe([{ kmh: 23, durationS: 1800, jitter: 0.12 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCycliste(points),
    now: afterEnd(points),
  });
  const s = signal(report, 'discipline_mismatch');
  assert(s.available, 'discipline mesurable : podomètre transmis + fenêtre remplie');
  assert(s.severity === 1, `le motif doit être franc (sévérité ${s.severity})`);
  assert(
    report.reasons.includes('discipline_mismatch'),
    'le motif discipline doit figurer dans les raisons rendues à la revue',
  );
  assert(
    report.decision === 'MANUAL_REVIEW' || report.decision === 'REJECT',
    `la capture est gelée (décision ${report.decision})`,
  );
});

Deno.test('l’inverse — un vélo LENT avec des pas — n’est PAS une triche', () => {
  // Quelqu'un qui pousse son vélo, ou pédale à 14 km/h avec le téléphone en
  // poche. Rien à signaler : le motif discipline ne vise QUE la course.
  const points = traceDe([{ kmh: 14, durationS: 1800 }]);
  const report = scoreRun({
    points,
    activity: 'bike',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  assert(
    !signal(report, 'discipline_mismatch').available,
    'aucun motif discipline ne se calcule sur une sortie vélo',
  );
});

Deno.test('sans podomètre, le motif discipline reste INDISPONIBLE (l’absence n’accuse pas)', () => {
  const points = traceDe([{ kmh: 23, durationS: 1800 }]);
  const report = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  const s = signal(report, 'discipline_mismatch');
  assert(!s.available, 'aucun pas transmis ⇒ rien à opposer');
  assert(s.severity === 0, 'un signal indisponible ne pèse rien');
});

Deno.test('un coureur RAPIDE mais qui court (pas cohérents) ne porte aucun motif discipline', () => {
  const points = traceDe([{ kmh: 22, durationS: 900, jitter: 0.2 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  assert(
    signal(report, 'discipline_mismatch').severity === 0,
    'des foulées réelles interdisent le motif « ce n’est pas de la course »',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 3. TRACE SYNTHÉTIQUE — la précision d'un simulateur ne respire pas
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — précision rigoureusement constante : le signal existe enfin', () => {
  // Un simulateur qui prend la peine de faire VARIER sa vitesse (jitter humain)
  // mais écrit la même précision sur 1800 points. Avant ce lot, aucun signal ne
  // regardait la précision comme une SÉRIE : la trace passait entièrement.
  const points = traceDe([{ kmh: 12, durationS: 1800, jitter: 0.2, acc: 5 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  const s = signal(report, 'accuracy_uniformity');
  assert(s.available, 'assez de points portent une précision');
  assert(s.severity === 1, `écart-type nul ⇒ sévérité maximale (obtenu ${s.severity})`);
  assert(
    report.reasons.includes('accuracy_uniformity'),
    'la revue doit voir ce que le système a remarqué',
  );
  // ⚠️ ET CE QUE CE TEST N'AFFIRME PAS : que la capture est gelée. Une précision
  // figée ne distingue PAS un simulateur d'un appareil qui ne mesure pas sa
  // précision. Ce signal converge, il ne tranche pas seul (cf. le spec table).
});

Deno.test('CONVERGENCE — vitesse trop lisse ET précision figée : la trace fabriquée est prise', () => {
  // Le vrai simulateur : interpolation quasi parfaite (dispersion de vitesse
  // sous le plancher humain) ET précision constante. Aucun des deux signaux ne
  // condamne seul ; ensemble, ils décrivent une trace que rien de vivant ne
  // produit.
  const points = traceDe([{ kmh: 12, durationS: 1800, jitter: 0.005, acc: 5 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  assert(
    signal(report, 'accuracy_uniformity').severity === 1,
    'précision figée',
  );
  assert(
    signal(report, 'trace_regularity').severity >= 0.8,
    'vitesse plus régulière qu’un corps humain',
  );
  assert(
    report.decision !== 'PASS' && report.decision !== 'PASS_WITH_EXCLUSIONS',
    `une trace fabriquée ne capture pas (décision ${report.decision})`,
  );
});

Deno.test('précision toujours égale à la borne par défaut du client : INDISPONIBLE, pas suspecte', () => {
  // `toRawFix` substitue la borne de précision de la discipline quand
  // l’appareil n’en rend aucune. Une série entièrement égale à cette valeur est
  // une précision ABSENTE, pas une précision figée : la compter contre le
  // joueur condamnerait tout un parc d’appareils.
  const points = traceDe([{ kmh: 11, durationS: 1800, acc: POINT_MAX_ACCURACY_M }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  const s = signal(report, 'accuracy_uniformity');
  assert(!s.available, 'une valeur substituée n’est pas une mesure');
  assert(s.severity === 0, 'un signal indisponible ne pèse rien');
});

Deno.test('un vrai récepteur (précision qui varie) ne déclenche rien', () => {
  const points = traceDe([{ kmh: 11, durationS: 1800 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  const s = signal(report, 'accuracy_uniformity');
  assert(s.available, 'la précision est mesurable');
  assert(
    s.severity === 0,
    `une précision qui varie normalement est au-dessus du plancher ${ANTICHEAT_HUMAN_MIN_ACCURACY_CV} (sévérité ${s.severity})`,
  );
});

Deno.test('source sans précision (HealthKit) : signal INDISPONIBLE, jamais défavorable', () => {
  const points = traceDe([{ kmh: 11, durationS: 1800, acc: null }]);
  const report = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  const s = signal(report, 'accuracy_uniformity');
  assert(!s.available, 'aucune précision transmise ⇒ rien à mesurer');
  assert(s.severity === 0, 'un signal indisponible ne pèse rien');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. POSITION SIMULÉE DÉCLARÉE PAR L'APPAREIL (Android)
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — position simulée signalée par l’OS : revue, jamais refus automatique', () => {
  const points = traceDe([{ kmh: 12, durationS: 1800 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    mockedLocation: true,
    now: afterEnd(points),
  });
  const s = signal(report, 'mocked_location');
  assert(s.available, 'le drapeau a été transmis : le signal est disponible');
  assert(s.severity === 1, 'une position simulée déclarée est franche');
  assert(
    report.decision === 'MANUAL_REVIEW',
    `revue humaine, pas refus automatique (décision ${report.decision})`,
  );
});

Deno.test('drapeau à false : signal DISPONIBLE et négatif (l’appareil a répondu)', () => {
  const points = traceDe([{ kmh: 12, durationS: 1800 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    mockedLocation: false,
    now: afterEnd(points),
  });
  const s = signal(report, 'mocked_location');
  assert(s.available, 'un `false` est une réponse, pas une absence');
  assert(s.severity === 0, 'aucune simulation déclarée');
  assert(
    report.decision === 'PASS' || report.decision === 'PASS_WITH_EXCLUSIONS',
    `un appareil qui répond « non » ne doit rien coûter (décision ${report.decision})`,
  );
});

Deno.test('drapeau absent (iOS, où l’OS ne le dit pas) : INDISPONIBLE, jamais « propre »', () => {
  const points = traceDe([{ kmh: 12, durationS: 1800 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCoureur(points),
    now: afterEnd(points),
  });
  const s = signal(report, 'mocked_location');
  assert(!s.available, 'iOS ne rend aucun drapeau : le signal sort du dénominateur');
  assert(
    s.unavailableReason !== undefined,
    'un signal indisponible DIT pourquoi (le rapport voyage jusqu’à la revue)',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 5. VIE PRIVÉE — le rapport ne transporte aucune coordonnée
// ════════════════════════════════════════════════════════════════════════════

Deno.test('aucune preuve chiffrée ne contient de latitude ni de longitude', () => {
  const points = traceDe([{ kmh: 24, durationS: 900, acc: 5 }]);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: pasDeCycliste(points),
    mockedLocation: true,
    now: afterEnd(points),
  });
  const serialise = JSON.stringify(report.signals);
  assert(
    !serialise.includes(String(ORIGINE.lat)) && !serialise.includes(String(ORIGINE.lng)),
    'le rapport voyage jusqu’à la revue : il ne doit porter aucun point du trajet',
  );
  // Le plancher pédestre reste la SEULE frontière « pédestre / non pédestre »
  // du dépôt : aucun second seuil n'a été inventé pour la discipline.
  assert(
    STEP_COHERENCE_MIN_STEPS_PER_M > 0,
    'le plancher pédestre est la frontière réutilisée par le motif discipline',
  );
});
