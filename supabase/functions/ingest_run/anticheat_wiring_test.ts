/**
 * GRYD — CÂBLAGE DE L'ANTI-TRICHE (§11). Tests PURS.
 *
 * ═══ CE QUI EST VERROUILLÉ ICI, ET POURQUOI CES CAS-LÀ ══════════════════════
 * Le moteur (`anticheat.ts`, 20 tests) sait déjà décider. Ce qui peut être faux
 * ICI, c'est la CONSÉQUENCE — et une conséquence fausse ne plante pas : elle
 * refuse une course honnête, ou elle laisse passer une course refusée. Cinq
 * façons de se tromper, une famille de tests chacune :
 *
 *  1. PUNIR CE QUI EST CRÉDITÉ. `PASS` et `PASS_WITH_EXCLUSIONS` créditent : le
 *     verdict §3.2 doit ressortir INTACT, et AUCUNE revue ne doit s'ouvrir. Le
 *     piège précis : ré-exclure les segments que `claimableSegments` a déjà
 *     écartés en amont — ils seraient retirés deux fois.
 *  2. CRÉDITER CE QUI EST REFUSÉ. `MANUAL_REVIEW` et `REJECT` ne créditent
 *     rien : le verdict doit tomber sur `flagged`, et la revue exister avec la
 *     BONNE décision système (c'est elle que l'écran d'appel E28 lit — les
 *     confondre priverait un joueur refusé de savoir de quoi il fait appel).
 *  3. SOUPÇONNER QUELQU'UN QUI A JUSTE COURU 200 M. Une course déjà refusée par
 *     une règle de JEU ne doit pas recevoir en plus un dossier de suspicion.
 *  4. OUVRIR DEUX FOIS. Un renvoi du même `clientRunId` ne doit ni échouer ni
 *     empiler deux dossiers du même fait. La contrainte `unique` de 0081
 *     tranche ; encore faut-il que le code lise son verdict au lieu de crier.
 *  5. ÉCRIRE DES COLONNES QUI NE NOUS APPARTIENNENT PAS. Pré-remplir `status`
 *     ou `final_decision` affirmerait qu'un dossier a été regardé. Personne ne
 *     dépile la file.
 *
 * Un dernier test regarde `index.ts` : un module pur que personne n'appelle ne
 * protège rien — c'est EXACTEMENT l'état d'où ce chantier sort (`scoreRun`
 * existait, testé, et n'était appelé nulle part).
 *
 * ═══ LES TRACES SONT RÉELLES, ET LEURS DEUX VERDICTS AUSSI ══════════════════
 * Chaque fixture passe par `verdictForRequest` (le VRAI pipeline §3.2 du
 * handler) AVANT d'entrer dans le câblage. Aucun `ValidationOutcome` n'est
 * fabriqué à la main : un test qui inventerait un verdict « claimable » pourrait
 * verrouiller une combinaison que le produit ne produit jamais. Les quatre
 * décisions testées sont donc TOUTES atteignables en production, sur une trace
 * que §3.2 aurait créditée.
 *
 * Géométrie : progression plein EST à latitude constante (conversion
 * mètres → degrés exacte au premier ordre), horloge FIXE, aléa par LCG à graine
 * fixe. Aucun `Date.now()`, aucun tirage non reproductible.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  type AntiCheatDecision,
  creditsCapture,
  scoreRun,
  traceFingerprint,
} from '../_shared/engine/anticheat.ts';
import type { RunPoint } from '../_shared/types.ts';
import { verdictForRequest } from './validate.ts';
import {
  ANTICHEAT_RUN_STATUS,
  type AntiCheatWiringInput,
  buildReviewRow,
  isDuplicateReview,
  planAntiCheat,
  UNIQUE_VIOLATION,
} from './anticheat_wiring.ts';

// ─── Fabrique de traces ──────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 48.85, lng: 2.35 };
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);
/** 1er mars 2026, 08:00 UTC — une date fixe, jamais l'horloge machine. */
const T0 = Date.UTC(2026, 2, 1, 8, 0, 0);
/** Vitesse d'un véhicule urbain (m/s) : 90 km/h, très au-dessus de toute borne. */
const VEHICULE_M_S = 25;

