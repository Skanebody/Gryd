/**
 * GRYD — Catalogue des badges V2 à NIVEAUX (AMENDEMENT-06 §1, remplace le
 * catalogue 59 d'AMENDEMENT-04). SOURCE DE VÉRITÉ UNIQUE du catalogue.
 * AUCUN nombre magique badge hors de ce fichier (seuils, couleurs, bornes).
 *
 * Nouveautés V2 :
 *  - `BadgeTier` (road·tempo·race·carbon·elite·legend) REMPLACE `BadgeRarity`
 *    PARTOUT (le tier = intensité visuelle du niveau, §1.1). Visuel par tier =
 *    maquette-badges-gryd.html (road graphite → legend or+halo).
 *  - 12 familles (§1.2), couleurs EXACTES = DATA du catalogue (exception
 *    polychrome contrôlée, AMENDEMENT-04 §1) — jamais dans design-tokens.
 *  - Familles progressives : `leveledFamily(slug,name,family,metric,thresholds)`
 *    → 6 BadgeDef (slug_1..5 + slug_legend), names en chiffres romains + LEGEND,
 *    tier par niveau [road,tempo,race,carbon,elite,legend] (§1.3). Le moteur
 *    décerne TOUS les niveaux franchis d'un coup (jamais ré-attribués).
 *  - 8 onboarding (reprend les keys/names FR existants quand l'équivalent
 *    existe : premiers_pas… ; ajoute first_share/first_verified/first_crew).
 *  - Héritage Saison 0 : keys sans équivalent conservées (`legacy: true`), non
 *    mises en avant (§1.5).
 *  - Famille saison : 18 médailles Season/National/Crew Rank — DÉCERNÉES PAR
 *    season_close (metric seasonRank/nationalRank/crewSeasonRank), pas par course.
 *  - 12 secrets (9 existants + Comeback / Silent Takeover / No Map Run, §1.2).
 *
 * L'attribution vit dans packages/engine/src/badges.ts ; la copie
 * supabase/functions/_shared/badges.ts est GÉNÉRÉE par sync-game-rules.mjs.
 * La migration 0009 reseed la table `badges` depuis ce catalogue.
 */

// ─── Tiers (AMENDEMENT-06 §1.1) — remplacent les raretés PARTOUT ──────────────

/**
 * Tier d'un badge/niveau. Le niveau n d'une famille progressive a le tier
 * `BADGE_TIERS[n-1]` (§1.3). Mapping ancien→nouveau (migration 0009) :
 * common→road, rare→tempo, epic→carbon, legend→legend (race/elite = V2 only).
 */
export type BadgeTier = 'road' | 'tempo' | 'race' | 'carbon' | 'elite' | 'legend';

/** Ordre des tiers = ordre des 6 niveaux d'une famille progressive (§1.3). */
export const BADGE_TIERS: readonly BadgeTier[] = [
  'road',
  'tempo',
  'race',
  'carbon',
  'elite',
  'legend',
];

/** Rang d'intensité d'un tier (0 = road … 5 = legend) — pour « Tier max ». */
export const BADGE_TIER_RANK: Record<BadgeTier, number> = {
  road: 0,
  tempo: 1,
  race: 2,
  carbon: 3,
  elite: 4,
  legend: 5,
};

/** Libellé court affiché d'un tier (§1.1). */
export const BADGE_TIER_LABEL: Record<BadgeTier, string> = {
  road: 'Road',
  tempo: 'Tempo',
  race: 'Race',
  carbon: 'Carbon',
  elite: 'Elite',
  legend: 'Legend',
};

/**
 * Recette VISUELLE par tier — DATA du catalogue (exception polychrome §1),
 * transcrite 1:1 de maquette-badges-gryd.html (objet TIER). Le TIER décide
 * anneau/glow/halo, la FAMILLE (familyColor) décide la teinte de l'icône :
 * road contour graphite simple → legend or + halo (§1.6).
 *
 * `ring`   : couleur du contour de l'hexagone.
 * `ring2`  : contour intérieur (null = aucun).
 * `glow`   : couleur du glow diffus (null = aucun, tiers bas).
 * `haloOpacity` : opacité de l'ellipse-halo derrière (0 = pas de halo — legend
 *                 uniquement).
 * `strokeWidth` : épaisseur du contour (road plus fin, tiers hauts plus épais).
 * La teinte chartreuse des tiers tempo/race (maquette) est neutralisée : sur la
 * surface badge, la teinte vient de la FAMILLE (familyColor), pas du tier.
 */
export interface BadgeTierStyle {
  ring: string;
  ring2: string | null;
  glow: string | null;
  haloOpacity: number;
  strokeWidth: number;
}

