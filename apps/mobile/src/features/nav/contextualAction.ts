/**
 * GRYD — DÉRIVATION de l'ACTION contextuelle du bouton CENTRAL de la barre
 * d'onglets (AMENDEMENT-29).
 *
 * « Navigation = où je vais. Bouton principal = ce que je fais MAINTENANT. »
 * Un SEUL bouton chartreuse, au centre de la barre et présent sur TOUS les
 * onglets, dont le LIBELLÉ + l'INTENTION + la CIBLE changent selon le contexte
 * de jeu. Ce module est PUR (aucun rendu, aucun hook d'état interne) : il lit
 * la SÉLECTION qu'on lui passe, et rien d'autre. Le défaut est TOUJOURS **RUN**
 * (course libre) — jamais « GO » (retiré définitivement, AMENDEMENT-29 :
 * toujours un VERBE qui dit POURQUOI tu cours).
 *
 * Le bouton porte l'INTENTION CLIENT (conquest / defense / complete) vers
 * `/course-live` — 100 % client, jamais envoyée au serveur (le tracé décide, le
 * serveur tranche ; cf. run/intention.ts). L'ordre de priorité suit les Règles
 * §C (1 run en cours > mission > défendre > boucle à terminer > rival) adapté à
 * ce que ce bouton peut lancer : TERMINER (frontière crew presque fermée) prime
 * DÉFENDRE (zone attaquée) prime CONQUÉRIR prime RUN.
 *
 * FIN DU MODE VITRINE (21/07/2026) — au MVP il n'existe pas encore de VRAIE
 * sélection live de zone/mission. Ce module DÉRIVAIT donc le verbe de sources
 * fabriquées (battleContext / MISSIONS) : sur la Carte, le bouton annonçait
 * « CONQUÉRIR ta zone » et partait sur une boucle République de démo, pour tout
 * joueur où qu'il soit. Cette dérivation est SUPPRIMÉE. Tant que la sélection
 * réelle n'est pas câblée, le bouton dit **RUN** — la seule chose toujours vraie
 * (GRYD classe conquis/défendu après la course, d'après le tracé réel). Les
 * branches `selected*` restent : elles n'attendent qu'une vraie sélection.
 */
import { intentionHref } from './runContext';
import { type PartialBoundaryDemo } from '../run/intention';
import { C } from '../../i18n/catalog/nav';
import { format, resolve, type Locale } from '../../i18n/types';
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
  screen?: 'map' | 'zone' | 'route' | 'loop';
  /** Zone sélectionnée (V1) : `attacked` ⇒ DÉFENDRE, `neutral`/`rival` ⇒ CONQUÉRIR. */
  selectedZone?: { kind: 'attacked' | 'neutral' | 'rival'; routeId?: string } | null;
  /** Frontière crew presque fermée sélectionnée (V1) ⇒ TERMINER. */
  selectedBoundary?: PartialBoundaryDemo | null;
  /** Mission crew ouverte sélectionnée (V1) ⇒ REJOINDRE. */
  selectedCrewMissionId?: string | null;
}

// ─── Constructeurs d'action (une source de vérité par verbe) ─────────────────
// Module PUR : la langue arrive en paramètre (resolve/format de ../../i18n/types,
// jamais le store) — les textes viennent du catalogue nav (i18n/catalog/nav).

/** RUN — course LIBRE, défaut absolu. Aucune intention, le live classe après. */
function runAction(locale: Locale): ContextualAction {
  return {
    kind: 'run',
    label: resolve(C.actionRun, locale),
    icon: 'foulees',
    intention: null,
    // Run libre = départ immédiat, SANS route ni intention imposée. Ce href
    // portait `goHref(battleContext().plan)`, donc `route=<id de ROUTES_DEMO>` :
    // le départ chargeait un itinéraire fabriqué. Un run libre n'a pas de route.
    targetHref: '/course-live?mode=conquete',
    a11yLabel: resolve(C.a11yRun, locale),
  };
}

/** DÉFENDRE — zone attaquée : intention défense + route de la zone à protéger. */
function defendAction(zone: string, locale: Locale, routeId?: string): ContextualAction {
  return {
    kind: 'defendre',
    label: resolve(C.actionDefendre, locale),
    icon: 'bouclier',
    intention: 'defense',
    targetHref: intentionHref('defense', routeId),
    a11yLabel: format(C.a11yDefendre, { zone }, locale),
  };
}

/** CONQUÉRIR — zone neutre/rivale : intention conquête (course de capture). */
function conquerAction(zone: string, locale: Locale, routeId?: string): ContextualAction {
  return {
    kind: 'conquerir',
    label: resolve(C.actionConquerir, locale),
    icon: 'cible',
    intention: 'conquest',
    targetHref: intentionHref('conquest', routeId),
    a11yLabel: format(C.a11yConquerir, { zone }, locale),
  };
}

