/**
 * GRYD — dérivation du MODE du bouton central contextuel (AMENDEMENT-08 §3,
 * doc §8). L'état est DÉRIVÉ des données démo déterministes, jamais saisi :
 *   RAID    offensive crew active (warroom/demo OFFENSIVE)
 *   DEFEND  hexes en decay urgent sur la Battle Map
 *   CAPTURE zone neutre objectif proche
 *   RUN     sinon (run libre)
 * (SCOUT = mission exploration, branché quand les missions scout existeront.)
 * Le serveur décide toujours du territoire — ce mode n'est qu'une lecture UI.
 */
import type { RunButtonMode } from '../../ui/game';
import { battleMapData, battleMapSummary, type BattleMapSummary } from '../map/fakeHexes';
import { OFFENSIVE } from '../warroom/demo';

export interface BattleContext {
  mode: RunButtonMode;
  summary: BattleMapSummary;
}

let cached: BattleContext | null = null;

/** Contexte de bataille partagé bouton central / HUD carte (calculé une fois — démo). */
export function battleContext(): BattleContext {
  if (cached) return cached;
  const summary = battleMapSummary(battleMapData().collection);
  const offensiveActive =
    OFFENSIVE.remainingS > 0 && OFFENSIVE.hexesTaken < OFFENSIVE.objectiveHexes;
  const mode: RunButtonMode = offensiveActive
    ? 'RAID'
    : summary.decayUrgent > 0
      ? 'DEFEND'
      : summary.objectiveHexes > 0
        ? 'CAPTURE'
        : 'RUN';
  cached = { mode, summary };
  return cached;
}

export function deriveRunButtonMode(): RunButtonMode {
  return battleContext().mode;
}