export const BADGE_TIER_STYLE: Record<BadgeTier, BadgeTierStyle> = {
  // road : graphite, contour simple, sans glow (maquette t-road)
  road: { ring: '#3E4239', ring2: null, glow: null, haloOpacity: 0, strokeWidth: 1.6 },
  // tempo : contour renforcé, sans glow encore
  tempo: { ring: 'rgba(250,250,247,0.30)', ring2: null, glow: null, haloOpacity: 0, strokeWidth: 1.8 },
  // race : double anneau + amorce de glow
  race: { ring: 'rgba(250,250,247,0.55)', ring2: 'rgba(250,250,247,0.22)', glow: null, haloOpacity: 0, strokeWidth: 2 },
  // carbon : titane, double anneau (maquette t-carbon)
  carbon: { ring: '#9BA3AD', ring2: 'rgba(155,163,173,0.35)', glow: null, haloOpacity: 0, strokeWidth: 2.2 },
  // elite : bleu électrique, glow (maquette t-elite)
  elite: { ring: '#DCE6F2', ring2: 'rgba(111,183,255,0.50)', glow: 'rgba(111,183,255,0.35)', haloOpacity: 0, strokeWidth: 2.4 },
  // legend : or + halo (maquette t-legend)
  legend: { ring: '#E7B84C', ring2: 'rgba(231,184,76,0.45)', glow: 'rgba(231,184,76,0.40)', haloOpacity: 0.18, strokeWidth: 2.4 },
};

// ─── Familles et couleurs (AMENDEMENT-06 §1.2) ───────────────────────────────

export type BadgeFamily =
  | 'onboarding'
  | 'distance'
  | 'territoire'
  | 'attaque'
  | 'defense'
  | 'exploration'
  | 'routes'
  | 'crew'
  | 'performance'
  | 'healthy'
  | 'saison'
  | 'verified'
  | 'secret';

/**
 * Couleur d'accent PAR FAMILLE (§1.2, couleurs EXACTES). DATA du catalogue
 * (exception polychrome AMENDEMENT-04 §1) : seules les surfaces badge
 * (collection, détail, carte de partage, notification) les utilisent ;
 * partout ailleurs un badge reste monochrome charte.
 */
export const BADGE_FAMILY_COLORS: Record<BadgeFamily, string> = {
  onboarding: '#8B5CF6', // violet
  distance: '#F472B6', // rose
  territoire: '#4ADE80', // vert
  attaque: '#FF5C33', // rouge-orangé
  defense: '#6FB7FF', // bleu
  exploration: '#2DD4BF', // turquoise
  routes: '#F59E0B', // ambre
  crew: '#FB923C', // orange
  performance: '#22D3EE', // cyan
  healthy: '#34D399', // émeraude (santé/récup, AMENDEMENT-07 §6) — distinct du vert territoire
  saison: '#E7B84C', // or
  verified: '#9BA3AD', // gris acier
  secret: '#E7B84C', // or
};

// ─── GRYD Verified (§1.4) ────────────────────────────────────────────────────
/**
 * Seuil de motionTrust au-dessus duquel une course valide compte comme
 * vérifiée (metric verifiedRuns). Si motionTrust indisponible : compte comme
 * vérifié SEULEMENT si status valid ET aucun flag (documenté engine/badges.ts).
 */
export const VERIFIED_MIN_TRUST = 70;

// ─── Métriques évaluées (LifetimeStats côté moteur) ──────────────────────────

/**
 * Chaque badge est décerné quand `stats[metric] >= threshold`. Toutes les
 * métriques sont des compteurs/maxima croissants (franchissement définitif),
 * SAUF les métriques saison (seasonRank/…) qui sont des MAXIMA de rang inversé
 * (voir season_close) : on stocke `(N - rang + 1)` pour que « ≥ threshold »
 * signifie « au moins aussi bien classé ».
 *
 * Alimentées par ingest_run DÈS MAINTENANT : distance (course/saison/vie),
 * hexes, volés, défendus, pionniers, routes, avant-postes, contributions,
 * weeksActive (dérivée des jours actifs ISO-semaine), verifiedRuns, cleanDays
 * (via lastRejectedDay — applyRejectedRun), secrets.
 * Alimentées par les JOBS (sector_control/season_close/offensives V1) :
 * sectorsControlled, bestSectorControlPct, holdDays, clustersProtected,
 * offensivesJoined, seasonRank/nationalRank/crewSeasonRank, activeMembersWeek,
 * paceImprovementSKm, formeScore. RÈGLE : plus JAMAIS « À venir » — un badge
 * non alimenté est simplement verrouillé à 0 (AMENDEMENT-04 §4).
 */
