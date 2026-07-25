/**
 * GRYD — DÉFIER UN RIVAL : décision d'AFFICHAGE du CTA de défi au résultat (E09).
 *
 * Le serveur (seul juge des vols/reprises) place `rivalReprise` sur la réponse
 * UNIQUEMENT quand un crew rival a réellement REPRIS un secteur du joueur — nom
 * de crew et secteur RÉELS, jamais fabriqués (cf. types.ts rivalReprise, §47).
 * Ce helper ne fait qu'AFFIRMER ce que le serveur a dit : sans signal, il n'y a
 * personne à défier et le CTA disparaît. Une absence n'est pas un mensonge ; un
 * bouton qui mène à un rival inventé en serait un (§A « aucun bouton mort »).
 *
 * Défense en profondeur : on ne propose de défier que si la course est CRÉDITÉE
 * (cohérent avec la dé-escalade §11 — rien d'offensif greffé sur un refus).
 *
 * PUR : type d'entrée structurel (aucun import), Deno-testable — comme
 * pioneerCelebration.ts / finishedTrace.ts.
 */
type RivalInput = {
  readonly rivalReprise?: {
    readonly rivalCrew: string;
    readonly sector: string;
    readonly zonesLost: number;
  };
} | null;

/** Le rival à défier — nom de crew + secteur, jamais une position GPS. */
export interface RivalChallenge {
  rivalCrew: string;
  sector: string;
  zonesLost: number;
}

/**
 * Le rival à défier, ou `null` (aucune reprise serveur, ou course non créditée).
 * `credited` = la course a bien été créditée (ni refusée ni signalée).
 */
export function rivalChallengeFromResult(
  serverResult: RivalInput,
  credited: boolean,
): RivalChallenge | null {
  if (!serverResult || !credited) return null;
  const r = serverResult.rivalReprise;
  if (!r) return null;
  return { rivalCrew: r.rivalCrew, sector: r.sector, zonesLost: r.zonesLost };
}
