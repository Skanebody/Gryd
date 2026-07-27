/**
 * GRYD — E50 « Statistiques du crew » + E54 « Classement crews » : LECTURE PURE.
 *
 * Ce fichier ne contient AUCUN React et AUCUNE I/O — il transforme le jsonb des
 * RPC `crew_stats()` / `crew_board()` (migration 0086) en états que l'écran peut
 * rendre sans jamais deviner. Le câblage vit dans `statsData.ts`, testé nulle
 * part et n'ayant rien à décider ; la décision, elle, est ici et elle est testée
 * en Deno (`stats.test.ts`).
 *
 * ═══ LA SEULE RÈGLE QUI COMPTE DANS CE FICHIER ══════════════════════════════
 * `{ok:false}` NE DEVIENT JAMAIS UNE LISTE VIDE. C'est la faute que la doctrine
 * interdit : une liste vide AFFIRME « personne n'a couru ici », alors qu'un
 * refus ou un contrat inattendu n'affirme rien du tout. Les états sont donc
 * DISTINCTS de bout en bout, et le type les rend impossibles à confondre :
 *
 *   · 'loading'         la lecture est EN COURS — n'affirme rien sur le monde ;
 *   · 'signed_out'      pas de compte : il n'y a pas de « ma ville » ;
 *   · 'city_unknown'    connecté, `users.city_id` NULL — aucune ville à classer ;
 *   · 'never_refreshed' GRYD n'a JAMAIS calculé ce classement. Un fait sur GRYD,
 *                       pas sur les joueurs. C'est l'état dans lequel le dépôt a
 *                       vécu depuis 0002 sans le savoir (la matview n'était
 *                       rafraîchie par aucun job — constat 0044) ;
 *   · 'unavailable'     la lecture a ÉCHOUÉ (réseau, RLS, backend absent) ;
 *   · 'empty'           lecture RÉUSSIE, aucun crew ne tient de terrain ici.
 *                       Un fait sur le MONDE, et il est vrai aujourd'hui ;
 *   · 'ready'           des lignes réelles.
 *
 * 'never_refreshed' et 'empty' se ressemblent à l'écran (aucune ligne) et ne
 * disent PAS la même chose. Les fondre transformerait un job absent en jugement
 * sur les joueurs — ou l'inverse. Les catalogues i18n portent déjà les deux
 * phrases séparément (`boardNoSourceCrews` vs `crewBoardEmpty`).
 *
 * ═══ AUCUNE VALEUR N'EST FABRIQUÉE ═════════════════════════════════════════
 * Aucun `?? 0` sur une mesure absente : une mesure illisible fait TOMBER la
 * ligne (board) ou rendre `null` (stats). Un « 0 » nu affirmerait que le crew
 * n'a rien fait. Les seuls `0` produits ici viennent du serveur, où ils sont des
 * faits mesurés.
 *
 * ⚠ CE FICHIER NE CALCULE NI SURFACE, NI RANG, NI CONTRIBUTION pour E50 : ces
 * trois-là sont déjà rendus par `crew_overview()` (0044) et lus par
 * `useRealCrew({ withOverview: true })` — l'écran E50 lit LA MÊME SOURCE que le
 * HQ crew. Les recalculer ici produirait deux chiffres pour la même chose.
 */
import { type Activity } from '@klaim/shared';

// ═══════════════════════════════════════════════════════════════════════════
// E54 — LE CLASSEMENT DES CREWS
// ═══════════════════════════════════════════════════════════════════════════

/** Une ligne du classement. Toutes les valeurs sont MESURÉES, jamais déduites. */
export interface CrewBoardRow {
  crewId: string;
  name: string;
  /** Index d'identité crew (0..CREW_COLORS_COUNT-1). Sert le blason, PAS la carte
   *  (les couleurs de carte sont par RÔLE, jamais par crew — §C). */
  color: number;
  /** Effectif ACTIF. Ce n'est pas l'effectif historique. */
  membersActive: number;
  /** Nombre de ZONES (polygones) tenues. Jamais « hexagones » (constitution §6). */
  zonesHeld: number;
  /** Surface contrôlée validée, en m² (§10.1), dérivée de la géométrie serveur. */
  areaM2: number;
  /** Rang de COMPÉTITION : ex aequo partagés, le suivant saute. */
  rank: number;
}

export type CrewBoardStatus =
  | 'loading'
  | 'signed_out'
  | 'city_unknown'
  | 'never_refreshed'
  | 'unavailable'
  | 'empty'
  | 'ready';

