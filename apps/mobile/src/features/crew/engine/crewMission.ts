// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/crewMission.ts (drift testé côté Deno).

/**
 * GRYD — engine/crewMission.ts (AMENDEMENT-43 §0, maillon 3 : « je cours pour
 * l'AIDER »).
 *
 * LE PROBLÈME QUE CE FICHIER RÉSOUT. Un crew qui affiche seulement un compteur
 * partagé n'est pas un crew : c'est un club Strava avec une somme. Le maillon 3
 * de la boucle exige que le crew ait TOUJOURS AU PLUS UNE mission prioritaire —
 * une phrase, un manque chiffré, une action. `chooseCrewMission` est cette
 * dérivation, et elle est PURE : aucune I/O, aucune horloge (le `nowMs` est
 * fourni), aucun aléa. Mêmes entrées ⇒ même mission, toujours.
 *
 * ═══ CE QUI EST INTERDIT ICI (contrainte fondateur, CLAUDE.md) ═══════════════
 * Cette fonction n'INVENTE RIEN : ni zone, ni rival, ni distance, ni urgence.
 * Chaque champ d'une mission renvoyée provient d'un fait mesuré en base :
 *   · un compte de zones réellement tenues / réellement perdues ;
 *   · une échéance de decay réellement posée en base (`hex_claims.decay_at`) ;
 *   · un nom de secteur réellement géocodé (`sectors.name`, discover_sectors) ;
 *   · des mètres réellement manquants sur une boucle ouverte
 *     (`partial_boundaries.missing_m`, calculés serveur).
 * Il n'y a AUCUNE constante « d'ambiance », aucun rival nommé, aucun classement
 * fabriqué. Quand l'état réel ne permet de dériver aucune mission, on renvoie
 * `{ kind: 'none' }` — un ÉTAT HONNÊTE, pas un échec, et surtout pas un prétexte
 * à inventer un objectif.
 *
 * ═══ POURQUOI DES AGRÉGATS PAR SECTEUR EN ENTRÉE ════════════════════════════
 * Le serveur (RPC `crew_mission_inputs`, migration 0049) agrège par secteur au
 * lieu de renvoyer un hex par ligne : la charge utile reste bornée par le nombre
 * de secteurs touchés, pas par le territoire du crew. La DÉCISION — quelle
 * mission, quel secteur, quels ex aequo — reste ici, pure et testée.
 *
 * Aucun nombre magique : les seuils viennent de @klaim/shared/game-rules.
 */
import {
  CREW_MISSION_CAPTURE_MIN_FREE,
  CREW_MISSION_RECLAIM_WINDOW_H,
  ZONE_DEFEND_WINDOW_HOURS,
} from '@klaim/shared';

// ─── Entrées : l'état RÉEL du crew, tel que lu en base ────────────────────────

/**
 * Agrégat d'un secteur touché par le crew. Un secteur apparaît ici s'il contient
 * au moins une zone tenue par le crew OU une zone que le crew a récemment perdue.
 *
 * `sectorId`/`sectorName` peuvent être `null` : `discover_sectors` rattache et
 * NOMME les secteurs de façon asynchrone (Nominatim, rate-limité), donc une
 * capture toute fraîche n'a pas encore de secteur. C'est un état normal, pas une
 * erreur — la mission est alors sans nom de lieu, et l'écran dit « notre
 * territoire » plutôt que d'inventer un quartier.
 */
export interface CrewSectorState {
  sectorId: string | null;
  /** Nom RÉEL (reverse-geocode) ou `null` si le secteur n'est pas encore nommé. */
  sectorName: string | null;
  /** Zones vivantes tenues par des membres ACTIFS dans ce secteur. */
  heldTotal: number;
  /**
   * Parmi elles, celles dont l'échéance de decay tombe dans les
   * ZONE_DEFEND_WINDOW_HOURS à venir. Comptées en base (le seuil est passé à la
   * RPC depuis game-rules : aucun nombre magique en SQL non plus).
   */
  expiringSoon: number;
  /** Échéance de decay la PLUS PROCHE du secteur (ms epoch), `null` si aucune. */
  earliestDecayAt: number | null;
  /**
   * Zones DISTINCTES perdues au profit d'un autre crew dans la fenêtre
   * CREW_MISSION_RECLAIM_WINDOW_H et NON reprises depuis. Source :
   * `contested_group_runs` (prev_owner_crew_id = nous, winner_crew_id = autre).
   */
  lostRecently: number;
  /** Date (ms epoch) de la perte la plus récente du secteur, `null` si aucune. */
  lastLostAt: number | null;
  /**
   * Zones RÉELLEMENT libres du secteur (`sectors.total_hexes` − claims vivants).
   * `null` = INCONNU (secteur pas encore créé/nommé, donc pas de total fiable) :
   * on ne le lit surtout pas comme « 0 libre », et on ne l'estime jamais.
   */
  freeHexes: number | null;
}

