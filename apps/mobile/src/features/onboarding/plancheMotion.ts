/**
 * GRYD — PLANCHES E01b (02 · 03 · 04 · 05) : GÉOMÉTRIE ET TEMPS **PURS**.
 *
 * ─── POURQUOI CE MODULE EXISTE (il remplace `demoPhases.ts`) ────────────────
 * Même raison, déjà payée trois fois : dans l'aperçu headless
 * `document.visibilityState` vaut "hidden", `requestAnimationFrame` tourne à
 * 0 fps, et TOUTE capture d'écran d'une animation y montre une image figée qui ne
 * prouve rien. Ce qui est prouvable sans écran l'est donc ici : les bornes de
 * chaque temps, l'ORDRE des temps, les invariants de sens (« rien n'est pris
 * avant que la boucle soit fermée »), la géométrie des plateaux. Les composants
 * (`E02Loop.tsx`, `visuals.tsx`) ne font que RENDRE l'état renvoyé à l'instant t.
 *
 * Zéro import React / react-native : testable par `npm run test:mobile` (Deno).
 *
 * ─── CE QU'IL REMPLACE, ET CE QU'IL RÉCUPÈRE ────────────────────────────────
 * `demoPhases.ts` portait le storyboard des DEUX anciennes cartes pédagogiques
 * (`CaptureDemo` supprimée le 25/07, `RivalryDemo` supprimée par CE chantier) :
 * quatre temps sur 3 s en boucle, plateau de vraies rues projetées. Les planches
 * E01b décrivent autre chose — des animations d'ENTRÉE, jouées UNE fois, sur une
 * grille de rues stylisée :
 *   · planche 02 « la boucle se dessine en 900 ms à l'arrivée, PUIS la surface se
 *     remplit » ;
 *   · planche 03 « la moitié bascule en orange en 600 ms ».
 * Une timeline bouclée de 3 s n'était plus la vérité de l'écran : elle est
 * remplacée, pas conservée « au cas où » (du code qui ne décrit plus ce qui est
 * rendu diverge à coup sûr).
 *
 * ⚠️ LA BOUCLE DE LA PLANCHE 02 EST **RÉCUPÉRÉE**, PAS REDESSINÉE.
 * `LOOP_POINTS` reproduit sommet pour sommet le tracé de
 * `src/features/onboarding/E01Route.tsx`, supprimé comme code mort au commit
 * b5b3e64 et repris ici depuis `git show b5b3e64^`. Ce parcours suit les RUES
 * (segments droits + angles, jamais une courbe lisse) et se referme sur son
 * départ. `plancheMotion.test.ts` vérifie que le `d` reconstruit est
 * CARACTÈRE POUR CARACTÈRE celui du fichier récupéré : la géométrie ne peut plus
 * dériver silencieusement de la planche.
 *
 * ─── HONNÊTETÉ (CLAUDE.md « l'app ne ment jamais ») ────────────────────────
 * Ces plateaux ILLUSTRENT une règle, ils n'affichent aucun état du monde :
 * AUCUN lieu nommé, AUCUN nom de crew, AUCUN chiffre attribué au joueur, AUCUNE
 * célébration, et ils ne se recentrent JAMAIS sur la ville du joueur. Le rendu
 * pose en plus la chip « Exemple » (`ExampleTag`). L'invariant `fill > 0 ⇒
 * draw === 1` de `loopPhases` verrouille la seule chose qui pourrait mentir en
 * silence : une zone qui se remplirait AVANT la fermeture enseignerait une
 * fausse règle de jeu.
 *
 * Aucune valeur de JEU ici : ce sont des durées de RENDU et des coordonnées de
 * viewBox (`game-rules.ts` régit les règles, pas les millisecondes d'un fondu).
 */

// ═══════════════════════════════════════════════════════════════════════════
// TEMPS — les durées ÉCRITES SUR LES PLANCHES, jamais estimées
// ═══════════════════════════════════════════════════════════════════════════

