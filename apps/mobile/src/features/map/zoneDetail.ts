/**
 * GRYD — E14 « DÉTAIL D'UN TERRITOIRE » (spec produit l.943-985) : la LOGIQUE
 * PURE des variantes de la feuille basse.
 *
 * ⚠ NUMÉROTATION : E14 = la spec `GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md`
 * (ARBITRAGES A4). Le « E14 » cité dans `supabase/functions/ingest_run/**`
 * (commutateur Run/Bike) est la planche Vague 1, à citer `V1-E14`.
 *
 * ═══ CE QUI EXISTAIT DÉJÀ, ET QU'ON NE REFAIT PAS ═══════════════════════════
 * Le mécanisme tap → feuille basse marche (MapScreen.tsx:537 `selectZoneView`,
 * BattleMapOverlays.tsx `ZoneDecisionPeek`), la sheet de DÉFENSE d'une zone
 * contestée existe (`defenseZone.ts` + `DefenseZoneSheet.tsx`), les hauteurs se
 * déduisent du contenu rendu (`zoneDecision.ts`). Ce module ne les remplace pas :
 * il ajoute la seule chose qui manquait, LA LECTURE DU PROPRIÉTAIRE.
 *
 * ═══ LE DÉFAUT QUE CE MODULE CORRIGE ════════════════════════════════════════
 * `selectZoneView` réduisait `props.status` à deux rôles par
 * `status === 'crew' ? 'mine' : 'rival'`. Depuis que la carte lit `territories`
 * (LOT 1 étape 4), `territoryRole` (territoriesSource.ts:241) rend AUSSI
 * `'contested'` — pour n'importe quel propriétaire, MOI COMPRIS. Conséquences
 * mesurables, toutes deux des mensonges à l'écran :
 *   1. MA zone passée en `state = 'contested'` s'ouvrait « ZONE RIVALE · À un
 *      rival » avec le CTA « Reprendre » — l'app disait au joueur qu'il ne tenait
 *      plus une zone qu'il tient encore ;
 *   2. `isDefenseZone` (defenseZone.ts:41) exige `role === 'mine'` : la sheet de
 *      DÉFENSE ne pouvait donc JAMAIS s'ouvrir sur un territoire polygonal
 *      contesté — exactement le cas pour lequel elle a été écrite.
 *
 * ═══ CE QU'ON N'INVENTE PAS (et qui reste donc absent de l'écran) ═══════════
 * · ZONE LIBRE (spec l.950-954) — aucune source. `PAINTABLE_STATES`
 *   (territoriesSource.ts:214) exclut délibérément `unowned` (« le neutre
 *   n'existe pas : c'est la basemap »), et RIEN dans le dépôt n'écrit une ligne
 *   `unowned` : `buildTerritoryRow` n'émet que `owned_personal`
 *   (supabase/functions/ingest_run/territory.ts:213) et `contest_wiring`
 *   `owned_personal`/`owned_crew`/`contested`/`defended`. Une « surface estimée »
 *   d'une zone libre serait donc un nombre fabriqué, et sa « meilleure boucle
 *   suggérée » une promesse de capture avant course. La variante n'est pas là.
 * · CONTRIBUTION DE L'UTILISATEUR et DERNIERS ÉVÉNEMENTS de la zone crew
 *   (spec l.968-969) — `territories` ne porte ni part par membre ni journal, et
 *   la RLS `runs_select_own` interdit au client de reconstituer l'un ou l'autre.
 * · RENFORCER (spec l.962) — `defense_level` ne monte QUE lorsqu'une
 *   contestation active est repoussée (ingest_run/index.ts:3604). Aucune action
 *   ne « renforce » une zone tranquille : peindre ce CTA serait un bouton mort
 *   (constitution §2). D'où `plan-outing` comme seul CTA de MA zone.
 *
 * Zéro import React/RN : Deno charge ce module tel quel.
 */
import { displayableFortificationLevel } from '@klaim/shared';

/**
 * QUI tient la zone, du point de vue du joueur qui regarde.
 *
 * `unknown` n'est pas un cinquième cas de politesse : c'est l'état RÉEL d'une
 * zone `contested` quand on ne sait pas encore qui regarde (session en cours de
 * restauration, ou lecture du crew en vol). Répondre `rival` dans ce cas
 * affirmerait une dépossession qu'on n'a pas vérifiée ; répondre `personal`
 * affirmerait l'inverse. On dit qu'on ne sait pas, et l'écran se tait sur le
 * propriétaire — il lui reste l'état CONTESTÉ, lui parfaitement établi.
 */
export type ZoneOwnership = 'personal' | 'crew' | 'rival' | 'unknown';

/** Ce que la sélection lit d'un territoire pour trancher la propriété. */
export interface ZoneOwnershipFacts {
  /**
   * `TerritoryProperties.status`. Vaut `'crew'` (moi OU mon crew), `'rival'`, ou
   * `'contested'` — ce dernier NE DIT RIEN du propriétaire (territoriesSource.ts
   * :241 : « `contested` gagne sur la propriété »), d'où les champs suivants.
   */
  status: string;
  /** `territories.owner_type` (`'neutral'` sur le chemin hexagonal). */
  ownerType: 'user' | 'crew' | 'neutral';
  /** `territories.owner_id` / `hex_claims.owner_user_id`. */
  ownerId: string | null;
}

