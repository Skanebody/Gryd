/**
 * GRYD — E66 « ANALYTICS TERRITORIALES » : LE CALCUL, ET RIEN QUE LE CALCUL.
 *
 * Module PUR : aucun import React, aucun accès réseau, aucune horloge. `nowMs`
 * est TOUJOURS un paramètre — même exigence que `packages/engine` et que
 * `premium/entitlement.ts`, et même bénéfice : les bornes d'une fenêtre de 90
 * jours se testent à la milliseconde près sous Deno, sans attendre 90 jours.
 *
 * ══ ANTI PAY-TO-WIN (§1.6, CONSTITUTIONNEL) ═══════════════════════════════
 * Ce module ne rend AUCUNE capacité de jeu. Il ne décide pas d'une capture,
 * d'une défense, d'un point, d'un classement, d'une protection ni d'une
 * priorité : il RÉSUME ce qui s'est déjà produit. Un joueur Club et un joueur
 * gratuit qui courent la même sortie obtiennent EXACTEMENT le même territoire —
 * l'un le comprend mieux, c'est tout, et c'est précisément ce que §1.6 range
 * dans le vendable (« analyses avancées, outils de planification et de replay »).
 * Le jour où une valeur d'ici entrerait dans `packages/engine` ou dans une Edge
 * Function de capture, ce serait un défaut de conformité, pas une feature.
 *
 * ══ §12 / E66 : ON COMPREND SON PROPRE TERRITOIRE, ON N'ESPIONNE PERSONNE ══
 * La spec est catégorique : « Aucune information privée sur les rivaux. Le
 * Premium aide à comprendre SON PROPRE territoire, pas à espionner. »
 * Ce fichier applique la règle par la FORME DE SES ENTRÉES, pas par une
 * discipline d'appelant :
 *   · `OwnedTerritoryRow` n'a NI `owner_type` NI `owner_id`. Le filtre
 *     « c'est à moi » est fait par le SQL (`read.ts`), et le calcul ne peut
 *     donc pas, même par accident, agréger le territoire d'un tiers ;
 *   · `OwnContestRow` n'a NI `attacker_type` NI `attacker_id`. Une contestation
 *     dit « quelqu'un a couru ici, à cette heure-là, et voici qui »
 *     (RLS de 0078) : le camp qui défend a le droit de savoir qu'il est
 *     attaqué, PAS d'en tirer une fiche de renseignement. L'identité de
 *     l'assaillant n'entre donc jamais dans ce module — elle n'est même pas
 *     demandée au serveur ;
 *   · une contestation qui ne vise AUCUN de mes territoires est IGNORÉE. Elle
 *     m'est pourtant lisible quand c'est MOI qui attaque (0078 : la policy
 *     ouvre aux deux camps) — l'agréger ferait entrer dans « mes stats » le
 *     territoire de quelqu'un d'autre.
 *
 * ══ CE QUE CE MODULE REFUSE DE CALCULER, ET POURQUOI ══════════════════════
 * LES PERTES PAR TRANSFERT NE SONT PAS DÉRIVABLES. Quand une contestation
 * arrive à échéance, `resolve_due_contests` (0080) réécrit `territories.owner_*`
 * au profit de l'assaillant. Or la policy `territory_contests_select_parties`
 * (0078) ouvre la ligne au camp défenseur *via le territoire visé* : dès que le
 * territoire change de mains, l'ANCIEN propriétaire cesse de voir la
 * contestation qui l'a dépossédé. Il n'existe aucune table d'historique de
 * propriété. Conséquence : « tu as perdu N zones ces 90 jours » est INTENABLE.
 * On ne l'affiche donc pas — et surtout, `AnalyticsWindow` ne porte AUCUN champ
 * `lostZones` qui vaudrait `0`. Un zéro serait lu comme « tu n'as rien perdu »,
 * c'est-à-dire la version la plus tentante du mensonge : celle qui flatte.
 * `lossesDerivable: false` existe pour que l'écran DISE l'absence au lieu de la
 * combler. (Même doctrine que l'écart n° 2 de `app/performance.tsx`.)
 *
 * ══ AUCUN NOMBRE MAGIQUE ══════════════════════════════════════════════════
 * La fenêtre d'analyse n'est pas « 90 » écrit ici : c'est
 * `RAW_POLYLINE_RETENTION_DAYS` (`packages/shared/src/game-rules.ts`), et le
 * lien est CAUSAL, pas cosmétique — on n'analyse pas plus loin que ce que le
 * projet accepte de conserver. C'est le raisonnement exact que `game-rules.ts`
 * tient déjà pour `HABITS_HISTORY_DAYS` ; on le RÉUTILISE au lieu d'ouvrir une
 * seconde valeur qui dériverait un jour de la première.
 */
