/**
 * GRYD — ingest_run/contest_wiring.ts : LE CÂBLAGE DE LA CONTESTATION (§9).
 * LOT 3, SUITE — la logique PURE d'orchestration.
 *
 * ═══ CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS ═════════════════════════
 * FAIT   : à partir (a) de la boucle qui vient d'être ingérée, (b) des
 *          territoires voisins DÉJÀ LUS par l'appelant et (c) des contestations
 *          DÉJÀ LUES, il décide un PLAN : quelles contestations OUVRIR, et
 *          quelle contestation en cours est CLOSE par une défense valide.
 * NE FAIT PAS : aucune lecture, aucune écriture, aucune horloge (`nowMs` est
 *          INJECTÉ), aucune règle de jeu — les règles sont dans
 *          `packages/engine/src/contest.ts` (livré, 36 tests) et ce fichier ne
 *          fait que les APPELER dans le bon ordre avec les bonnes entrées.
 *
 * ═══ POURQUOI UN FICHIER SÉPARÉ ═════════════════════════════════════════════
 * `index.ts` appelle `Deno.serve` au chargement : il n'est pas importable, donc
 * pas testable. Patron déjà établi par `validate.ts`, `dedup.ts`, `territory.ts`.
 * Sans ce fichier, « une boucle rivale ouvre une contestation au lieu de voler »
 * resterait une intention non prouvée.
 *
 * ═══ LES CINQ DÉCISIONS DE CE CÂBLAGE, ÉCRITES UNE FOIS ═════════════════════
 *
 * 1. `hex_claims` RESTE LA PROPRIÉTÉ OPÉRATIONNELLE. `claim_hexes` (0070:610)
 *    continue de faire `on conflict do update set owner_user_id = excluded.…` :
 *    LES CELLULES CHANGENT TOUJOURS DE MAIN DANS LA TRANSACTION. Ce module
 *    n'enlève rien à ce comportement — il AJOUTE, à côté, le modèle §9 sur la
 *    représentation POLYGONALE (`territories` / `territory_contests`).
 *    Conséquence à assumer et à ne pas maquiller : pendant la transition, un
 *    territoire peut être « contesté » côté polygone alors que ses cellules
 *    ont déjà changé de propriétaire côté hexagones. C'est un ÉCART RÉEL,
 *    inscrit en suspens en fin de fichier ; il n'est pas résorbable sans
 *    toucher `claim_hexes`, hors du périmètre de ce chantier.
 *
 * 2. L'ASSAILLANT EST TOUJOURS UN JOUEUR (`attacker_type = 'user'`), jamais son
 *    crew — même quand il en a un. Raison : `territory.ts` écrit
 *    `owner_type: 'user'` en dur (« un crew ne peut PAS posséder aujourd'hui :
 *    `hex_claims.owner_user_id` est `not null` »). Ouvrir une contestation au
 *    nom d'un crew produirait, à l'échéance, un territoire `owned_crew` que la
 *    propriété hexagonale ne saurait pas représenter — les deux modèles
 *    divergeraient dès le premier transfert. La conquête crew est le LOT 7.
 *
 * 3. LA CONTESTATION S'OUVRE À L'INGESTION, PAS À LA FIN DE LA COURSE.
 *    `startedAtMs = nowMs` (l'instant d'ingestion), et non `finishedAtMs`. Un
 *    GPX importé trois semaines plus tard ouvrirait sinon une fenêtre de défense
 *    DÉJÀ EXPIRÉE : le propriétaire perdrait sa zone sans avoir jamais pu
 *    défendre, ce qui vide §9.2 de son sens. La fenêtre commence quand le
 *    défenseur peut, au plus tôt, être averti.
 *
 * 4. UNE DÉFENSE VALIDE CLÔT LA CONTESTATION IMMÉDIATEMENT, à l'instant de FIN
 *    de la course défensive (`resolvedAtMs = finishedAtMs`), et non à
 *    l'échéance. C'est un ÉCART ASSUMÉ avec `resolveContest`, qui écrit
 *    l'échéance pour rester idempotent malgré un cron en retard. Ici le
 *    problème n'existe pas : l'instant retenu est celui d'un ÉVÉNEMENT RÉEL
 *    (la course qui a sauvé la zone), il est déterministe, il ne dépend d'aucun
 *    réveil de job, et une ré-ingestion de la même course produit la même date.
 *    Écrire l'échéance aurait daté la défense d'un futur qui n'a pas eu lieu.
 *    Et le job d'échéance (0080) n'y revient pas : il ne touche QUE les
 *    contestations restées `active`.
 *
 * 5. LE NIVEAU DE FORTIFICATION EST DÉCRU AVANT USAGE. `decayedDefenseLevel`
 *    est appliqué à partir de la DERNIÈRE DÉFENSE RÉUSSIE réellement lue
 *    (`territory_contests.resolved_at` du dernier `defended`), jamais d'une
 *    date approchée. Sans défense antérieure connue, le niveau est pris tel
 *    quel — la fonction du moteur le dit : « un territoire fortifié dont on
 *    ignore la dernière défense est une donnée incomplète : on ne la remplace
 *    pas par une supposition ».
 *
 * ═══ ANTI PAY-TO-WIN ════════════════════════════════════════════════════════
 * Aucune entrée de ce module ne porte un statut payant, un objet, un solde ni
 * un abonnement. Le plan ne dépend que de : géométrie, horloge injectée,
 * appartenance, et niveau de fortification (qui ne se gagne que par des
 * défenses réussies). Il n'existe aucun paramètre par lequel un achat pourrait
 * entrer.
 */