/** Planche 02 : « la boucle se dessine en 900 ms à l'arrivée ». */
export const LOOP_DRAW_MS = 900;
/** Planche 02 : « PUIS la surface se remplit ». */
export const LOOP_FILL_MS = 600;
/** Fin de l'animation d'entrée de la planche 02. */
export const LOOP_PLAY_MS = LOOP_DRAW_MS + LOOP_FILL_MS;
/** Planche 03 : « la moitié bascule en orange en 600 ms ». */
export const TAKEOVER_MS = 600;

/** Bornes d'un temps, en ms depuis le début de l'animation d'entrée. */
export interface Beat {
  readonly from: number;
  readonly to: number;
}

/** Planche 02 — DEUX temps, dans cet ordre et jamais l'inverse. */
export const LOOP_BEATS = {
  /** Le tracé se dessine le long des rues, jusqu'à revenir à son départ. */
  draw: { from: 0, to: LOOP_DRAW_MS },
  /** La boucle FERMÉE, l'intérieur se remplit — le payoff. */
  fill: { from: LOOP_DRAW_MS, to: LOOP_PLAY_MS },
} as const satisfies Record<string, Beat>;

/** Planche 03 — un seul temps : la moitié droite bascule. */
export const TAKEOVER_BEATS = {
  taken: { from: 0, to: TAKEOVER_MS },
} as const satisfies Record<string, Beat>;

/** Rampe 0→1 d'un temps, bornée. PURE, jamais NaN (beat dégénéré → 1). */
export function rampAt(ms: number, beat: Beat): number {
  if (!Number.isFinite(ms)) return 0;
  if (ms <= beat.from) return 0;
  if (ms >= beat.to) return 1;
  const span = beat.to - beat.from;
  if (!(span > 0)) return 1;
  return (ms - beat.from) / span;
}

/** Accélération douce (départ amorti, arrivée posée). PURE. */
export function easeInOut(x: number): number {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAT À L'INSTANT t
// ═══════════════════════════════════════════════════════════════════════════

/** Planche 02 — ce que le rendu doit peindre à l'instant t. */
export interface LoopPhases {
  /** Part du tracé dessinée (0→1). */
  readonly draw: number;
  /** Opacité de la surface intérieure (0→1). */
  readonly fill: number;
}

/**
 * L'état de la planche 02 à `ms`.
 *
 * INVARIANT DE SENS (testé) : `fill > 0 ⇒ draw === 1`. La règle enseignée est
 * « QUAND ton tracé SE REFERME, la zone devient la tienne » : une surface qui se
 * remplirait avant la fermeture apprendrait exactement l'inverse.
 */
export function loopPhases(ms: number): LoopPhases {
  return {
    draw: easeInOut(rampAt(ms, LOOP_BEATS.draw)),
    fill: rampAt(ms, LOOP_BEATS.fill),
  };
}

/** Planche 03 — ce que le rendu doit peindre à l'instant t. */
export interface TakeoverPhases {
  /** Bascule de la moitié droite en orange (0→1). */
  readonly taken: number;
}

/** L'état de la planche 03 à `ms`. */
export function takeoverPhases(ms: number): TakeoverPhases {
  return { taken: easeInOut(rampAt(ms, TAKEOVER_BEATS.taken)) };
}

/**
 * ÉTAT FINAL LISIBLE — ce que voit un joueur en MOUVEMENT RÉDUIT (a11y). Jamais
 * une animation dégradée, jamais un écran vide : la planche 02 est « déjà fermée
 * et remplie », la planche 03 déjà basculée.
 */
export const LOOP_FINAL: LoopPhases = loopPhases(LOOP_PLAY_MS);
export const TAKEOVER_FINAL: TakeoverPhases = takeoverPhases(TAKEOVER_MS);

// ═══════════════════════════════════════════════════════════════════════════
// GÉOMÉTRIE DES PLATEAUX (viewBox commun 320×300)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le plateau est en 320×300 (viewBox) : c'est l'écran qui le dimensionne (la
 * planche 02 lui donne 58 % de la hauteur). Ces constantes vivent ici pour que
 * les tests vérifient la MÊME géométrie que celle qui est rendue.
 */
export const BOARD_W = 320;
export const BOARD_H = 300;

