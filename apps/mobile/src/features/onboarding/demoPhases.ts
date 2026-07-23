/**
 * GRYD — MICRO-DÉMONSTRATION D'ONBOARDING : géométrie et timeline PURES.
 *
 * ─── POURQUOI CE MODULE EXISTE ──────────────────────────────────────────────
 * Même raison que `logoRoute.ts`, et elle a déjà été payée trois fois : dans
 * l'aperçu headless `document.visibilityState` vaut "hidden", donc
 * `requestAnimationFrame` produit ZÉRO image par seconde et TOUTE animation
 * pilotée en JS y paraît figée. Une capture d'écran ne prouve donc RIEN sur une
 * animation. Ce qui est prouvable sans écran l'est ici : les bornes de la
 * démonstration, l'ordre des temps, les invariants de sens (« rien n'est pris
 * avant que la boucle soit fermée »), et la géométrie du plateau. Le composant
 * (`visuals.tsx`) ne fait plus que RENDRE l'état renvoyé à l'instant t.
 *
 * Zéro import React / react-native : testable par `npm run test:map` (Deno).
 *
 * ─── LE STORYBOARD (demande fondateur, ~3 s en boucle) ──────────────────────
 * Carte 1 — MÉCANIQUE : la trace apparaît progressivement (0-0,8 s) → la boucle
 * se ferme (0,8-1,5 s) → l'intérieur se remplit en chartreuse (1,5-2,1 s) → un
 * label bref apparaît (2,1-3 s). Elle doit se comprendre SANS lire le texte.
 * Carte 2 — RIVALITÉ : ma zone est établie (0-0,8) → une pression rivale arrive
 * (0,8-1,5) → la zone bascule en CONTESTÉE (1,5-2,1) → label bref (2,1-3).
 *
 * `draw` couvre TOUT le tracé (0→1500 ms) et `close` n'en marque que la
 * fermeture (800→1500) : c'est le même geste, pas deux traits — le second temps
 * est une emphase (le point de départ redevient point d'arrivée), pas un
 * nouveau dessin.
 *
 * ─── HONNÊTETÉ (CLAUDE.md « l'app ne ment jamais ») ─────────────────────────
 * Ce plateau ILLUSTRE une règle, il n'affiche aucun état du monde : géométries
 * réelles (le tracé doit être crédible) mais AUCUN nom de lieu, AUCUN nom de
 * crew, AUCUN chiffre attribué au joueur, AUCUNE célébration. Les invariants de
 * `capturePhases` verrouillent la seule chose qui pourrait mentir en silence :
 * une zone qui se remplirait avant que la boucle soit fermée apprendrait une
 * fausse règle. Le rendu porte en plus la chip « Exemple » (visuals.tsx).
 *
 * Aucune valeur de JEU ici : ce sont des durées de RENDU (game-rules.ts régit
 * les règles, pas les millisecondes d'une animation).
 */
import { fitTracesToBox } from '../map/projectTrace';
import {
  AVENUE_DE_LA_REPUBLIQUE,
  BOUCLE_PLACE_REPUBLIQUE,
  BOUCLE_REPUBLIQUE,
  BOULEVARD_VOLTAIRE,
  QUAI_VALMY,
  type LatLngPoint,
} from '../map/realAnchors';

// ═══════════════════════════════════════════════════════════════════════════
// TEMPS
// ═══════════════════════════════════════════════════════════════════════════

/** Durée d'une démonstration complète (les 4 temps du storyboard). */
export const DEMO_PLAY_MS = 3000;
/**
 * Tenue de l'état final avant relance : la démonstration doit être LUE, pas
 * regardée défiler. Sans cette tenue, la boucle repart à l'instant précis où le
 * joueur comprend ce qu'il vient de voir.
 */
export const DEMO_HOLD_MS = 1100;
/** Cycle complet (démonstration + tenue) — la durée de la timing bouclée. */
export const DEMO_CYCLE_MS = DEMO_PLAY_MS + DEMO_HOLD_MS;