export type BadgeMetric =
  // ── Onboarding / simples ──
  | 'runsValid' // courses validées (valid + partial)
  | 'firstShares' // premier partage effectué (proxy : run.shared)
  | 'crewsJoined' // a rejoint ≥ 1 crew
  // ── Distance ──
  | 'bestRunDistanceM' // meilleure distance en UNE course (m) — Distance Runner
  | 'seasonDistanceM' // distance cumulée saison courante (m) — Season Distance
  | 'totalDistanceM' // distance cumulée vie entière (m) — Lifetime Distance
  // ── Territoire ──
  | 'hexesCaptured' // hexes capturés vie entière = neutres + volés — Hex Hunter
  | 'sectorsControlled' // secteurs contrôlés (job) — Zone Taker
  | 'bestSectorControlPct' // meilleur % de contrôle d'un secteur actif (job) — City Control
  // ── Attaque ──
  | 'steals' // hexes volés — Raider
  | 'sectorsContested' // secteurs contestés (job) — Sector Breaker
  | 'offensivesJoined' // offensives rejointes (job offensives V1) — Raid Leader
  // ── Défense ──
  | 'defends' // hexes défendus — Defender
  | 'holdDays' // jours de tenue d'une même zone (job) — Hold The Line
  | 'clustersProtected' // clusters protégés = boucliers posés (job) — Fortress
  // ── Exploration / pionnier ──
  | 'pioneerHexes' // hexes pionniers (jamais possédés) — Pioneer
  | 'ruralZonesOpened' // zones rurales ouvertes — Frontier Runner
  // ── Routes / avant-postes ──
  | 'routes' // routes ouvertes — Route Opened
  | 'outposts' // avant-postes fondés — Outpost Builder
  | 'supplyLines' // routes maintenues 7 j (job) — Supply Line
  // ── Crew ──
  | 'crewContributions' // contributions crew — Crew Member
  | 'crewCaptainScore' // progression capitaine (job) — Crew Captain
  | 'activeMembersWeek' // membres actifs même semaine (job) — United Front
  // ── Performance ──
  | 'paceImprovementSKm' // amélioration d'allure /mois, s/km (perf V1) — Pace Progress
  | 'weeksActive' // semaines ISO actives — Consistency
  | 'formeScore' // meilleur Score Forme atteint (perf V1) — Score Forme
  | 'personalBests' // records perso battus (distance/allure, ingest_run) — Personal Best
  | 'cleanWeeks' // semaines ISO actives sans run rejeté — Clean Week
  // ── Social / motivation (AMENDEMENT-07 §6, motivation §19-§20) ──
  | 'invitesSent' // invitations envoyées (First Invite / Crew Helper, alim. endpoint invite V1)
  | 'referralsActivated' // recrues activées (parrainage §3.7, colonne user_stats existante) — Recruiter
  | 'groupRuns' // runs groupés détectés (engine detectGroupRun) — Group Run
  | 'reactionsSent' // réactions GRYD envoyées sur le feed crew (Encourager, alim. endpoint feed V1)
  // ── Healthy (AMENDEMENT-07 §6, motivation §19) — nouvelle sous-famille ──
  | 'easyRuns' // courses SANS objectif de vitesse (client easyMode) — Easy Run
  | 'recoveryRuns' // courses de récupération (allure lente choisie, easyMode+lent) — Recovery Run
  | 'balancedWeeks' // semaines actives à volume modéré (ni sur- ni sous-entraînement) — Balanced Week
  | 'noPressureWeeks' // semaines actives 100 % course_privee/social_run (aucune pression territoire) — No Pressure Week
  | 'smartRuns' // courses vérifiées ET sans flag ET allure raisonnable — Smart Runner
  // ── Verified / fair-play ──
  | 'verifiedRuns' // courses vérifiées — GRYD Verified
  | 'cleanDays' // jours sans run rejeté (lastRejectedDay) — Clean Runner
  // ── Saison (décernées par season_close, rang inversé) ──
  | 'seasonRank' // rang local inversé — Season Rank
  | 'nationalRank' // rang France inversé — National Rank
  | 'crewSeasonRank' // rang crew inversé — Crew Season
  // ── Secrets (héritage AMENDEMENT-04 + 3 nouveaux) ──
  | 'pioneerZoneRuns' // héritage : capture en zone pionnière/sauvage (Explorateur legacy)
  | 'seasonZeroHexes' // héritage : hexes S0 (Saison 0 legacy)
  | 'soloRuns' // héritage : courses solo (Solitaire legacy)
  | 'loopRuns' // secret « La Boucle »
  | 'exactTenRuns' // secret « Dix Pile »
  | 'maxRunsInOneDay' // secret « Triplé »
  | 'wolfHourRuns' // secret « Heure du Loup »
  | 'straightRuns' // secret « Ligne Droite »
  | 'maxHexesInRun' // secret « Centurion »
  | 'newYearRuns' // secret « Première Foulée de l'An »
  | 'bestActiveDayStreak' // secret « Semaine Parfaite »
  | 'homeSpotRuns' // secret « Fidèle au Poste »
  | 'comebackRuns' // secret « Comeback » : course après ≥ 30 j d'inactivité
  | 'silentTakeoverRuns' // secret « Silent Takeover » : ≥ 50 volés ET départ nocturne
  | 'noMapRuns'; // secret « No Map Run » : course valide 100 % pionnière