import { RAW_POLYLINE_RETENTION_DAYS } from '@klaim/shared';
import { parsePolygonRings, type PolygonRing } from '../../map/territoriesSource';

/**
 * Fenêtre d'analyse, en jours. DÉRIVÉE, jamais saisie : voir l'en-tête.
 * Exposée pour que la copie de l'écran écrive « 90 jours » depuis la valeur
 * réelle plutôt que depuis un souvenir de la spec.
 */
export const TERRITORY_ANALYTICS_WINDOW_DAYS = RAW_POLYLINE_RETENTION_DAYS;

/** Conversion d'unité (ms → jour). Pas une règle de jeu : rien à arbitrer. */
const MS_PER_DAY = 86_400_000;

/**
 * États de `territories` (0074) dans lesquels une zone ne compte plus comme
 * TENUE. Le propriétaire y reste renseigné (la contrainte
 * `territories_owner_coherent` l'exige hors 'unowned'), donc ces lignes
 * m'arrivent : les additionner à ma surface tenue gonflerait mon territoire
 * d'un territoire éteint.
 */
const DEAD_STATES: ReadonlySet<string> = new Set(['expired', 'invalidated']);

/** Statut d'une contestation qui court encore (0078). */
const CONTEST_ACTIVE = 'active';
/** Statut d'une contestation repoussée par une défense valide (§9.3). */
const CONTEST_DEFENDED = 'defended';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LES ENTRÉES — volontairement AMPUTÉES de tout ce qui désigne autrui
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Une ligne de `public.territories` DÉJÀ bornée à mes territoires par le SQL.
 * Aucun champ de propriété : voir §12 dans l'en-tête.
 */
export interface OwnedTerritoryRow {
  readonly id: string;
  readonly area_m2: number;
  readonly state: string;
  readonly defense_level: number;
  /** ISO 8601, ou `null` quand la base ne date pas la prise de contrôle. */
  readonly controlled_since: string | null;
  /** GeoJSON `Polygon` (jsonb). MA géométrie, à MOI, donc exacte. */
  readonly geometry: unknown;
}

/**
 * Une ligne de `public.territory_contests` réduite à ce que la DÉFENSE a besoin
 * de savoir. Ni `attacker_type` ni `attacker_id` : ils ne sont pas demandés au
 * serveur, donc ils ne peuvent pas fuir dans un rendu.
 */
export interface OwnContestRow {
  readonly territory_id: string;
  readonly status: string;
  /** ISO 8601 — instant de clôture ('defended'…), `null` tant qu'elle court. */
  readonly resolved_at: string | null;
  /** ISO 8601 — échéance de MA fenêtre de défense (§9.4). */
  readonly expires_at: string | null;
}

