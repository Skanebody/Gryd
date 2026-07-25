/**
 * GRYD — « PROCHAINE MISSION » sur le Profil : la MACHINE À ÉTATS de la ligne, PURE.
 *
 * POURQUOI CE FICHIER EXISTE (25/07/2026, décision fondateur). Le recalage du
 * Profil sur la planche E15 avait RETIRÉ la ligne « Prochaine mission » — or
 * c'était le SEUL rappel de mission hors de la Carte. Elle revient, mais en
 * PREVIEW SCANNABLE (une ligne, un chevron, l'action au bout), jamais en second
 * CTA chartreuse : le Profil n'en porte plus qu'un seul, la PREMIÈRE MISSION du
 * compte neuf (§A.4), et GO est déjà chartreuse en permanence dans la nav.
 *
 * Ce qui se décide ici est le POINT DE MENSONGE POSSIBLE, donc il est pur et
 * testé : `useRealMission` REPLIE plusieurs situations sur `mission: null`
 * (pas de session, échec de lecture, rejet réseau) et démarre à
 * `{ mission: null, loading: false }` AVANT que son effet ait tenté quoi que ce
 * soit. Lire ce `null` naïvement afficherait « lecture impossible » au tout
 * premier rendu, alors que RIEN n'a encore été tenté — un échec inventé est un
 * mensonge au même titre qu'une donnée inventée.
 *
 * Les quatre états se lisent donc DIFFÉREMMENT sur l'écran :
 *  · pas de compte / lecture des chiffres en cours / échec des chiffres →
 *    `gameReady` est faux : la ligne N'EXISTE PAS, et les blocs d'état de
 *    l'écran (pas de compte · échec · chargement) portent déjà cette vérité ;
 *  · lecture de la mission en cours → `loading` : ligne d'état, bornée ;
 *  · lecture tentée et revenue vide → `unavailable` : ligne d'état distincte ;
 *  · aucune zone (`first_capture`) → RIEN : le bloc PREMIÈRE MISSION le dit déjà,
 *    le répéter serait un doublon (§A « 1 écran = 1 décision »).
 */
import type { RealMission } from '../mission/deriveMission';

/** Ce que la ligne du Profil a le droit d'afficher — rien d'autre. */
export type NextMissionRow =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'defend'; hoursLeft: number; distanceM: number | null }
  | { kind: 'expand'; distanceM: number | null };

export interface NextMissionRowInput {
  /** `gameReady` de l'écran : compte relié ET lu, sans échec ni lecture en vol. */
  gameReady: boolean;
  /** L'écran affiche DÉJÀ le bloc PREMIÈRE MISSION (compte sans aucune zone).
   *  Les deux sources (hex_claims classés vs hex_claims bruts) peuvent diverger
   *  d'une zone expirée : sans ce garde-fou, l'écran dirait « prends ta première
   *  zone » ET « agrandis ton territoire » — deux vérités contradictoires. */
  firstMissionShown: boolean;
  /** `loading` de useRealMission (la 1re résolution réelle n'a pas abouti). */
  loading: boolean;
  /** true dès qu'une lecture a été VUE démarrer. Sans ce témoin, impossible de
   *  distinguer « pas encore tenté » (état initial du hook) de « tenté, vide ». */
  readStarted: boolean;
  /** `mission` de useRealMission — jamais fabriquée, `null` si rien d'honnête. */
  mission: RealMission | null;
}

/** LA décision d'affichage. PURE, déterministe, une seule sortie. */
export function nextMissionRow(input: NextMissionRowInput): NextMissionRow {
  const { gameReady, firstMissionShown, loading, readStarted, mission } = input;

  // L'écran parle déjà (pas de compte / échec / chargement des chiffres, ou
  // bloc PREMIÈRE MISSION) : une seconde voix sur le même sujet brouillerait.
  if (!gameReady || firstMissionShown) return { kind: 'hidden' };

  if (loading) return { kind: 'loading' };

  // `null` APRÈS une lecture réellement partie = échec (le hook retombe
  // silencieusement dessus). `null` AVANT = on ne sait encore rien : on se tait.
  if (mission === null) return readStarted ? { kind: 'unavailable' } : { kind: 'hidden' };

  if (mission.kind === 'defend_expiring') {
    return { kind: 'defend', hoursLeft: mission.hoursLeft, distanceM: mission.distanceM };
  }
  if (mission.kind === 'expand') {
    return { kind: 'expand', distanceM: mission.distanceM };
  }
  // `first_capture` : le compte n'a aucune zone. Le bloc PREMIÈRE MISSION de
  // l'écran porte déjà ce cas (avec l'unique CTA) — on ne le double pas.
  return { kind: 'hidden' };
}