// ─── Interprétations gelées (AMENDEMENT-04 §3, conservées) — bornes LOCALES ──

/** Nocturne : départ entre 22 h et 5 h locale, BORNES COMPRISES. */
export const NIGHT_START_MIN = 22 * 60;
export const NIGHT_END_MIN = 5 * 60;
/** Aube : départ entre 5 h (incluse) et 7 h (exclue). */
export const DAWN_START_MIN = 5 * 60;
export const DAWN_END_MIN = 7 * 60;
/** Sprinter MVP (héritage) : allure moyenne STRICTEMENT < 4:00/km. */
export const SPRINTER_MAX_AVG_PACE_S_KM = 4 * 60;

// ─── Mécaniques (météo / routes V0, conservées d'AMENDEMENT-04) ──────────────
export const WEATHER_RAIN_MIN_MM_H = 0.5;
export const WEATHER_SNOW_MIN_CM_H = 0.1;
export const WEATHER_HEAT_MIN_C = 30;
export const ROUTE_MIN_KM = 2;
export const ROUTE_ENDPOINT_MATCH_KM = 1;

// ─── Conditions des badges secrets (documentées, évaluées par le moteur) ─────

/** « La Boucle » : arrivée à moins de 100 m du point de départ. */
export const LOOP_MAX_CLOSE_M = 100;
/** « Dix Pile » : 10,00 km ± 1 %. */
export const EXACT_TEN_TARGET_M = 10_000;
export const EXACT_TEN_TOLERANCE = 0.01;
/** « Heure du Loup » : départ entre 3 h (incluse) et 4 h (exclue). */
export const WOLF_HOUR_START_MIN = 3 * 60;
export const WOLF_HOUR_END_MIN = 4 * 60;
/** « Ligne Droite » : ≥ 2 km, à vol d'oiseau ≥ 95 % de la distance courue. */
export const STRAIGHT_MIN_DISTANCE_M = 2_000;
export const STRAIGHT_MIN_RATIO = 0.95;
/** « Première Foulée de l'An » : départ un 1ᵉʳ janvier (date locale, 'MM-DD'). */
export const NEW_YEAR_MONTH_DAY = '01-01';
/** « Fidèle au Poste » : mêmes départs en cellule H3 res 9 (~150-200 m). */
export const HOME_SPOT_H3_RESOLUTION = 9;
/** « Triplé » : 3 courses validées le même jour local. */
export const TRIPLE_RUNS_IN_ONE_DAY = 3;
/** « Semaine Parfaite » : 7 jours actifs locaux consécutifs. */
export const PERFECT_WEEK_DAYS = 7;
/** « Centurion » : 100 hexes capturés en une seule course. */
export const CENTURION_HEXES_IN_RUN = 100;
/** « Fidèle au Poste » : 10 départs depuis le même spot. */
export const HOME_SPOT_RUNS = 10;
/** « Comeback » : reprise après un trou d'au moins 30 jours entre jours actifs. */
export const COMEBACK_GAP_DAYS = 30;
/** « Silent Takeover » : au moins 50 hexes VOLÉS dans une course à départ nocturne. */
export const SILENT_TAKEOVER_MIN_STEALS = 50;

// ─── Déduplication d'activité (AMENDEMENT-06 §4, Activity Hub) ───────────────
/** Tolérance de l'heure de départ, en MINUTES (± borne INCLUSE). */
export const DEDUP_START_TOLERANCE_MIN = 3;
/** Tolérance relative sur la durée (10 %, borne INCLUSE). */
export const DEDUP_DURATION_TOLERANCE = 0.1;
/** Tolérance relative sur la distance (10 %, borne INCLUSE). */
export const DEDUP_DISTANCE_TOLERANCE = 0.1;

// ─── Le catalogue ─────────────────────────────────────────────────────────────

export interface BadgeDef {
  /** Identifiant stable snake_case (clé DB `badges.key`). */
  key: string;
  name: string;
  /** Condition affichée, formulée joueur. */
  requirement: string;
  family: BadgeFamily;
  /** Couleur d'accent de la famille — DATA, exception polychrome §1. */
  familyColor: string;
  /** Tier visuel (remplace la rareté). */
  tier: BadgeTier;
  /** Stat vie entière évaluée (LifetimeStats, moteur). */
  metric: BadgeMetric;
  /** Décerné quand `stats[metric] >= threshold`. */
  threshold: number;
  /** Ordre d'affichage. */
  sort: number;
  /** Masqué en « ? » en UI tant que non débloqué (§2). */
  secret?: boolean;
  /** Slug de la famille progressive (null pour simples/secrets). */
  familySlug?: string;
  /** Niveau 1..5 dans la famille progressive ; 6 = legend. Absent = simple. */
  level?: number;
  /** Badge héritage Saison 0 conservé mais non mis en avant (§1.5). */
  legacy?: boolean;
}