function pointEst(xM: number, tMs: number): RunPoint {
  return {
    lat: ORIGINE.lat,
    lng: ORIGINE.lng + xM / (RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0),
    t: tMs,
    acc: 8,
  };
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

/** Une portion COURUE : allure visée, jitter humain, échantillonnage 1 Hz. */
function course(paceSKm: number, durationS: number, x0 = 0, t0 = T0, seed = 42): RunPoint[] {
  const rnd = lcg(seed);
  const v = 1000 / paceSKm;
  const pts: RunPoint[] = [];
  let x = x0;
  for (let s = 0; s <= durationS; s += 1) {
    pts.push(pointEst(x, t0 + s * 1000));
    x += v * (1 + (rnd() * 2 - 1) * 0.3);
  }
  return pts;
}

function xDe(p: RunPoint): number {
  return (p.lng - ORIGINE.lng) * RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0;
}

/**
 * Une vraie course, PUIS un trajet en véhicule enregistré dans la même trace —
 * le GPX qui contient le retour en voiture. `filterPoints` jette les points du
 * véhicule, donc §3.2 ne voit qu'une course propre et la CRÉDITE : c'est
 * précisément le cas que l'anti-triche existe pour rattraper, et il n'est
 * atteignable qu'en mesurant la vitesse sur les points BRUTS.
 */
function courseAvecVehicule(courseS: number, pointsVehicule: number, seed = 42): RunPoint[] {
  const a = course(300, courseS, 0, T0, seed);
  const dernier = a[a.length - 1]!;
  let x = xDe(dernier);
  let t = dernier.t + 60_000;
  const vehicule: RunPoint[] = [];
  for (let i = 0; i < pointsVehicule; i++) {
    vehicule.push(pointEst(x, t));
    x += VEHICULE_M_S * 60;
    t += 60_000;
  }
  return a.concat(vehicule);
}

/** Instant « serveur » : après la fin de la trace, jamais l'horloge machine. */
function apresFin(points: readonly RunPoint[]): number {
  return Math.max(...points.map((p) => p.t)) + 60_000;
}

/** Le câblage tel que `index.ts` l'appelle : verdict §3.2 réel + trace brute. */
function plan(points: RunPoint[], extra: Partial<AntiCheatWiringInput> = {}) {
  return planAntiCheat({
    verdict: verdictForRequest({ points, stepCount: undefined, gpsTrust: undefined }),
    points,
    activity: 'run',
    nowMs: apresFin(points),
    ...extra,
  });
}

// ─── Les quatre fixtures, et leur double verdict ─────────────────────────────
//
// Elles sont construites une fois et vérifiées ci-dessous : si une borne de
// game-rules bouge, c'est CE test qui le dit, pas un test de conséquence qui
// deviendrait silencieusement vide.

/** PASS — 20 min à 5:00/km, rien à signaler. */
const TRACE_PROPRE = course(300, 1200);
/** MANUAL_REVIEW — 20 min courues + 30 min de véhicule (58 % de la durée). */
const TRACE_REVUE = courseAvecVehicule(1200, 30);
/** REJECT — 10 min courues + 6 h 40 de véhicule : 97 % de la durée, décisif. */
const TRACE_REFUS = courseAvecVehicule(600, 400);
/** PASS_WITH_EXCLUSIONS — une course, puis un retour au calme hors bornes. */
const TRACE_EXCLUSIONS = (() => {
  const a = course(300, 600);
  const dernier = a[a.length - 1]!;
  return a.concat(course(840, 400, xDe(dernier) + 300, dernier.t + 600_000, 99));
})();

Deno.test('les fixtures sont bien ce qu’elles prétendent : §3.2 crédite, §11 décide', () => {
  for (const [nom, pts, attendu] of [
    ['propre', TRACE_PROPRE, 'PASS'],
    ['exclusions', TRACE_EXCLUSIONS, 'PASS_WITH_EXCLUSIONS'],
    ['revue', TRACE_REVUE, 'MANUAL_REVIEW'],
    ['refus', TRACE_REFUS, 'REJECT'],
  ] as const) {
    const v = verdictForRequest({ points: pts, stepCount: undefined, gpsTrust: undefined });
    assertEquals(v.kind, 'claimable', `fixture « ${nom} » : §3.2 doit CRÉDITER`);
    assertEquals(
      scoreRun({ points: pts, activity: 'run', now: apresFin(pts) }).decision,
      attendu,
      `fixture « ${nom} » : décision moteur attendue`,
    );
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 1. PUNIR CE QUI EST CRÉDITÉ
// ════════════════════════════════════════════════════════════════════════════

Deno.test('PASS : le verdict §3.2 ressort INTACT et AUCUNE revue n’est ouverte', () => {
  const p = plan(TRACE_PROPRE);
  assertEquals(p.decision, 'PASS');
  assertEquals(p.review, null, 'une course propre ne doit produire AUCUN dossier');
  assertEquals(p.downgraded, false);
  assertEquals(p.skipped, null);
  assertEquals(p.verdict.kind, 'claimable');
  assert(p.verdict.kind === 'claimable' && p.verdict.status === 'valid');
});

Deno.test('PASS_WITH_EXCLUSIONS : la course reste créditée, les segments ne sont pas exclus DEUX fois', () => {
  const avant = verdictForRequest({
    points: TRACE_EXCLUSIONS,
    stepCount: undefined,
    gpsTrust: undefined,
  });
  const p = plan(TRACE_EXCLUSIONS);

  assertEquals(p.decision, 'PASS_WITH_EXCLUSIONS');
  assertEquals(p.review, null, 'une exclusion partielle crédite : pas de dossier');
  assertEquals(p.downgraded, false);
  assert(p.verdict.kind === 'claimable', 'la course reste capturante');
  assertEquals(p.verdict.status, 'partial', '§3.2 disait déjà « partial »');
  // LE point du test : le câblage n'enlève RIEN. Les segments écartés le sont
  // déjà par `claimableSegments` en amont ; en retirer d'autres ici couperait
  // deux fois dans la même sortie.
  assert(avant.kind === 'claimable');
  assertEquals(
    p.verdict.claimable.length,
    avant.claimable.length,
    'le câblage ne doit retirer AUCUN segment supplémentaire',
  );
  assertEquals(
    p.verdict.claimable.map((s) => s.length),
    avant.claimable.map((s) => s.length),
    'les segments capturables doivent être les MÊMES, point pour point',
  );
});

Deno.test('les deux décisions qui créditent laissent `runs.status` au verdict §3.2', () => {
  assertEquals(ANTICHEAT_RUN_STATUS.PASS, null);
  assertEquals(ANTICHEAT_RUN_STATUS.PASS_WITH_EXCLUSIONS, null);
  // La table de correspondance et le moteur doivent dire la MÊME chose : un
  // statut imposé exactement quand la capture n'est PAS créditée.
  for (const d of Object.keys(ANTICHEAT_RUN_STATUS) as AntiCheatDecision[]) {
    assertEquals(
      ANTICHEAT_RUN_STATUS[d] === null,
      creditsCapture(d),
      `« ${d} » : la correspondance contredit creditsCapture()`,
    );
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. CRÉDITER CE QUI EST REFUSÉ
// ════════════════════════════════════════════════════════════════════════════

Deno.test('MANUAL_REVIEW : la capture n’est PAS créditée et un dossier s’ouvre', () => {
  const p = plan(TRACE_REVUE);
  assertEquals(p.decision, 'MANUAL_REVIEW');
  assertEquals(p.downgraded, true);
  assertEquals(p.verdict.kind, 'flagged', 'aucune capture ne doit être créditée');
  assert(p.review !== null, 'une course non créditée DOIT laisser une trace consultable');
  assertEquals(p.review.system_decision, 'MANUAL_REVIEW');
});

Deno.test('REJECT : refusée, ET un dossier existe quand même — sinon aucun appel n’est possible', () => {
  const p = plan(TRACE_REFUS);
  assertEquals(p.decision, 'REJECT');
  assertEquals(p.downgraded, true);
  assertEquals(p.verdict.kind, 'flagged');
  assert(p.review !== null, '§11.4 : sans dossier, le joueur n’a rien à contester');
  assertEquals(
    p.review.system_decision,
    'REJECT',
    'la décision SYSTÈME doit dire « refus », même si runs.status dit « flagged »',
  );
  // La distinction revue/refus vit dans la colonne que E28 lit : la confondre
  // priverait un joueur refusé de savoir de quoi il fait appel.
  assert(plan(TRACE_REVUE).review?.system_decision !== p.review.system_decision);
});

Deno.test('la revue porte le score ET les preuves, dans les bornes que 0081 accepte', () => {
  const p = plan(TRACE_REFUS);
  assert(p.review !== null && p.report !== null);
  assertEquals(p.review.suspicion, p.report.suspicion, 'le score doit être celui du moteur');
  // `suspicion smallint check (suspicion between 0 and 100)` — un score hors
  // bornes ferait échouer l'insert et perdre le dossier.
  assert(
    Number.isInteger(p.review.suspicion) && p.review.suspicion >= 0 && p.review.suspicion <= 100,
    `score hors bornes 0081 : ${p.review.suspicion}`,
  );
  // `signals jsonb ... check (jsonb_typeof(signals) = 'array')`.
  assert(Array.isArray(p.review.signals), 'les signaux doivent être un TABLEAU');
  assert(p.review.signals.length > 0, 'un dossier sans signal n’explique rien');
  // §11.4 « données concernées » : les preuves CHIFFRÉES voyagent, jamais une
  // coordonnée (§12). Le moteur le garantit ; on vérifie qu'on ne l'a pas défait.
  const brut = JSON.stringify(p.review.signals);
  assert(!brut.includes('"lat"') && !brut.includes('"lng"'), 'aucune coordonnée dans un dossier');
  // Le signal qui a décidé doit être NOMMÉ : un dossier muet n'est pas relisable.
  assert(
    p.review.signals.some((s) => s.id === 'sustained_speed' && s.available && s.severity > 0.9),
    'le signal décisif doit figurer au dossier avec sa sévérité',
  );
});

Deno.test('les scores de confiance §3.2 SURVIVENT au déclassement', () => {
  const avant = verdictForRequest({
    points: TRACE_REVUE,
    stepCount: undefined,
    gpsTrust: undefined,
  });
  const p = plan(TRACE_REVUE);
  // `runs.gps_trust` / `motion_trust` / `trust_score` décrivent la QUALITÉ DU
  // SIGNAL, pas la suspicion. Les écraser ferait dire à la base une chose
  // qu'aucune mesure n'a constatée.
  assertEquals(p.verdict.gpsTrust, avant.gpsTrust);
  assertEquals(p.verdict.motionTrust, avant.motionTrust);
  assertEquals(p.verdict.trustScore, avant.trustScore);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. SOUPÇONNER QUELQU'UN QUI A JUSTE COURU 200 M
// ════════════════════════════════════════════════════════════════════════════

Deno.test('une course déjà refusée par une RÈGLE DE JEU n’ouvre aucun dossier de suspicion', () => {
  // 90 s à 5:00/km : trop brève ET trop courte (§3.2). Personne n'a triché.
  const pts = course(300, 90);
  const avant = verdictForRequest({ points: pts, stepCount: undefined, gpsTrust: undefined });
  assertEquals(avant.kind, 'rejected', 'la fixture doit bien être refusée par §3.2');

  const p = plan(pts);
  assertEquals(p.skipped, 'not_claimable', 'le silence doit porter sa raison');
  assertEquals(p.report, null, 'le moteur ne doit pas même tourner');
  assertEquals(p.decision, null);
  assertEquals(p.review, null, 'courir 200 m n’est pas un fait de triche');
  assertEquals(p.downgraded, false);
  assertEquals(p.verdict, avant, 'le verdict §3.2 doit ressortir tel quel, raison comprise');
});

Deno.test('une course déjà `flagged` par GRYD Verify n’est pas doublée d’un dossier', () => {
  // Podomètre incohérent → `flagged` (§3.2 / GRYD Verify) AVANT l'anti-triche.
  const pts = TRACE_PROPRE;
  const avant = verdictForRequest({ points: pts, stepCount: 10, gpsTrust: undefined });
  assertEquals(avant.kind, 'flagged', 'la fixture doit bien être gelée par GRYD Verify');

  const p = planAntiCheat({
    verdict: avant,
    points: pts,
    activity: 'run',
    stepCount: 10,
    nowMs: apresFin(pts),
  });
  assertEquals(p.skipped, 'not_claimable');
  assertEquals(p.review, null, 'la capture est déjà gelée : un second dossier n’ajoute rien');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. OUVRIR DEUX FOIS
// ════════════════════════════════════════════════════════════════════════════

Deno.test('DÉTERMINISME : deux appels sur la même course rendent le MÊME plan', () => {
  // C'est la propriété qui rend le renvoi d'un `clientRunId` inoffensif : le
  // second passage ne peut pas décider autre chose que le premier, donc la
  // ligne déjà présente en base est bien celle qu'on aurait écrite.
  const a = plan(TRACE_REFUS);
  const b = plan(TRACE_REFUS);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

Deno.test('un doublon de revue se lit sur la CONTRAINTE, pas sur une vérification préalable', () => {
  assertEquals(UNIQUE_VIOLATION, '23505', 'code d’unicité Postgres');
  assert(isDuplicateReview('23505'), 'un second insert concurrent doit être reconnu et toléré');
  assert(!isDuplicateReview('23503'), 'une clé étrangère manquante n’est PAS un doublon');
  assert(!isDuplicateReview('42501'), 'un refus de droits n’est PAS un doublon');
  assert(!isDuplicateReview(null) && !isDuplicateReview(undefined), 'l’absence de code non plus');
});

// ════════════════════════════════════════════════════════════════════════════
// 5. ÉCRIRE DES COLONNES QUI NE NOUS APPARTIENNENT PAS
// ════════════════════════════════════════════════════════════════════════════

Deno.test('la ligne écrite ne contient QUE ce que l’ingestion sait — rien du traitement', () => {
  const p = plan(TRACE_REFUS);
  assert(p.review !== null);
  const row = buildReviewRow({ runId: 'run-1', userId: 'user-1', review: p.review });

  assertEquals(
    Object.keys(row).sort(),
    ['run_id', 'signals', 'suspicion', 'system_decision', 'user_id'],
    'toute colonne en plus serait une affirmation sur un dossier que personne n’a ouvert',
  );
  assertEquals(row.run_id, 'run-1');
  // Dénormalisé depuis `runs.user_id`, comme 0081 l'exige pour sa RLS.
  assertEquals(row.user_id, 'user-1');
  assertEquals(row.system_decision, 'REJECT');
  // Ces quatre-là restent aux DEFAULT / à NULL : il n'y a AUCUN opérateur.
  for (const interdite of ['status', 'final_decision', 'operator_id', 'closed_at']) {
    assert(!(interdite in row), `« ${interdite} » ne doit pas être écrite à l’ingestion`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LES ANTÉCÉDENTS : UN CHAMP QU'ON NE REMPLIT PAS AUJOURD'HUI, MAIS QUI PASSE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('sans antécédents fournis, `duplicate_trace` reste INDISPONIBLE (jamais « propre »)', () => {
  const p = plan(TRACE_REVUE);
  const s = p.report?.signals.find((x) => x.id === 'duplicate_trace');
  assertEquals(s?.available, false, '`ingest_run` n’en fournit aucun : le signal ne conclut RIEN');
  assert((s?.unavailableReason ?? '').length > 10, 'l’indisponibilité doit être EXPLIQUÉE au dossier');
});

Deno.test('les antécédents traversent bien le câblage le jour où on saura les lire', () => {
  // Le champ n'est pas décoratif : si un lot ultérieur conserve les empreintes,
  // il suffira de les passer. Ce test empêche que le câblage les avale.
  const p = plan(TRACE_PROPRE, {
    priorTraceFingerprints: [traceFingerprint(TRACE_PROPRE)],
  });
  const s = p.report?.signals.find((x) => x.id === 'duplicate_trace');
  assertEquals(s?.available, true);
  assertEquals(s?.severity, 1, 'le rejeu doit être vu');
  assertEquals(p.decision, 'MANUAL_REVIEW', 'un rejeu demande une revue, il ne condamne pas');
  assertEquals(p.review?.system_decision, 'MANUAL_REVIEW');
});

// ════════════════════════════════════════════════════════════════════════════
// UN MODULE PUR QUE PERSONNE N'APPELLE NE PROTÈGE RIEN
// ════════════════════════════════════════════════════════════════════════════

Deno.test('index.ts APPELLE réellement le câblage et ÉCRIT réellement la revue', async () => {
  const src = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assert(src.includes("from './anticheat_wiring.ts'"), 'index.ts n’importe pas le câblage');
  assert(src.includes('planAntiCheat('), 'index.ts n’appelle pas planAntiCheat');
  assert(src.includes("from('anticheat_reviews')"), 'index.ts n’écrit aucune revue');
  assert(src.includes('buildReviewRow('), 'index.ts ne construit pas la ligne de revue');
  assert(src.includes('isDuplicateReview('), 'index.ts ne tolère pas le renvoi concurrent');
  // Le verdict propagé à l'aval doit être CELUI DU CÂBLAGE. Si `validation`
  // redevenait le verdict §3.2 brut, l'anti-triche cesserait d'avoir le moindre
  // effet sans qu'aucun test de ce fichier ne s'en aperçoive.
  assert(
    src.includes('const validation = antiCheat.verdict'),
    'index.ts ne propage pas le verdict issu de l’anti-triche',
  );
});

Deno.test('la migration 0081 pose bien les deux garanties sur lesquelles ce câblage s’appuie', async () => {
  const sql = await Deno.readTextFile(
    new URL('../../migrations/0081_anticheat_review.sql', import.meta.url),
  );
  // (a) l'idempotence est une CONTRAINTE, pas une convention de code.
  assert(
    sql.includes('run_id uuid not null unique'),
    'sans `unique` sur run_id, deux renvois empileraient deux dossiers',
  );
  // (b) seules les deux décisions NON créditantes peuvent entrer.
  assert(
    sql.includes("check (system_decision in ('MANUAL_REVIEW', 'REJECT'))"),
    'la base doit refuser d’enregistrer une décision qui CRÉDITE',
  );
});