export interface CrewBoard {
  status: CrewBoardStatus;
  activity: Activity;
  /** Nom de la ville, LU en base. `null` = pas de nom → aucune légende de portée. */
  cityName: string | null;
  /** Instant du dernier calcul du classement (ISO). L'écran DATE ce qu'il montre. */
  refreshedAt: string | null;
  rows: CrewBoardRow[];
  /** Nombre TOTAL de crews classés (la page peut être plus courte). */
  rankedTotal: number;
  /** Mon crew, ou `null` si je n'en ai pas. */
  myCrewId: string | null;
  /** Mon rang dans le classement COMPLET, ou `null` = crew non classé (0 m²). */
  myRank: number | null;
}

/** L'état « rien lu » — utilisé au montage et à chaque remise à zéro. */
export const emptyCrewBoard = (activity: Activity, status: CrewBoardStatus): CrewBoard => ({
  status,
  activity,
  cityName: null,
  refreshedAt: null,
  rows: [],
  rankedTotal: 0,
  myCrewId: null,
  myRank: null,
});

function asText(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Entier fini, sinon `null`. JAMAIS 0 par défaut : 0 est une affirmation. */
function asInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;
}

/** Nombre fini ≥ 0, sinon `null`. Les m² arrivent en `double precision`. */
function asArea(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
  return v;
}

/**
 * Une ligne de board, ou `null` si elle est inexploitable. Une ligne amputée est
 * ÉCARTÉE plutôt que complétée : un crew affiché sans son effectif réel, ou avec
 * une surface devinée, serait une donnée fabriquée dans un classement — la faute
 * la plus visible de toutes.
 */
export function parseCrewBoardRow(raw: unknown): CrewBoardRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const crewId = asText(r.crewId);
  const name = asText(r.name);
  const color = asInt(r.color);
  const membersActive = asInt(r.membersActive);
  const zonesHeld = asInt(r.zonesHeld);
  const areaM2 = asArea(r.areaM2);
  const rank = asInt(r.rank);
  if (
    crewId === null || name === null || color === null || membersActive === null ||
    zonesHeld === null || areaM2 === null || rank === null || rank < 1
  ) {
    return null;
  }
  return {
    crewId,
    name,
    color: Math.max(0, color),
    membersActive: Math.max(0, membersActive),
    zonesHeld: Math.max(0, zonesHeld),
    areaM2,
    rank,
  };
}

/** Les motifs de refus que 0086 peut rendre, mappés sur un état d'écran. */
const BOARD_REFUSALS: Readonly<Record<string, CrewBoardStatus>> = {
  signed_out: 'signed_out',
  city_unknown: 'city_unknown',
  never_refreshed: 'never_refreshed',
  // `bad_activity` / `bad_limit` sont des bugs d'appelant, pas des états du
  // monde : ils ne méritent pas une phrase à eux, mais ils ne doivent SURTOUT
  // pas devenir « aucun crew ». Ils retombent donc sur l'échec de lecture.
  bad_activity: 'unavailable',
  bad_limit: 'unavailable',
};

/**
 * jsonb `crew_board()` → `CrewBoard`.
 *
 * `raw` inexploitable (null, forme inconnue, contrat futur) ⇒ 'unavailable' —
 * jamais 'empty'. Ne pas savoir lire et savoir qu'il n'y a rien sont deux
 * choses, et une seule des deux se raconte au joueur.
 */
