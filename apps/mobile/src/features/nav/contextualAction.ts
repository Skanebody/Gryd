/**
 * GRYD — DÉRIVATION de l'ACTION contextuelle du bouton CENTRAL de la barre
 * d'onglets (AMENDEMENT-29).
 *
 * « Navigation = où je vais. Bouton principal = ce que je fais MAINTENANT. »
 * Un SEUL bouton chartreuse, au centre de la barre et présent sur TOUS les
 * onglets, dont le LIBELLÉ + l'INTENTION + la CIBLE changent selon le contexte
 * de jeu. Ce module est PUR (aucun rendu, aucun hook d'état interne) : il lit
 * les mêmes sources DÉMO déterministes que le reste de l'app (battleContext /
 * MISSIONS / frontières partielles) et rend l'action à afficher. Le défaut est
 * TOUJOURS **RUN** (course libre) — jamais « GO » (retiré définitivement,
 * AMENDEMENT-29 : toujours un VERBE qui dit POURQUOI tu cours).
 *
 * Le bouton porte l'INTENTION CLIENT (conquest / defense / complete) vers
 * `/course-live` — 100 % client, jamais envoyée au serveur (le tracé décide, le
 * serveur tranche ; cf. run/intention.ts). L'ordre de priorité suit les Règles
 * §C (1 run en cours > mission > défendre > boucle à terminer > rival) adapté à
 * ce que ce bouton peut lancer : TERMINER (frontière crew presque fermée) prime
 * DÉFENDRE (zone attaquée) prime CONQUÉRIR prime RUN.
 *
 * NB : au MVP il n'existe pas encore de VRAIE sélection live de zone/mission
 * (les stores sont démo déterministes). On dérive donc le contexte de l'écran
 * courant : sur la Carte (`/`) → le contexte de la Battle Map (attaque ⇒
 * DÉFENDRE) ; sur Missions (`/warroom`) → la mission urgente (frontière ⇒
 * TERMINER, sinon défense ⇒ DÉFENDRE) ; sur Crew / Saison / Moi → RUN libre
 * (aucun contexte de jeu à lire). Quand la vraie sélection existera
 * (territoryStatus live), il suffira de la passer dans `ContextInput`.
 */
import { battleContext, goHref, intentionHref } from './runContext';
import {
  PARTIAL_BOUNDARIES_DEMO,
  type PartialBoundaryDemo,
} from '../run/intention';
import { MISSIONS, OPEN_BOUNDARIES } from '../warroom/demo';
import type { IconName } from '@klaim/shared';

/**
 * Les 5 verbes possibles du bouton central (JAMAIS « GO »). Chacun = une intention de
 * course distincte, portée telle quelle vers le live.
 *   run       course LIBRE (aucune sélection) — GRYD classe après coup.
 *   defendre  zone attaquée sélectionnée — mission défense + route conseillée.
 *   conquerir zone neutre / rivale sélectionnée — course de conquête.
 *   terminer  boucle crew presque fermée — course pour refermer la frontière.
 *   rejoindre mission crew ouverte — rejoint la course du crew.
 */
export type ContextualActionKind =
  | 'run'
  | 'defendre'
  | 'conquerir'
  | 'terminer'
  | 'rejoindre';

/**
 * L'action résolue que le bouton affiche et lance. `label` = le VERBE court
 * (jamais tronqué, jamais « GO ») ; `icon` = picto propriétaire (charte §10 :
 * CTA principal = icône + texte) ; `intention` = teinte CLIENT du live
 * (null = run libre) ; `targetHref` = destination expo-router au tap.
 */
export interface ContextualAction {
  kind: ContextualActionKind;
  /** VERBE court affiché sur le bouton (RUN / DÉFENDRE / CONQUÉRIR / …). */
  label: string;
  /** Icône propriétaire à gauche du libellé (déjà un IconName @klaim/shared). */
  icon: IconName;
  /**
   * Intention CLIENT portée au live (jamais au serveur). `null` = run libre.
   * `conquest`/`defense` = teinte des bandeaux ; `complete` = mode terminer.
   */
  intention: 'conquest' | 'defense' | 'complete' | null;
  /** Destination du tap (toujours /course-live avec l'intention encodée). */
  targetHref: string;
  /** Contexte lecteur d'écran (verbe + pourquoi). */
  a11yLabel: string;
}

