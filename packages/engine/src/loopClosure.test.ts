/**
 * GRYD — LA FERMETURE ASSISTÉE : « jamais d'échec sec à 98 % » (MASTER §4, L19).
 *
 * ─── CE QUE CES TESTS PROTÈGENT ─────────────────────────────────────────────
 * Une boucle ouverte est une TENSION : le joueur a couru en croyant refermer.
 * Le produit a donc deux devoirs, et ils sont testés ici :
 *   1. REFERMER quand il ne manquait qu'un trottoir (bande assistée) ;
 *   2. quand c'est vraiment trop loin, DIRE DE COMBIEN — jamais « raté » sec.
 *
 * Tout est dérivé de `game-rules` : régler la bande en Saison 0 ne fera pas
 * rougir ces tests, franchir une règle si.
 */
import {
  BIKE_LOOP_CLOSE_ASSIST_M,
  DEFAULT_ACTIVITY,
  LOOP_CLOSE_ASSIST_M,
  LOOP_CLOSE_TOLERANCE_M,
  activityRules,
  type Activity,
} from '@klaim/shared/game-rules';
import { closureGapM, detectClosedLoop, detectLoop, loopClosureVerdict } from './hexing.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

/** ~1 m en degrés de latitude — suffisant pour placer un écart au mètre près. */
const M_LAT = 1 / 111_320;

/**
 * Carré de `sideM` de côté dont l'arrivée s'arrête `gapM` avant le départ.
 * Le côté est pris large pour que le périmètre et l'aire dépassent largement
 * leurs planchers : ces tests portent sur la FERMETURE, pas sur la forme.
 */
function squareWithGap(sideM: number, gapM: number): { lat: number; lng: number }[] {
  const d = sideM * M_LAT;
  const lat0 = 48.86;
  const lng0 = 2.35;
  const lngD = d / Math.cos((lat0 * Math.PI) / 180);
  const pts = [
    { lat: lat0, lng: lng0 },
    { lat: lat0, lng: lng0 + lngD },
    { lat: lat0 + d, lng: lng0 + lngD },
    { lat: lat0 + d, lng: lng0 },
  ];
  // Retour vers le départ, arrêté `gapM` avant.
  pts.push({ lat: lat0 + gapM * M_LAT, lng: lng0 });
  return pts;
}

const COTE_M = 400; // périmètre ~1 600 m : au-dessus du plancher course (800 m)

// ─── 1. Les trois bandes ────────────────────────────────────────────────────

Deno.test('sous la tolérance : la boucle est FERMÉE, sans assistance', () => {
  const v = loopClosureVerdict(squareWithGap(COTE_M, Math.round(LOOP_CLOSE_TOLERANCE_M * 0.5)));
  assertEquals(v.kind, 'closed');
  assertEquals(v.missingM, 0, 'rien ne manque à une boucle fermée');
});

Deno.test('ENTRE tolérance et bande assistée : GRYD referme à la place du joueur', () => {
  // Le cas que ce lot existe pour traiter : il manquait un trottoir.
  const milieu = Math.round((LOOP_CLOSE_TOLERANCE_M + LOOP_CLOSE_ASSIST_M) / 2);
  const v = loopClosureVerdict(squareWithGap(COTE_M, milieu));
  assertEquals(v.kind, 'assisted', `écart ${milieu} m : la bande assistée doit prendre le relais`);
  assertEquals(v.missingM, 0, 'une boucle assistée est ACCORDÉE : rien ne manque');
});

Deno.test('au-delà de la bande : la boucle est ouverte, et on DIT de combien', () => {
  const trop = LOOP_CLOSE_ASSIST_M + 30;
  const v = loopClosureVerdict(squareWithGap(COTE_M, trop));
  assertEquals(v.kind, 'open');
  assert(v.missingM > 0, 'un refus muet est exactement ce que ce lot interdit');
  // La phrase de l'écran (« Il manquait {m} m ») doit être JUSTE à ~1 m près :
  // le manque se mesure depuis la BANDE, pas depuis la tolérance — sinon on
  // décourage le joueur en lui annonçant 20 m de plus que la réalité.
  assert(
    Math.abs(v.missingM - 30) <= 2,
    `manque annoncé ${v.missingM} m pour un dépassement réel de ~30 m`,
  );
});

// ─── 2. Les invariants qui survivront à tout réglage ────────────────────────

Deno.test('INVARIANT : le manque annoncé n’est JAMAIS plus grand que le vrai dépassement', () => {
  for (const gap of [61, 70, 100, 150, 300, 800]) {
    const v = loopClosureVerdict(squareWithGap(COTE_M, gap));
    if (v.kind !== 'open' || v.gapM === null) continue;
    const vrai = v.gapM - LOOP_CLOSE_ASSIST_M;
    assert(
      v.missingM >= vrai - 0.001 && v.missingM <= vrai + 1,
      `écart ${gap} m : manque ${v.missingM} m pour un dépassement de ${vrai.toFixed(1)} m`,
    );
  }
});