export interface DeriveAnalyticsInput {
  readonly territories: readonly OwnedTerritoryRow[];
  readonly contests: readonly OwnContestRow[];
  /** INJECTÉ. Aucune horloge implicite dans ce fichier. */
  readonly nowMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES SORTIES
// ═══════════════════════════════════════════════════════════════════════════

export interface ZoneAnalytics {
  readonly id: string;
  readonly areaM2: number;
  readonly state: string;
  readonly defenseLevel: number;
  /** `null` = la base ne date pas ma prise de contrôle. JAMAIS 0. */
  readonly controlledSinceMs: number | null;
  /** Durée de contrôle en ms, `null` si indatable. Jamais négative. */
  readonly controlMs: number | null;
  /** Jours PLEINS de contrôle (plancher), `null` si indatable. */
  readonly controlDays: number | null;
  /** Contestations REPOUSSÉES sur cette zone (statut 'defended'). */
  readonly defensesWon: number;
  /** Échéance de défense si une contestation court, sinon `null`. */
  readonly underAttackUntilMs: number | null;
  /** La zone est-elle TENUE (par opposition à expirée / invalidée) ? */
  readonly held: boolean;
  /** Anneaux OUVERTS [lng, lat]. Vide si la géométrie est illisible. */
  readonly rings: readonly PolygonRing[];
  /**
   * Intensité RELATIVE de contrôle dans [0, 1] — la grandeur de la carte de
   * chaleur. `null` quand elle n'a aucun sens : zone indatable, ou aucune de
   * mes zones n'a encore de durée mesurable. On ne colorie JAMAIS au hasard :
   * une chaleur inventée serait pire que pas de chaleur du tout.
   */
  readonly heat: number | null;
}

export interface AnalyticsWindow {
  /** Largeur de la fenêtre (jours) — dérivée, cf. en-tête. */
  readonly days: number;
  /** Borne basse INCLUSE. */
  readonly fromMs: number;
  /** Borne haute INCLUSE (= `nowMs`). */
  readonly toMs: number;
  /** Zones TENUES dont la prise de contrôle tombe dans la fenêtre. */
  readonly gainedZones: number;
  readonly gainedAreaM2: number;
  /** Contestations repoussées dont la clôture tombe dans la fenêtre. */
  readonly defensesWon: number;
  /**
   * TOUJOURS `false` — et ce n'est pas un TODO, c'est un fait de schéma
   * (en-tête, « ce que ce module refuse de calculer »). Le champ existe pour
   * que l'écran ait quelque chose à LIRE quand il doit dire « non mesurable ».
   */
  readonly lossesDerivable: false;
}

export interface TerritoryAnalytics {
  /** Toutes mes zones, TENUES D'ABORD, puis par durée de contrôle décroissante. */
  readonly zones: readonly ZoneAnalytics[];
  /** `true` ⇔ aucune ligne : l'écran doit rendre son état vide, pas des zéros. */
  readonly isEmpty: boolean;
  readonly heldZones: number;
  /** Somme des surfaces TENUES (m²). 0 uniquement si rien n'est tenu. */
  readonly heldAreaM2: number;
  /** Zones éteintes (expirées/invalidées) que je porte ENCORE. Non datées. */
  readonly deadZones: number;
  /** Durée de contrôle maximale observée (ms) — l'échelle de la chaleur. */
  readonly maxControlMs: number | null;
  /** La zone tenue depuis le plus longtemps, ou `null` si aucune n'est datée. */
  readonly longestHeld: ZoneAnalytics | null;
  /**
   * La zone qui a repoussé le PLUS de contestations. `null` quand AUCUNE
   * défense n'a jamais eu lieu : élire une « zone la plus défendue » à 0 défense
   * inventerait un fait d'armes (et, la base étant vide aujourd'hui, ce serait
   * exactement ce que le fondateur verrait en premier).
   */
  readonly mostDefended: ZoneAnalytics | null;
  /** Frontières à surveiller : zones sous contestation, la plus urgente d'abord. */
  readonly watchlist: readonly ZoneAnalytics[];
  readonly window: AnalyticsWindow;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE CALCUL
// ═══════════════════════════════════════════════════════════════════════════

/** ISO → ms, ou `null`. Jamais NaN : un NaN se propage et devient un « 0 ». */
function parseMs(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Nombre exploitable, ou `null` (une surface absente n'est pas une surface nulle). */
function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Agrégat des contestations, PAR TERRITOIRE, en une passe.
 * Les contestations qui ne visent aucun de mes territoires sont écartées ici —
 * c'est le point de contrôle §12 du module (cf. en-tête).
 */
function foldContests(
  contests: readonly OwnContestRow[],
  mine: ReadonlySet<string>,
  windowFromMs: number,
  windowToMs: number,
): {
  readonly defensesByZone: ReadonlyMap<string, number>;
  readonly deadlineByZone: ReadonlyMap<string, number>;
  readonly defensesInWindow: number;
} {
  const defensesByZone = new Map<string, number>();
  const deadlineByZone = new Map<string, number>();
  let defensesInWindow = 0;

  for (const row of contests) {
    if (!mine.has(row.territory_id)) continue;

    if (row.status === CONTEST_DEFENDED) {
      defensesByZone.set(row.territory_id, (defensesByZone.get(row.territory_id) ?? 0) + 1);
      const resolvedAt = parseMs(row.resolved_at);
      // Bornes INCLUSES des deux côtés — la règle est écrite une seule fois et
      // testée aux deux millisecondes limites.
      if (resolvedAt !== null && resolvedAt >= windowFromMs && resolvedAt <= windowToMs) {
        defensesInWindow += 1;
      }
      continue;
    }

    if (row.status === CONTEST_ACTIVE) {
      const expiresAt = parseMs(row.expires_at);
      if (expiresAt === null) continue;
      // 0078 garantit UNE seule contestation active par territoire, mais on ne
      // s'appuie pas dessus pour être correct : on garde la plus PROCHE, celle
      // qui commande l'urgence affichée.
      const known = deadlineByZone.get(row.territory_id);
      if (known === undefined || expiresAt < known) {
        deadlineByZone.set(row.territory_id, expiresAt);
      }
    }
  }

  return { defensesByZone, deadlineByZone, defensesInWindow };
}

/**
 * Le calcul complet. Déterministe : à entrées égales (y compris `nowMs`), la
 * sortie est identique — départages inclus, faits sur `id` et jamais sur
 * l'ordre d'arrivée du serveur.
 */
export function deriveTerritoryAnalytics(input: DeriveAnalyticsInput): TerritoryAnalytics {
  const nowMs = Number.isFinite(input.nowMs) ? input.nowMs : 0;
  const windowMs = TERRITORY_ANALYTICS_WINDOW_DAYS * MS_PER_DAY;
  const fromMs = nowMs - windowMs;

  const mineIds = new Set(input.territories.map((row) => row.id));
  const { defensesByZone, deadlineByZone, defensesInWindow } = foldContests(
    input.contests,
    mineIds,
    fromMs,
    nowMs,
  );

  // ─── Passe 1 : une zone par ligne, sans encore de chaleur ────────────────
  type Draft = Omit<ZoneAnalytics, 'heat'>;
  const drafts: Draft[] = input.territories.map((row) => {
    const controlledSinceMs = parseMs(row.controlled_since);
    // Une prise de contrôle DANS LE FUTUR (horloge serveur en avance, ligne
    // fabriquée) ne donne pas une durée négative : elle donne 0. Une durée
    // négative se serait affichée « -3 j », ce qui n'est pas une donnée.
    const controlMs =
      controlledSinceMs === null ? null : Math.max(0, nowMs - controlledSinceMs);
    const held = !DEAD_STATES.has(row.state);
    return {
      id: row.id,
      areaM2: Math.max(0, finiteOrNull(row.area_m2) ?? 0),
      state: row.state,
      defenseLevel: Math.max(0, Math.trunc(finiteOrNull(row.defense_level) ?? 0)),
      controlledSinceMs,
      controlMs,
      controlDays: controlMs === null ? null : Math.floor(controlMs / MS_PER_DAY),
      defensesWon: defensesByZone.get(row.id) ?? 0,
      // Une zone ÉTEINTE n'est plus attaquable : afficher un compte à rebours
      // de défense dessus enverrait courir pour rien.
      underAttackUntilMs: held ? (deadlineByZone.get(row.id) ?? null) : null,
      held,
      rings: parsePolygonRings(row.geometry) ?? [],
    };
  });

  // ─── Passe 2 : l'échelle de chaleur, LUE sur les zones tenues et datées ──
  // Elle se calcule après coup parce qu'elle est RELATIVE : la chaleur d'une
  // zone n'a de sens que rapportée à la plus ancienne des miennes.
  let maxControlMs: number | null = null;
  for (const d of drafts) {
    if (!d.held || d.controlMs === null) continue;
    if (maxControlMs === null || d.controlMs > maxControlMs) maxControlMs = d.controlMs;
  }
  // `maxControlMs === 0` (tout vient d'être capturé) : aucune division possible
  // et aucun gradient réel. On rend `null` — l'écran peint une teinte neutre et
  // le dit, plutôt que d'inventer un dégradé sur un dénominateur nul.
  const scale = maxControlMs !== null && maxControlMs > 0 ? maxControlMs : null;

  const zones: ZoneAnalytics[] = drafts.map((d) => ({
    ...d,
    heat: scale === null || !d.held || d.controlMs === null ? null : d.controlMs / scale,
  }));

  // ─── Tri : les zones TENUES d'abord, puis la plus ancienne en tête ───────
  // Les indatables passent après les datées (on ne prétend pas qu'elles sont
  // récentes), et `id` départage pour que deux rendus consécutifs coïncident.
  const sorted = [...zones].sort((a, b) => {
    if (a.held !== b.held) return a.held ? -1 : 1;
    const av = a.controlMs;
    const bv = b.controlMs;
    if (av === null && bv === null) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av !== bv) return bv - av;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const heldZones = sorted.filter((z) => z.held);

  // ─── Superlatifs — `null` plutôt qu'un vainqueur par défaut ──────────────
  const longestHeld = heldZones.find((z) => z.controlMs !== null) ?? null;

  let mostDefended: ZoneAnalytics | null = null;
  for (const z of heldZones) {
    if (z.defensesWon === 0) continue; // 0 défense ≠ « la plus défendue »
    if (mostDefended === null) {
      mostDefended = z;
      continue;
    }
    if (z.defensesWon > mostDefended.defensesWon) mostDefended = z;
    else if (z.defensesWon === mostDefended.defensesWon) {
      if (z.defenseLevel > mostDefended.defenseLevel) mostDefended = z;
      else if (z.defenseLevel === mostDefended.defenseLevel && z.areaM2 > mostDefended.areaM2) {
        mostDefended = z;
      }
    }
  }

  // ─── Frontières à surveiller : l'échéance la plus proche d'abord ─────────
  const watchlist = heldZones
    .filter((z) => z.underAttackUntilMs !== null)
    .sort((a, b) => {
      const av = a.underAttackUntilMs ?? 0;
      const bv = b.underAttackUntilMs ?? 0;
      if (av !== bv) return av - bv;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  // ─── La fenêtre ──────────────────────────────────────────────────────────
  let gainedZones = 0;
  let gainedAreaM2 = 0;
  for (const z of heldZones) {
    const since = z.controlledSinceMs;
    if (since === null) continue;
    if (since < fromMs || since > nowMs) continue; // bornes INCLUSES
    gainedZones += 1;
    gainedAreaM2 += z.areaM2;
  }

  return {
    zones: sorted,
    isEmpty: sorted.length === 0,
    heldZones: heldZones.length,
    heldAreaM2: heldZones.reduce((sum, z) => sum + z.areaM2, 0),
    deadZones: sorted.length - heldZones.length,
    maxControlMs,
    longestHeld,
    mostDefended,
    watchlist,
    window: {
      days: TERRITORY_ANALYTICS_WINDOW_DAYS,
      fromMs,
      toMs: nowMs,
      gainedZones,
      gainedAreaM2,
      defensesWon: defensesInWindow,
      lossesDerivable: false,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA CARTE DE CHALEUR — CADRAGE (pur, testable, sans SVG)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mètres par degré de longitude à la latitude `lat`. La carte de chaleur cadre
 * MES zones, où qu'elles soient : figer le facteur sur Paris
 * (`REAL_M_PER_DEG_LNG`, ancré République) écraserait horizontalement un
 * territoire lillois et l'étirerait sur un territoire méditerranéen. Le facteur
 * de latitude, lui, est constant — c'est `mPerDegLat` que l'appelant fournit.
 *
 * Aux pôles le cosinus tend vers 0 ; on plancherait alors une division. Le
 * plancher est ici une PROTECTION NUMÉRIQUE (jamais un réglage de jeu) : sous
 * cette valeur, la projection n'a de toute façon plus de sens géométrique.
 */
const MIN_COS_LAT = 1e-6;

export function metersPerDegreeLng(lat: number, mPerDegLat: number): number {
  if (!Number.isFinite(lat) || !Number.isFinite(mPerDegLat)) return mPerDegLat;
  const cos = Math.cos((lat * Math.PI) / 180);
  return mPerDegLat * Math.max(MIN_COS_LAT, Math.abs(cos));
}

/**
 * Latitude REPRÉSENTATIVE d'un ensemble d'anneaux (milieu de l'étendue), ou
 * `null` s'il n'y a rien à cadrer. Sert uniquement au facteur de longitude
 * ci-dessus — le cadrage lui-même reste `share/mapFrame.frameFor`, déjà écrit,
 * déjà testé : on ne réécrit pas une projection qui existe.
 */
export function centerLatitudeOf(
  // Signature ÉLARGIE (27/07/2026, E15) au ring profondément readonly : un
  // `PolygonRing` (`[number, number][]`) y reste assignable, donc aucun appelant
  // existant ne change, et les anneaux publics d'un rival (`RivalRing`, eux
  // readonly de bout en bout) peuvent réutiliser cette fonction au lieu d'en
  // recopier une septième variante.
  rings: readonly (readonly (readonly [number, number])[])[],
): number | null {
  let min = Infinity;
  let max = -Infinity;
  for (const ring of rings) {
    for (const point of ring) {
      const lat = point[1];
      if (lat < min) min = lat;
      if (lat > max) max = lat;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return (min + max) / 2;
}

/** Tous les anneaux de toutes les zones qui en ont un — l'entrée de `frameFor`. */
export function heatRings(zones: readonly ZoneAnalytics[]): PolygonRing[] {
  const out: PolygonRing[] = [];
  for (const zone of zones) {
    for (const ring of zone.rings) out.push(ring);
  }
  return out;
}
