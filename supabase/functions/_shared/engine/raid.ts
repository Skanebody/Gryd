// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/raid.ts

/**
 * GRYD — engine/raid.ts
 * AMENDEMENT-34 §DELTA-CLASH — RAID crew (emprunt Clash of Clans → GRYD).
 *
 * SOURCE = le doc « Clash → GRYD » du fondateur : un RAID est une OFFENSIVE
 * COLLECTIVE à fenêtre courte (façon Clan War / Raid Weekend) dont la
 * progression est une jauge de zones prises pendant la fenêtre. Ici, PUREMENT :
 * timestamps + jauge → statut nommé, et progression bornée 0..1.
 *
 * Fonctions PURES : aucune I/O, aucune horloge implicite — l'appelant fournit
 * `now`. AUCUN nombre magique (RAID_DURATION_HOURS / RAID_DEMO_TARGET_ZONES sont
 * gelés dans @klaim/shared/game-rules).
 *
 * ANTI PAY-TO-WIN STRICT : un raid ne DONNE ni territoire bonus, ni point, ni
 * vitesse, ni protection — il met en scène, dans le temps, la conquête que le
 * crew fait de toute façon. Ce module ne calcule qu'un STATUT et un POURCENTAGE
 * d'affichage.
 *
 * Cycle de vie d'un raid :
 *   complete   dès que progress ≥ target (prime, MÊME après l'échéance : la
 *              cible atteinte est un succès quoi qu'il arrive) ;
 *   active     avant l'échéance (now < endsAt) et cible non atteinte ;
 *   expired    échéance dépassée (now ≥ endsAt) sans cible atteinte.
 */

/** Statut nommé d'un raid crew. Union stable pour l'UI/explicabilité. */
export type RaidStatus = 'active' | 'complete' | 'expired';

/**
 * État d'un raid à évaluer. Timestamps absolus (Date) — `now` fourni par
 * l'appelant, jamais lu ici. `progress`/`target` en zones (unité de la jauge).
 */
export interface RaidState {
  /** Horloge fournie par l'appelant (pas de Date.now() dans le moteur). */
  now: Date;
  /** Échéance de fin de la fenêtre de raid (départ + RAID_DURATION_HOURS). */
  endsAt: Date;
  /** Zones déjà prises pendant la fenêtre (jauge, ≥ 0 attendu). */
  progress: number;
  /** Cible de zones à prendre (ex. RAID_DEMO_TARGET_ZONES en démo). */
  target: number;
}

/**
 * Statut d'un raid (AMENDEMENT-34). PURE.
 *  - `complete` si progress ≥ target (cible > 0) — prime sur l'échéance ;
 *  - sinon `active` tant que now < endsAt ;
 *  - sinon `expired`.
 * Garde-fou : une cible ≤ 0 n'est jamais « atteignable » par ce raccourci
 * (aucun objectif réel) → on retombe sur active/expired selon l'échéance.
 */
export function raidStatus(state: RaidState): RaidStatus {
  const { now, endsAt, progress, target } = state;
  if (target > 0 && progress >= target) return 'complete';
  return now.getTime() < endsAt.getTime() ? 'active' : 'expired';
}

/**
 * Progression d'un raid en fraction [0, 1] (AMENDEMENT-34). PURE. `progress /
 * target`, bornée : jamais < 0 (progression négative → 0), jamais > 1 (au-delà
 * de la cible → 1, la jauge d'affichage sature). Cible ≤ 0 → 0 (pas de division,
 * aucune cible réelle à remplir).
 */
export function raidProgressPct(progress: number, target: number): number {
  if (target <= 0) return 0;
  const pct = progress / target;
  if (pct < 0) return 0;
  if (pct > 1) return 1;
  return pct;
}
