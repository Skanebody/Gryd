/**
 * GRYD — E53 : LE CLASSEMENT JOUEURS SE MESURE EN SURFACE (spec §10.1/§10.2).
 *
 * ─── CE QUE CE MODULE EXISTE POUR CORRIGER ───────────────────────────────────
 * Jusqu'au 28/07/2026, `features/social/leagueBoard.ts` lisait `points`
 * (`player_leaderboard`, donc `season_scores`). §10.1 dit « surface contrôlée
 * validée » ; le point est l'axe de PROGRESSION (§10.5, « ne modifie jamais la
 * puissance territoriale »), pas l'axe du classement. Un rang en points est de
 * surcroît OPAQUE : le joueur ne peut pas le relier à ce qu'il voit sur la
 * carte. La migration 0090 rend désormais les MESURES de §10.2 ; ce module fait
 * la seule chose que le serveur ne fait pas — les DÉPARTAGER, et les formater.
 *
 * ─── POURQUOI LE DÉPARTAGE VIT ICI, ET NON EN SQL ────────────────────────────
 * 0082 l'a tranché : « la base fournit les MESURES ; le moteur classe ». Le
 * moteur pur canonique est `packages/engine/src/leaderboard.ts`
 * (`compareLeaderboardEntries` / `rankLeaderboard`), testé en Deno. Metro ne
 * résout pas ses imports Deno `.ts` — même contrainte qu'ailleurs dans l'app
 * (`features/route/walkability.ts`, `features/crew/rules.ts`, `features/daily/
 * zoneFit.ts`) — donc l'ORDRE est reproduit ici, à l'identique, et testé en
 * Deno lui aussi. C'est une duplication ASSUMÉE de ~15 lignes, pas une seconde
 * règle : si §10.2 change, les deux tests tombent ensemble.
 *
 * ─── LE 4ᵉ DÉPARTAGE N'EST PAS APPLIQUÉ, ET C'EST DIT ────────────────────────
 * §10.2 finit par « timestamp du snapshot précédent ». Personne ne prend de
 * snapshot (suspens 1 de la migration 0082, toujours ouvert). Ce module s'arrête
 * donc aux TROIS premiers critères et laisse les joueurs restants EX ÆQUO —
 * l'écran l'écrit en toutes lettres. Départager au hasard de l'ordre Postgres
 * serait exactement le mensonge que la règle 1224 a été posée pour éviter.
 *
 * ─── AUCUN ACHAT N'ENTRE ICI (constitution §3, anti-pay-to-win) ──────────────
 * Les seules valeurs lues sont la surface, les défenses et la conquête. Aucun
 * champ d'inventaire, d'abonnement ou de mise en avant n'existe dans le type
 * d'entrée : un achat ne peut pas déplacer une ligne, et il n'y a pas de porte
 * par laquelle en ajouter une sans changer ce fichier ET son test.
 *
 * Module PUR : aucun import React/RN, aucun accès réseau. Testé en Deno.
 */

/** Mesures §10.2 d'UN joueur, telles que `city_player_surface_board` les rend. */
export interface SurfaceEntry {
  userId: string;
  pseudo: string;
  /** §10.2 critère 1 — surface contrôlée validée, en m² (métrique PRINCIPALE). */
  controlledAreaM2: number;
  /** §10.2 critère 2 — défenses gagnées sur la période. */
  successfulDefenses: number;
  /** §10.2 critère 3 — surface conquise sur la période, en m². */
  conqueredAreaM2: number;
}

/**
 * ORDRE DE §10.2, reproduit à l'identique de `compareLeaderboardEntries` :
 * surface ↓, puis défenses ↓, puis conquête ↓. Retourne 0 pour une VRAIE
 * égalité — le 4ᵉ critère n'étant pas disponible, elle reste une égalité.
 */
export function compareSurfaceEntries(a: SurfaceEntry, b: SurfaceEntry): number {
  if (a.controlledAreaM2 !== b.controlledAreaM2) return b.controlledAreaM2 - a.controlledAreaM2;
  if (a.successfulDefenses !== b.successfulDefenses) {
    return b.successfulDefenses - a.successfulDefenses;
  }
  if (a.conqueredAreaM2 !== b.conqueredAreaM2) return b.conqueredAreaM2 - a.conqueredAreaM2;
  return 0;
}

/**
 * CLÉ D'ÉGALITÉ : deux lignes ne sont ex æquo que si les TROIS mesures
 * coïncident. Sans elle, `withTiedRanks` (qui ne compare que la valeur affichée)
 * marquerait « ex æquo » deux joueurs à surface égale que leurs défenses
 * départagent pourtant — une égalité affirmée à tort est un mensonge, même
 * flatteur.
 */
export function surfaceTieKey(entry: SurfaceEntry): string {
  return `${entry.controlledAreaM2}|${entry.successfulDefenses}|${entry.conqueredAreaM2}`;
}

/**
 * Trie selon §10.2. Ne mute pas l'entrée. L'ordre des VRAIS ex æquo est celui
 * d'arrivée (tri stable en ES2019+) : on ne les réordonne pas, faute de critère.
 */
