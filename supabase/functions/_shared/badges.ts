/**
 * GRYD — Catalogue des badges (AMENDEMENT-04, planche « GRYD — TOUS LES BADGES »).
 * SOURCE DE VÉRITÉ UNIQUE du catalogue : 50 badges en 5 familles + 9 secrets = 59.
 * AUCUN nombre magique badge hors de ce fichier (seuils, couleurs, bornes horaires).
 *
 * - Les couleurs de famille sont des DONNÉES du catalogue (exception polychrome
 *   contrôlée, AMENDEMENT-04 §1) — jamais dans design-tokens. Seules les
 *   surfaces badge (collection, détail, carte de partage, notification de
 *   déblocage) les utilisent ; partout ailleurs un badge reste monochrome charte.
 * - `dormant` (§4) : badge visible mais JAMAIS décerné en l'état (raison en texte).
 * - `secret` (§2) : masqué en « ? » en UI tant que non débloqué.
 * - L'attribution vit dans packages/engine/src/badges.ts (applyRunToStats +
 *   evaluateBadges) ; la copie supabase/functions/_shared/badges.ts est GÉNÉRÉE
 *   par scripts/sync-game-rules.mjs — ne jamais l'éditer à la main.
 * - La migration supabase/migrations/0007_badges_catalog.sql reseed la table
 *   `badges` depuis ce catalogue (SQL écrit à la main, à générer par script à terme).
 */

// ─── Familles et couleurs (AMENDEMENT-04 §1) ─────────────────────────────────

export type BadgeFamily =
  | 'fondateur'
  | 'performance'
  | 'territoire'
  | 'crew'
  | 'special'
  | 'secret';

/**
 * Couleur d'accent PAR FAMILLE (planche) : Fondateur violet · Performance cyan ·
 * Territoire vert · Crew orange · Spécial rose · Secrets or.
 * Valeurs alignées sur le catalogue provisoire mobile (features/badges).
 */
export const BADGE_FAMILY_COLORS: Record<BadgeFamily, string> = {
  fondateur: '#8B5CF6', // violet
  performance: '#22D3EE', // cyan
  territoire: '#4ADE80', // vert
  crew: '#FB923C', // orange
  special: '#F472B6', // rose
  secret: '#E7B84C', // or
};

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legend';

// ─── Métriques évaluées (stats vie entière, LifetimeStats côté moteur) ───────

/**
 * Chaque badge est décerné quand `stats[metric] >= threshold`. Toutes les
 * métriques sont des compteurs/maxima croissants (jamais décroissants) : le
 * franchissement d'un seuil est donc définitif.
 * `sectorsVisited`, `outposts`, `routes`, `crewOutposts`, `crewRoutes` (détection
 * V0 non branchée), `crewsCreated`, `referralsActivated`, `dominatedSectors`,
 * `rain/snow/heat/eventRuns` sont alimentées par d'autres pipelines que
 * ingest_run (jobs/endpoints V1) — les badges correspondants restent à 0 (ou
 * sont `dormant`) d'ici là.
 */