import {
  contestDeadline,
  decayedDefenseLevel,
  isDefenseValid,
  nextDefenseLevel,
  shouldContest,
  type ContestReason,
  type ContestSnapshot,
  type DefenseActivity,
  type DefenseReason,
  type ContestStatus,
} from '../_shared/engine/contest.ts';
import {
  fromGeoJsonPolygon,
  type GeoJsonPolygon,
  type PolygonRing,
} from '../_shared/engine/polygon.ts';
import type { FortificationLevel } from '../_shared/game-rules.ts';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LES ENTRÉES — ce que l'appelant a LU, converti en formes explicites
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Un territoire voisin, tel que lu dans `public.territories` (0074). La
 * `geometry` reste le `jsonb` BRUT rendu par la base : ce module la valide
 * lui-même, plutôt que de faire confiance à un cast fait ailleurs — une
 * géométrie illisible doit produire un SKIP NOMMÉ, pas une exception.
 */
export interface CandidateTerritory {
  readonly id: string;
  readonly ownerType: 'user' | 'crew';
  readonly ownerId: string;
  /** `territories.state` tel quel (§5.3). Informatif : la décision ne s'y appuie pas. */
  readonly state: string;
  readonly defenseLevel: number;
  /** `territories.geometry` brut (jsonb). Jamais `geometry_generalized` : on
   *  contesté la géométrie AUTORITAIRE, pas sa version publique dégradée. */
  readonly geometry: unknown;
  /**
   * Création du compte propriétaire (ms epoch), pour la protection d'onboarding
   * §3.3 réexprimée (`shouldContest`, motif
   * `defender_under_onboarding_protection`). `null` quand elle est INCONNUE —
   * propriétaire crew, ou lecture qui n'a rien rendu. Un garde-fou absent n'est
   * PAS présumé satisfait : il n'est simplement pas évalué (contrat de
   * `ContestGate`).
   */
  readonly ownerCreatedAtMs: number | null;
}

/** Une ligne `public.territory_contests` (0078) déjà lue par l'appelant. */
export interface ExistingContest {
  readonly id: string;
  readonly territoryId: string;
  readonly status: ContestStatus;
  readonly attackerType: 'user' | 'crew';
  readonly attackerId: string;
  readonly startedAtMs: number;
  readonly expiresAtMs: number;
  readonly resolvedAtMs: number | null;
}

/** La course qui vient d'être ingérée, vue depuis §9. */
export interface RunnerActivity {
  /** `runs.id` — c'est lui qui part en `source_activity_id`. */
  readonly runId: string;
  readonly actorUserId: string;
  /** Crew ACTIF du coureur, ou null. Sert UNIQUEMENT à ne pas attaquer les siens. */
  readonly actorCrewId: string | null;
  /** Anneau de la boucle fermée, ou null si la course n'en a pas fermé. */
  readonly polygon: PolygonRing | null;
  readonly loopClosed: boolean;
  /** Verdict §11 du pipeline (`validateOrStatus`), jamais re-décidé ici. */
  readonly antiCheatPassed: boolean;
  /** Fin de la course (ms epoch) — §9.3 la compare à l'échéance. */
  readonly finishedAtMs: number;
}