export function parseCrewBoard(raw: unknown, activity: Activity): CrewBoard {
  if (!raw || typeof raw !== 'object') return emptyCrewBoard(activity, 'unavailable');
  const root = raw as Record<string, unknown>;

  if (root.ok !== true) {
    const reason = asText(root.reason);
    return emptyCrewBoard(activity, (reason !== null ? BOARD_REFUSALS[reason] : undefined) ?? 'unavailable');
  }

  // La date du calcul est OBLIGATOIRE quand `ok` : sans elle, l'écran ne peut
  // pas dater ce qu'il montre — et un classement non daté est exactement ce que
  // 0086 vient de rendre impossible. Son absence est donc un contrat cassé.
  const refreshedAt = asText(root.refreshedAt);
  if (refreshedAt === null) return emptyCrewBoard(activity, 'unavailable');

  const rows: CrewBoardRow[] = [];
  if (Array.isArray(root.rows)) {
    for (const entry of root.rows) {
      const row = parseCrewBoardRow(entry);
      if (row !== null) rows.push(row);
    }
  }

  const rankedTotal = asInt(root.rankedTotal);
  return {
    status: rows.length > 0 ? 'ready' : 'empty',
    activity,
    cityName: asText(root.cityName),
    refreshedAt,
    rows,
    // Le total ne peut pas être inférieur à ce qu'on a effectivement lu :
    // annoncer « 2 crews classés » en affichant 3 lignes serait incohérent.
    rankedTotal: Math.max(rows.length, rankedTotal ?? 0),
    myCrewId: asText(root.myCrewId),
    myRank: asInt(root.myRank),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// E50 — LES TROIS MESURES QUE `crew_overview()` NE REND PAS
// ═══════════════════════════════════════════════════════════════════════════

/** Un point de la courbe : le lundi de la semaine ISO, et les mètres courus. */
export interface CrewTrendPoint {
  /** Début de semaine ISO (lundi), ISO 8601. */
  weekStart: string;
  /** Mètres parcourus par le crew cette semaine-là. `0` est une VRAIE valeur. */
  distanceM: number;
}

export interface CrewStats {
  activity: Activity;
  /** Profondeur de la fenêtre, en semaines (CREW_STATS_TREND_WEEKS). */
  weeks: number;
  /** Défenses RÉUSSIES sur la fenêtre (§9.3). */
  defenses: number;
  /** Distance collective des membres actifs sur la fenêtre, en mètres. */
  distanceM: number;
  /** Un point PAR SEMAINE, semaines à zéro incluses (sinon la courbe ment). */
  trend: CrewTrendPoint[];
}

export type CrewStatsStatus =
  | 'loading'
  | 'signed_out'
  | 'no_crew'
  | 'unavailable'
  | 'ready';

export interface CrewStatsState {
  status: CrewStatsStatus;
  /** Les mesures, ou `null` dans TOUS les états qui ne sont pas 'ready'. */
  stats: CrewStats | null;
}

const STATS_REFUSALS: Readonly<Record<string, CrewStatsStatus>> = {
  signed_out: 'signed_out',
  no_crew: 'no_crew',
  bad_activity: 'unavailable',
  bad_weeks: 'unavailable',
};

/** Un point de courbe, ou `null` : un point sans date ne se place nulle part. */
export function parseCrewTrendPoint(raw: unknown): CrewTrendPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const weekStart = asText(p.weekStart);
  // `distanceM` arrive en `bigint` côté Postgres : supabase-js le rend en
  // NOMBRE quand il tient, en CHAÎNE au-delà de 2^53. On accepte les deux —
  // refuser la chaîne ferait disparaître une semaine chargée de la courbe.
  const distanceM = asBigIntish(p.distanceM);
  if (weekStart === null || distanceM === null) return null;
  return { weekStart, distanceM };
}

/**
 * Un entier positif rendu soit en `number`, soit en `string` (bigint Postgres).
 * `null` si ce n'est ni l'un ni l'autre — jamais 0 de repli.
 */
function asBigIntish(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.trunc(v) : null;
  if (typeof v === 'string' && /^\d+$/.test(v)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * jsonb `crew_stats()` → `CrewStatsState`.
 *
 * Comme pour le board : un contrat inattendu donne 'unavailable', jamais des
 * zéros. Trois zéros à l'écran diraient « ce crew n'a rien défendu, rien couru »
 * — une affirmation qu'aucune lecture ratée n'autorise.
 */
export function parseCrewStats(raw: unknown, activity: Activity): CrewStatsState {
  if (!raw || typeof raw !== 'object') return { status: 'unavailable', stats: null };
  const root = raw as Record<string, unknown>;

  if (root.ok !== true) {
    const reason = asText(root.reason);
    return {
      status: (reason !== null ? STATS_REFUSALS[reason] : undefined) ?? 'unavailable',
      stats: null,
    };
  }

  const weeks = asInt(root.weeks);
  const defenses = asInt(root.defenses);
  const distanceM = asBigIntish(root.distanceM);
  if (weeks === null || weeks < 1 || defenses === null || defenses < 0 || distanceM === null) {
    return { status: 'unavailable', stats: null };
  }

  const trend: CrewTrendPoint[] = [];
  if (Array.isArray(root.trend)) {
    for (const entry of root.trend) {
      const point = parseCrewTrendPoint(entry);
      if (point !== null) trend.push(point);
    }
  }
  // Une courbe amputée n'est pas une courbe : si le serveur promet `weeks`
  // semaines et n'en rend pas autant, on refuse de tracer une forme qui ferait
  // croire à une tendance qu'on n'a pas mesurée.
  if (trend.length !== weeks) return { status: 'unavailable', stats: null };

  return {
    status: 'ready',
    stats: { activity, weeks, defenses, distanceM, trend },
  };
}

/**
 * Hauteurs relatives des barres de la courbe, en [0, 1]. PUR et testé, parce
 * qu'une normalisation ratée est un mensonge graphique — la barre la plus haute
 * DOIT être le maximum réel, et une semaine à zéro DOIT valoir zéro (jamais un
 * moignon décoratif qui ferait croire à une activité).
 *
 * Toutes les semaines à zéro ⇒ toutes les hauteurs à zéro : une courbe plate au
 * sol est la vérité, pas un cas dégénéré à maquiller.
 */
export function trendHeights(trend: readonly CrewTrendPoint[]): number[] {
  const max = trend.reduce((m, p) => (p.distanceM > m ? p.distanceM : m), 0);
  if (max <= 0) return trend.map(() => 0);
  return trend.map((p) => p.distanceM / max);
}