export type BadgeMetric =
  | 'runsValid' // courses validées (valid + partial, AMENDEMENT-02 §4)
  | 'totalDistanceM' // distance cumulée vie entière (m)
  | 'activeDays' // jours actifs DISTINCTS cumulés (≥ 1 course valide), §3
  | 'hexesCaptured' // hexes capturés vie entière = neutres + volés (§3)
  | 'steals' // hexes volés
  | 'defends' // hexes défendus
  | 'pioneerHexes' // hexes pionniers (jamais possédés)
  | 'sectorsVisited' // secteurs distincts couru(s) — V1
  | 'outposts' // avant-postes fondés — détection V0
  | 'routes' // routes tracées — détection V0
  | 'dominatedSectors' // secteurs dominés ≥ 70 % — job sector_control V1
  | 'crewsJoined' // a rejoint ≥ 1 crew (proxy MVP : course avec crew actif)
  | 'crewsCreated' // crews créés — endpoint crew V1
  | 'crewContributions' // courses valides avec ≥ 1 hex claimé en crew (§3)
  | 'crewOutposts' // avant-postes crew — détection V0
  | 'crewRoutes' // routes crew — détection V0
  | 'maxCrewSize' // taille max atteinte par son crew
  | 'referralsActivated' // filleuls activés (1re course valide du filleul, §3.7)
  | 'soloRuns' // courses valides sans crew (§3)
  | 'seasonZeroRuns' // courses valides pendant la Saison 0
  | 'seasonZeroHexes' // hexes capturés pendant la Saison 0
  | 'pioneerZoneRuns' // courses valides avec ≥ 1 hex capturé en zone pionnière/sauvage
  | 'bestRunDistanceM' // meilleure distance en UNE course (m)
  | 'sprintRuns' // courses valides à allure < SPRINTER_MAX_AVG_PACE_S_KM
  | 'nightRuns' // départs 22 h-5 h locale (bornes comprises)
  | 'dawnRuns' // départs 5 h-7 h locale
  | 'rainRuns' // courses sous la pluie — source météo V1
  | 'snowRuns' // courses sous la neige — source météo V1
  | 'heatRuns' // courses par forte chaleur — source météo V1
  | 'eventRuns' // participations à un événement — système events V1
  | 'loopRuns' // secret « La Boucle »
  | 'exactTenRuns' // secret « Dix Pile »
  | 'maxRunsInOneDay' // secret « Triplé » (max de courses valides un même jour)
  | 'wolfHourRuns' // secret « Heure du Loup »
  | 'straightRuns' // secret « Ligne Droite »
  | 'maxHexesInRun' // secret « Centurion » (max d'hexes capturés en une course)
  | 'newYearRuns' // secret « Première Foulée de l'An »
  | 'bestActiveDayStreak' // secret « Semaine Parfaite » (jours actifs consécutifs)
  | 'homeSpotRuns'; // secret « Fidèle au Poste »

// ─── Interprétations gelées (AMENDEMENT-04 §3) — bornes horaires LOCALES ─────

/** Nocturne : départ entre 22 h et 5 h locale, BORNES COMPRISES (05:00 pile compte). */
export const NIGHT_START_MIN = 22 * 60;
export const NIGHT_END_MIN = 5 * 60;
/** Aube : départ entre 5 h (incluse) et 7 h (exclue). 05:00 pile = Nocturne ET Aube. */
export const DAWN_START_MIN = 5 * 60;
export const DAWN_END_MIN = 7 * 60;
/** Sprinter MVP : allure moyenne STRICTEMENT < 4:00/km (course valide ⇒ ≥ 1 km, §3.2). */
export const SPRINTER_MAX_AVG_PACE_S_KM = 4 * 60;

// ─── Conditions des 9 badges secrets (documentées ici, évaluées par le moteur) ─

/** « La Boucle » : arrivée à moins de 100 m du point de départ (course valide ⇒ ≥ 1 km). */
export const LOOP_MAX_CLOSE_M = 100;
/** « Dix Pile » : distance de course à 10,00 km ± 1 % (9 900 m — 10 100 m). */
export const EXACT_TEN_TARGET_M = 10_000;
export const EXACT_TEN_TOLERANCE = 0.01;
/** « Heure du Loup » : départ entre 3 h (incluse) et 4 h (exclue) du matin. */
export const WOLF_HOUR_START_MIN = 3 * 60;
export const WOLF_HOUR_END_MIN = 4 * 60;
/**
 * « Ligne Droite » : course ≥ 2 km dont la distance départ→arrivée à vol
 * d'oiseau vaut ≥ 95 % de la distance courue (aller simple quasi rectiligne).
 */
export const STRAIGHT_MIN_DISTANCE_M = 2_000;
export const STRAIGHT_MIN_RATIO = 0.95;
/** « Première Foulée de l'An » : départ un 1ᵉʳ janvier (date locale, 'MM-DD'). */
export const NEW_YEAR_MONTH_DAY = '01-01';
/**
 * « Fidèle au Poste » : départs répétés dans la MÊME cellule H3 res 9 (~150-200 m).
 * Le spot est mémorisé en cellule grossière — jamais de lat/lng exact (esprit §7).
 * L'ancre est la cellule du tout premier départ enregistré.
 */
export const HOME_SPOT_H3_RESOLUTION = 9;
/** « Triplé » : 3 courses validées le même jour local. */
export const TRIPLE_RUNS_IN_ONE_DAY = 3;
/** « Semaine Parfaite » : 7 jours actifs locaux consécutifs. */
export const PERFECT_WEEK_DAYS = 7;
/** « Centurion » : 100 hexes capturés (neutres + volés) en une seule course. */
export const CENTURION_HEXES_IN_RUN = 100;
/** « Fidèle au Poste » : 10 départs depuis le même spot. */
export const HOME_SPOT_RUNS = 10;

