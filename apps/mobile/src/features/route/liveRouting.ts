/**
 * GRYD — ROUTING EN CONTINU (façon Waze live), N'IMPORTE OÙ EN EUROPE.
 * Route À LA VOLÉE une boucle fermée d'une distance quelconque, RUE PAR RUE, via
 * OSRM, autour d'une ORIGINE quelconque (ta position GPS ou un lieu cherché —
 * plus aucun point de départ figé). Waypoints en rosace autour de l'origine →
 * route OSRM → géométrie qui SUIT LES RUES, calée en 2 passes sur la distance.
 *
 * Réseau AU RUNTIME (assumé — décision fondateur) : le calcul temps réel se fait
 * via l'internet de l'utilisateur, gratuitement (serveurs communautaires, sans
 * clé). Échec / hors ligne → `routeLoop` renvoie null (l'appelant garde le tracé
 * courant) ; `routeLoopOutcome` renvoie EN PLUS la cause observée, parce qu'un
 * routeur muet et un terrain sans boucle n'appellent pas le même geste (E18,
 * 28/07/2026 — cf. `routingOutcome.ts`).
 *
 * ─── LE PROFIL SUIT LA DISCIPLINE (E14, 26/07/2026) ───────────────────────────
 * Ce module codait `foot` EN DUR, dans son URL et dans son nom. C'était juste
 * tant que GRYD ne chronométrait que la course. Depuis que le vélo est une
 * discipline RÉELLE, router un cycliste au profil piéton produit un tracé que
 * PERSONNE ne peut suivre : escaliers, passages, sens interdits piétonnisés,
 * et pas une piste cyclable — c'est-à-dire un bouton qui ment. Le profil vient
 * donc de `activityRouting(activity).profile` (game-rules, `ACTIVITY_ROUTING`) :
 * `foot` à pied, `bike` à vélo, `car` JAMAIS, dans aucune discipline.
 *
 * La discipline est un paramètre OBLIGATOIRE, sans valeur par défaut. C'est
 * délibéré : un défaut silencieux ici, c'est exactement le tracé piéton rendu à
 * un cycliste que ce chantier supprime. Le compilateur force chaque appelant à
 * dire dans quel monde il route.
 *
 * ─── CE MODULE NE DÉCIDE PLUS RIEN DU JEU (25/07/2026) ─────────────────────────
 * Il renvoyait `zones`, `loopZones`, `points`, `streetsToSave`, `expiresInH` et
 * `difficulty`, tous FABRIQUÉS ICI à partir de `ZONES_PER_KM = 15.3` et
 * `LOOP_ZONE_RATIO = 0.6` — deux nombres qui ne venaient pas de `game-rules.ts`
 * et n'avaient été mesurés nulle part. Une boucle planifiée annonçait donc au
 * joueur, avant qu'il ait couru un mètre, un gain de territoire et un score que
 * le serveur seul décide, APRÈS la course, cellule par cellule (ingest_run).
 *
 * Ce n'était pas une décoration : c'était une PROMESSE DE RÉCOMPENSE. Elle est
 * supprimée, pas déplacée. Ce module ne connaît plus que de la géométrie — une
 * polyligne réellement renvoyée par OSRM et sa longueur mesurée.
 */