/** Qui regarde. `meId === null` = pas (encore) de session : on n'affirme rien. */
export interface ZoneViewer {
  meId: string | null;
  /** Ids des membres ACTIFS de mon crew (+ l'id du crew lui-même). */
  crewIds?: ReadonlySet<string> | null;
}

/**
 * Propriété RÉELLE d'une zone. Ordre des tests délibéré : le cas « c'est
 * littéralement moi » se tranche par une égalité d'ids, jamais par une couleur
 * déjà calculée — c'est ce qui sépare la variante PERSONNELLE (spec l.956) de la
 * variante CREW (l.966), que `status: 'crew'` fond en une seule.
 */
export function zoneOwnership(
  facts: ZoneOwnershipFacts,
  viewer: ZoneViewer | null,
): ZoneOwnership {
  const meId = viewer?.meId ?? null;
  const { ownerId, ownerType } = facts;

  // 1. MOI, au sens strict : une ligne `owned_personal` dont je suis le tenant.
  //    `ownerType === 'user'` est exigé pour qu'un crew dont l'uuid vaudrait par
  //    accident le mien ne devienne pas « à toi » (0074 n'a aucune contrainte
  //    croisée entre les deux espaces d'uuid).
  if (meId !== null && ownerId === meId && ownerType !== 'crew') return 'personal';

  // 2. MON CREW : soit le crew lui-même (`owner_type = 'crew'`), soit un
  //    coéquipier — les deux cas passent par le même Set, exactement comme
  //    `territoryRole` (territoriesSource.ts:246).
  if (ownerId !== null && viewer?.crewIds?.has(ownerId) === true) return 'crew';

  // 3. Le chemin HEXAGONAL n'a pas d'`ownerType` et son `status` a DÉJÀ été
  //    tranché contre `meId` par `stateFor` (territoryBuild.ts:130). On le
  //    respecte plutôt que de re-trancher avec moins d'information : `'crew'` y
  //    signifie « moi ou mon crew », et sans plus de source on le dit ainsi.
  if (facts.status === 'crew') return meId === null ? 'unknown' : 'crew';
  if (facts.status === 'rival') return 'rival';

  // 4. `contested` (et tout état futur) : sans identité connue, on ne tranche
  //    PAS. Avec une identité connue et aucun rattachement trouvé plus haut, la
  //    zone est bien à quelqu'un d'autre.
  return meId === null ? 'unknown' : 'rival';
}

/**
 * Le RÔLE DE COULEUR (§C : chartreuse = moi/mon crew, orange = rival). C'est
 * aussi lui qui ouvre la sheet de DÉFENSE (`isDefenseZone` exige `'mine'`).
 *
 * ORDRE DÉLIBÉRÉ, et c'est tout le correctif : `status` est autoritaire QUAND IL
 * TRANCHE. `'crew'` et `'rival'` ont déjà été décidés contre `meId` en amont —
 * par `stateFor` (territoryBuild.ts:130) ou `territoryRole`
 * (territoriesSource.ts:243) — et les re-décider ici avec moins d'information
 * (un appelant qui ne passe pas de `viewer`) ferait REculer une réponse juste
 * vers un « je ne sais pas ». Seul `'contested'` ne dit rien du tenant : lui
 * seul retombe sur la propriété.
 *
 * Et dans ce dernier cas, `unknown` se peint en rival plutôt qu'en chartreuse :
 * entre deux erreurs possibles, annoncer à tort « c'est à toi » est la plus
 * coûteuse — elle ferait manquer une défense.
 */
export function zoneRole(status: string, ownership: ZoneOwnership): 'mine' | 'rival' {
  if (status === 'crew') return 'mine';
  if (status === 'rival') return 'rival';
  return ownership === 'personal' || ownership === 'crew' ? 'mine' : 'rival';
}

/**
 * NIVEAU DE PROTECTION affichable (spec l.960), ou `null`.
 *
 * ⚠ CORRECTIF DU 27/07 — CE MODULE PORTAIT SA PROPRE COPIE DE LA RÈGLE, avec
 * une borne haute (`ZONE_PROTECTION_MAX = 3`) recopiée à la main depuis le CHECK
 * SQL (0074:151) tandis que son jumeau `displayableProtection` (Résultat) n'en
 * avait AUCUNE. Le docblock revendiquait « une seule vérité dans l'app » : il y
 * en avait deux, et sur un `defense_level` de 4 la carte masquait la protection
 * pendant que le Résultat imprimait « niveau 4 ». Les deux délèguent désormais à
 * `displayableFortificationLevel` (@klaim/shared), qui dérive sa borne de
 * `FORTIFICATION_WINDOW_HOURS_BY_LEVEL` — plus aucun « 3 » écrit deux fois.
 *
 * Ce fichier garde le NOM local (une trentaine d'appels + tests le citent), mais
 * plus la règle : c'est un alias, pas une seconde implémentation.
 */