/**
 * LA GRILLE DE RUES des planches 02/03/04 : « 4 colonnes × 5 lignes, filets très
 * discrets ». Ce n'est PAS une carte : aucune rue réelle, aucun lieu, aucune
 * projection — un décor régulier qui dit « ville » sans rien affirmer sur celle
 * du joueur (les vraies rues projetées de `demoPhases` faisaient croire, à qui
 * les reconnaissait, que le plateau était un quartier précis).
 */
export const GRID_COLS = 4;
export const GRID_ROWS = 5;

export interface GridLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/**
 * Les filets de la grille : `cols` verticaux et `rows` horizontaux, RÉPARTIS
 * dans le plateau sans jamais tomber sur ses bords (une ligne collée au bord se
 * confondrait avec le cadre du plateau).
 */
export function gridLines(
  w: number = BOARD_W,
  h: number = BOARD_H,
  cols: number = GRID_COLS,
  rows: number = GRID_ROWS,
): readonly GridLine[] {
  const lines: GridLine[] = [];
  for (let i = 1; i <= cols; i++) {
    const x = (w * i) / (cols + 1);
    lines.push({ x1: x, y1: 0, x2: x, y2: h });
  }
  for (let j = 1; j <= rows; j++) {
    const y = (h * j) / (rows + 1);
    lines.push({ x1: 0, y1: y, x2: w, y2: y });
  }
  return lines;
}

/** Un sommet de plateau (coordonnées de viewBox, jamais des lat/lng). */
export type Vertex = readonly [number, number];