function def(
  family: BadgeFamily,
  key: string,
  name: string,
  requirement: string,
  tier: BadgeTier,
  metric: BadgeMetric,
  threshold: number,
  flags: { secret?: boolean; legacy?: boolean } = {},
): Omit<BadgeDef, 'sort'> {
  return {
    key,
    name,
    requirement,
    family,
    familyColor: BADGE_FAMILY_COLORS[family],
    tier,
    metric,
    threshold,
    ...(flags.secret ? { secret: true } : {}),
    ...(flags.legacy ? { legacy: true } : {}),
  };
}

/** Chiffres romains des niveaux 1..5 (le 6ᵉ niveau est « LEGEND »). */
const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

/**
 * Génère une famille progressive : 6 BadgeDef `slug_1..5` + `slug_legend`.
 * names = « <name> <chiffre romain> » (I..V) puis « <name> LEGEND ».
 * tier du niveau n = BADGE_TIERS[n-1] (road…legend). `thresholds` = 6 bornes
 * croissantes [niv1..niv5, legend]. `requirement` construit depuis un modèle.
 */
export function leveledFamily(
  slug: string,
  name: string,
  family: BadgeFamily,
  metric: BadgeMetric,
  thresholds: readonly [number, number, number, number, number, number],
  requirementFor: (level: number, threshold: number) => string,
): Omit<BadgeDef, 'sort'>[] {
  return thresholds.map((threshold, i) => {
    const level = i + 1; // 1..6 (6 = legend)
    const isLegend = level === 6;
    return {
      key: isLegend ? `${slug}_legend` : `${slug}_${level}`,
      name: `${name} ${isLegend ? 'LEGEND' : ROMAN[i]}`,
      requirement: requirementFor(level, threshold),
      family,
      familyColor: BADGE_FAMILY_COLORS[family],
      tier: BADGE_TIERS[i]!,
      metric,
      threshold,
      familySlug: slug,
      level,
    };
  });
}

/** Modèle de condition « atteins N <unité> ». */
const reqCount = (unit: string) => (_level: number, t: number) =>
  `Atteins ${t.toLocaleString('fr-FR')} ${unit}.`;
/** Modèle de condition distance (m → km). */
const reqKm = (scope: string) => (_level: number, t: number) =>
  `${scope} ${(t / 1000).toLocaleString('fr-FR')} km.`;

/**
 * Le catalogue V2 (sort = index + 1) — 203 badges (cf. BADGE_COUNT) :
 * onboarding + familles progressives (I..V + LEGEND, 6 niveaux) + 12 secrets
 * + 12 motivationnels AMENDEMENT-07 §6 (5 crew/social + 2 mastery + 5 healthy)
 * + héritage Saison 0. Les 13 familles §1.2 (+ healthy) sont toutes couvertes.
 * NB : la famille « saison » (rangs) est décernée par season_close, PAS par
 * course ; le National Rank et le Crew Season restent hors périmètre MVP
 * (verrouillés à 0, décernables sans « À venir » — AMENDEMENT-06 §1.4).
 */