/** TERMINER — boucle crew presque fermée : intention complete + boundary id. */
function completeAction(boundary: PartialBoundaryDemo, locale: Locale): ContextualAction {
  return {
    kind: 'terminer',
    label: resolve(C.actionTerminer, locale),
    icon: 'boucle_fermee',
    intention: 'complete',
    // Mode terminer du live : intention=complete + boundary=<id> (run/intention).
    targetHref: `/course-live?mode=conquete&intention=complete&boundary=${boundary.id}`,
    a11yLabel: format(C.a11yTerminer, { zone: boundary.zone }, locale),
  };
}

/** REJOINDRE — mission crew ouverte : rejoint la course collective du crew. */
function joinAction(missionLabel: string, locale: Locale, boundaryId?: string): ContextualAction {
  // Rejoindre = participer à la boucle crew ouverte (mode terminer si une
  // frontière est en jeu, sinon une conquête collective). L'intention reste
  // client ; le serveur reste seul décideur des contributions.
  const href = boundaryId
    ? `/course-live?mode=conquete&intention=complete&boundary=${boundaryId}`
    : intentionHref('conquest');
  return {
    kind: 'rejoindre',
    label: resolve(C.actionRejoindre, locale),
    icon: 'crew',
    intention: boundaryId ? 'complete' : 'conquest',
    targetHref: href,
    a11yLabel: format(C.a11yRejoindre, { mission: missionLabel }, locale),
  };
}

// ─── Dérivation (pure) ───────────────────────────────────────────────────────

/**
 * DÉRIVE l'action contextuelle du bouton central (PURE). Ordre de priorité
 * (Règles §C, adapté à ce que le bouton lance) :
 *   1. sélection EXPLICITE (V1) : boundary ⇒ TERMINER · zone ⇒ DÉFENDRE/CONQUÉRIR
 *      · mission crew ⇒ REJOINDRE ;
 *   2. sinon **RUN** (course libre) — quel que soit l'écran. La lecture d'écran
 *      a été retirée : savoir qu'on est sur la Carte n'apprend RIEN sur les
 *      zones du joueur, et la remplir de démo était le mensonge d'origine.
 * Ne renvoie JAMAIS « GO ».
 *
 * `locale` : langue des libellés (module pur — les composants la lisent via
 * useLocale() et la passent ici ; jamais d'import du store i18n dans ce module).
 */
export function deriveContextualAction(input: ContextInput, locale: Locale): ContextualAction {
  // 1) Sélection explicite (V1) — préférée dès qu'elle existe.
  if (input.selectedBoundary) return completeAction(input.selectedBoundary, locale);
  if (input.selectedZone) {
    const { kind, routeId } = input.selectedZone;
    return kind === 'attacked'
      ? defendAction(resolve(C.zoneThis, locale), locale, routeId)
      : conquerAction(resolve(C.zoneThis, locale), locale, routeId);
  }
  if (input.selectedCrewMissionId) {
    // Le libellé de mission venait de `warroom/demo.MISSIONS` (missions de démo
    // indexées par clé). Sans catalogue réel de missions crew, on n'en NOMME
    // aucune : le libellé générique dit la vérité, l'id sélectionné suffit à
    // router. Le vrai nom reviendra avec la vraie source.
    return joinAction(resolve(C.crewMissionFallback, locale), locale);
  }

  // 2) LECTURE D'ÉCRAN — SUPPRIMÉE le 21/07/2026 (fin du mode vitrine).
  //    Elle appelait `battleContext()`, dont le mode et la route venaient de
  //    `fakeHexes.battleMapData()` et de `warroom/demo.DEFENSE_MISSION` : sur la
  //    Carte, le bouton central annonçait donc « DÉFENDRE / CONQUÉRIR <ta zone> »
  //    et partait sur un itinéraire de démo (boucle République), pour TOUT joueur
  //    où qu'il soit — le bug d'origine du fondateur, à l'endroit le plus visible
  //    de l'app. `input.screen` ne peut PAS produire une lecture honnête : savoir
  //    qu'on est sur la Carte n'apprend rien sur les zones du joueur.
  //    Quand la vraie sélection sera câblée (tap zone → `selectedZone`, déjà
  //    gérée en 1), le verbe reviendra — porté par une donnée réelle.
  //
  // 3) DÉFAUT — RUN libre. C'est la seule action toujours vraie : GRYD classe
  //    conquis/défendu APRÈS la course, à partir du tracé réel.
  return runAction(locale);
}