/** Le `d` d'un polygone FERMÉ (segments droits + `Z`), sans décimale parasite. */
export function closedPathD(points: readonly Vertex[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points as readonly Vertex[];
  const head = `M${first![0]} ${first![1]}`;
  return `${head}${rest.map(([x, y]) => ` L${x} ${y}`).join('')} Z`;
}

/** Périmètre d'un polygone fermé — la longueur du `strokeDasharray` du « draw ». */
export function closedPathLength(points: readonly Vertex[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

// ─── PLANCHE 02 · LA BOUCLE (géométrie RÉCUPÉRÉE de E01Route.tsx) ────────────

/**
 * LE TRACÉ DE LA PLANCHE 02, sommet pour sommet.
 *
 * Repris de `E01Route.tsx` (`git show b5b3e64^`), dans son repère d'origine
 * (viewBox plein écran 375×812) : segments DROITS et angles — un vrai parcours
 * urbain autour de quelques pâtés de maisons, pas une courbe décorative. Il est
 * ramené dans le plateau 320×300 par `LOOP_FIT` ci-dessous, ce qui évite de
 * recalculer les sommets à la main (donc de les faire dériver).
 */
export const LOOP_POINTS: readonly Vertex[] = [
  [95, 495],
  [95, 370],
  [155, 370],
  [155, 285],
  [250, 285],
  [250, 350],
  [300, 350],
  [300, 455],
  [205, 455],
  [205, 495],
];

/** Le `d` de la boucle, dans le repère d'origine. Testé contre E01Route. */
export const LOOP_PATH_D = closedPathD(LOOP_POINTS);
/** Périmètre EXACT (l'ancien 840 de E01Route était annoté « approximatif »). */
export const LOOP_PATH_LEN = closedPathLength(LOOP_POINTS);

/**
 * LES DEUX PASTILLES de la planche, « sur le contour, en bas, côte à côte » :
 * un cercle CREUX (le départ) et un cercle PLEIN (l'arrivée). Toutes deux sur le
 * segment inférieur du tracé (y = 495, de x = 95 à x = 205) — une pastille posée
 * à côté du contour dirait « le départ n'est pas sur le parcours ».
 */
export const LOOP_START: Vertex = [120, 495];
export const LOOP_FINISH: Vertex = [178, 495];

/** Marge du plateau autour du tracé (coordonnées de viewBox). */
export const LOOP_PAD = 28;

/** Boîte englobante d'un nuage de sommets. */
export function bboxOf(points: readonly Vertex[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Transformation SVG `translate(tx,ty) scale(s)` — p ↦ s·p + t. */
export interface FitTransform {
  readonly scale: number;
  readonly tx: number;
  readonly ty: number;
}

/**
 * Recadre un nuage de sommets DANS le plateau, centré, sans le déformer (une
 * seule échelle pour x et y : un parcours étiré n'est plus un parcours).
 */
export function fitToBoard(
  points: readonly Vertex[],
  w: number = BOARD_W,
  h: number = BOARD_H,
  pad: number = LOOP_PAD,
): FitTransform {
  const box = bboxOf(points);
  const availW = w - 2 * pad;
  const availH = h - 2 * pad;
  const scale = Math.min(availW / box.w, availH / box.h);
  return {
    scale,
    tx: pad + (availW - box.w * scale) / 2 - box.x * scale,
    ty: pad + (availH - box.h * scale) / 2 - box.y * scale,
  };
}

/** Le recadrage effectivement rendu par `E02Loop`. */
export const LOOP_FIT: FitTransform = fitToBoard(LOOP_POINTS);

// ─── PLANCHE 03 · LA ZONE COUPÉE EN DEUX ────────────────────────────────────

/**
 * UNE zone, et une seule (planche : « UNE zone : sa MOITIÉ GAUCHE est
 * chartreuse, sa MOITIÉ DROITE bascule en ORANGE »). Bloc urbain à angles
 * droits, lisible en moins de 3 s ; la coupe passe par `RIVALRY_SPLIT_X`.
 */
export const RIVALRY_ZONE: readonly Vertex[] = [
  [46, 66],
  [274, 66],
  [274, 152],
  [232, 152],
  [232, 234],
  [46, 234],
];
export const RIVALRY_ZONE_D = closedPathD(RIVALRY_ZONE);
/** La coupe — au milieu EXACT de la boîte de la zone (46 → 274). */
export const RIVALRY_SPLIT_X = 160;
/**
 * Débord du contour rival à DROITE (planche : « le contour orange déborde
 * légèrement à droite »). C'est ce débord qui dit « ça vient de l'extérieur ».
 */
export const RIVALRY_OVERFLOW = 5;
/** Ancre du mot « REPRIS » — centre de la PARTIE DROITE de la zone. */
export const RIVALRY_LABEL_ANCHOR: Vertex = [217, 116];

// ─── PLANCHE 04 · DEUX TERRITOIRES ADJACENTS ────────────────────────────────

/**
 * « DEUX territoires ADJACENTS qui se touchent […] leur frontière commune est
 * partagée » : deux blocs qui partagent EXACTEMENT le segment x =
 * `CREW_BORDER_X`. Le mien à gauche (chartreuse), l'autre crew à droite.
 */
export const CREW_BORDER_X = 160;
export const CREW_MINE: readonly Vertex[] = [
  [44, 78],
  [CREW_BORDER_X, 78],
  [CREW_BORDER_X, 228],
  [44, 228],
];
export const CREW_OTHER: readonly Vertex[] = [
  [CREW_BORDER_X, 78],
  [276, 78],
  [276, 150],
  [240, 150],
  [240, 228],
  [CREW_BORDER_X, 228],
];
export const CREW_MINE_D = closedPathD(CREW_MINE);
export const CREW_OTHER_D = closedPathD(CREW_OTHER);
/** La frontière COMMUNE, dessinée une fois et partagée par les deux zones. */
export const CREW_BORDER: readonly [Vertex, Vertex] = [
  [CREW_BORDER_X, 78],
  [CREW_BORDER_X, 228],
];

// ─── PLANCHE 05 · LA ZONE FLOUTÉE ───────────────────────────────────────────

/**
 * « un cercle EN POINTILLÉ chartreuse (la zone floutée) avec un POINT PLEIN
 * chartreuse au centre (toi) ». Repère 120×120 : c'est un pictogramme, pas un
 * plateau — il ne porte NI grille, NI chip « Exemple » (il n'illustre aucune
 * capture, donc rien à étiqueter comme exemple).
 */
export const PRIVACY_BOX = 120;
export const PRIVACY_RING_R = 46;
export const PRIVACY_DOT_R = 7;
/** Pointillé du halo : tiret court, grand vide — « approximatif », pas un mur. */
export const PRIVACY_DASH = '3 8';