export function zoneProtectionLevel(level: number | null | undefined): number | null {
  return displayableFortificationLevel(level);
}

/**
 * D'OÙ VIENT LE CONTOUR QU'ON REGARDE — et donc ce que la feuille a le droit
 * d'appeler « la frontière » (spec l.975, variante rivale).
 *
 * · `exact`       — le polygone de MA trace, tel que le moteur l'a produit ;
 * · `generalized` — la version publique d'un territoire d'autrui (§12.3) : la
 *                   forme est vraie mais volontairement grossie, on ne sert
 *                   jamais la trace exacte d'un tiers ;
 * · `approx`      — AUCUN polygone n'existe pour ces captures : ce qui est peint
 *                   est le contour DISSOUS ET LISSÉ de la grille de capture
 *                   interne (territoriesSource.ts §5 — pas un hexagone dessiné :
 *                   les cellules sont fusionnées en un seul anneau, puis
 *                   simplifiées et adoucies). Sa silhouette reste néanmoins
 *                   dérivée de la grille, donc ce N'EST PAS la trace du coureur.
 *                   C'est le seul endroit où l'app doit l'avouer — et elle
 *                   l'avoue sans jamais exposer H3, qui est un index INTERNE :
 *                   la copie dit « contour approximatif », pas « hexagones ».
 */
export type ZoneBorderKind = 'exact' | 'generalized' | 'approx';

export function zoneBorderKind(input: {
  geometrySource: 'polygon' | 'h3cells';
  /** `PolygonTerritory.precision`, absent sur le chemin hexagonal. */
  precision?: 'exact' | 'generalized' | null;
}): ZoneBorderKind {
  if (input.geometrySource !== 'polygon') return 'approx';
  return input.precision === 'exact' ? 'exact' : 'generalized';
}

/**
 * La métrique temporelle a DEUX sens selon la source, et les confondre est un
 * mensonge dans les deux directions :
 *
 * · `held`        — chemin POLYGONAL : `props.capturedAt` vaut
 *                   `territories.controlled_since` (territoriesSource.ts:368),
 *                   c'est-à-dire le début du contrôle ININTERROMPU. « Tenue
 *                   depuis 6 j » y est littéralement vrai.
 * · `lastCapture` — chemin HEXAGONAL : `capturedAt` est le `claimed_at` le PLUS
 *                   RÉCENT du paquet de cellules. « Tenue depuis » y serait faux
 *                   dès qu'un seul hex a changé de main entre-temps ; seule
 *                   « Dernière prise » est mesurable.
 */
export type ZoneTimeMetric = 'held' | 'lastCapture';

export function zoneTimeMetric(geometrySource: 'polygon' | 'h3cells'): ZoneTimeMetric {
  return geometrySource === 'polygon' ? 'held' : 'lastCapture';
}

/**
 * L'UNIQUE CTA chartreuse de la feuille (§A4), ou `null`.
 *
 * · `reprendre`   — zone rivale (spec l.976). Ouvre le briefing de conquête.
 * · `plan-outing` — MA zone / celle de mon crew (spec l.962 « sinon PLANIFIER
 *                   UNE SORTIE »). Ouvre le planificateur, qui existe et
 *                   fonctionne : ce n'est pas un bouton mort. Avant ce lot, MA
 *                   zone n'avait AUCUNE action : la feuille était un cul-de-sac
 *                   dont on ne sortait qu'en fermant, GO étant retiré tant
 *                   qu'elle est ouverte (`useZoneSheetOpen`).
 * · `null`        — zone peinte en rival dont la propriété est INDÉTERMINÉE
 *                   (contestée, identité du lecteur pas encore connue) :
 *                   proposer « Reprendre » sur une zone peut-être mienne serait
 *                   décider à la place d'un fait qu'on n'a pas.
 *
 * La zone CONTESTÉE dont je suis le tenant ne passe pas par ici : elle relève de
 * la sheet de DÉFENSE (`isDefenseZone`), dont le CTA est « Défendre ».
 */
export type ZoneCta = 'reprendre' | 'plan-outing' | null;

export function zoneCta(role: 'mine' | 'rival', ownership: ZoneOwnership): ZoneCta {
  if (role === 'mine') return 'plan-outing';
  return ownership === 'unknown' ? null : 'reprendre';
}

/**
 * La note de CONFIDENTIALITÉ de la spec (l.983 : « Aucun départ, arrivée,
 * horaire précis ou trace brute d'un tiers ») ne se peint que sur une zone qui
 * n'est PAS la mienne : sur ma propre zone elle n'informe personne et coûte une
 * ligne à un écran qui doit se lire en moins de 3 s (§A).
 *
 * Elle n'est pas décorative : c'est la seule ligne de l'app qui dise au joueur
 * ce que les AUTRES ne verront pas de lui.
 */
export function zoneShowsPrivacyNote(role: 'mine' | 'rival'): boolean {
  return role === 'rival';
}
