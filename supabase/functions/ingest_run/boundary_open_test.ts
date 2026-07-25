/**
 * GRYD — OUVERTURE DE FRONTIÈRE PAR DISCIPLINE (E14 / A-17 §CH2).
 * Purs : aucune I/O, aucun réseau, aucune base.
 *
 * CE QUI EST VERROUILLÉ ICI, et pourquoi ces cas-là précisément.
 *
 * Le défaut corrigé n'était PAS une borne fausse : chaque borne, prise seule,
 * connaissait déjà sa discipline (`activityRules`). C'était un ARGUMENT OMIS sur
 * UN appel — `detectOpenBoundary(loopTrace)` au lieu de
 * `detectOpenBoundary(loopTrace, activity)`. Aucun test de borne unitaire ne
 * pouvait le voir, puisque toutes les bornes restaient justes. Il faut donc
 * tester la COMPOSITION, avec des géométries qui SÉPARENT les deux disciplines :
 *
 *  1. TROP PERMISSIF (le vol) — une trace dont le périmètre complété tombe
 *     ENTRE les deux planchers (1 km course < 2,8 km < 5 km vélo). Sous les
 *     règles course elle ouvre ; sous les règles vélo elle ne doit pas. C'est
 *     le contournement d'un facteur 5, suivi d'une capture d'intérieur au
 *     plafond d'aire VÉLO.
 *  2. TROP STRICT (le blocage) — une sortie vélo dont l'auto-intersection fait
 *     ~2,4 km : c'est une BOUCLE sous les règles course (plancher 1 km), donc
 *     « rien à ouvrir », mais PAS une boucle sous les règles vélo (plancher
 *     5 km). Le cycliste doit pouvoir ouvrir. Un correctif qui n'irait que dans
 *     le sens « plus strict » laisserait ce cas cassé.
 *  3. LE CÂBLAGE lui-même — `index.ts` ne doit plus pouvoir appeler le moteur en
 *     direct (c'est exactement ce qui a produit le défaut).
 *
 * Géométrie : repère local plan centré Paris, mêmes conversions que
 * `boundary_test.ts` / `loop_test.ts`. Les VALEURS de seuil ne sont jamais
 * écrites en dur : elles viennent de game-rules, seule source.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  BIKE_LOOP_MIN_PERIMETER_M,
  LOOP_MIN_PERIMETER_M,
} from '../_shared/game-rules.ts';
import { detectLoop, type LatLngPoint } from '../_shared/engine/hexing.ts';
import { decideOpenBoundary } from './boundary_open.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

/** Point à (xM est, yM nord) du coin d'origine. */
function pt(xM: number, yM: number): LatLngPoint {
  return { lat: LAT0 + yM / M_PER_DEG_LAT, lng: LNG0 + xM / M_PER_DEG_LNG };
}

/** Polyligne densifiée entre deux coins du repère (un point tous les `stepM`). */
function leg(
  from: readonly [number, number],
  to: readonly [number, number],
  stepM: number,
): LatLngPoint[] {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const lengthM = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.round(lengthM / stepM));
  const out: LatLngPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    out.push(pt(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps));
  }
  return out;
}

/** Trace densifiée passant par une suite de coins. */
function path(corners: readonly (readonly [number, number])[], stepM: number): LatLngPoint[] {
  const first = corners[0]!;
  const out: LatLngPoint[] = [pt(first[0], first[1])];
  for (let i = 1; i < corners.length; i++) out.push(...leg(corners[i - 1]!, corners[i]!, stepM));
  return out;
}

/** Un run GRYD Verified, non bouclé : le seul contexte où l'ouverture se pose. */
const opener = (trace: readonly LatLngPoint[], activity: 'run' | 'bike') =>
  decideOpenBoundary({ trace, activity, loopClosed: false, finisherVerified: true });

// ─── 1. TROP PERMISSIF : le plancher de boucle VÉLO ne se contourne plus ─────

/**
 * « U » de côté 700 m (3 côtés courus) : traced 2 100 m, corde manquante 700 m,
 * périmètre COMPLÉTÉ 2 800 m. Choisi pour tomber STRICTEMENT entre les deux
 * planchers — c'est ce qui rend le test capable de distinguer les disciplines.
 */
function u700(): LatLngPoint[] {
  return path([[0, 0], [700, 0], [700, 700], [0, 700]], 25);
}

Deno.test('la géométrie de test tombe bien ENTRE les deux planchers (sinon le test ne prouve rien)', () => {
  const completedPerimeterM = 2_100 + 700;
  assert(
    completedPerimeterM > LOOP_MIN_PERIMETER_M,
    `2 800 m doit dépasser le plancher course (${LOOP_MIN_PERIMETER_M} m)`,
  );
  assert(
    completedPerimeterM < BIKE_LOOP_MIN_PERIMETER_M,
    `2 800 m doit rester sous le plancher vélo (${BIKE_LOOP_MIN_PERIMETER_M} m)`,
  );
});