/**
 * Boucle de frontière OUVERTE du crew (`partial_boundaries`, status 'open').
 * `missingM` est le manque calculé SERVEUR pour refermer l'anneau — jamais une
 * distance estimée côté client. Aucune géométrie ne transite (0015 : segments,
 * opener_ring et missing_segment restent serveur only).
 */
export interface CrewLoopState {
  id: string;
  /** Nom lisible de la frontière (UX, posé à l'ouverture). */
  name: string;
  /** Mètres restants pour fermer. > 0 attendu ; ≤ 0 ⇒ ignoré (déjà fermable). */
  missingM: number;
  /** Expiration de la boucle (ms epoch), `null` si non lisible. */
  expiresAt: number | null;
}

/** Photographie complète de ce que le crew peut décider MAINTENANT. */
export interface CrewMissionState {
  /** Horloge fournie par l'appelant — la fonction reste pure. */
  nowMs: number;
  sectors: readonly CrewSectorState[];
  loops: readonly CrewLoopState[];
}

// ─── Sortie : AU PLUS UNE mission ────────────────────────────────────────────

/**
 * Motif d'absence de mission. Les deux se disent DIFFÉREMMENT à l'écran :
 *  · `no_data`        : on ne sait rien (crew tout neuf, sans territoire ni
 *                       perte ni boucle). « Rien à défendre : prenez une
 *                       première zone. »
 *  · `nothing_urgent` : on sait, et il n'y a réellement rien à faire en
 *                       priorité (territoire stable, aucune perte, aucune boucle
 *                       ouverte, aucun secteur assez libre). « Tout est stable. »
 * Aucun des deux n'est un échec technique : ce sont des VÉRITÉS sur l'état du
 * crew. Un échec de lecture ne passe pas par ici — il ne produit aucun bloc.
 */
export type CrewMissionNoneReason = 'no_data' | 'nothing_urgent';

export type CrewMission =
  /** Du territoire À NOUS expire bientôt : le repasser le repousse. */
  | {
      kind: 'defend';
      sectorId: string | null;
      sectorName: string | null;
      /** Zones qui expirent dans la fenêtre. ≥ 1. */
      zones: number;
      /** Échéance la plus proche (ms epoch) — la vraie, celle de la base. */
      deadlineAt: number;
    }
  /** Un autre crew nous a pris des zones récemment : aller les reprendre. */
  | {
      kind: 'reclaim';
      sectorId: string | null;
      sectorName: string | null;
      /** Zones distinctes perdues et pas encore reprises. ≥ 1. */
      zones: number;
      /** Perte la plus récente (ms epoch). */
      lastLostAt: number;
    }
  /** Une boucle ouverte par un membre attend son dernier segment. */
  | {
      kind: 'close_loop';
      loopId: string;
      name: string;
      /** Mètres manquants calculés serveur. > 0. */
      missingM: number;
      expiresAt: number | null;
    }
  /** Un secteur où le crew court déjà a des zones libres à prendre. */
  | {
      kind: 'capture';
      sectorId: string | null;
      sectorName: string | null;
      /** Zones libres comptées (≥ CREW_MISSION_CAPTURE_MIN_FREE). */
      freeZones: number;
    }
  /** Aucune mission dérivable — état honnête, cf. CrewMissionNoneReason. */
  | { kind: 'none'; reason: CrewMissionNoneReason };

// ─── Garde-fous d'entrée ─────────────────────────────────────────────────────

