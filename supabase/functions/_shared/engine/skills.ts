// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/skills.ts

/**
 * GRYD — engine/skills.ts (AMENDEMENT-23 §C). Dérivation PURE des skills :
 * stats joueur → niveau atteint (0/I/II/III) par famille + progression vers le
 * suivant. Aucune I/O, aucune horloge. MÊME source de stats que les badges
 * (LifetimeStats, engine/badges.ts) — AUCUN barème parallèle, AUCUN nombre
 * magique ici (les seuils viennent du catalogue passé en argument).
 *
 * ANTI PAY-TO-WIN : la dérivation ne produit qu'un NIVEAU indicatif (rôle,
 * reco mission) — jamais de territoire/points. Elle ne touche à rien de décidé
 * serveur.
 *
 * Pourquoi le catalogue est PASSÉ EN ARGUMENT (et non importé de
 * `@klaim/shared/skills`) : la copie Deno générée (_shared/engine/skills.ts,
 * sync-game-rules.mjs) ne sait réécrire que les imports `@klaim/shared/{badges,
 * bonuses,game-rules,types}`. Pour rester Deno-safe SANS toucher au script de
 * sync ni au drift test, l'engine dépend d'une INTERFACE STRUCTURELLE locale
 * (`DerivableSkill`), que `SkillDef` (shared) satisfait. Le client appelle
 * `deriveSkills(stats, SKILLS)`. Le type des stats est le MÊME que les badges.
 */
import type { LifetimeStats } from './badges.ts';

/**
 * Clé de stat lisible par la dérivation : un compteur numérique de
 * LifetimeStats. (Les champs de suivi interne — dates, streak en cours — ne
 * sont jamais des `metric` de skill, cf. catalogue shared `SkillMetric`.)
 */
export type SkillStatKey = {
  [K in keyof LifetimeStats]: LifetimeStats[K] extends number ? K : never;
}[keyof LifetimeStats];

/** Un palier de niveau minimal requis par la dérivation. */
export interface DerivableSkillLevel {
  level: 1 | 2 | 3;
  threshold: number;
}

/**
 * Contrat MINIMAL qu'une famille de skill doit exposer pour être dérivée.
 * `SkillDef` (packages/shared/src/skills.ts) le satisfait structurellement
 * (mêmes champs `id`/`metric`/`levels[].{level,threshold}`), d'où l'absence
 * d'import cross-package côté Deno.
 */
export interface DerivableSkill {
  /** Identifiant stable de la famille. */
  id: string;
  /** Compteur de stat réutilisé (doit être une clé numérique de LifetimeStats). */
  metric: SkillStatKey;
  /** Les 3 paliers I/II/III, seuils croissants. */
  levels: readonly [DerivableSkillLevel, DerivableSkillLevel, DerivableSkillLevel];
}

/** Rang de niveau atteint : 0 = verrouillé, 1 = I, 2 = II, 3 = III. */
export type DerivedLevelRank = 0 | 1 | 2 | 3;

/** État dérivé d'UNE famille de skill pour un joueur donné. */
export interface DerivedSkill {
  /** Identifiant de la famille (miroir de l'entrée du catalogue). */
  id: string;
  /** Compteur évalué (clé LifetimeStats). */
  metric: SkillStatKey;
  /** Valeur courante du compteur (bornée à 0). */
  value: number;
  /** Niveau atteint : 0 (verrouillé) … 3 (III). */
  level: DerivedLevelRank;
  /** true si le niveau max (III) est atteint. */
  maxed: boolean;
  /** Seuil DÉJÀ franchi du niveau courant (0 si aucun niveau atteint). */
  currentThreshold: number;
  /**
   * Seuil du PROCHAIN niveau, ou null si déjà au max. Sert au libellé
   * « X restants » de la reco War Room et à la jauge du Profil.
   */
  nextThreshold: number | null;
  /**
   * Progression [0..1] à l'INTÉRIEUR du niveau courant vers le suivant
   * (0 tout juste après un palier, →1 juste avant le suivant). Vaut 1 quand
   * `maxed`. Progression LINÉAIRE entre `currentThreshold` et `nextThreshold`.
   */
  progress: number;
  /** Reste à parcourir vers le prochain niveau (0 si `maxed`). */
  remaining: number;
}

/**
 * Niveau atteint pour une valeur de compteur et 3 seuils croissants : nombre
 * de seuils `<= value`. PURE. Robuste à des seuils non triés (on compte les
 * franchissements réels). Ex. value 50, seuils [10,50,150] → 2 (niveau II).
 */
function reachedLevel(
  value: number,
  levels: readonly DerivableSkillLevel[],
): DerivedLevelRank {
  let reached = 0;
  for (const l of levels) if (value >= l.threshold) reached += 1;
  return Math.min(reached, 3) as DerivedLevelRank;
}

/**
 * Dérive l'état d'UNE famille de skill à partir des stats (PURE). Réutilise
 * directement `stats[skill.metric]` (le compteur badge). La progression est
 * calculée entre le seuil courant et le seuil suivant ; au niveau 0 elle part
 * de 0 (pas de « seuil précédent » sous le premier palier).
 */
export function deriveSkill(stats: LifetimeStats, skill: DerivableSkill): DerivedSkill {
  const raw = stats[skill.metric];
  const value = Math.max(0, typeof raw === 'number' ? raw : 0);

  // Paliers triés par seuil croissant (défensif : on ne suppose pas l'ordre).
  const sorted = [...skill.levels].sort((a, b) => a.threshold - b.threshold);
  const level = reachedLevel(value, sorted);
  const maxed = level >= 3;

  const currentThreshold = level > 0 ? sorted[level - 1]!.threshold : 0;
  const nextThreshold = maxed ? null : sorted[level]!.threshold;

  let progress: number;
  let remaining: number;
  if (nextThreshold === null) {
    progress = 1;
    remaining = 0;
  } else {
    const span = nextThreshold - currentThreshold;
    remaining = Math.max(0, nextThreshold - value);
    // span > 0 garanti si seuils strictement croissants ; garde-fou sinon.
    progress = span > 0 ? Math.min(1, Math.max(0, (value - currentThreshold) / span)) : 0;
  }

  return {
    id: skill.id,
    metric: skill.metric,
    value,
    level,
    maxed,
    currentThreshold,
    nextThreshold,
    progress,
    remaining,
  };
}

/**
 * Dérive TOUTES les familles du catalogue pour un joueur (PURE). Conserve
 * l'ordre du catalogue fourni (le shared expose `SKILLS` déjà ordonné §28).
 * L'appelant (Profil / reco War Room) passe `SKILLS` de @klaim/shared/skills.
 */
export function deriveSkills(
  stats: LifetimeStats,
  catalogue: readonly DerivableSkill[],
): DerivedSkill[] {
  return catalogue.map((skill) => deriveSkill(stats, skill));
}

/**
 * Skills classés pour une RECO de mission : ceux dont le niveau atteint est le
 * plus élevé d'abord, puis la progression vers le suivant la plus avancée (le
 * joueur « presque au niveau suivant » est un bon candidat), puis l'ordre du
 * catalogue. PURE, ne filtre rien — l'UI décide combien en afficher.
 * Ex. War Room : « KORO recommandé · Finisher II · 620 m restants ».
 */
export function rankSkillsForRecommendation(derived: readonly DerivedSkill[]): DerivedSkill[] {
  return derived
    .map((d, i) => ({ d, i }))
    .sort((a, b) =>
      b.d.level - a.d.level ||
      b.d.progress - a.d.progress ||
      a.i - b.i
    )
    .map(({ d }) => d);
}