Deno.test('INVARIANT : la bande assistée contient strictement la tolérance', () => {
  for (const activity of ['run', 'bike'] as const) {
    const r = activityRules(activity as Activity);
    assert(
      r.loopCloseAssistM > r.loopCloseToleranceM,
      `[${activity}] une bande assistée ≤ tolérance serait VIDE, donc morte`,
    );
  }
  // Le vélo n'a pas un meilleur GPS parce qu'on roule : même marge.
  assertEquals(BIKE_LOOP_CLOSE_ASSIST_M, LOOP_CLOSE_ASSIST_M);
});

Deno.test('INVARIANT : le verdict est monotone — plus l’écart grandit, moins on ferme', () => {
  const rang = { closed: 0, assisted: 1, open: 2 } as const;
  let precedent = -1;
  for (let gap = 5; gap <= 200; gap += 5) {
    const k = rang[loopClosureVerdict(squareWithGap(COTE_M, gap)).kind];
    assert(k >= precedent, `l'issue s'est ADOUCIE en passant à ${gap} m d'écart`);
    precedent = k;
  }
  assertEquals(precedent, rang.open, 'à 200 m d’écart, la boucle doit être ouverte');
});

// ─── 3. Ce que l'assistance ne doit PAS accorder ────────────────────────────

Deno.test('assister la fermeture n’accorde JAMAIS une micro-boucle', () => {
  // Périmètre très en dessous du plancher : même dans la bande assistée, aucune
  // boucle. Assister veut dire « fermer », jamais « offrir un tour non couru ».
  const petit = squareWithGap(20, Math.round((LOOP_CLOSE_TOLERANCE_M + LOOP_CLOSE_ASSIST_M) / 2));
  assertEquals(loopClosureVerdict(petit).kind, 'assisted', 'la FERMETURE, elle, est bien assistée');
  assertEquals(detectLoop(petit), null, 'mais aucune boucle n’est accordée sous le plancher');
});

Deno.test('assister la fermeture n’accorde JAMAIS un aller-retour (aire nulle)', () => {
  const lat0 = 48.86;
  const lng0 = 2.35;
  const lngD = (600 * M_LAT) / Math.cos((lat0 * Math.PI) / 180);
  // VRAI aller-retour : le retour longe l'aller à 50 cm près. Le périmètre
  // (~1,2 km) dépasse largement le plancher — c'est bien l'AIRE, quasi nulle,
  // qui doit refuser. Un décalage plus large ferait une bande de plusieurs
  // milliers de m² et testerait autre chose.
  const allerRetour = [
    { lat: lat0, lng: lng0 },
    { lat: lat0, lng: lng0 + lngD },
    { lat: lat0 + 0.5 * M_LAT, lng: lng0 + lngD },
    { lat: lat0 + 0.5 * M_LAT, lng: lng0 },
  ];
  // La FERMETURE, elle, est parfaite (50 cm d'écart) : c'est bien la forme qui
  // refuse, pas la fermeture — sinon ce test ne prouverait pas ce qu'il dit.
  assertEquals(loopClosureVerdict(allerRetour).kind, 'closed');
  assertEquals(detectLoop(allerRetour), null, 'un aller-retour n’enclôt rien, assisté ou non');
});

// ─── 4. `detectClosedLoop` reste STRICT (il porte le nom de la tolérance) ────

Deno.test('detectClosedLoop ne s’élargit PAS à la bande assistée', () => {
  const milieu = Math.round((LOOP_CLOSE_TOLERANCE_M + LOOP_CLOSE_ASSIST_M) / 2);
  const pts = squareWithGap(COTE_M, milieu);
  assertEquals(
    detectClosedLoop(pts),
    false,
    'ce prédicat porte le nom de la TOLÉRANCE : l’élargir en silence le ferait mentir',
  );
  // …mais `detectLoop`, lui, accorde la boucle et NOMME l'assistance.
  const loop = detectLoop(pts);
  assert(loop !== null, 'la boucle assistée doit bien être accordée');
  assertEquals(loop!.closure, 'assisted', 'le produit doit SAVOIR ce qu’il a donné');
});

Deno.test('une boucle franchement fermée reste marquée `tolerance`, pas `assisted`', () => {
  const loop = detectLoop(squareWithGap(COTE_M, 5));
  assert(loop !== null);
  assertEquals(loop!.closure, 'tolerance', 'ne pas attribuer au produit un cadeau qu’il n’a pas fait');
});

// ─── 5. Entrées aberrantes : on ne prétend rien ─────────────────────────────

Deno.test('trace inexploitable : aucun écart affirmé, aucun manque inventé', () => {
  for (const pts of [[], [{ lat: 48.86, lng: 2.35 }]]) {
    assertEquals(closureGapM(pts), null);
    const v = loopClosureVerdict(pts);
    assertEquals(v.gapM, null, 'un écart inconnu ne vaut pas 0');
    assertEquals(v.missingM, 0, 'on n’annonce pas un manque qu’on ne sait pas mesurer');
  }
});

Deno.test('la discipline par défaut est bien celle du MVP', () => {
  const v = loopClosureVerdict(squareWithGap(COTE_M, 10));
  assertEquals(v.kind, loopClosureVerdict(squareWithGap(COTE_M, 10), DEFAULT_ACTIVITY).kind);
});