import { type Activity } from '@klaim/shared';
import { REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';
import { plannerRoutingProfile } from './activityPlanning';
import { classifyRoutingFailure, type RoutingFailure } from './routingOutcome';
import type { PlannedLoop, PlannerIntention } from './types';

/**
 * Serveur OSRM communautaire (sans clé). Il expose une instance PAR PROFIL, à
 * l'adresse `/routed-<profil>/route/v1/<profil>` — le nom du profil apparaît
 * donc deux fois, et il vient de game-rules, jamais d'une chaîne écrite ici.
 */
const OSRM_HOST = 'https://routing.openstreetmap.de';

function osrmEndpoint(activity: Activity): string {
  const profile = plannerRoutingProfile(activity);
  return `${OSRM_HOST}/routed-${profile}/route/v1/${profile}`;
}

/**
 * ═══ §12 — CE QUI SORT DE L'APPAREIL VERS LE ROUTEUR (27/07/2026) ═══════════
 *
 * LE PROBLÈME, MESURÉ. `routeOsrm` écrit les coordonnées à SIX décimales
 * (≈ 0,11 m) dans le CHEMIN de l'URL — donc journalisable en clair par le
 * serveur — vers `routing.openstreetmap.de`, une infrastructure TIERCE (FOSSGIS
 * e.V.). Et le premier waypoint de la rosace EST l'origine exacte : `routeLoop`
 * force `jitter[0] = 0`. Autrement dit, chaque planification envoyait le fix GPS
 * du joueur, au décimètre, à un tiers. Depuis que E16/E17 montent un aperçu de
 * boucle AU MONTAGE (`MissionLoopPreview`), ça partait même sans geste.
 *
 * La constitution §7 interdit qu'une position EXACTE quitte l'appareil vers un
 * tiers. Elle n'interdit pas de router : elle interdit la précision inutile.
 *
 * CE QUI EST FAIT. L'origine est arrondie AVANT de construire les waypoints —
 * une seule fois, dans `routeLoop`, donc pour TOUS les appelants (E16, E17, le
 * planificateur, le briefing). Toute la géométrie en dérive : la finesse
 * maximale présente dans l'URL redevient celle de l'origine arrondie, et les six
 * décimales ne portent plus que des décalages géométriques déterministes
 * (`jitter` est semé, pas aléatoire).
 *
 * POURQUOI 3 DÉCIMALES (≈ 110 m), et pas plus ni moins. Plus fin (4 déc. ≈ 11 m)
 * désigne un immeuble — c'est-à-dire un domicile. Plus grossier (2 déc. ≈ 1,1 km)
 * déplacerait le départ d'un kilomètre et rendrait la boucle proposée fausse :
 * un tracé qui commence à 1 km de toi est un bouton qui ment. À 110 m, OSRM
 * raccroche de toute façon au réseau routier le plus proche, et la boucle reste
 * jouable — tandis que le carreau contient un pâté de maisons entier.
 *
 * CE QUE ÇA NE FAIT PAS. Ça n'anonymise pas la VILLE, et ça ne prétend pas le
 * faire : le routeur sait dans quel quartier on court. C'est la raison pour
 * laquelle ce destinataire est désormais DÉCLARÉ dans la politique de
 * confidentialité (`i18n/catalog/legal.ts`, section « Partage & sous-traitants »),
 * où il manquait — une liste de sous-traitants qui se présente comme limitative
 * et omet un destinataire est un faux, au même titre qu'une donnée fabriquée.
 *
 * Ce n'est PAS une constante de jeu (aucun territoire, aucun point, aucun claim) :
 * même statut que `COUNTRY_LOOKUP_DECIMALS` dans `run/safety/country.ts`.
 */
export const ROUTING_ORIGIN_DECIMALS = 3;

/** Arrondi PUR appliqué à l'origine avant TOUT appel réseau. Exporté pour être
 *  testé sans réseau : c'est la seule garantie §12 que ce module offre. */
export function coarseRoutingOrigin(origin: LatLngPoint): LatLngPoint {
  const f = 10 ** ROUTING_ORIGIN_DECIMALS;
  return { lat: Math.round(origin.lat * f) / f, lng: Math.round(origin.lng * f) / f };
}

/**
 * Cap (deg, 0 = est) par intention — oriente la boucle autour de l'origine.
 * MESURE DE COMPOSITION GÉOMÉTRIQUE, pas une règle de jeu : deux objectifs
 * doivent proposer deux boucles distinctes plutôt que la même, et ces caps ne
 * rapportent ni point ni zone.
 */
const INTENTION_BEARING: Record<PlannerIntention, number> = {
  conquerir: 25,
  defendre: 210,
};

/** Plus de waypoints pour les grandes boucles (tour plus rond, jusqu'au trail). */
function nWpFor(km: number): number {
  return Math.min(12, Math.max(6, Math.round(km / 3)));
}
/** Décimation bornée : ~150 points/boucle quelle que soit la distance. */
function gapFor(distanceM: number): number {
  return Math.max(8, distanceM / 150);
}
function mPerDegLng(lat: number): number {
  return REAL_M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}
const d2r = (d: number) => (d * Math.PI) / 180;

/** Waypoints d'une rosace fermée autour de `origin` (origine = 1er = dernier). */
function waypoints(
  origin: LatLngPoint,
  bearingDeg: number,
  radiusM: number,
  jitter: readonly number[],
  n: number,
): LatLngPoint[] {
  const mLng = mPerDegLng(origin.lat);
  const cx = radiusM * Math.cos(d2r(bearingDeg));
  const cy = radiusM * Math.sin(d2r(bearingDeg));
  const start = bearingDeg + 180;
  const pts: LatLngPoint[] = [];
  for (let k = 0; k < n; k += 1) {
    const a = d2r(start + (360 * k) / n);
    const r = radiusM * (1 + (jitter[k] ?? 0));
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push({ lat: origin.lat + y / REAL_M_PER_DEG_LAT, lng: origin.lng + x / mLng });
  }
  pts.push(pts[0]!);
  return pts;
}

interface OsrmResult {
  distanceM: number;
  coords: [number, number][];
}

/**
 * Ce qu'une passe de routage a réellement produit. `answered` est le fait que
 * l'écran ne pouvait PAS deviner avant le 28/07/2026 : sans lui, une coupure
 * réseau et un « il n'y a pas de boucle ici » rendaient exactement la même
 * chose (`null`), et l'écran servait le même message et le même bouton aux deux
 * — dont un qui ne pouvait pas aboutir (cf. `routingOutcome.ts`).
 */
interface OsrmAttempt {
  /** Une réponse HTTP est revenue et a pu être lue (quel que soit son verdict). */
  answered: boolean;
  /** L'itinéraire, si le routeur en a trouvé un. */
  result: OsrmResult | null;
}

async function routeOsrm(
  activity: Activity,
  wps: readonly LatLngPoint[],
  signal?: AbortSignal,
): Promise<OsrmAttempt> {
  const coords = wps.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url = `${osrmEndpoint(activity)}/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, signal ? { signal } : undefined);
    const json = await res.json();
    if (json.code === 'Ok' && json.routes?.[0]) {
      return {
        answered: true,
        result: { distanceM: json.routes[0].distance, coords: json.routes[0].geometry.coordinates },
      };
    }
    // Le routeur a PARLÉ (`NoRoute`, `NoSegment`, un 4xx lisible…) : il n'y a
    // pas de boucle jouable ici, et ce n'est pas une panne de transport.
    return { answered: true, result: null };
  } catch {
    // réseau / CORS / abort / JSON illisible → on n'a rien appris du terrain.
    return { answered: false, result: null };
  }
}

/** Décime la polyligne : garde un point tous les >= minGapM (mètres). */
function decimate(coords: readonly [number, number][], lat: number, minGapM: number): LatLngPoint[] {
  const mLng = mPerDegLng(lat);
  const out: LatLngPoint[] = [];
  let last: LatLngPoint | null = null;
  for (const [lng, latPt] of coords) {
    if (last) {
      const dx = (lng - last.lng) * mLng;
      const dy = (latPt - last.lat) * REAL_M_PER_DEG_LAT;
      if (Math.hypot(dx, dy) < minGapM) continue;
    }
    const p = { lat: Number(latPt.toFixed(5)), lng: Number(lng.toFixed(5)) };
    out.push(p);
    last = p;
  }
  return out;
}

/**
 * Le résultat COMPLET d'une tentative : la boucle, ou la RAISON de son absence.
 * C'est ce que consomme le planificateur (E18) — un écran qui doit choisir un
 * message et un geste, et qui ne peut pas le faire à partir d'un `null` nu.
 */
export type RouteLoopOutcome =
  | { ok: true; loop: PlannedLoop }
  | { ok: false; failure: RoutingFailure };

/**
 * Route en direct une boucle autour de `origin` (n'importe où), à la distance
 * cible (km), AU PROFIL DE `activity`. `zoneLabel` nomme le secteur affiché
 * (lieu de départ). Renvoie null en cas d'échec réseau. 2 passes de calage.
 *
 * ⚠ Conserve la signature historique (`PlannedLoop | null`) pour ses appelants
 * qui n'affichent PAS de cause (aperçus E16/E17). Un écran qui doit expliquer
 * l'absence utilise `routeLoopOutcome` — même calcul, même arrondi §12.
 */
export async function routeLoop(
  /**
   * ⚠ Ce point est ARRONDI (`coarseRoutingOrigin`) avant de toucher le réseau :
   * aucune position exacte ne quitte l'appareil vers le routeur tiers (§12).
   */
  rawOrigin: LatLngPoint,
  zoneLabel: string,
  targetKm: number,
  intention: PlannerIntention,
  seed: number,
  /** Discipline de la sortie visée — décide le profil de routage. Obligatoire. */
  activity: Activity,
  signal?: AbortSignal,
): Promise<PlannedLoop | null> {
  const outcome = await routeLoopOutcome(
    rawOrigin,
    zoneLabel,
    targetKm,
    intention,
    seed,
    activity,
    signal,
  );
  return outcome.ok ? outcome.loop : null;
}

/**
 * Même routage que `routeLoop`, mais il DIT pourquoi quand il échoue.
 * Deux causes seulement, et toutes deux observées (jamais devinées) :
 * `unreachable` (le routeur n'a pas répondu) et `noRoute` (il a répondu, il n'y
 * a pas de boucle jouable ici) — cf. `routingOutcome.ts`.
 */
export async function routeLoopOutcome(
  /** ⚠ ARRONDI (`coarseRoutingOrigin`) avant tout appel réseau, comme ci-dessus (§12). */
  rawOrigin: LatLngPoint,
  zoneLabel: string,
  targetKm: number,
  intention: PlannerIntention,
  seed: number,
  activity: Activity,
  signal?: AbortSignal,
): Promise<RouteLoopOutcome> {
  // §12 — L'ARRONDI EST LA PREMIÈRE LIGNE DE CETTE FONCTION, avant tout calcul
  // géométrique : ainsi AUCUN chemin ne peut rejoindre le réseau avec le fix
  // exact, pas même une passe de calage ajoutée plus tard.
  const origin = coarseRoutingOrigin(rawOrigin);
  const n = nWpFor(targetKm);
  const rand = rng(seed * 131 + Math.round(targetKm * 10));
  const jitter: number[] = [];
  for (let k = 0; k < n; k += 1) jitter.push((rand() - 0.5) * 0.34);
  jitter[0] = 0;

  let radius = (targetKm * 1000) / (2 * Math.PI);
  let result: OsrmResult | null = null;
  for (let pass = 0; pass < 2; pass += 1) {
    const attempt = await routeOsrm(
      activity,
      waypoints(origin, INTENTION_BEARING[intention], radius, jitter, n),
      signal,
    );
    result = attempt.result;
    // Une distance nulle vient d'un routeur qui a PARLÉ : c'est un terrain sans
    // boucle, pas une panne — d'où la classification par le fait observé.
    if (!result || result.distanceM <= 0) {
      return { ok: false, failure: classifyRoutingFailure({ routerAnswered: attempt.answered }) };
    }
    radius *= (targetKm * 1000) / result.distanceM;
  }
  if (!result) return { ok: false, failure: 'unreachable' };

  const line = decimate(result.coords, origin.lat, gapFor(result.distanceM));
  // Géométrie dégénérée (moins de 4 points) : le routeur a répondu, mais ce
  // qu'il rend n'est pas une boucle qu'on peut peindre ni courir.
  if (line.length < 4) return { ok: false, failure: 'noRoute' };

  // La SEULE métrique que ce module a le droit de produire : la longueur que
  // le routeur a réellement mesurée sur les rues (pas la distance demandée).
  const km = Math.round((result.distanceM / 1000) * 10) / 10;
  return {
    ok: true,
    loop: {
      // La discipline entre dans l'identité : deux lentilles peuvent proposer la
      // même distance au même endroit, ce ne sont pas les mêmes boucles (profils
      // différents), et une clé de rendu commune les confondrait.
      id: `live_${activity}_${intention}_${Math.round(targetKm * 10)}_${seed}`,
      zone: zoneLabel,
      distanceKm: km,
      intention,
      activity,
      line,
    },
  };
}
