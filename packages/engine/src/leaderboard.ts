/**
 * GRYD — engine/leaderboard.ts
 * §10.1 / §10.2 de la spec produit (GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md) :
 * LE CLASSEMENT SE MESURE EN SURFACE. LOT 8, brique PURE.
 *
 * ═══ LE CHANGEMENT DE FOND — LA MÉTRIQUE N'EST PLUS UN POINT ════════════════
 * Aujourd'hui le classement lit `season_scores.points` : un ENTIER attribué par
 * `claim_hexes`, une monnaie de progression. §10.1 dit autre chose — « surface
 * contrôlée validée dans le contexte choisi ». Une SURFACE, en m², DÉRIVÉE de
 * la géométrie serveur (`territories.area_m2`), donc non falsifiable par une
 * règle de bonus et non gonflable par un achat.
 *
 * ⚠️ LES DEUX AXES COEXISTENT, SÉPARÉS (arbitrage AUDIT_GRYD.md §3.3, tranché —
 * ne pas le rouvrir ici) :
 *   · SURFACE (ce fichier) = LE CLASSEMENT. m², dérivés de la géométrie.
 *   · POINTS / XP (`scoring.ts`, `season_scores`) = LA PROGRESSION et les
 *     récompenses. §10.5 : l'XP « ne modifie jamais la puissance territoriale ».
 * Aucun des deux ne se sacrifie, et RIEN ICI n'écrit, ne lit ni ne remplace
 * `season_scores`. Ce fichier ne connaît même pas l'existence des points.
 *
 * ⚠️ CE FICHIER NE CÂBLE RIEN. Il fournit le CALCUL ; la prise de snapshot
 * (Edge Function ou cron) et l'écran `apps/mobile/app/(tabs)/classement.tsx`
 * sont des lots suivants. Tant que ce câblage n'a pas eu lieu, LE CLASSEMENT
 * AFFICHÉ RESTE EN POINTS — le dire ici plutôt que laisser croire qu'écrire le
 * calcul l'a mis à l'écran.
 *
 * ═══ RUN ET BIKE NE SE MÉLANGENT JAMAIS (§1.2) ══════════════════════════════
 * « Une surface Run ne s'additionne pas à une surface Bike. » Ce n'est pas une
 * consigne d'appelant ici : `rankLeaderboard` prend la discipline en PREMIER
 * paramètre et REFUSE (`foreign_activity`) toute entrée d'un autre monde. Il n'y
 * a aucun chemin par lequel une liste mixte produirait un classement — pas même
 * un classement « approximatif ». Un refus explicite vaut mieux qu'un total
 * fabriqué.
 *
 * ═══ PURETÉ ════════════════════════════════════════════════════════════════
 * Aucune I/O, aucune horloge, aucun accès réseau ou base. Les horodatages sont
 * des paramètres (`previousSnapshotAtMs`), jamais un `Date.now()`. Aucun nombre
 * magique : ce fichier ne contient AUCUN seuil de jeu — un classement n'en a
 * pas besoin, il ordonne des mesures déjà produites.
 *
 * ═══ ANTI PAY-TO-WIN ═══════════════════════════════════════════════════════
 * Aucune fonction de ce fichier ne lit, ne prend ni ne dérive un statut payant,
 * un bonus, un objet ou un multiplicateur. Les quatre critères de §10.2 sont des
 * MESURES DE TERRAIN (surface tenue, défenses réussies, surface conquise,
 * ancienneté). Il n'existe aucun paramètre par lequel un achat pourrait entrer.
 */
import { ACTIVITIES, type Activity } from '@klaim/shared/game-rules';

// ═══════════════════════════════════════════════════════════════════════════
// LE SUJET CLASSÉ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Qui est classé. §10.3 liste « crews » au même rang que les classements de
 * joueurs : le même calcul sert les deux, seul le sujet change. Mêmes valeurs
 * EXACTES que `territories.owner_type` (0074) — un seul vocabulaire pour la
 * même chose, sinon un jour une jointure ne matche pas.
 */
export type LeaderboardSubjectType = 'user' | 'crew';

