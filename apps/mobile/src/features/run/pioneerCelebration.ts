/**
 * GRYD — PIONNIER de commune : décision d'AFFICHAGE de la célébration au résultat.
 *
 * Le serveur (seul juge) place `communeOpened` sur la réponse UNIQUEMENT quand la
 * course a réellement OUVERT une commune vierge — course claimable, point de
 * départ hors de toute zone, nom RÉEL issu de geo.api.gouv.fr (jamais fabriqué,
 * cf. types.ts communeOpened). C'est la seule récompense qui vaut PLUS quand la
 * ville est vide : « tu es le premier runner de GRYD ici ».
 *
 * Ce helper ne fait qu'AFFIRMER ce que le serveur a dit — jamais une célébration
 * déduite d'une carte localement vide. Défense en profondeur : on n'affiche le
 * pionnier que si la course est CRÉDITÉE (cohérent avec la dé-escalade §11 — rien
 * de festif sur un refus/signalement), même si le serveur omet déjà communeOpened
 * dans ces cas.
 *
 * PUR : type d'entrée structurel (aucun import), Deno-testable — comme
 * finishedTrace.ts / runResult.ts.
 */
type PioneerInput = { readonly communeOpened?: { readonly insee: string; readonly nom: string } } | null;

/**
 * La commune ouverte à célébrer, ou `null` (aucune ouverture, ou course non
 * créditée). `credited` = la course a bien été créditée (ni refusée ni signalée).
 */
export function pioneerCelebration(
  serverResult: PioneerInput,
  credited: boolean,
): { insee: string; nom: string } | null {
  if (!serverResult || !credited) return null;
  const opened = serverResult.communeOpened;
  return opened ? { insee: opened.insee, nom: opened.nom } : null;
}