Deno.test('un COUREUR ouvre sa frontière à 2,8 km de périmètre complété (comportement inchangé)', () => {
  const b = opener(u700(), 'run');
  assert(b !== null, 'frontière course attendue');
  assert(Math.abs(b!.missingM - 700) < 10, `corde ≈ 700 m, obtenu ${b!.missingM}`);
  assert(Math.abs(b!.tracedLengthM - 2_100) < 15, `couru ≈ 2 100 m, obtenu ${b!.tracedLengthM}`);
});

Deno.test('un CYCLISTE n’ouvre PAS de frontière sous le plancher de boucle vélo (facteur 5 refermé)', () => {
  assertEquals(
    opener(u700(), 'bike'),
    null,
    'périmètre complété 2,8 km < 5 km : à vélo, la zone se gagne à l’échelle du quartier',
  );
});

// ─── 2. TROP STRICT : le cycliste peut ouvrir ce qu’il a le droit d’ouvrir ───

/**
 * Sortie vélo de ~8,8 km avec un NŒUD : la trace repart en arrière et recroise
 * son propre départ, formant une sous-boucle de ~2,4 km de périmètre.
 *
 *   (0,0) →E (1000,0) →N (1000,600) →O (420,600) →S (420,−180) ⨯ croise y=0
 *         →E (2000,−180) →N (2000,2000) →O (0,2000)
 *
 * · sous les règles COURSE, la sous-boucle (~2,4 km ≥ 1 km) est une BOUCLE
 *   détectée → « rien à ouvrir » ;
 * · sous les règles VÉLO, ~2,4 km < 5 km : ce n'est pas une boucle, et la grande
 *   forme ouverte (périmètre complété ~10,8 km) EST une frontière légitime.
 *
 * ⚠️ Le croisement est volontairement en x=420 / y=0 avec un pas de 50 m : le
 * moteur n'accepte que les croisements STRICTEMENT intérieurs aux deux segments
 * (t et u dans ]0,1[). Une intersection tombant sur un SOMMET partagé serait
 * ignorée — et le test passerait pour une mauvaise raison.
 */
function bikeKnot(): LatLngPoint[] {
  return path(
    [[0, 0], [1000, 0], [1000, 600], [420, 600], [420, -180], [2000, -180], [2000, 2000], [
      0,
      2000,
    ]],
    50,
  );
}

Deno.test('le nœud EST une boucle sous les règles course, et n’en est PAS une à vélo', () => {
  // Sanity de la géométrie : sans cet écart, les deux assertions suivantes
  // passeraient pour de mauvaises raisons.
  assert(detectLoop(bikeKnot(), 'run') !== null, 'sous-boucle 2,4 km ≥ plancher course');
  assertEquals(detectLoop(bikeKnot(), 'bike'), null, 'sous-boucle 2,4 km < plancher vélo');
});

Deno.test('un CYCLISTE ouvre la frontière que les règles course lui refusaient (défaut symétrique)', () => {
  assertEquals(
    opener(bikeKnot(), 'run'),
    null,
    'sous les règles course, le nœud est une boucle : rien à ouvrir',
  );
  const b = opener(bikeKnot(), 'bike');
  assert(b !== null, 'à vélo, cette sortie ouvre une frontière — le défaut la bloquait');
  assert(Math.abs(b!.missingM - 2_000) < 20, `corde ≈ 2 000 m, obtenu ${b!.missingM}`);
});

// ─── 3. Les gardes de contexte restent appliquées ────────────────────────────

Deno.test('boucle déjà fermée ou run non vérifié → aucune ouverture, dans les DEUX disciplines', () => {
  for (const activity of ['run', 'bike'] as const) {
    assertEquals(
      decideOpenBoundary({ trace: u700(), activity, loopClosed: true, finisherVerified: true }),
      null,
      `${activity} : une boucle fermée fait sa zone, elle n’ouvre rien`,
    );
    assertEquals(
      decideOpenBoundary({ trace: u700(), activity, loopClosed: false, finisherVerified: false }),
      null,
      `${activity} : un run non GRYD Verified n’ouvre jamais de frontière`,
    );
  }
});

// ─── 4. LE CÂBLAGE — le défaut d’origine était un appel, pas une règle ───────

Deno.test('index.ts n’IMPORTE plus detectOpenBoundary : le contournement est fermé', async () => {
  // Ce test est le seul qui aurait attrapé le défaut initial. `decideOpenBoundary`
  // exige la discipline (typecheck), mais rien n'empêcherait de réimporter le
  // moteur — dont l'argument `activity` est optionnel — et de refaire l'oubli.
  //
  // On vérifie l'IMPORT et non le texte « detectOpenBoundary( » : un test qui
  // grepperait l'appel se déclencherait sur un simple commentaire (il l'a fait),
  // et un test qui se trompe de cible n'est pas un filet. Sans import, un appel
  // est une erreur de compilation — le typecheck du gate le refuse.
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  const engineBoundaryImports = [
    ...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/_shared\/engine\/boundary\.ts'/g),
  ]
    .map((m) => m[1] ?? '')
    .join(',');
  assertEquals(
    engineBoundaryImports.includes('detectOpenBoundary'),
    false,
    'index.ts doit passer par decideOpenBoundary (discipline REQUISE), jamais par le moteur nu',
  );
  assert(
    source.includes("from './boundary_open.ts'"),
    'index.ts doit bien consommer le module de décision (sinon le filet ne protège rien)',
  );
});