/**
 * Entrée de dérivation. Tout est OPTIONNEL : sans rien, on lit les sources démo
 * du contexte courant. `screen` recadre la lecture selon l'écran (la Carte lit
 * l'attaque ; Missions lit la mission urgente). Les champs `selected*` sont les
 * points d'entrée de la VRAIE sélection live (V1) — quand ils seront câblés, la
 * dérivation les préférera aux sources démo.
 */
export interface ContextInput {
  /** Écran d'où provient le bouton (recadre la lecture démo). */
  screen?: 'map' | 'missions' | 'zone' | 'route' | 'loop';
  /** Zone sélectionnée (V1) : `attacked` ⇒ DÉFENDRE, `neutral`/`rival` ⇒ CONQUÉRIR. */
  selectedZone?: { kind: 'attacked' | 'neutral' | 'rival'; routeId?: string } | null;
  /** Frontière crew presque fermée sélectionnée (V1) ⇒ TERMINER. */
  selectedBoundary?: PartialBoundaryDemo | null;
  /** Mission crew ouverte sélectionnée (V1) ⇒ REJOINDRE. */
  selectedCrewMissionId?: string | null;
}

// ─── Constructeurs d'action (une source de vérité par verbe) ─────────────────

/** RUN — course LIBRE, défaut absolu. Aucune intention, le live classe après. */
function runAction(): ContextualAction {
  return {
    kind: 'run',
    label: 'RUN',
    icon: 'foulees',
    intention: null,
    // Run libre = départ immédiat sur le plan auto, SANS intention imposée —
    // GRYD détecte après coup conquis/défendu/route.
    targetHref: goHref(battleContext().plan),
    a11yLabel: 'Lancer une course libre',
  };
}

/** DÉFENDRE — zone attaquée : intention défense + route de la zone à protéger. */
function defendAction(zone: string, routeId?: string): ContextualAction {
  return {
    kind: 'defendre',
    label: 'DÉFENDRE',
    icon: 'bouclier',
    intention: 'defense',
    targetHref: intentionHref('defense', routeId),
    a11yLabel: `Défendre ${zone} — lancer la course de défense`,
  };
}

/** CONQUÉRIR — zone neutre/rivale : intention conquête (course de capture). */
function conquerAction(zone: string, routeId?: string): ContextualAction {
  return {
    kind: 'conquerir',
    label: 'CONQUÉRIR',
    icon: 'cible',
    intention: 'conquest',
    targetHref: intentionHref('conquest', routeId),
    a11yLabel: `Conquérir ${zone} — lancer la course de conquête`,
  };
}

/** TERMINER — boucle crew presque fermée : intention complete + boundary id. */
function completeAction(boundary: PartialBoundaryDemo): ContextualAction {
  return {
    kind: 'terminer',
    label: 'TERMINER',
    icon: 'boucle_fermee',
    intention: 'complete',
    // Mode terminer du live : intention=complete + boundary=<id> (run/intention).
    targetHref: `/course-live?mode=conquete&intention=complete&boundary=${boundary.id}`,
    a11yLabel: `Terminer ${boundary.zone} — refermer la boucle du crew`,
  };
}

/** REJOINDRE — mission crew ouverte : rejoint la course collective du crew. */
function joinAction(missionLabel: string, boundaryId?: string): ContextualAction {
  // Rejoindre = participer à la boucle crew ouverte (mode terminer si une
  // frontière est en jeu, sinon une conquête collective). L'intention reste
  // client ; le serveur reste seul décideur des contributions.
  const href = boundaryId
    ? `/course-live?mode=conquete&intention=complete&boundary=${boundaryId}`
    : intentionHref('conquest');
  return {
    kind: 'rejoindre',
    label: 'REJOINDRE',
    icon: 'crew',
    intention: boundaryId ? 'complete' : 'conquest',
    targetHref: href,
    a11yLabel: `Rejoindre la mission du crew — ${missionLabel}`,
  };
}

// ─── Dérivation (pure) ───────────────────────────────────────────────────────