export function sortSurfaceEntries(entries: readonly SurfaceEntry[]): SurfaceEntry[] {
  return [...entries].sort(compareSurfaceEntries);
}

// ─── UNITÉ ET FORMAT ─────────────────────────────────────────────────────────

/**
 * Conversion d'unité, pas une constante de jeu : 1 km² = 1 000 000 m². Nommée
 * plutôt que semée dans le code (aucun nombre nu), mais elle n'a rien à faire
 * dans `game-rules.ts` — aucune règle de GRYD ne dépend d'elle.
 */
const M2_PER_KM2 = 1_000_000;

/** Au-delà de cette surface, le tableau bascule en km² (lisibilité, pas règle). */
const KM2_READABLE_FROM_M2 = 100_000;

export type SurfaceUnit = 'm2' | 'km2';

/**
 * UNE SEULE UNITÉ POUR TOUT LE TABLEAU, choisie sur la plus GRANDE valeur.
 * Deux raisons, toutes deux d'honnêteté :
 *  · la colonne porte un libellé unique (« km² ») — une unité par ligne rendrait
 *    « 12 » et « 0,4 » incomparables sous la même en-tête ;
 *  · un joueur à 40 000 m² affiché « 0,04 km² » se lit mal, et arrondi à
 *    « 0 km² » il lirait qu'il ne tient RIEN. En m², il lit 40 000.
 * Un tableau vide reste en m² : c'est l'unité de la première capture.
 */
export function surfaceUnitFor(entries: readonly SurfaceEntry[]): SurfaceUnit {
  let max = 0;
  for (const e of entries) if (e.controlledAreaM2 > max) max = e.controlledAreaM2;
  return max >= KM2_READABLE_FROM_M2 ? 'km2' : 'm2';
}

/**
 * Valeur affichée dans l'unité du tableau. `locale` est passée par l'appelant
 * (séparateur décimal : « 0,42 » en français, « 0.42 » en anglais) — ce module
 * reste pur et ne devine aucune langue.
 *
 * En km², DEUX décimales : une seule ferait afficher « 0,0 km² » à un joueur qui
 * tient réellement du terrain, et zéro le ferait disparaître.
 *
 * ── ET DEUX DÉCIMALES NE SUFFISAIENT PAS (28/07/2026) ───────────────────────
 * Deux décimales déplacent le seuil de disparition, elles ne le suppriment pas :
 * TOUT ce qui est sous 5 000 m² s'arrondissait encore à « 0,00 ». Le docblock
 * ci-dessus, celui de `league.ts` et le titre du test affirmaient pourtant tous
 * les trois « une surface réelle ne disparaît JAMAIS derrière un 0 » — une
 * garantie écrite avant que le code la tienne. Or le cas n'est pas théorique :
 * l'unité du tableau bascule en km² dès QU'UN SEUL joueur passe 100 000 m²
 * (`surfaceUnitFor`), et toutes les lignes sous 5 000 m² lisaient alors zéro.
 *
 * D'où le PLANCHER : une surface strictement positive qui n'atteint pas le plus
 * petit montant représentable s'écrit « < 0,01 » — un fait exact (elle est bien
 * inférieure à ce seuil) plutôt qu'un zéro faux. Le « < » se lit dans les cinq
 * langues, il n'a pas à être traduit. Un ZÉRO RÉEL, lui, reste « 0,00 » : c'est
 * un fait, et le confondre avec le plancher serait l'erreur symétrique.
 */
const KM2_DECIMALS = 2;
/** Plus petite valeur que `KM2_DECIMALS` décimales savent écrire : 0,01 km². */
const KM2_SMALLEST_SHOWN = 10 ** -KM2_DECIMALS;

export function formatSurface(areaM2: number, unit: SurfaceUnit, locale: string): string {
  const safe = Number.isFinite(areaM2) && areaM2 > 0 ? areaM2 : 0;
  if (unit === 'km2') {
    const km2 = safe / M2_PER_KM2;
    const digits = { minimumFractionDigits: KM2_DECIMALS, maximumFractionDigits: KM2_DECIMALS };
    // Le plancher ne s'applique QUE si l'arrondi effacerait la surface, c'est-à-
    // dire s'il écrirait « 0,00 ». Entre 0,005 et 0,01 km², l'arrondi normal
    // donne « 0,01 » : c'est déjà honnête, on ne le remplace pas.
    // `safe > 0` d'abord : seul un terrain RÉELLEMENT tenu mérite le plancher.
    const arrondiEfface = Math.round(km2 * 10 ** KM2_DECIMALS) === 0;
    if (safe > 0 && arrondiEfface) {
      return `< ${KM2_SMALLEST_SHOWN.toLocaleString(locale, digits)}`;
    }
    return km2.toLocaleString(locale, digits);
  }
  return Math.round(safe).toLocaleString(locale);
}

/** Libellé court de l'unité — identique dans les 5 langues (symbole SI). */
export function surfaceUnitLabel(unit: SurfaceUnit): string {
  return unit === 'km2' ? 'km²' : 'm²';
}