/** Bornes d'un temps de la démonstration, en ms depuis le début du cycle. */
export interface Beat {
  readonly from: number;
  readonly to: number;
}

/** Carte 1 — MÉCANIQUE (verbatim du storyboard fondateur). */
export const CAPTURE_BEATS = {
  /** La trace se dessine, jusqu'à revenir à son point de départ. */
  draw: { from: 0, to: 1500 },
  /** La FERMETURE de la boucle (emphase du dernier tiers du tracé). */
  close: { from: 800, to: 1500 },
  /** L'intérieur bascule en chartreuse — le payoff. */
  fill: { from: 1500, to: 2100 },
  /** Le label bref, une fois la zone prise. */
  label: { from: 2100, to: 3000 },
} as const satisfies Record<string, Beat>;

/** Carte 2 — RIVALITÉ (même grammaire : les deux cartes se lisent pareil). */
export const RIVALRY_BEATS = {
  /** Ma zone est établie (chartreuse) — l'état acquis à la carte 1. */
  mine: { from: 0, to: 800 },
  /** La pression rivale arrive (orange). */
  threat: { from: 800, to: 1500 },
  /** Ma zone bascule en CONTESTÉE (violet, double contour). */
  contested: { from: 1500, to: 2100 },
  /** Le label bref. */
  label: { from: 2100, to: 3000 },
} as const satisfies Record<string, Beat>;

/** Rampe 0→1 d'un temps, bornée. PURE, jamais NaN (beat dégénéré → 0/1). */
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

/**
 * Position dans la démonstration (en ms) à partir de la valeur brute 0→1 d'UNE
 * timing linéaire bouclée.
 *
 * ⚠ Pourquoi pas une `Animated.sequence` bouclée, qui serait la forme naturelle
 * d'un storyboard à 4 temps : sur react-native-web, `Animated.loop` d'une
 * séquence NE DÉMARRE PAS — mesuré sur 6 s le 21/07/2026, le tracé restait figé
 * à 0 (cf. `logoRoute.ts`). Le seul chemin solide sur les deux cibles est une
 * timing linéaire unique ; la tenue de fin se calcule donc ICI, au rendu.
 */
export function demoElapsedMs(
  raw: number,
  playMs: number = DEMO_PLAY_MS,
  holdMs: number = DEMO_HOLD_MS,
): number {
  if (!(playMs > 0)) return 0;
  const hold = holdMs > 0 ? holdMs : 0;
  const clamped = !Number.isFinite(raw) ? 0 : raw < 0 ? 0 : raw > 1 ? 1 : raw;
  return Math.min(playMs, clamped * (playMs + hold));
}

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAT À L'INSTANT t
// ═══════════════════════════════════════════════════════════════════════════

/** Carte 1 — ce que le rendu doit peindre à l'instant t. */
export interface CapturePhases {
  /** Part du tracé dessinée (0→1). */
  readonly draw: number;
  /** Fermeture de la boucle : marque le point départ = arrivée (0→1). */
  readonly close: number;
  /** Opacité de la zone conquise (0→1). */
  readonly fill: number;
  /** Opacité du label bref (0→1). */
  readonly label: number;
  /** Repère de position visible : uniquement PENDANT la course. */
  readonly head: boolean;
}

/**
 * L'état de la carte MÉCANIQUE à `ms`.
 *
 * INVARIANT DE SENS (testé) : `fill > 0 ⇒ draw === 1`. Une zone qui se
 * remplirait avant la fermeture enseignerait une règle fausse — c'est le seul
 * mensonge que cette illustration pourrait commettre, il est verrouillé ici.
 */
export function capturePhases(ms: number): CapturePhases {
  const draw = easeInOut(rampAt(ms, CAPTURE_BEATS.draw));
  return {
    draw,
    close: rampAt(ms, CAPTURE_BEATS.close),
    fill: rampAt(ms, CAPTURE_BEATS.fill),
    label: rampAt(ms, CAPTURE_BEATS.label),
    head: draw > 0 && draw < 1,
  };
}