export const BADGES: readonly BadgeDef[] = [
  // ── Onboarding (8 simples) — violet. Keys/names FR existants conservés. ──
  def('onboarding', 'premiers_pas', 'Premiers Pas', 'Termine ta première course valide.', 'road', 'runsValid', 1),
  def('onboarding', 'enclenche', 'Enclenché', 'Capture ta première zone.', 'road', 'hexesCaptured', 1),
  def('onboarding', 'first_crew', 'First Crew', 'Rejoins ton premier crew.', 'road', 'crewsJoined', 1),
  def('onboarding', 'defenseur_premier', 'First Defense', 'Défends ta première zone.', 'road', 'defends', 1),
  def('onboarding', 'first_share', 'First Share', 'Partage un résultat de course.', 'road', 'firstShares', 1),
  def('onboarding', 'first_verified', 'First Verified Run', 'Réalise ta première course vérifiée.', 'road', 'verifiedRuns', 1),
  def('onboarding', 'fondateur', 'Fondateur', 'Rejoins la Saison 0 en tant que fondateur.', 'carbon', 'seasonZeroHexes', 1),
  def('onboarding', 'saison_0', 'Saison 0', 'Capture au moins 1 zone pendant la Saison 0.', 'race', 'seasonZeroHexes', 1),

  // ── Distance (3 familles × 6) — rose ──
  ...leveledFamily('distance_runner', 'Distance Runner', 'distance', 'bestRunDistanceM',
    [3_000, 5_000, 10_000, 21_100, 42_195, 50_000], reqKm('Cours en une seule course')),
  ...leveledFamily('season_distance', 'Season Distance', 'distance', 'seasonDistanceM',
    [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000], reqKm('Cumule cette saison')),
  ...leveledFamily('lifetime_distance', 'Lifetime Distance', 'distance', 'totalDistanceM',
    [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000], reqKm('Cumule au total')),

  // ── Territoire (3 familles × 6) — vert ──
  ...leveledFamily('hex_hunter', 'Zone Hunter', 'territoire', 'hexesCaptured',
    [100, 500, 1_000, 5_000, 10_000, 50_000], reqCount('zones capturées (cumul vie entière)')),
  ...leveledFamily('zone_taker', 'Zone Taker', 'territoire', 'sectorsControlled',
    [1, 3, 10, 25, 50, 100], reqCount('secteurs contrôlés')),
  ...leveledFamily('city_control', 'City Control', 'territoire', 'bestSectorControlPct',
    [10, 25, 50, 70, 90, 100], (_l, t) =>
      t >= 100 ? 'Domine un secteur actif 30 jours.' : `Contrôle ${t} % d'un secteur actif.`),

  // ── Attaque (3 familles × 6) — rouge-orangé ──
  ...leveledFamily('raider', 'Raider', 'attaque', 'steals',
    [10, 100, 500, 1_000, 5_000, 10_000], reqCount('zones volées')),
  ...leveledFamily('sector_breaker', 'Sector Breaker', 'attaque', 'sectorsContested',
    [1, 3, 10, 25, 50, 100], reqCount('secteurs contestés')),
  ...leveledFamily('raid_leader', 'Raid Leader', 'attaque', 'offensivesJoined',
    [1, 5, 10, 25, 50, 100], reqCount('offensives rejointes')),

  // ── Défense (3 familles × 6) — bleu ──
  ...leveledFamily('defender', 'Defender', 'defense', 'defends',
    [10, 100, 500, 1_000, 5_000, 10_000], reqCount('zones défendues')),
  ...leveledFamily('hold_the_line', 'Hold The Line', 'defense', 'holdDays',
    [3, 7, 14, 30, 60, 100], reqCount('jours de tenue d\'une zone')),
  ...leveledFamily('fortress', 'Fortress', 'defense', 'clustersProtected',
    [1, 3, 10, 25, 50, 100], reqCount('secteurs protégés')),

  // ── Exploration (2 familles × 6) — turquoise ──
  ...leveledFamily('pioneer', 'Pioneer', 'exploration', 'pioneerHexes',
    [10, 100, 500, 1_000, 5_000, 10_000], reqCount('zones pionnières')),
  ...leveledFamily('frontier_runner', 'Frontier Runner', 'exploration', 'ruralZonesOpened',
    [1, 3, 10, 25, 50, 100], reqCount('zones rurales ouvertes')),

  // ── Routes / avant-postes (3 familles × 6) — ambre ──
  ...leveledFamily('route_opened', 'Route Opened', 'routes', 'routes',
    [1, 5, 10, 25, 50, 100], reqCount('routes ouvertes')),
  ...leveledFamily('outpost_builder', 'Outpost Builder', 'routes', 'outposts',
    [1, 3, 5, 10, 25, 50], reqCount('avant-postes créés')),
  ...leveledFamily('supply_line', 'Supply Line', 'routes', 'supplyLines',
    [1, 3, 10, 25, 50, 100], reqCount('routes maintenues 7 jours')),

  // ── Crew (3 familles × 6) — orange ──
  ...leveledFamily('crew_member', 'Crew Member', 'crew', 'crewContributions',
    [1, 5, 25, 100, 500, 1_000], (_l, t) =>
      t <= 1 ? 'Rejoins un crew.' : `Réalise ${t.toLocaleString('fr-FR')} contributions crew.`),
  ...leveledFamily('crew_captain', 'Crew Captain', 'crew', 'crewCaptainScore',
    [1, 3, 5, 10, 25, 50], (_l, t) =>
      t <= 1 ? 'Crée un crew.' : `Atteins le palier capitaine ${t}.`),
  ...leveledFamily('united_front', 'United Front', 'crew', 'activeMembersWeek',
    [2, 5, 10, 25, 50, 100], reqCount('membres actifs la même semaine')),

  // ── Crew / social motivationnels (AMENDEMENT-07 §6, simples) — orange ──
  // Keys NOUVELLES (0012 reseed additif) : ne recoupent aucun badge 0009.
  def('crew', 'first_invite', 'First Invite', 'Invite ta première recrue ou ami.', 'road', 'invitesSent', 1),
  def('crew', 'crew_helper', 'Crew Helper', 'Envoie 5 invitations pour renforcer ton crew.', 'tempo', 'invitesSent', 5),
  def('crew', 'recruiter', 'Recruiter', 'Active 5 recrues via ton parrainage.', 'race', 'referralsActivated', 5),
  def('crew', 'group_run', 'Group Run', 'Cours en run groupé (départ synchronisé, trace partagée).', 'tempo', 'groupRuns', 1),
  def('crew', 'encourager', 'Encourager', 'Envoie 10 réactions de soutien sur le feed de ton crew.', 'tempo', 'reactionsSent', 10),

  // ── Performance (3 familles × 6) — cyan ──
  ...leveledFamily('pace_progress', 'Pace Progress', 'performance', 'paceImprovementSKm',
    [1, 10, 20, 30, 45, 60], (_l, t) => `Améliore ton allure de ${t} s/km sur un mois.`),
  ...leveledFamily('consistency', 'Consistency', 'performance', 'weeksActive',
    [2, 4, 8, 12, 24, 52], reqCount('semaines actives')),
  ...leveledFamily('score_forme', 'Score Forme', 'performance', 'formeScore',
    [60, 70, 80, 85, 90, 95], (_l, t) => `Atteins un Score Forme de ${t}.`),

  // ── Mastery motivationnels (AMENDEMENT-07 §6, simples) — cyan ──
  // Personal Best / Clean Week : progression perso, jamais vitesse/volume brut.
  def('performance', 'personal_best', 'Personal Best', 'Bats un record perso (distance ou allure) sur une course.', 'race', 'personalBests', 1),
  def('performance', 'clean_week', 'Clean Week', 'Passe une semaine ISO active sans aucun run rejeté.', 'tempo', 'cleanWeeks', 1),

  // ── Healthy (AMENDEMENT-07 §6, nouvelle sous-famille, simples) — émeraude ──
  // Récompensent l'effort sain (récup, régularité douce), PAS le volume/vitesse.
  def('healthy', 'easy_run', 'Easy Run', 'Réalise une course sans objectif de vitesse (mode facile).', 'road', 'easyRuns', 1),
  def('healthy', 'recovery_run', 'Recovery Run', 'Réalise une course de récupération à allure tranquille.', 'road', 'recoveryRuns', 1),
  def('healthy', 'balanced_week', 'Balanced Week', 'Passe une semaine à volume équilibré (ni trop, ni trop peu).', 'tempo', 'balancedWeeks', 1),
  def('healthy', 'no_pressure_week', 'No Pressure Week', 'Passe une semaine active 100 % sans enjeu de territoire.', 'tempo', 'noPressureWeeks', 1),
  def('healthy', 'smart_runner', 'Smart Runner', 'Enchaîne 10 courses vérifiées, propres et à allure raisonnable.', 'race', 'smartRuns', 10),

  // ── Verified / fair-play (2 familles × 6) — gris acier ──
  ...leveledFamily('gryd_verified', 'GRYD Verified', 'verified', 'verifiedRuns',
    [10, 50, 100, 250, 500, 1_000], reqCount('courses vérifiées')),
  ...leveledFamily('clean_runner', 'Clean Runner', 'verified', 'cleanDays',
    [30, 60, 90, 180, 365, 730], reqCount('jours sans run rejeté')),

  // ── Saison (3 familles × 6 = 18) — or. DÉCERNÉES PAR season_close. ──
  // Rang inversé : la stat vaut « au moins ce niveau de classement atteint ».
  ...leveledFamily('season_rank', 'Season Rank', 'saison', 'seasonRank',
    [1, 2, 3, 4, 5, 6], (_l, t) => [
      'Termine dans le top 100 local.', 'Termine dans le top 50 local.',
      'Termine dans le top 10 local.', 'Termine dans le top 3 local.',
      'Termine #1 local.', 'Remporte la saison locale.',
    ][t - 1]!),
  ...leveledFamily('national_rank', 'National Rank', 'saison', 'nationalRank',
    [1, 2, 3, 4, 5, 6], (_l, t) => [
      'Termine dans le top 1 000 France.', 'Termine dans le top 500 France.',
      'Termine dans le top 100 France.', 'Termine dans le top 50 France.',
      'Termine dans le top 10 France.', 'Termine #1 France.',
    ][t - 1]!),
  ...leveledFamily('crew_season', 'Crew Season', 'saison', 'crewSeasonRank',
    [1, 2, 3, 4, 5, 6], (_l, t) => [
      'Ton crew termine dans le top 100.', 'Ton crew termine dans le top 50.',
      'Ton crew termine dans le top 10.', 'Ton crew termine dans le top 3.',
      'Ton crew termine #1 local.', 'Ton crew termine #1 France.',
    ][t - 1]!),

  // ── Secrets (12) — or, masqués en « ? » (§2). 9 existants + 3 nouveaux. ──
  def('secret', 'secret_la_boucle', 'La Boucle', 'Termine une course en revenant à moins de 100 m de ton point de départ.', 'tempo', 'loopRuns', 1, { secret: true }),
  def('secret', 'secret_dix_pile', 'Dix Pile', 'Cours très exactement 10,00 km (± 1 %).', 'tempo', 'exactTenRuns', 1, { secret: true }),
  def('secret', 'secret_triple', 'Triplé', 'Valide 3 courses dans la même journée.', 'carbon', 'maxRunsInOneDay', TRIPLE_RUNS_IN_ONE_DAY, { secret: true }),
  def('secret', 'secret_heure_du_loup', 'Heure du Loup', 'Démarre une course entre 3 h et 4 h du matin.', 'carbon', 'wolfHourRuns', 1, { secret: true }),
  def('secret', 'secret_ligne_droite', 'Ligne Droite', 'Course ≥ 2 km quasi rectiligne : arrive à vol d\'oiseau à ≥ 95 % de la distance courue.', 'tempo', 'straightRuns', 1, { secret: true }),
  def('secret', 'secret_centurion', 'Centurion', 'Capture 100 zones en une seule course.', 'carbon', 'maxHexesInRun', CENTURION_HEXES_IN_RUN, { secret: true }),
  def('secret', 'secret_premiere_foulee', 'Première Foulée de l\'An', 'Cours un 1ᵉʳ janvier.', 'tempo', 'newYearRuns', 1, { secret: true }),
  def('secret', 'secret_semaine_parfaite', 'Semaine Parfaite', 'Cours 7 jours d\'affilée.', 'carbon', 'bestActiveDayStreak', PERFECT_WEEK_DAYS, { secret: true }),
  def('secret', 'secret_fidele_au_poste', 'Fidèle au Poste', 'Démarre 10 courses depuis le même endroit (~150 m).', 'tempo', 'homeSpotRuns', HOME_SPOT_RUNS, { secret: true }),
  def('secret', 'secret_comeback', 'Comeback', 'Reviens courir après au moins 30 jours d\'inactivité.', 'race', 'comebackRuns', 1, { secret: true }),
  def('secret', 'secret_silent_takeover', 'Silent Takeover', 'Vole au moins 50 zones lors d\'une course démarrée la nuit.', 'elite', 'silentTakeoverRuns', 1, { secret: true }),
  def('secret', 'secret_no_map_run', 'No Map Run', 'Termine une course valide 100 % en territoire jamais possédé.', 'elite', 'noMapRuns', 1, { secret: true }),

  // ── Héritage Saison 0 (§1.5) — conservés, non mis en avant (legacy). ──
  def('onboarding', 'explorateur', 'Explorateur', 'Capture au moins 1 zone en territoire pionnier ou sauvage.', 'tempo', 'pioneerZoneRuns', 1, { legacy: true }),
  def('onboarding', 'solitaire', 'Solitaire', '10 courses valides sans appartenir à un crew.', 'tempo', 'soloRuns', 10, { legacy: true }),
  def('onboarding', 'sprinter', 'Sprinter', 'Course ≥ 1 km avec une allure moyenne sous 4:00/km.', 'race', 'runsValid', 1, { legacy: true }),
].map((b, i) => ({ ...b, sort: i + 1 }));

