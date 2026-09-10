/**
 * GRYD — L'ANTI-TRICHE DANS LE PIPELINE RÉELLEMENT ACTIF (`refonte2026.ts`).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * `anticheat_wiring_test.ts` prouve un câblage qui n'est plus branché :
 * `index.ts` le dit lui-même en tête, « the sole registered handler dispatches
 * to refonte2026.ts. The former handler below is unregistered historical code ».
 * Tout ce que le lot 9 avait construit — `planAntiCheat`, l'écriture de
 * `anticheat_reviews` — vit dans ce handler historique. Le pipeline de
 * septembre, lui, appelait bien `scoreRun`, mais :
 *
 *  · SANS le podomètre. `IngestRunRequest.stepCount` est collecté par le mobile
 *    (`Pedometer.watchStepCount`), transmis, et stocké par l'ancien pipeline —
 *    et il n'atteignait JAMAIS `scoreRun`. Le signal `step_coherence`, seul
 *    capable de dire « ce déplacement n'est pas pédestre », sortait donc
 *    « indisponible » sur CHAQUE course de production.
 *  · SANS écrire la moindre revue. `reviewRequired` suffisait à refuser la
 *    capture (0155) mais le SCORE et les SIGNAUX n'étaient consignés nulle
 *    part : ni pour un opérateur, ni pour le joueur qui fait appel.
 *
 * Ces tests verrouillent les deux fils, et la propriété qui les rend honnêtes :
 * une sortie signalée ne prend AUCUN terrain, et personne n'est accusé.
 *
 * ═══ CE QUE CES TESTS NE PROUVENT PAS ═══════════════════════════════════════
 * Ils n'exécutent pas `ingestRefonte2026` (il exige un client Supabase et une
 * base). Le câblage est donc prouvé par INSPECTION DE SOURCE — patron déjà
 * établi dans `capture2026_test.ts` — et le comportement par les fonctions
 * pures. La preuve d'EXÉCUTION de l'admission de capture est ailleurs :
 * `supabase/tests/capture_admission_2026.pglite.test.mjs`.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { requiresReview2026, sourceClockVerdict2026 } from './refonte2026.ts';
import { buildReviewRow, isDuplicateReview, type ReviewableDecision } from './anticheat_wiring.ts';
import { scoreRun } from '../_shared/engine/anticheat.ts';
import { ANTICHEAT_SUSTAINED_WINDOW_S } from '../_shared/game-rules.ts';
import type { RunPoint } from '../_shared/types.ts';

const SOURCE = await Deno.readTextFile(new URL('./refonte2026.ts', import.meta.url));

// ─── Fabrique de traces : plein est, latitude constante, cadence 1 Hz ────────
const ORIGIN = { lat: 49.4431, lng: 1.0993 };
const M_PER_DEG_LNG = (Math.PI / 180) * 6_371_000 * Math.cos((ORIGIN.lat * Math.PI) / 180);
const T0 = Date.UTC(2026, 8, 1, 8, 0, 0);

function trace(kmh: number, durationS: number, acc = 6): RunPoint[] {
  const points: RunPoint[] = [];
  let x = 0;
  for (let s = 0; s < durationS; s++) {
    points.push({
      lat: ORIGIN.lat,
      lng: ORIGIN.lng + x / M_PER_DEG_LNG,
      t: T0 + s * 1000,
      acc: acc + (s % 7) * 0.4,
    });
    x += (kmh / 3.6) * (1 + ((s % 11) - 5) * 0.04);
  }
  return points;
}
const distanceM = (points: RunPoint[]) =>
  (points[points.length - 1]!.lng - points[0]!.lng) * M_PER_DEG_LNG;
const afterEnd = (points: RunPoint[]) => points[points.length - 1]!.t + 60_000;

// ════════════════════════════════════════════════════════════════════════════
// 1. LE PODOMÈTRE ATTEINT LE MOTEUR — ET IL CHANGE LA DÉCISION
// ════════════════════════════════════════════════════════════════════════════

Deno.test('2026: le podomètre est passé à scoreRun, et depuis la LIGNE de course', () => {
  assert(
    /scoreRun\(\{[\s\S]*?stepCount: run\.step_count/.test(SOURCE),
    'le pipeline actif doit passer `stepCount` à scoreRun, lu sur `runs`',
  );
  assert(
    /scoreRun\(\{[\s\S]*?mockedLocation: run\.mocked_location_2026/.test(SOURCE),
    'le drapeau de position simulée doit lui aussi venir de la ligne de course',
  );
  // Scellé À L'UPSERT : un renvoi du même clientRunId ne doit pas pouvoir rendre
  // une décision différente de la première (le moteur est déterministe ; ses
  // ENTRÉES doivent l'être aussi).
  assert(SOURCE.includes('step_count:'), 'le podomètre doit être persisté avec la course');
  assert(
    SOURCE.includes('mocked_location_2026: typeof request.mockedLocation'),
    'le drapeau doit être persisté avec la course, et seulement s’il est booléen',
  );
});

Deno.test('2026: un vélo déclaré « course » est signalé — et il ne l’était pas sans podomètre', () => {
  // 23 km/h pendant 30 min, téléphone sur le guidon : quelques dizaines de pas
  // parasites sur 11,5 km. C'est la sortie que le pipeline de septembre créditait.
  const points = trace(23, 1800);
  const steps = Math.round(distanceM(points) * 0.01);

  const sansPodometre = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  const avecPodometre = scoreRun({ points, activity: 'run', stepCount: steps, now: afterEnd(points) });

  assertEquals(
    requiresReview2026(sansPodometre.decision),
    false,
    'ÉTAPE 0 : sans le podomètre, cette sortie passait — c’est le trou que le câblage ferme',
  );
  assertEquals(
    requiresReview2026(avecPodometre.decision),
    true,
    'avec le podomètre, la même trace demande une vérification',
  );
  assert(
    avecPodometre.reasons.includes('discipline_mismatch'),
    'la revue doit recevoir le MOTIF, pas seulement un score',
  );
});

Deno.test('2026: un coureur honnête n’est jamais renvoyé en vérification par le podomètre', () => {
  const points = trace(12, 1800);
  const steps = Math.round(distanceM(points) * 1.4);
  const report = scoreRun({ points, activity: 'run', stepCount: steps, now: afterEnd(points) });
  assertEquals(requiresReview2026(report.decision), false, 'une course ordinaire garde son terrain');
  assertEquals(report.suspicion, 0, 'et son score de suspicion reste nul');
});

Deno.test('2026: podomètre ABSENT ⇒ signal indisponible, jamais une pénalité', () => {
  const points = trace(12, 1800);
  const sans = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  const signal = sans.signals.find((s) => s.id === 'step_coherence')!;
  assertEquals(signal.available, false, 'aucun pas transmis ⇒ indisponible');
  assertEquals(signal.severity, 0, 'un signal indisponible ne pèse dans aucun sens');
  assertEquals(requiresReview2026(sans.decision), false, 'un téléphone sans podomètre ne coûte rien');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. UNE SORTIE SIGNALÉE NE PREND AUCUN TERRAIN
// ════════════════════════════════════════════════════════════════════════════

Deno.test('2026: `reviewRequired` voyage jusqu’à l’admission de capture', () => {
  assert(
    /const reviewRequired = requiresReview2026\(antiCheat\.decision\)/.test(SOURCE),
    'la décision du moteur doit produire le drapeau de revue',
  );
  assert(
    /p_review_required:\s*reviewRequired/.test(SOURCE),
    'ce drapeau doit être passé à `stage_game_activity_2026` (migration 0155)',
  );
});

Deno.test('2026: 0155 refuse la capture sur `p_review_required`, avant tout le reste', async () => {
  const sql = await Deno.readTextFile(
    new URL('../../migrations/0155_capture_admission_2026.sql', import.meta.url),
  );
  assert(
    /if p_review_required is true then[\s\S]{0,200}'verification_required'/.test(sql),
    'une sortie en vérification doit sortir par un motif NOMMÉ, pas par un silence',
  );
  assert(
    /if p_source_verified is distinct from true or p_review_required is distinct from false then return; end if;/
      .test(sql),
    'aucune face ne doit être mise en scène tant que la vérification n’est pas levée',
  );
});

Deno.test('2026: MANUAL_REVIEW et REJECT gèlent la capture ; PASS et PASS_WITH_EXCLUSIONS non', () => {
  assertEquals(requiresReview2026('MANUAL_REVIEW'), true);
  assertEquals(requiresReview2026('REJECT'), true);
  assertEquals(requiresReview2026('PASS'), false);
  assertEquals(requiresReview2026('PASS_WITH_EXCLUSIONS'), false);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LA RAISON DU GEL EST ÉCRITE QUELQUE PART
// ════════════════════════════════════════════════════════════════════════════

Deno.test('2026: une revue est INSÉRÉE quand la capture est gelée, et seulement là', () => {
  assert(
    /if \(reviewRequired\) \{[\s\S]{0,400}from\('anticheat_reviews'\)\.insert\(buildReviewRow\(/.test(SOURCE),
    'le pipeline actif doit écrire `anticheat_reviews` — la table de 0081 était vide par construction',
  );
  assert(
    /isDuplicateReview\(review\.error\.code\)/.test(SOURCE),
    'l’idempotence passe par la contrainte unique, pas par un `select` préalable (fenêtre de course)',
  );
  // BEST-EFFORT : la capture est déjà refusée. Faire échouer l'ingestion parce
  // que la ligne d'audit n'est pas passée priverait le joueur de son résultat
  // sportif sans rien protéger.
  assert(
    /catch\(e\) \{ console\.error\('\[ingest2026\] anticheat review pending/.test(SOURCE),
    'un échec d’écriture de revue ne doit jamais faire échouer l’ingestion',
  );
});

Deno.test('2026: la ligne de revue porte le score, les signaux, et AUCUNE coordonnée', () => {
  const points = trace(23, 1800);
  const report = scoreRun({
    points,
    activity: 'run',
    stepCount: Math.round(distanceM(points) * 0.01),
    now: afterEnd(points),
  });
  const row = buildReviewRow({
    runId: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    review: {
      system_decision: report.decision as ReviewableDecision,
      suspicion: report.suspicion,
      signals: report.signals,
    },
  });
  assertEquals(row.system_decision, report.decision);
  assertEquals(row.suspicion, report.suspicion);
  assert(Array.isArray(row.signals) && row.signals.length > 0, 'les signaux voyagent avec la décision');
  // Le rapport va jusqu'à la revue ET jusqu'à l'appel (E28) : §12 interdit d'y
  // recopier un trajet.
  const serialised = JSON.stringify(row);
  assert(
    !serialised.includes(String(ORIGIN.lat)) && !serialised.includes(String(ORIGIN.lng)),
    'aucune latitude ni longitude ne doit se retrouver dans le dossier de revue',
  );
  assertEquals(isDuplicateReview('23505'), true, 'un renvoi concurrent se tait');
  assertEquals(isDuplicateReview('42P01'), false, 'une vraie panne ne se tait pas');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. LE SCÉNARIO STRAVA — UNE TRACE IMPORTÉE NE PREND JAMAIS DE TERRAIN
// ════════════════════════════════════════════════════════════════════════════

Deno.test('2026: aucune source autre que le GPS live ne peut être vérifiée', () => {
  const points = trace(12, 600);
  const session = {
    activity: 'run',
    client_run_id: '33333333-3333-4333-8333-333333333333',
    started_at: new Date(T0 - 1000).toISOString(),
  };
  const base = {
    activity: 'run',
    clientRunId: session.client_run_id,
    points,
    receivedAt: new Date(afterEnd(points)).toISOString(),
    session,
  };
  // Le GPS live, avec son ancre serveur, est vérifié.
  assertEquals(sourceClockVerdict2026({ ...base, source: 'gps' }).verified, true);
  // Un import — GPX exporté par une montre, ou par une application qui SIMULE
  // une course — ne l'est jamais, quelle que soit la qualité de sa trace.
  for (const source of ['gpx', 'healthkit', 'strava', 'manual']) {
    const verdict = sourceClockVerdict2026({ ...base, source });
    assertEquals(verdict.verified, false, `${source} ne doit jamais être vérifié`);
    assert(!verdict.verified && verdict.reason === 'source_or_clock_unconfirmed');
  }
});

Deno.test('2026: sans ancre d’enregistrement serveur, aucune trace n’est vérifiée', () => {
  const points = trace(12, 600);
  const verdict = sourceClockVerdict2026({
    source: 'gps',
    activity: 'run',
    clientRunId: '33333333-3333-4333-8333-333333333333',
    points,
    receivedAt: new Date(afterEnd(points)).toISOString(),
    session: null,
  });
  assertEquals(verdict.verified, false);
  assert(!verdict.verified && verdict.reason === 'no_recording_session');
});

Deno.test('2026: la SQL exige elle aussi le GPS — deux verrous, pas un', async () => {
  const sql = await Deno.readTextFile(
    new URL('../../migrations/0155_capture_admission_2026.sql', import.meta.url),
  );
  assert(
    /if r\.source is distinct from 'gps' then return jsonb_build_object\('reason','source_or_clock_unconfirmed'\)/
      .test(sql),
    'la base refuse une capture hors GPS live indépendamment du serveur applicatif',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 5. LA FENÊTRE GLISSANTE EST BIEN CELLE DES CONSTANTES PARTAGÉES
// ════════════════════════════════════════════════════════════════════════════

Deno.test('2026: la fenêtre de vitesse soutenue vient de game-rules, pas d’un nombre écrit ici', () => {
  const points = trace(24, ANTICHEAT_SUSTAINED_WINDOW_S + 120);
  const report = scoreRun({ points, activity: 'run', now: afterEnd(points) });
  const signal = report.signals.find((s) => s.id === 'sustained_speed_window')!;
  assertEquals(signal.available, true, 'une trace plus longue que la fenêtre la remplit');
  assertEquals(
    signal.evidence.windowS,
    ANTICHEAT_SUSTAINED_WINDOW_S,
    'la preuve chiffrée doit citer la constante partagée',
  );
});