export interface ContestWiringInput {
  readonly activity: RunnerActivity;
  /** Territoires susceptibles d'être touchés, déjà bornés par l'appelant. */
  readonly candidates: readonly CandidateTerritory[];
  /**
   * Contestations connues de ces territoires. L'appelant fournit AU MOINS les
   * `active` (sans elles, l'unicité de 0078 serait découverte par une erreur
   * 23505 au lieu d'être décidée) et les `defended` (qui portent la date de
   * dernière défense, entrée de `decayedDefenseLevel`).
   */
  readonly contests: readonly ExistingContest[];
  readonly nowMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES SORTIES — un PLAN, pas des écritures
// ═══════════════════════════════════════════════════════════════════════════

/** Une contestation à OUVRIR : exactement une ligne `territory_contests`. */
export interface ContestOpen {
  readonly territoryId: string;
  /** Toujours 'user' — décision 2 du docblock. */
  readonly attackerType: 'user';
  readonly attackerId: string;
  readonly sourceActivityId: string;
  readonly overlapRatio: number;
  readonly startedAtMs: number;
  readonly expiresAtMs: number;
  /** Niveau (décru) au moment de l'ouverture — il a fixé la durée de la fenêtre. */
  readonly defenseLevelAtOpen: FortificationLevel;
}

/** Une contestation CLOSE par une défense valide. */
export interface DefenseClose {
  readonly contestId: string;
  readonly territoryId: string;
  /** Fin de la course défensive — décision 4 du docblock. */
  readonly resolvedAtMs: number;
  /** Niveau à écrire sur le territoire après la défense (`nextDefenseLevel`). */
  readonly defenseLevel: FortificationLevel;
  readonly overlapRatio: number;
  readonly winningActivityId: string;
}

/** Pourquoi un territoire examiné n'a PAS été contesté. Jamais un silence. */
export type WiringSkipReason =
  /** La course n'a fermé aucune boucle : rien à opposer à personne. */
  | 'no_attacker_polygon'
  /** Le territoire est celui du coureur, et aucune contestation n'y est ouverte. */
  | 'own_territory'
  /** Territoire du crew du coureur — on n'attaque pas les siens (§9.1 « rivale »). */
  | 'own_crew_territory'
  /** Une contestation est DÉJÀ ouverte : 0078 n'en autorise qu'une (idempotence). */
  | 'already_contested'
  /** `geometry` illisible en base : on ne devine pas une forme. */
  | 'unreadable_geometry'
  /** Tous les motifs du moteur (§9.1). */
  | ContestReason;

export interface WiringSkip {
  readonly territoryId: string;
  readonly reason: WiringSkipReason;
  /** Recouvrement mesuré quand il a pu l'être — l'écran doit pouvoir le dire. */
  readonly overlapRatio: number;
}

/** Une défense TENTÉE et refusée : le coureur défendait, sa boucle n'a pas suffi. */
export interface DefenseRefusal {
  readonly contestId: string;
  readonly territoryId: string;
  readonly reason: DefenseReason;
  readonly overlapRatio: number;
}

export interface ContestWiringPlan {
  readonly opens: readonly ContestOpen[];
  readonly defenses: readonly DefenseClose[];
  readonly skipped: readonly WiringSkip[];
  readonly defenseRefusals: readonly DefenseRefusal[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LECTURE DÉFENSIVE DE LA GÉOMÉTRIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `territories.geometry` (jsonb) → anneau, ou `null` si la valeur n'est pas un
 * Polygon GeoJSON exploitable. Les CHECK de 0074 garantissent déjà la FORME
 * (`type = 'Polygon'`, `coordinates` tableau) ; ils ne garantissent PAS qu'il
 * reste ≥ 3 sommets distincts après normalisation. On revérifie donc ici, parce
 * qu'un anneau dégénéré ferait rendre 0 à `intersectionRatio` — c'est-à-dire
 * « pas de recouvrement » — là où la vérité est « on ne sait pas lire cette
 * zone ». Deux situations différentes ne doivent pas produire le même silence.
 */
export function ringFromGeometry(geometry: unknown): PolygonRing | null {
  if (typeof geometry !== 'object' || geometry === null) return null;
  const geo = geometry as { type?: unknown; coordinates?: unknown };
  if (geo.type !== 'Polygon' || !Array.isArray(geo.coordinates)) return null;
  const ring = fromGeoJsonPolygon(geometry as GeoJsonPolygon);
  return ring.length >= 3 ? ring : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LE PLAN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Décide, pour UNE course ingérée, l'ensemble des contestations à ouvrir et la
 * contestation éventuellement close par une défense. PURE.
 *
 * ORDRE ET EXCLUSIVITÉ — un territoire tombe dans UNE seule branche :
 *  · il est au coureur (ou à son crew)  → branche DÉFENSE (jamais attaqué) ;
 *  · il est à un tiers                  → branche ATTAQUE.
 * Rien ne peut donc produire à la fois une ouverture et une défense sur la même
 * zone, ni un joueur qui se conteste lui-même — le cas est réel dès qu'une
 * boucle recouvre à la fois sa propre zone et celle d'un voisin.
 *
 * IDEMPOTENCE : un territoire déjà porteur d'une contestation ACTIVE n'est
 * jamais ré-ouvert (`already_contested`). L'index unique partiel de 0078 reste
 * le dernier verrou en cas de concurrence, mais il n'est plus le PREMIER : une
 * règle de jeu ne doit pas être tranchée par un code d'erreur SQL.
 */
export function planContestWiring(input: ContestWiringInput): ContestWiringPlan {
  const { activity: act, candidates, contests, nowMs } = input;

  const opens: ContestOpen[] = [];
  const defenses: DefenseClose[] = [];
  const skipped: WiringSkip[] = [];
  const defenseRefusals: DefenseRefusal[] = [];

  const attackerRing = act.polygon;
  // Pas de boucle fermée ⇒ pas de surface à opposer, ni en attaque ni en
  // défense (§9.1 et §9.3 exigent tous deux une boucle). On le DIT pour chaque
  // territoire examiné plutôt que de rendre un plan vide sans explication.
  if (attackerRing === null || attackerRing.length < 3) {
    return {
      opens,
      defenses,
      skipped: candidates.map((t) => ({
        territoryId: t.id,
        reason: 'no_attacker_polygon' as const,
        overlapRatio: 0,
      })),
      defenseRefusals,
    };
  }

  // ─── Index des contestations connues ──────────────────────────────────────
  // `active` : au plus une par territoire (0078 le garantit en base ; si deux
  // arrivaient malgré tout, la DERNIÈRE OUVERTE gagne — un choix déterministe
  // vaut mieux que « la première du tableau », qui dépendrait de l'ordre d'un
  // `select` sans `order by`).
  const activeByTerritory = new Map<string, ExistingContest>();
  const lastDefendedByTerritory = new Map<string, number>();
  for (const c of contests) {
    if (c.status === 'active') {
      const prev = activeByTerritory.get(c.territoryId);
      if (prev === undefined || c.startedAtMs > prev.startedAtMs) {
        activeByTerritory.set(c.territoryId, c);
      }
    } else if (c.status === 'defended' && c.resolvedAtMs !== null) {
      const prev = lastDefendedByTerritory.get(c.territoryId);
      if (prev === undefined || c.resolvedAtMs > prev) {
        lastDefendedByTerritory.set(c.territoryId, c.resolvedAtMs);
      }
    }
  }

  for (const t of candidates) {
    const isMine = t.ownerType === 'user' && t.ownerId === act.actorUserId;
    const isMyCrew = t.ownerType === 'crew' &&
      act.actorCrewId !== null && t.ownerId === act.actorCrewId;
    const active = activeByTerritory.get(t.id) ?? null;

    // §9.2 axe TEMPOREL : le niveau qui SERT est le niveau DÉCRU, pas celui
    // stocké. Un territoire fortifié il y a une semaine n'ouvre pas une fenêtre
    // de 36 h.
    const level = decayedDefenseLevel({
      level: t.defenseLevel,
      lastDefendedAtMs: lastDefendedByTerritory.get(t.id) ?? null,
      nowMs,
    });

    const ring = ringFromGeometry(t.geometry);

    // ─── BRANCHE DÉFENSE ────────────────────────────────────────────────────
    if (isMine || isMyCrew) {
      const ownReason: WiringSkipReason = isMine ? 'own_territory' : 'own_crew_territory';
      if (active === null) {
        skipped.push({ territoryId: t.id, reason: ownReason, overlapRatio: 0 });
        continue;
      }
      if (ring === null) {
        skipped.push({ territoryId: t.id, reason: 'unreadable_geometry', overlapRatio: 0 });
        continue;
      }
      const contest: ContestSnapshot = {
        territoryId: t.id,
        owner: { type: t.ownerType, id: t.ownerId },
        attacker: { type: active.attackerType, id: active.attackerId },
        polygon: ring,
        startedAtMs: active.startedAtMs,
        expiresAtMs: active.expiresAtMs,
        status: 'active',
        defenseLevel: level,
        resolvedAtMs: null,
      };
      const defenseActivity: DefenseActivity = {
        activityId: act.runId,
        actorUserId: act.actorUserId,
        actorCrewId: act.actorCrewId,
        polygon: attackerRing,
        closedLoop: act.loopClosed,
        finishedAtMs: act.finishedAtMs,
        antiCheatPassed: act.antiCheatPassed,
      };
      const verdict = isDefenseValid({ contest, defenseActivity, nowMs });
      if (!verdict.valid) {
        defenseRefusals.push({
          contestId: active.id,
          territoryId: t.id,
          reason: verdict.reason,
          overlapRatio: verdict.overlapRatio,
        });
        continue;
      }
      defenses.push({
        contestId: active.id,
        territoryId: t.id,
        // Décision 4 : l'instant RÉEL où la zone a été sauvée. `isDefenseValid`
        // a déjà garanti startedAt ≤ finishedAt ≤ min(now, expiresAt), donc les
        // trois CHECK de 0078 sur `resolved_at` sont satisfaits par construction.
        resolvedAtMs: act.finishedAtMs,
        defenseLevel: nextDefenseLevel(level, 'defended'),
        overlapRatio: verdict.overlapRatio,
        winningActivityId: act.runId,
      });
      continue;
    }

    // ─── BRANCHE ATTAQUE ────────────────────────────────────────────────────
    if (active !== null) {
      skipped.push({ territoryId: t.id, reason: 'already_contested', overlapRatio: 0 });
      continue;
    }
    if (ring === null) {
      skipped.push({ territoryId: t.id, reason: 'unreadable_geometry', overlapRatio: 0 });
      continue;
    }
    const decision = shouldContest(attackerRing, ring, {
      attackerLoopClosed: act.loopClosed,
      attackerAntiCheatPassed: act.antiCheatPassed,
      // Protection d'onboarding : évaluée SEULEMENT quand la date de création du
      // propriétaire est réellement connue (cf. `CandidateTerritory`).
      ...(t.ownerCreatedAtMs !== null
        ? { defenderOnboarding: { ownerCreatedAtMs: t.ownerCreatedAtMs, nowMs } }
        : {}),
    });
    if (!decision.contested) {
      skipped.push({
        territoryId: t.id,
        reason: decision.reason,
        overlapRatio: decision.overlapRatio,
      });
      continue;
    }
    opens.push({
      territoryId: t.id,
      attackerType: 'user',
      attackerId: act.actorUserId,
      sourceActivityId: act.runId,
      overlapRatio: decision.overlapRatio,
      // Décision 3 : la fenêtre part de l'INGESTION, jamais de la fin de course.
      startedAtMs: nowMs,
      expiresAtMs: contestDeadline(nowMs, level),
      defenseLevelAtOpen: level,
    });
  }

  return { opens, defenses, skipped, defenseRefusals };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ÉTAT DU TERRITOIRE APRÈS LE PLAN (§5.3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * État à écrire sur `territories` quand une contestation s'OUVRE : §5.3 nomme
 * `contested`, et la carte le peint en violet (`territoriesSource.ts`,
 * `territoryRole` : « contesté gagne sur la propriété »). Constante nommée
 * plutôt que littérale à quatre endroits.
 */
export const TERRITORY_STATE_CONTESTED = 'contested';

/**
 * État après une DÉFENSE réussie : §5.3 a un état `defended`, et c'est lui
 * qu'on écrit — pas un retour à `owned_personal`.
 *
 * POURQUOI. `defended` est PEIGNABLE et se colore par la PROPRIÉTÉ (seul
 * `contested` détourne la couleur), donc l'écran ne change pas de sens : la
 * zone redevient chartreuse pour son tenant. Revenir à `owned_personal`
 * effacerait au contraire l'information « cette zone a été défendue », que la
 * spec veut justement conserver. Aucune transition ne ramène ensuite un
 * territoire de `defended` vers `owned_*` : une nouvelle contestation le passe
 * `contested`, et son issue le repose sur `defended` ou sur la propriété du
 * vainqueur. Écart assumé, inscrit en suspens.
 */
export const TERRITORY_STATE_DEFENDED = 'defended';

/**
 * État de propriété correspondant à un type de propriétaire — utilisé par le
 * TRANSFERT (0080) et par rien d'autre ici. Exporté pour que le SQL et le TS
 * ne se contredisent pas sans qu'on s'en aperçoive : le test de 0080 compare la
 * valeur écrite par la fonction SQL à celle-ci.
 */
export function ownedStateFor(ownerType: 'user' | 'crew'): 'owned_personal' | 'owned_crew' {
  return ownerType === 'crew' ? 'owned_crew' : 'owned_personal';
}

// ═══════════════════════════════════════════════════════════════════════════
// CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
// (un point refermé se RETIRE d'ici ; il ne se laisse pas traîner comme ouvert)
// ═══════════════════════════════════════════════════════════════════════════
// 1. LES DEUX PROPRIÉTÉS PEUVENT DIVERGER PENDANT LA TRANSITION. `claim_hexes`
//    transfère toujours les CELLULES dans la transaction (0070:610) tandis que
//    ce câblage n'ouvre qu'une contestation sur le POLYGONE. Un joueur peut donc
//    voir ses cellules changer de main immédiatement (modèle hexagonal, celui
//    qui compte les points) pendant que sa zone n'est que « contestée » (modèle
//    polygonal, celui que la carte peint). Résorber l'écart demande de retirer
//    le vol instantané de `claim_hexes` ET les quatre protections de
//    `claims.ts` étape 6 EN MÊME TEMPS — atomique, et hors du périmètre de ce
//    chantier (voir `handoff`).
// 2. LES CANDIDATS SONT BORNÉS PAR VILLE ET PAR DISCIPLINE, PAS PAR GÉOMÉTRIE.
//    `territories.geometry` est du `jsonb` sans index spatial (0074 §1 : PostGIS
//    est installé mais aucune colonne `geometry` typée n'existe). L'appelant lit
//    donc les territoires de la MÊME ville (ou sans ville) et de la MÊME
//    discipline, puis ce module écarte le reste par le calcul. Deux
//    conséquences réelles : (a) un territoire rattaché à une AUTRE ville n'est
//    jamais contesté, même si les polygones se chevauchent à une frontière
//    communale ; (b) le coût croît linéairement avec le nombre de territoires
//    d'une ville. Le correctif est une colonne `geography` + index GiST, à faire
//    avec la bascule des lectures.
// 3. `cancelled` N'EST TOUJOURS PRODUIT PAR RIEN. Ni ce module ni 0080 ne
//    l'écrivent : une course invalidée a posteriori laisse sa contestation
//    ouverte jusqu'à l'échéance. Le statut existe (§19.3), il reste inemployé.
// 4. AUCUNE NOTIFICATION. §9.4 veut que le propriétaire soit averti de la
//    contestation et de son issue. Ce module produit un plan ; personne ne
//    pousse encore quoi que ce soit (`steal_push_queue` n'est alimentée que par
//    le vol hexagonal). Un joueur peut donc perdre une zone sans l'avoir su.
// 5. PAS DE RETOUR DE `defended` VERS `owned_*`. Voir `TERRITORY_STATE_DEFENDED`.