/** Carte 2 — ce que le rendu doit peindre à l'instant t. */
export interface RivalryPhases {
  /** Ma zone, établie (0→1). */
  readonly mine: number;
  /** Pression rivale : la zone d'à côté monte en puissance (0→1). */
  readonly threat: number;
  /** Bascule en contestée : violet + double contour (0→1). */
  readonly contested: number;
  /** Opacité du label bref (0→1). */
  readonly label: number;
}

/**
 * L'état de la carte RIVALITÉ à `ms`.
 *
 * INVARIANTS DE SENS (testés) : `threat > 0 ⇒ mine === 1` (on ne peut menacer
 * qu'une zone déjà tenue) et `contested > 0 ⇒ threat === 1` (une zone ne
 * devient contestée qu'après l'arrivée d'un rival). C'est la règle de jeu que
 * l'image enseigne ; si l'ordre se brisait, l'image mentirait.
 */
export function rivalryPhases(ms: number): RivalryPhases {
  return {
    mine: rampAt(ms, RIVALRY_BEATS.mine),
    threat: easeInOut(rampAt(ms, RIVALRY_BEATS.threat)),
    contested: rampAt(ms, RIVALRY_BEATS.contested),
    label: rampAt(ms, RIVALRY_BEATS.label),
  };
}

/** État FINAL lisible — ce que voit un joueur en « mouvement réduit » (a11y). */
export const CAPTURE_FINAL: CapturePhases = capturePhases(DEMO_PLAY_MS);
export const RIVALRY_FINAL: RivalryPhases = rivalryPhases(DEMO_PLAY_MS);

// ═══════════════════════════════════════════════════════════════════════════
// GÉOMÉTRIE DU PLATEAU (vraies rues, vraies boucles — jamais un blob)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le plateau est en 320×300 (viewBox) : c'est le composant qui le dimensionne à
 * l'écran (~35-40 % de la hauteur, demande fondateur). Ces constantes sont ici
 * pour que les tests vérifient la MÊME projection que celle qui est rendue.
 */
export const DEMO_BOARD_W = 320;
export const DEMO_BOARD_H = 300;

/** Rues hôtes RÉELLES — décor, jamais un état de jeu, jamais nommées à l'écran. */
export const DEMO_STREETS: readonly (readonly LatLngPoint[])[] = [
  AVENUE_DE_LA_REPUBLIQUE,
  QUAI_VALMY,
  BOULEVARD_VOLTAIRE,
];

/** La boucle héros : une VRAIE boucle de course, qui se referme sur son départ. */
export const CAPTURE_LOOP: readonly LatLngPoint[] = BOUCLE_REPUBLIQUE;

/**
 * La zone d'à côté, sur la carte RIVALITÉ. Choisie ADJACENTE (et non à l'autre
 * bout de la ville) pour deux raisons : à cette échelle les deux zones tiennent
 * dans le plateau sans que la mienne devienne un timbre-poste, et « la zone d'à
 * côté peut me reprendre » se lit sans légende. Aucune des deux n'est nommée.
 */
export const RIVAL_LOOP: readonly LatLngPoint[] = BOUCLE_PLACE_REPUBLIQUE;

/** Projection carte 1 : la boucle héros seule, cadrée large (les rues débordent). */
export const CAPTURE_PROJ = fitTracesToBox([CAPTURE_LOOP], DEMO_BOARD_W, DEMO_BOARD_H, 26);

/** Projection carte 2 : les DEUX zones, à leur vraie position relative. */
export const RIVALRY_PROJ = fitTracesToBox(
  [CAPTURE_LOOP, RIVAL_LOOP],
  DEMO_BOARD_W,
  DEMO_BOARD_H,
  22,
);