/**
 * UNE LIGNE DE MESURE, avant classement. Les quatre champs de mesure sont
 * EXACTEMENT les quatre critères de §10.2, dans l'ordre où ils départagent.
 *
 * Rien ici n'est calculé par ce module : tout arrive déjà mesuré par le serveur
 * (`leaderboard_source_metrics`, migration 0082). Le moteur ORDONNE, il ne
 * mesure pas — c'est ce qui le rend testable sans base.
 */
export type LeaderboardEntry = {
  readonly subjectType: LeaderboardSubjectType;
  readonly subjectId: string;
  /** Discipline (§1.2). Une entrée d'un autre monde fait REFUSER tout le lot. */
  readonly activity: Activity;
  /**
   * §10.2 critère 1 — LA MÉTRIQUE PRINCIPALE (§10.1) : surface contrôlée
   * validée, en m², somme des `territories.area_m2` effectivement tenus.
   */
  readonly controlledAreaM2: number;
  /**
   * §10.2 critère 2 — nombre de défenses RÉUSSIES sur la période (contestations
   * closes en `defended`, §9.3). Un entier : une demi-défense n'existe pas.
   */
  readonly successfulDefenses: number;
  /**
   * §10.2 critère 3 — surface CONQUISE sur la période, en m². Distincte du
   * critère 1 : on peut tenir beaucoup sans avoir rien pris cette semaine.
   */
  readonly conqueredAreaM2: number;
  /**
   * §10.2 critère 4 — horodatage (ms epoch) du SNAPSHOT PRÉCÉDENT de ce sujet
   * dans ce même classement. `null` = ce sujet n'a jamais été classé ici.
   */
  readonly previousSnapshotAtMs: number | null;
};

/** Une ligne CLASSÉE : la mesure, plus le rang qu'elle occupe. */
export type RankedLeaderboardEntry = LeaderboardEntry & {
  /**
   * Rang de COMPÉTITION (« 1224 ») : deux ex aequo partagent le rang, et le
   * suivant saute. Deux joueurs strictement identiques sur les QUATRE critères
   * sont deuxièmes tous les deux — jamais 2ᵉ et 3ᵉ par tirage au sort.
   */
  readonly rank: number;
  /** Combien de sujets partagent ce rang (1 = personne d'autre). */
  readonly tiedCount: number;
};

/**
 * Pourquoi un lot de mesures est REFUSÉ. Un motif = une phrase honnête côté
 * exploitation (log, alerte), jamais un `null` nu qui laisserait l'appelant
 * inventer l'explication — et jamais un classement partiel servi comme s'il
 * était complet.
 */
export type LeaderboardRejectionReason =
  /** Une entrée appartient à une AUTRE discipline (§1.2 : jamais additionnées). */
  | 'foreign_activity'
  /** Le même sujet apparaît deux fois : le fusionner inventerait une surface. */
  | 'duplicate_subject'
  /** Une mesure n'est pas un nombre fini (NaN, ±Infinity). */
  | 'measure_not_finite'
  /** Une mesure est négative : ni une surface ni un compte de défenses ne l'est. */
  | 'measure_negative'
  /** Un compte de défenses n'est pas entier. */
  | 'measure_not_integer';

export type LeaderboardRanking =
  | {
      readonly ok: true;
      /** La discipline du classement — la même pour TOUTES les lignes, par construction. */
      readonly activity: Activity;
      readonly rows: readonly RankedLeaderboardEntry[];
    }
  | {
      readonly ok: false;
      readonly reason: LeaderboardRejectionReason;
      /** Le sujet fautif, quand il est identifiable (sinon `null`). */
      readonly subjectType: LeaderboardSubjectType | null;
      readonly subjectId: string | null;
    };