/**
 * Première frontière crew « presque fermée » (démo). En V1 c'est la frontière
 * partielle du crew la plus proche du seuil ; ici la première de la liste démo
 * (République, 620 m) sert de cible TERMINER par défaut sur Missions.
 */
function nearlyClosedBoundary(): PartialBoundaryDemo | null {
  return PARTIAL_BOUNDARIES_DEMO[0] ?? null;
}

/** Y a-t-il une mission crew ouverte à rejoindre ? (démo : type `crew`). */
function openCrewMission(): { label: string; boundaryId?: string } | null {
  const crew = MISSIONS.find((m) => m.kind === 'crew' && m.progress < m.target);
  if (!crew) return null;
  // Une frontière crew ouverte donne la cible « terminer » à rejoindre.
  const boundaryId = OPEN_BOUNDARIES[0]?.boundaryId;
  return { label: crew.label, boundaryId };
}

/**
 * DÉRIVE l'action contextuelle du bouton central (PURE). Ordre de priorité
 * (Règles §C, adapté à ce que le bouton lance) :
 *   1. sélection EXPLICITE (V1) : boundary ⇒ TERMINER · zone ⇒ DÉFENDRE/CONQUÉRIR
 *      · mission crew ⇒ REJOINDRE ;
 *   2. sinon, lecture de l'ÉCRAN :
 *      - `missions` : action COMPLÉMENTAIRE du CTA in-content (la zone attaquée
 *        DÉFENDRE est déjà en tête d'écran) ⇒ frontière à refermer TERMINER,
 *        puis mission crew REJOINDRE, puis DÉFENDRE, puis CONQUÉRIR ;
 *      - `map` / `zone` / `route` / `loop` : la Battle Map est attaquée ⇒
 *        DÉFENDRE (lecture `DEFENDRE` de battleContext), sinon CONQUÉRIR ;
 *   3. DÉFAUT ABSOLU : **RUN** (course libre).
 * Ne renvoie JAMAIS « GO ».
 */
export function deriveContextualAction(input: ContextInput = {}): ContextualAction {
  // 1) Sélection explicite (V1) — préférée dès qu'elle existe.
  if (input.selectedBoundary) return completeAction(input.selectedBoundary);
  if (input.selectedZone) {
    const { kind, routeId } = input.selectedZone;
    return kind === 'attacked'
      ? defendAction('cette zone', routeId)
      : conquerAction('cette zone', routeId);
  }
  if (input.selectedCrewMissionId) {
    const m = MISSIONS.find((x) => x.key === input.selectedCrewMissionId);
    return joinAction(m?.label ?? 'mission crew');
  }

  const ctx = battleContext();

  // 2) Lecture de l'écran (démo déterministe).
  if (input.screen === 'missions') {
    // Missions = « choisir une mission ». La zone attaquée (DÉFENDRE) est DÉJÀ
    // portée en tête d'écran par la carte URGENT · DÉFENSE (CTA in-content de la
    // liste) : le bouton CENTRAL prend donc l'action COMPLÉMENTAIRE la plus
    // urgente pour ne pas DUPLIQUER ce DÉFENDRE (§A.4) — la frontière crew à
    // refermer (TERMINER, section « À TERMINER » de l'écran), puis la mission
    // crew à rejoindre (REJOINDRE), puis DÉFENDRE, puis CONQUÉRIR en dernier.
    const boundary = nearlyClosedBoundary();
    if (boundary) return completeAction(boundary);
    const crew = openCrewMission();
    if (crew) return joinAction(crew.label, crew.boundaryId);
    if (ctx.mode === 'DEFENDRE') return defendAction('ta zone', ctx.plan.routeId);
    return conquerAction('une zone', ctx.plan.routeId);
  }

  if (
    input.screen === 'map' ||
    input.screen === 'zone' ||
    input.screen === 'route' ||
    input.screen === 'loop'
  ) {
    // La Battle Map lit l'attaque : mode DEFENDRE ⇒ DÉFENDRE, sinon CONQUÉRIR.
    if (ctx.mode === 'DEFENDRE') {
      return defendAction('ta zone', ctx.plan.routeId);
    }
    return conquerAction('ta zone', ctx.plan.routeId);
  }

  // 3) Défaut absolu — RUN libre (jamais « GO »).
  return runAction();
}
