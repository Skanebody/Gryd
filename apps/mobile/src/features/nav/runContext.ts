/**
 * GRYD — dérivation de l'OBJECTIF du bouton central contextuel (AMENDEMENT-12
 * §A — 2 objectifs joueur, plus jamais RUN/RAID/CAPTURE/SCOUT). L'état est
 * DÉRIVÉ des données démo déterministes, jamais saisi :
 *   DEFENDRE   zones en decay urgent sur la Battle Map OU mission défense
 *              active (warroom/demo DEFENSE_MISSION)
 *   CONQUERIR  sinon (défaut — absorbe capture, raid et exploration)
 * Le serveur décide toujours du territoire — cet objectif n'est qu'une
 * lecture UI ; les barèmes serveur restent inchangés.
 */
import type { RunButtonMode } from '../../ui/game';
import { battleMapData, battleMapSummary, type BattleMapSummary } from '../map/fakeHexes';
import { DEFENSE_MISSION } from '../warroom/demo';

export interface BattleContext {
  mode: RunButtonMode;
  summary: BattleMapSummary;
}

let cached: BattleContext | null = null;

/** Contexte de bataille partagé bouton central / HUD carte (calculé une fois — démo). */
export function battleContext(): BattleContext {
  if (cached) return cached;
  const summary = battleMapSummary(battleMapData().collection);
  const defenseMissionActive = DEFENSE_MISSION.expiresInH > 0;
  const mode: RunButtonMode =
    summary.decayUrgent > 0 || defenseMissionActive ? 'DEFENDRE' : 'CONQUERIR';
  cached = { mode, summary };
  return cached;
}

export function deriveRunButtonMode(): RunButtonMode {
  return battleContext().mode;
}