/** Entier fini ≥ 0, sinon 0. Une valeur aberrante ne doit jamais créer d'urgence. */
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Timestamp fini, sinon `null`. */
function stamp(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Comparateur d'ex aequo STABLE et lisible par un humain : nom de secteur
 * alphabétique, les secteurs sans nom EN DERNIER (on préfère annoncer un lieu
 * réel quand il en existe un), puis id. Jamais de tirage au sort : deux lectures
 * de suite doivent donner la même mission, sinon l'écran a l'air de mentir.
 */
function byNameThenId(
  a: { sectorName: string | null; sectorId: string | null },
  b: { sectorName: string | null; sectorId: string | null },
): number {
  if (a.sectorName !== b.sectorName) {
    if (a.sectorName === null) return 1;
    if (b.sectorName === null) return -1;
    return a.sectorName < b.sectorName ? -1 : 1;
  }
  const ai = a.sectorId ?? '';
  const bi = b.sectorId ?? '';
  return ai === bi ? 0 : ai < bi ? -1 : 1;
}

// ─── La dérivation ───────────────────────────────────────────────────────────

/**
 * Choisit LA mission prioritaire du crew, ou `none`. PURE.
 *
 * ORDRE DE PRIORITÉ — et pourquoi cet ordre (c'est un arbitrage, il se défend) :
 *
 *  1. `defend`     — c'est DÉJÀ à nous et une échéance réelle court. C'est la
 *                    seule situation où ne rien faire coûte du territoire à coup
 *                    sûr, et où le délai est imposé de l'extérieur. L'urgence
 *                    n'est pas dramatisée : elle est datée en base.
 *  2. `reclaim`    — la perte est faite, mais elle est FRAÎCHE et adressée à
 *                    quelqu'un. C'est le moment où le crew a une raison de courir
 *                    ensemble. Passé CREW_MISSION_RECLAIM_WINDOW_H, ça sort tout
 *                    seul du calcul plutôt que de devenir une rancune inventée.
 *  3. `close_loop` — du travail DÉJÀ investi par un membre, qu'il suffit de
 *                    terminer, et qui expire. Avant la capture pure car le coût
 *                    marginal est le plus faible du lot.
 *  4. `capture`    — toujours disponible tant qu'il reste du libre : c'est le
 *                    fond de roulement, donc le dernier recours.
 *
 * `nowMs` sert uniquement à écarter ce qui est déjà passé (échéance dépassée,
 * boucle expirée) : les fenêtres, elles, sont appliquées en base au moment de la
 * lecture. La fonction ne recalcule aucune date.
 */
export function chooseCrewMission(state: CrewMissionState): CrewMission {
  const now = stamp(state.nowMs) ?? 0;
  const sectors = Array.isArray(state.sectors) ? state.sectors : [];
  const loops = Array.isArray(state.loops) ? state.loops : [];

  // ── 1. DÉFENDRE ────────────────────────────────────────────────────────────
  // Une échéance déjà DÉPASSÉE n'est pas défendable : la zone est perdue, pas
  // menacée. On l'écarte au lieu d'afficher un compte à rebours négatif.
  const defendable = sectors
    .map((s) => ({
      sectorId: s.sectorId ?? null,
      sectorName: s.sectorName ?? null,
      zones: count(s.expiringSoon),
      deadlineAt: stamp(s.earliestDecayAt),
    }))
    .filter(
      (s): s is { sectorId: string | null; sectorName: string | null; zones: number; deadlineAt: number } =>
        s.zones > 0 && s.deadlineAt !== null && s.deadlineAt > now,
    );

  if (defendable.length > 0) {
    // Le plus de zones menacées d'abord (c'est ce qui se perd), puis la
    // deadline la plus proche (c'est ce qui se perd EN PREMIER), puis stable.
    defendable.sort(
      (a, b) => b.zones - a.zones || a.deadlineAt - b.deadlineAt || byNameThenId(a, b),
    );
    const top = defendable[0]!;
    return {
      kind: 'defend',
      sectorId: top.sectorId,
      sectorName: top.sectorName,
      zones: top.zones,
      deadlineAt: top.deadlineAt,
    };
  }

  // ── 2. REPRENDRE ───────────────────────────────────────────────────────────
  const lost = sectors
    .map((s) => ({
      sectorId: s.sectorId ?? null,
      sectorName: s.sectorName ?? null,
      zones: count(s.lostRecently),
      lastLostAt: stamp(s.lastLostAt),
    }))
    .filter(
      (s): s is { sectorId: string | null; sectorName: string | null; zones: number; lastLostAt: number } =>
        s.zones > 0 && s.lastLostAt !== null,
    );

  if (lost.length > 0) {
    // Le plus de zones perdues, puis la perte la plus RÉCENTE (celle dont le
    // crew se souvient), puis stable.
    lost.sort((a, b) => b.zones - a.zones || b.lastLostAt - a.lastLostAt || byNameThenId(a, b));
    const top = lost[0]!;
    return {
      kind: 'reclaim',
      sectorId: top.sectorId,
      sectorName: top.sectorName,
      zones: top.zones,
      lastLostAt: top.lastLostAt,
    };
  }

  // ── 3. TERMINER UNE BOUCLE ─────────────────────────────────────────────────
  const open = loops
    .map((l) => ({
      loopId: typeof l.id === 'string' ? l.id : '',
      name: typeof l.name === 'string' ? l.name : '',
      missingM: typeof l.missingM === 'number' && Number.isFinite(l.missingM) ? l.missingM : 0,
      expiresAt: stamp(l.expiresAt),
    }))
    .filter((l) => l.loopId !== '' && l.missingM > 0 && (l.expiresAt === null || l.expiresAt > now));

  if (open.length > 0) {
    // La plus PROCHE d'être finie d'abord (moins de mètres = plus atteignable
    // ce soir), puis celle qui expire le plus tôt, puis id (stabilité).
    open.sort(
      (a, b) =>
        a.missingM - b.missingM ||
        (a.expiresAt ?? Number.POSITIVE_INFINITY) - (b.expiresAt ?? Number.POSITIVE_INFINITY) ||
        (a.loopId < b.loopId ? -1 : a.loopId > b.loopId ? 1 : 0),
    );
    const top = open[0]!;
    return {
      kind: 'close_loop',
      loopId: top.loopId,
      name: top.name,
      missingM: top.missingM,
      expiresAt: top.expiresAt,
    };
  }

  // ── 4. CAPTURER DU LIBRE ───────────────────────────────────────────────────
  // « PROCHE » n'est PAS une distance inventée : c'est un secteur où le crew
  // tient déjà du terrain, donc où ses membres courent déjà. On ne calcule
  // aucun rayon, on ne compare aucune position.
  const free = sectors
    .map((s) => ({
      sectorId: s.sectorId ?? null,
      sectorName: s.sectorName ?? null,
      heldTotal: count(s.heldTotal),
      // `null` (inconnu) ≠ 0 : un secteur sans total fiable est simplement écarté.
      freeZones: typeof s.freeHexes === 'number' && Number.isFinite(s.freeHexes)
        ? Math.max(0, Math.floor(s.freeHexes))
        : -1,
    }))
    .filter((s) => s.heldTotal > 0 && s.freeZones >= CREW_MISSION_CAPTURE_MIN_FREE);

  if (free.length > 0) {
    // Là où le crew est le plus implanté d'abord (le plus « chez nous »), puis
    // là où il reste le plus à prendre, puis stable.
    free.sort((a, b) => b.heldTotal - a.heldTotal || b.freeZones - a.freeZones || byNameThenId(a, b));
    const top = free[0]!;
    return {
      kind: 'capture',
      sectorId: top.sectorId,
      sectorName: top.sectorName,
      freeZones: top.freeZones,
    };
  }

  // ── Aucune mission : on le DIT, on n'en fabrique pas une ───────────────────
  return {
    kind: 'none',
    reason: sectors.length === 0 && loops.length === 0 ? 'no_data' : 'nothing_urgent',
  };
}

/**
 * Fenêtres réellement appliquées, exportées pour que l'appelant les passe à la
 * RPC (le seuil vit dans game-rules, pas dans le SQL). `defendWindowH` réutilise
 * ZONE_DEFEND_WINDOW_HOURS : « à défendre » a déjà une définition dans le jeu,
 * la mission ne s'en invente pas une deuxième.
 */
export const CREW_MISSION_WINDOWS = {
  defendWindowH: ZONE_DEFEND_WINDOW_HOURS,
  reclaimWindowH: CREW_MISSION_RECLAIM_WINDOW_H,
} as const;