// ─── Le catalogue ─────────────────────────────────────────────────────────────

export interface BadgeDef {
  /** Identifiant stable snake_case (clé DB `badges.key`). */
  key: string;
  name: string;
  /** Condition affichée, formulée joueur (texte FR de la planche, gelé §3). */
  requirement: string;
  family: BadgeFamily;
  /** Couleur d'accent de la famille — DATA, exception polychrome §1. */
  familyColor: string;
  rarity: BadgeRarity;
  /** Stat vie entière évaluée (LifetimeStats, moteur). */
  metric: BadgeMetric;
  /** Décerné quand `stats[metric] >= threshold`. */
  threshold: number;
  /** Ordre d'affichage (ordre de la planche). */
  sort: number;
  /** Masqué en « ? » en UI tant que non débloqué (§2). */
  secret?: boolean;
  /** Non attribuable en l'état : raison (§4). Visible, jamais décerné. */
  dormant?: string;
}

const DORMANT_OUTPOSTS =
  'Détection avant-postes/routes/secteurs V0 non branchée — attribuable dès qu\'elle tourne (AMENDEMENT-04 §4).';
const DORMANT_CREW_CAP =
  'CREW_MAX_MEMBERS = 10 en Saison 0 — attribuable quand le cap sera levé (V2). On ne change pas la règle pour un badge.';
const DORMANT_WEATHER = 'Nécessite une source météo (V1).';
const DORMANT_EVENTS = 'Nécessite le système d\'événements (V1).';

function def(
  family: BadgeFamily,
  key: string,
  name: string,
  requirement: string,
  rarity: BadgeRarity,
  metric: BadgeMetric,
  threshold: number,
  flags: { secret?: boolean; dormant?: string } = {},
): Omit<BadgeDef, 'sort'> {
  return {
    key,
    name,
    requirement,
    family,
    familyColor: BADGE_FAMILY_COLORS[family],
    rarity,
    metric,
    threshold,
    ...(flags.secret ? { secret: true } : {}),
    ...(flags.dormant ? { dormant: flags.dormant } : {}),
  };
}