// ═══════════════════════════════════════════════════════════════════════════
// §10.2 — LES QUATRE DÉPARTAGES, DANS L'ORDRE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ordonne deux mesures selon §10.2, STRICTEMENT dans l'ordre de la spec :
 *   1. surface contrôlée (décroissante) ;
 *   2. défenses réussies (décroissantes) ;
 *   3. surface conquise sur la période (décroissante) ;
 *   4. horodatage du snapshot précédent (CROISSANT — voir l'arbitrage).
 * Rend un nombre négatif si `a` passe AVANT `b`, positif si après, ZÉRO si les
 * quatre critères sont identiques (égalité PARFAITE, §10.2 in fine).
 *
 * ═══ ARBITRAGE — LE SENS DU CRITÈRE 4, QUE LA SPEC NE DONNE PAS ════════════
 * §10.2 écrit « timestamp du snapshot précédent » sans dire quel sens gagne. Il
 * fallait trancher, parce qu'un critère dont le sens n'est pas fixé n'est pas un
 * départage : c'est un tirage au sort déguisé. LE PLUS ANCIEN PASSE DEVANT —
 * à performance égale, celui qui occupait déjà ce classement avant l'autre garde
 * l'avantage. C'est la seule lecture qui récompense le TERRAIN plutôt que la
 * fraîcheur d'une écriture, et elle est stable : elle ne change pas d'avis d'un
 * snapshot à l'autre.
 * Corollaire assumé : `null` (jamais classé ici) passe EN DERNIER parmi les ex
 * aequo. Un nouveau venu n'a rien à faire valoir sur ce critère — lui donner
 * l'avantage reviendrait à faire tomber un joueur installé pour cause de
 * nouveauté, et lui inventer une ancienneté serait fabriquer une donnée.
 *
 * ═══ POURQUOI AUCUN EPSILON SUR LES SURFACES ═══════════════════════════════
 * Comparer deux `double` à 1e-6 près rendrait la comparaison NON TRANSITIVE
 * (a ≈ b, b ≈ c, mais a < c) : le tri deviendrait dépendant de l'ordre d'entrée
 * et le classement changerait sans qu'aucune surface ait bougé. Les deux
 * surfaces comparées ici sortent du MÊME calcul serveur ; leur égalité exacte
 * est une information, pas un artefact. On compare donc exactement, et l'égalité
 * parfaite est traitée comme telle (rang partagé) au lieu d'être cachée.
 */
export function compareLeaderboardEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  // 1. Surface contrôlée — la métrique principale (§10.1).
  if (a.controlledAreaM2 !== b.controlledAreaM2) {
    return b.controlledAreaM2 - a.controlledAreaM2;
  }
  // 2. Défenses réussies.
  if (a.successfulDefenses !== b.successfulDefenses) {
    return b.successfulDefenses - a.successfulDefenses;
  }
  // 3. Surface conquise sur la période.
  if (a.conqueredAreaM2 !== b.conqueredAreaM2) {
    return b.conqueredAreaM2 - a.conqueredAreaM2;
  }
  // 4. Ancienneté dans ce classement. `null` = jamais classé → dernier.
  const at = a.previousSnapshotAtMs;
  const bt = b.previousSnapshotAtMs;
  if (at === bt) return 0;
  if (at === null) return 1;
  if (bt === null) return -1;
  return at - bt;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CLASSEMENT
// ═══════════════════════════════════════════════════════════════════════════

/** Clé d'unicité d'un sujet — un joueur et un crew peuvent porter le même uuid. */
function subjectKey(entry: LeaderboardEntry): string {
  return `${entry.subjectType}:${entry.subjectId}`;
}

function reject(
  reason: LeaderboardRejectionReason,
  entry: LeaderboardEntry | null,
): LeaderboardRanking {
  return {
    ok: false,
    reason,
    subjectType: entry ? entry.subjectType : null,
    subjectId: entry ? entry.subjectId : null,
  };
}

/**
 * CLASSE un lot de mesures pour UNE discipline (§10.1/§10.2).
 *
 * La discipline est le PREMIER paramètre, et c'est délibéré : le classement
 * appartient à un monde (§1.2), il ne le devine pas. Toute entrée d'un autre
 * monde fait refuser le lot entier — jamais un filtrage silencieux, qui
 * produirait un classement amputé ayant l'air complet.
 *
 * LISTE VIDE ⇒ `ok` avec ZÉRO ligne, jamais une erreur : « personne n'est
 * classé » est un ÉTAT RÉEL du jeu (début de saison, ville qui vient d'ouvrir),
 * pas une panne. C'est à l'écran de le dire (« vide » ≠ « échec »), et il ne
 * peut le dire que si le moteur distingue les deux.
 *
 * DÉTERMINISME : à entrée identique, sortie identique — toujours. Le tri est
 * stable et, en cas d'égalité PARFAITE sur les quatre critères, l'ordre rendu
 * est celui de l'ENTRÉE (aucun `Math.random`, aucune comparaison d'uuid, aucune
 * dépendance à l'implémentation de `Array.prototype.sort`). Les ex aequo
 * portent de toute façon LE MÊME RANG : leur ordre d'affichage n'avantage
 * personne. L'appelant qui veut un affichage reproductible d'un snapshot à
 * l'autre fournit une entrée ordonnée (ex. `order by subject_id`).
 */
export function rankLeaderboard(
  activity: Activity,
  entries: readonly LeaderboardEntry[],
): LeaderboardRanking {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.activity !== activity) return reject('foreign_activity', entry);

    const key = subjectKey(entry);
    if (seen.has(key)) return reject('duplicate_subject', entry);
    seen.add(key);

    const measures = [entry.controlledAreaM2, entry.successfulDefenses, entry.conqueredAreaM2];
    for (const m of measures) {
      if (!Number.isFinite(m)) return reject('measure_not_finite', entry);
      if (m < 0) return reject('measure_negative', entry);
    }
    if (!Number.isInteger(entry.successfulDefenses)) {
      return reject('measure_not_integer', entry);
    }
    if (entry.previousSnapshotAtMs !== null && !Number.isFinite(entry.previousSnapshotAtMs)) {
      return reject('measure_not_finite', entry);
    }
  }

  // Décoration par l'index d'entrée : le rang d'arrivée d'une égalité parfaite
  // est l'ordre d'entrée, EXPLICITEMENT, et non « ce que fait le moteur JS ».
  const decorated = entries.map((entry, index) => ({ entry, index }));
  decorated.sort((x, y) => {
    const c = compareLeaderboardEntries(x.entry, y.entry);
    return c !== 0 ? c : x.index - y.index;
  });

  // Rang de COMPÉTITION : les ex aequo partagent le rang, le suivant saute.
  // Deux passes plutôt qu'une : la seconde a besoin de `tiedCount`, qui n'est
  // connu qu'une fois le groupe d'égalité entièrement parcouru.
  const ranks: number[] = new Array(decorated.length);
  const tied: number[] = new Array(decorated.length);
  let groupStart = 0;
  for (let i = 1; i <= decorated.length; i += 1) {
    const sameAsGroup =
      i < decorated.length &&
      compareLeaderboardEntries(decorated[groupStart]!.entry, decorated[i]!.entry) === 0;
    if (sameAsGroup) continue;
    const size = i - groupStart;
    for (let j = groupStart; j < i; j += 1) {
      ranks[j] = groupStart + 1;
      tied[j] = size;
    }
    groupStart = i;
  }

  const rows = decorated.map((d, i) => ({
    ...d.entry,
    rank: ranks[i]!,
    tiedCount: tied[i]!,
  }));

  return { ok: true, activity, rows };
}

/**
 * SÉPARE un lot mixte par discipline, sans jamais rien additionner (§1.2).
 *
 * Utile au preneur de snapshot, qui lit la base une fois et doit produire DEUX
 * classements. Rend une entrée par discipline connue — y compris VIDE : « aucun
 * cycliste classé » est un fait, et il doit pouvoir être écrit tel quel plutôt
 * que disparaître de la sortie (une discipline absente se lirait « pas encore
 * calculé », ce qui est une autre affirmation).
 */
export function groupLeaderboardByActivity(
  entries: readonly LeaderboardEntry[],
): Readonly<Record<Activity, readonly LeaderboardEntry[]>> {
  const grouped = {} as Record<Activity, LeaderboardEntry[]>;
  for (const activity of ACTIVITIES) grouped[activity] = [];
  for (const entry of entries) grouped[entry.activity].push(entry);
  return grouped;
}
