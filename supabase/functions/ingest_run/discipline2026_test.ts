/**
 * GRYD — « SPORT SEULEMENT » : CE QUE LE SERVEUR ACCEPTE, SCELLE ET RECALCULE.
 *
 * ═══ ÉTAPE 0 — CE QUE LE PIPELINE FAISAIT LE 11/09/2026 AU SOIR ═════════════
 * `ingestRefonte2026` ne connaissait ni `disciplineSwitchedFrom`, ni
 * `disciplineMismatchKept` : les deux champs traversaient la validation sans
 * être lus, et `runs` n'avait aucune colonne pour les recevoir. Quelqu'un qui
 * avait tapé « Course » avant de partir à vélo n'avait donc qu'UNE issue côté
 * serveur — le signal `discipline_mismatch`, qui GÈLE la capture et convoque
 * une revue humaine. Aucune façon de dire « je garde, et je paie le prix ».
 *
 * ═══ CE QUE CES TESTS PROUVENT ══════════════════════════════════════════════
 * La FORME acceptée (rétro-compatibilité stricte), le SCELLEMENT du choix, et
 * le recalcul serveur du contrôle avec la même fonction que l'écran de fin.
 * ═══ CE QU'ILS NE PROUVENT PAS ══════════════════════════════════════════════
 * Ils n'exécutent pas `ingestRefonte2026` (il exige un client Supabase et une
 * base). Le câblage est prouvé par INSPECTION DE SOURCE — patron déjà établi
 * par `capture2026_test.ts` et `anticheat2026_test.ts` — et le comportement par
 * les fonctions PURES. La preuve d'exécution du refus est ailleurs :
 * `supabase/tests/sport_only_runs_2026.pglite.test.mjs`.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { scoreRun } from '../_shared/engine/anticheat.ts';
import {
  checkDeclaredDiscipline2026,
  wholeRunStepWindow2026,
} from '../_shared/engine/disciplineCheck2026.ts';
import { SPORT_ONLY_REASONS_2026 } from '../_shared/game-rules.ts';
import type { RunPoint } from '../_shared/types.ts';

const REFONTE = await Deno.readTextFile(new URL('./refonte2026.ts', import.meta.url));
const INDEX = await Deno.readTextFile(new URL('./index.ts', import.meta.url));

const ORIGIN = { lat: 49.4431, lng: 1.0993 };
const M_PER_DEG_LNG = (Math.PI / 180) * 6_371_000 * Math.cos((ORIGIN.lat * Math.PI) / 180);
const T0 = Date.UTC(2026, 8, 12, 8, 0, 0);

function trace(kmh: number, durationS: number): RunPoint[] {
  const points: RunPoint[] = [];
  let x = 0;
  for (let s = 0; s < durationS; s++) {
    points.push({ lat: ORIGIN.lat, lng: ORIGIN.lng + x / M_PER_DEG_LNG, t: T0 + s * 1000, acc: 6 + (s % 7) * 0.4 });
    x += kmh / 3.6;
  }
  return points;
}
const signal = (report: { signals: readonly { id: string; available: boolean; severity: number }[] }, id: string) => {
  const s = report.signals.find((x) => x.id === id);
  if (!s) throw new Error(`signal ${id} absent`);
  return s;
};

// ════════════════════════════════════════════════════════════════════════════
// 1. LA FORME ACCEPTÉE — RÉTRO-COMPATIBILITÉ STRICTE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — les deux champs sont VALIDÉS, et un absent ne change rien', () => {
  assert(
    INDEX.includes("(b.disciplineSwitchedFrom === undefined || isActivityShape(b.disciplineSwitchedFrom))"),
    'la discipline d’origine est bornée au vocabulaire du produit',
  );
  assert(
    INDEX.includes("(b.disciplineMismatchKept === undefined || typeof b.disciplineMismatchKept === 'boolean')"),
    'et la réponse est un booléen, jamais une chaîne repliée',
  );
  assert(
    REFONTE.includes("request.disciplineSwitchedFrom !== 'run' && request.disciplineSwitchedFrom !== 'bike'"),
    'le pipeline actif refuse aussi une discipline inconnue',
  );
  // `undefined` des deux côtés : l'absence est la valeur par défaut, donc une
  // requête écrite avant ce lot reste valide mot pour mot.
  assert(
    REFONTE.includes('request.disciplineSwitchedFrom !== undefined &&') &&
      REFONTE.includes('request.disciplineMismatchKept !== undefined &&'),
    'absents ⇒ aucune question posée, comportement inchangé',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE CHOIX EST SCELLÉ AVEC LA SORTIE, JAMAIS RELU DE LA REQUÊTE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('« garder » écrit le motif À L’UPSERT, avec les autres signaux de capteur', () => {
  const upsert = REFONTE.slice(REFONTE.indexOf("const saved = await db.from('runs').upsert("), REFONTE.indexOf("check(saved.error,"));
  assert(
    upsert.includes("sport_only_reason_2026: request.disciplineMismatchKept === true"),
    'le motif est écrit à la première écriture',
  );
  assert(
    upsert.includes("? 'discipline_mismatch_kept'") && upsert.includes(': null,'),
    'un seul motif possible, et `null` quand la question n’a pas été posée',
  );
  assertEquals(SPORT_ONLY_REASONS_2026, ['discipline_mismatch_kept']);
});

Deno.test('le RECALCUL lit la LIGNE, jamais la requête : un renvoi ne change pas le verdict', () => {
  const score = REFONTE.slice(REFONTE.indexOf('const antiCheat = scoreRun({'), REFONTE.indexOf('const reviewRequired'));
  assert(score.includes('run.sport_only_reason_2026'), 'la réponse vient de la ligne scellée');
  assert(!score.includes('request.discipline'), 'et jamais de la requête');
  assert(score.includes('activity:run.activity'), 'la discipline jugée est celle de la ligne');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LE CONTRÔLE, RECALCULÉ SERVEUR — LES TROIS CAS
// ════════════════════════════════════════════════════════════════════════════

Deno.test('CAS 1 — basculer ne dispense de rien : la nouvelle discipline a SES seuils', () => {
  // 24 km/h soutenus, zéro pas. Déclaré « course », c'est le motif entier.
  const points = trace(24, 1800);
  const enCourse = scoreRun({ points, activity: 'run', stepCount: 0, now: T0 + 2_000_000 });
  assertEquals(signal(enCourse, 'discipline_mismatch').severity, 1, 'le motif est franc en course');
  // La MÊME trace déclarée « vélo » ne porte plus le motif — et c'est bien la
  // fonction partagée qui le dit, avec les seuils du vélo.
  const enVelo = scoreRun({ points, activity: 'bike', stepCount: 0, now: T0 + 2_000_000 });
  assert(!signal(enVelo, 'discipline_mismatch').available, 'le motif ne vise que la course déclarée');
  assertEquals(
    checkDeclaredDiscipline2026(points, wholeRunStepWindow2026(points, 0), 'bike').suspected,
    null,
    '24 km/h sans pas est une sortie vélo parfaitement ordinaire',
  );
  // Mais les BORNES du vélo, elles, s'appliquent : `analyzeTrace2026` et
  // `TERRITORY_RULES_2026[activity]` lisent la discipline de la LIGNE.
  assert(
    REFONTE.includes("analyzeTrace2026(points,run.activity)") &&
      REFONTE.includes("TERRITORY_RULES_2026[run.activity as 'run'|'bike'].minAreaM2"),
    'distance minimale et surface minimale suivent la discipline basculée',
  );
});

Deno.test('CAS 2 — « garder » ÉTEINT le motif, et lui seul', () => {
  const points = trace(24, 1800);
  const sans = scoreRun({ points, activity: 'run', stepCount: 0, now: T0 + 2_000_000 });
  assertEquals(signal(sans, 'discipline_mismatch').severity, 1);
  assert(sans.decision === 'MANUAL_REVIEW' || sans.decision === 'REJECT', 'sans réponse : revue');

  const avec = scoreRun({ points, activity: 'run', stepCount: 0, now: T0 + 2_000_000, disciplineAnswered: true });
  assert(!signal(avec, 'discipline_mismatch').available, 'le motif est réglé, donc indisponible');
  assertEquals(signal(avec, 'discipline_mismatch').severity, 0, 'un signal indisponible ne pèse rien');
  assert(
    !avec.reasons.includes('discipline_mismatch'),
    'et il ne figure plus dans les raisons transmises à une revue',
  );

  // ── CE QU'UNE RÉPONSE N'ACHÈTE PAS ────────────────────────────────────────
  // Répondre « garder » règle UNE question, pas toutes. Une position simulée
  // reste une position simulée.
  const simule = scoreRun({
    points, activity: 'run', stepCount: 0, now: T0 + 2_000_000,
    disciplineAnswered: true, mockedLocation: true,
  });
  const mocked = signal(simule, 'mocked_location');
  assert(mocked.available && mocked.severity === 1, 'la position simulée pèse toujours');
  assert(
    simule.decision === 'MANUAL_REVIEW' || simule.decision === 'REJECT',
    `aucune impunité achetée (décision ${simule.decision})`,
  );
});

Deno.test('CAS 3 — SANS réponse du client, le comportement d’avant est EXACT', () => {
  // Le silence du client ne prouve rien : un appareil sans podomètre (tout
  // navigateur, tout simulateur, une permission refusée) ne PEUT PAS poser la
  // question, et une app modifiée pourrait choisir de ne pas la poser.
  const points = trace(24, 1800);
  const report = scoreRun({ points, activity: 'run', stepCount: 0, now: T0 + 2_000_000 });
  assertEquals(signal(report, 'discipline_mismatch').severity, 1);
  assert(report.reasons.includes('discipline_mismatch'), 'la revue reste demandée');
  // Et sans podomètre du tout, le serveur ne conclut rien : ni motif, ni quitus.
  const muet = scoreRun({ points, activity: 'run', now: T0 + 2_000_000 });
  assert(!signal(muet, 'discipline_mismatch').available, 'aucune cadence transmise ⇒ rien à opposer');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. LA DETTE DU SERVEUR, ÉCRITE ET VÉRIFIÉE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('le serveur n’a qu’un CUMUL de pas : il est plus indulgent, et le dit', () => {
  // Dix minutes de vélo puis vingt de trot. L'écran de fin, qui range le
  // podomètre par tranches, voit la fenêtre. Le serveur, qui ne reçoit qu'un
  // cumul, lit une cadence moyenne et ne conclut pas.
  const velo = trace(24, 600);
  const trot = trace(11, 1200).map((p) => ({ ...p, t: p.t + 600_000 }));
  const points = [...velo, ...trot];
  const cumul = 3_300; // les pas du seul trot
  assertEquals(
    checkDeclaredDiscipline2026(points, wholeRunStepWindow2026(points, cumul), 'run').suspected,
    null,
    'le cumul dilue la portion pédalée',
  );
  assert(
    REFONTE.includes('plus indulgent que') || REFONTE.includes('plus INDULGENT'),
    'et la source le DIT, pour que personne ne découvre ce trou en production',
  );
});