/** Les 59 badges (ordre de la planche ; sort = index + 1). */
export const BADGES: readonly BadgeDef[] = [
  // ── Fondateur (10) — violet ──
  def('fondateur', 'premiers_pas', 'Premiers Pas', 'Termine ta première course valide.', 'common', 'runsValid', 1),
  def('fondateur', 'enclenche', 'Enclenché', 'Capture ton premier hexagone.', 'common', 'hexesCaptured', 1),
  def('fondateur', 'fondateur', 'Fondateur', 'Capture 10 hexagones (cumul vie entière).', 'common', 'hexesCaptured', 10),
  def('fondateur', 'pionnier', 'Pionnier', 'Capture 100 hexagones (cumul vie entière).', 'rare', 'hexesCaptured', 100),
  def('fondateur', 'explorateur', 'Explorateur', 'Capture au moins 1 hex dans une zone pionnière ou sauvage.', 'rare', 'pioneerZoneRuns', 1),
  def('fondateur', 'batisseur', 'Bâtisseur', 'Fonde ton premier avant-poste.', 'epic', 'outposts', 1, { dormant: DORMANT_OUTPOSTS }),
  def('fondateur', 'connecteur', 'Connecteur', 'Relie deux territoires par une route.', 'rare', 'routes', 1, { dormant: DORMANT_OUTPOSTS }),
  def('fondateur', 'implante', 'Implanté', '7 jours actifs cumulés (≥ 1 course valide chacun).', 'common', 'activeDays', 7),
  def('fondateur', 'racines', 'Racines', '30 jours actifs cumulés (≥ 1 course valide chacun).', 'rare', 'activeDays', 30),
  def('fondateur', 'legende_locale', 'Légende Locale', '100 jours actifs cumulés (≥ 1 course valide chacun).', 'legend', 'activeDays', 100),
  // ── Performance (10) — cyan ──
  def('performance', 'sprinter', 'Sprinter', 'Course ≥ 1 km avec une allure moyenne sous 4:00/km.', 'rare', 'sprintRuns', 1),
  def('performance', 'energie', 'Énergie', 'Termine 5 courses valides.', 'common', 'runsValid', 5),
  def('performance', 'endurance', 'Endurance', 'Cours 10 km en une seule course.', 'common', 'bestRunDistanceM', 10_000),
  def('performance', 'perseverant', 'Persévérant', 'Cours 21 km en une seule course.', 'rare', 'bestRunDistanceM', 21_000),
  def('performance', 'devoue', 'Dévoué', 'Cumule 42 km de course.', 'rare', 'totalDistanceM', 42_000),
  def('performance', 'iron_runner', 'Iron Runner', 'Cumule 100 km de course.', 'rare', 'totalDistanceM', 100_000),
  def('performance', 'ultra_runner', 'Ultra Runner', 'Cumule 200 km de course.', 'epic', 'totalDistanceM', 200_000),
  def('performance', 'marathonien', 'Marathonien', 'Cours 42,195 km en une seule course.', 'epic', 'bestRunDistanceM', 42_195),
  def('performance', 'inarretable', 'Inarrêtable', 'Cumule 300 km de course.', 'epic', 'totalDistanceM', 300_000),
  def('performance', 'machine', 'Machine', 'Cumule 500 km de course.', 'legend', 'totalDistanceM', 500_000),
  // ── Territoire (10) — vert ── (« capturés » = neutres + volés, cumul vie entière, §3)
  def('territoire', 'conquerant', 'Conquérant', 'Capture 500 hexagones (cumul vie entière).', 'common', 'hexesCaptured', 500),
  def('territoire', 'dominateur', 'Dominateur', 'Capture 1 000 hexagones (cumul vie entière).', 'rare', 'hexesCaptured', 1_000),
  def('territoire', 'seigneur', 'Seigneur', 'Capture 5 000 hexagones (cumul vie entière).', 'epic', 'hexesCaptured', 5_000),
  def('territoire', 'maitre', 'Maître', 'Capture 10 000 hexagones (cumul vie entière).', 'legend', 'hexesCaptured', 10_000),
  def('territoire', 'rival', 'Rival', 'Vole 1 hexagone à un adversaire.', 'common', 'steals', 1),
  def('territoire', 'pillard', 'Pillard', 'Vole 10 hexagones à des adversaires.', 'rare', 'steals', 10),
  def('territoire', 'predateur', 'Prédateur', 'Vole 50 hexagones à des adversaires.', 'epic', 'steals', 50),
  def('territoire', 'defenseur', 'Défenseur', 'Défends 10 hexagones.', 'common', 'defends', 10),
  def('territoire', 'forteresse', 'Forteresse', 'Défends 50 hexagones.', 'epic', 'defends', 50),
  def('territoire', 'legende_territoire', 'Légende', 'Domine un secteur à 70 % ou plus.', 'legend', 'dominatedSectors', 1),
  // ── Crew (10) — orange ── (« contribution » = course valide avec ≥ 1 hex claimé en crew, §3)
  def('crew', 'recrue', 'Recrue', 'Rejoins un crew.', 'common', 'crewsJoined', 1),
  def('crew', 'coequipier', 'Coéquipier', '5 contributions crew.', 'common', 'crewContributions', 5),
  def('crew', 'membre_actif', 'Membre Actif', '20 contributions crew.', 'rare', 'crewContributions', 20),
  def('crew', 'pilier', 'Pilier', '50 contributions crew.', 'epic', 'crewContributions', 50),
  def('crew', 'stratege', 'Stratège', 'Participe à 10 avant-postes crew.', 'epic', 'crewOutposts', 10, { dormant: DORMANT_OUTPOSTS }),
  def('crew', 'batisseur_crew', 'Bâtisseur Crew', 'Ouvre 1 route pour ton crew.', 'rare', 'crewRoutes', 1, { dormant: DORMANT_OUTPOSTS }),
  def('crew', 'leader', 'Leader', 'Crée un crew.', 'common', 'crewsCreated', 1),
  def('crew', 'commandant', 'Commandant', 'Ton crew atteint 10 membres.', 'rare', 'maxCrewSize', 10),
  def('crew', 'legende_crew', 'Légende Crew', 'Ton crew atteint 50 membres.', 'legend', 'maxCrewSize', 50, { dormant: DORMANT_CREW_CAP }),
  def('crew', 'dynastie', 'Dynastie', 'Ton crew atteint 100 membres.', 'legend', 'maxCrewSize', 100, { dormant: DORMANT_CREW_CAP }),
  // ── Spécial (10) — rose ──
  def('special', 'nocturne', 'Nocturne', 'Course démarrée entre 22 h et 5 h.', 'common', 'nightRuns', 1),
  def('special', 'aube', 'Aube', 'Course démarrée entre 5 h et 7 h.', 'common', 'dawnRuns', 1),
  def('special', 'meteo', 'Météo', 'Cours sous la pluie.', 'rare', 'rainRuns', 1, { dormant: DORMANT_WEATHER }),
  def('special', 'hiver', 'Hiver', 'Cours sous la neige.', 'rare', 'snowRuns', 1, { dormant: DORMANT_WEATHER }),
  def('special', 'chaleur', 'Chaleur', 'Cours par forte chaleur.', 'rare', 'heatRuns', 1, { dormant: DORMANT_WEATHER }),
  def('special', 'solitaire', 'Solitaire', '10 courses valides sans appartenir à un crew.', 'rare', 'soloRuns', 10),
  def('special', 'social', 'Social', 'Parraine 1 coureur (1re course valide du filleul).', 'common', 'referralsActivated', 1),
  def('special', 'communaute', 'Communauté', 'Parraine 5 coureurs.', 'epic', 'referralsActivated', 5),
  def('special', 'evenement', 'Événement', 'Participe à un événement GRYD.', 'rare', 'eventRuns', 1, { dormant: DORMANT_EVENTS }),
  def('special', 'saison_0', 'Saison 0', 'Capture au moins 1 hex pendant la Saison 0.', 'legend', 'seasonZeroHexes', 1),
  // ── Secrets (9) — or, masqués en « ? » (§2). Conditions calculables depuis
  //    les données d'une course : heure de départ, distance, forme de trace,
  //    hexes, récurrence. Constantes documentées plus haut. ──
  def('secret', 'secret_la_boucle', 'La Boucle', 'Termine une course en revenant à moins de 100 m de ton point de départ.', 'rare', 'loopRuns', 1, { secret: true }),
  def('secret', 'secret_dix_pile', 'Dix Pile', 'Cours très exactement 10,00 km (± 1 %).', 'rare', 'exactTenRuns', 1, { secret: true }),
  def('secret', 'secret_triple', 'Triplé', 'Valide 3 courses dans la même journée.', 'epic', 'maxRunsInOneDay', TRIPLE_RUNS_IN_ONE_DAY, { secret: true }),
  def('secret', 'secret_heure_du_loup', 'Heure du Loup', 'Démarre une course entre 3 h et 4 h du matin.', 'epic', 'wolfHourRuns', 1, { secret: true }),
  def('secret', 'secret_ligne_droite', 'Ligne Droite', 'Course ≥ 2 km quasi rectiligne : arrive à vol d\'oiseau à ≥ 95 % de la distance courue.', 'rare', 'straightRuns', 1, { secret: true }),
  def('secret', 'secret_centurion', 'Centurion', 'Capture 100 hexagones en une seule course.', 'epic', 'maxHexesInRun', CENTURION_HEXES_IN_RUN, { secret: true }),
  def('secret', 'secret_premiere_foulee', 'Première Foulée de l\'An', 'Cours un 1ᵉʳ janvier.', 'rare', 'newYearRuns', 1, { secret: true }),
  def('secret', 'secret_semaine_parfaite', 'Semaine Parfaite', 'Cours 7 jours d\'affilée.', 'epic', 'bestActiveDayStreak', PERFECT_WEEK_DAYS, { secret: true }),
  def('secret', 'secret_fidele_au_poste', 'Fidèle au Poste', 'Démarre 10 courses depuis le même endroit (~150 m).', 'rare', 'homeSpotRuns', HOME_SPOT_RUNS, { secret: true }),
].map((b, i) => ({ ...b, sort: i + 1 }));

/** Accès direct par key (affichage, notifications). */
export const BADGES_BY_KEY: ReadonlyMap<string, BadgeDef> = new Map(
  BADGES.map((b) => [b.key, b]),
);

/** Compteur x/59 de l'écran collection. */
export const BADGE_COUNT = BADGES.length;