/** Accès direct par key (affichage, notifications). */
export const BADGES_BY_KEY: ReadonlyMap<string, BadgeDef> = new Map(
  BADGES.map((b) => [b.key, b]),
);

/** Compteur x/N de l'écran collection (recalculé). */
export const BADGE_COUNT = BADGES.length;

// ─── Helpers de progression (UI Collection V2) ───────────────────────────────

/** Badges d'une famille progressive, triés par niveau (1..6). */
export function familyLevels(slug: string): BadgeDef[] {
  return BADGES.filter((b) => b.familySlug === slug).sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0),
  );
}

/**
 * Prochain niveau d'un badge progressif (le niveau au-dessus de `key`), ou
 * null si `key` est déjà le legend ou n'est pas progressif.
 */
export function nextLevelOf(key: string): BadgeDef | null {
  const cur = BADGES_BY_KEY.get(key);
  if (!cur || !cur.familySlug || cur.level === undefined) return null;
  return familyLevels(cur.familySlug).find((b) => (b.level ?? 0) === cur.level! + 1) ?? null;
}

/** Métrique de progression d'un badge (celle qui alimente sa jauge). */
export function progressMetricOf(key: string): BadgeMetric | null {
  return BADGES_BY_KEY.get(key)?.metric ?? null;
}

/**
 * Progression d'un badge donné pour une valeur de stat courante. Renvoie le
 * ratio [0..1] vers le seuil du badge, `unlocked` si atteint, et le seuil.
 * Sert à la section « Proches du déblocage » et aux jauges (§1.6).
 */
export interface BadgeProgress {
  value: number;
  threshold: number;
  ratio: number;
  unlocked: boolean;
}

export function badgeProgress(key: string, statValue: number): BadgeProgress | null {
  const b = BADGES_BY_KEY.get(key);
  if (!b) return null;
  const value = Math.max(0, statValue);
  const ratio = b.threshold > 0 ? Math.min(1, value / b.threshold) : value >= b.threshold ? 1 : 0;
  return { value, threshold: b.threshold, ratio, unlocked: value >= b.threshold };
}
