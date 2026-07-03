/**
 * GRYD — Registre d'icônes BADGE + géométrie du BOUCLIER-HEXAGONE tactique.
 * SOURCE UNIQUE : maquette-badges-gryd.html (planche « GRYD — BADGE SYSTEM »,
 * 24 emblèmes) — les 24 paths `IC` et la silhouette `SHAPE`/`SHAPE_IN` sont
 * transcrits 1:1 (viewBox 120×136, icônes 24×24 au trait, stroke 1.15 posé
 * dans le groupe scale 2.5). UI-only : ce fichier n'est PAS synchronisé vers
 * supabase/functions/_shared (aucune règle de jeu ici).
 *
 * Volontairement séparé d'icons.ts (icônes de NAVIGATION/UI) : ici ce sont les
 * pictogrammes centraux des emblèmes, consommés par le mobile
 * (features/badges/BadgeHex, react-native-svg) et le web
 * (landing/BadgeGallery, SVG inline).
 *
 * Résolution d'icône (badgeIconFor) : slug EXACT → slug de famille progressive
 * (préfixe sans le suffixe de niveau `_1.._5`/`_legend`) → FAMILLE → défaut.
 * Chaque badge du catalogue (badges.ts) résout donc toujours une icône.
 */

import { BADGES, type BadgeFamily, type BadgeTier } from './badges';

// ─── Géométrie du bouclier-hexagone (planche, viewBox 120×136) ───────────────

/**
 * Silhouette + placements de la planche. `outline` = bouclier-hexagone
 * tactique (PAS un simple hexagone) ; `inner` = contour intérieur (ring2 des
 * tiers hauts) ; `icon` = groupe de l'icône 24×24 (translate 30,38 · scale
 * 2.5) ; `halo` = ellipse legend derrière le bouclier ; `ticks`/`speed`/
 * `rays`/`arcs` = décorations par tier (coordonnées planche — leurs TEINTES
 * viennent de BADGE_TIER_STYLE, jamais en dur côté composant).
 */
export const BADGE_SHIELD = {
  viewBoxWidth: 120,
  viewBoxHeight: 136,
  outline: 'M60 8 L104 30 V84 Q104 108 60 128 Q16 108 16 84 V30 Z',
  inner: 'M60 16 L97 35 V82 Q97 102 60 119 Q23 102 23 82 V35 Z',
  icon: { x: 30, y: 38, scale: 2.5 },
  iconStrokeWidth: 1.15,
  halo: { cx: 60, cy: 68, rx: 52, ry: 58 },
  ticks: ['M60 10v6', 'M60 120v6', 'M20 32l5 3', 'M100 32l-5 3'],
  speed: ['M28 96l14-14', 'M24 84l10-10'],
  rays: ['M34 22l4 5', 'M86 22l-4 5', 'M60 4v4'],
  arcs: ['M25 96q-6-14-2-28', 'M95 96q6-14 2-28'],
} as const;

/**
 * Décorations par TIER, transcrites de l'objet TIER de la planche :
 * road = nu · tempo = ticks · race = traits de vitesse · carbon = texture
 * tissée (hachures) · elite = rayons hauts · legend = arcs latéraux + halo.
 */
export interface BadgeTierDecor {
  ticks: boolean;
  speed: boolean;
  rays: boolean;
  arcs: boolean;
  /** Hachures « carbone tissé » du plateau (pattern weave de la planche). */
  weave: boolean;
}

export const BADGE_TIER_DECOR: Record<BadgeTier, BadgeTierDecor> = {
  road: { ticks: false, speed: false, rays: false, arcs: false, weave: false },
  tempo: { ticks: true, speed: false, rays: false, arcs: false, weave: false },
  race: { ticks: false, speed: true, rays: false, arcs: false, weave: false },
  carbon: { ticks: false, speed: false, rays: false, arcs: false, weave: true },
  elite: { ticks: false, speed: false, rays: true, arcs: false, weave: false },
  legend: { ticks: false, speed: false, rays: false, arcs: true, weave: false },
};

// ─── Icônes 24×24 au trait ───────────────────────────────────────────────────

/** Paths SVG (attribut d) d'une icône badge — fill none, stroke courant. */
export type BadgeIconPaths = readonly string[];

export const BADGE_ICON_VIEWBOX = 24;

/**
 * Registre : les 24 emblèmes de la planche (transcrits 1:1 de l'objet IC) +
 * 18 icônes complémentaires MÊME STYLE (24×24, trait ~1.15-1.5, caps ronds)
 * pour couvrir les 200 badges du catalogue (familles progressives, secrets,
 * motivationnels, healthy).
 */
export const BADGE_ICONS = {
  // ── Les 24 emblèmes de la planche (ordre de la planche) ──
  first_run: ['M4 15.5c0-1.1 1-2 2.3-2h3.2l3.6-3.8c.5 2.2 1.7 3.3 4.6 3.9 1.6.3 2.8 1.1 2.8 2.6v1.3H4z', 'M4 20h16.5', 'M9.5 13.5l1.6 1.6'],
  first_capture: ['M12 2.8l7.4 4.3v9.8L12 21.2l-7.4-4.3V7.1z', 'M10 15.5V8.8l5.2 2.1-3.4 1.5v3.1z'],
  founder: ['M12 2.6l7.6 4.4v10L12 21.4 4.4 17V7z', 'M12 7.4l1.3 2.7 3 .4-2.2 2 .6 2.9L12 14l-2.7 1.4.6-2.9-2.2-2 3-.4z'],
  verified: ['M12 21.5c5-2 8-5.4 8-9.9V6.2L12 3 4 6.2v5.4c0 4.5 3 7.9 8 9.9z', 'M7.4 12.2h2.1l1.2-2.5 1.6 4.4 1.2-1.9h2.4'],
  hex_hunter: ['M8.3 3.4l3.4 2v3.9l-3.4 2-3.4-2V5.4z', 'M16.2 7.4l3.4 2v3.9l-3.4 2-3.4-2V9.4z', 'M9.8 13.2l3.4 2v3.9l-3.4 2-3.4-2v-3.9z'],
  zone_taker: ['M4 5.5h4', 'M11 5.5h4', 'M18.5 5.5v4', 'M18.5 12.5v4', 'M15 19.5h-4', 'M8 19.5H4.5V16', 'M4.5 13V9', 'M15.8 13.6l2.7 1.6v3.1l-2.7 1.6-2.7-1.6v-3.1z'],
  city_grab: ['M4 19V11h3.4v8', 'M9.4 19V6.2h3.8V19', 'M15.4 19v-6.2H19V19', 'M2.8 19h18.4', 'M15.9 2.6l2 1.2v2.3l-2 1.2-2-1.2V3.8z'],
  territory_lord: ['M4 8.6 8 12l4-6.6L16 12l4-3.4-1.6 9.8H5.6z', 'M5.6 21h12.8'],
  first_defense: ['M12 2.8l7.4 4.3v9.8L12 21.2l-7.4-4.3V7.1z', 'M12 9.6a1.9 1.9 0 0 1 1 3.5v3h-2v-3a1.9 1.9 0 0 1 1-3.5z'],
  wall: ['M3.5 19.5v-6h4v-3.6h4V6.3h9', 'M3.5 19.5h17', 'M11.5 13.5h4.2V9.9h4.8', 'M7.5 19.5v-3h6v3'],
  fortress: ['M12 2.8l7.4 4.3v9.8L12 21.2l-7.4-4.3V7.1z', 'M12 6.4l4.4 2.5v5.9L12 17.4l-4.4-2.6V8.9z'],
  hold_line: ['M3 12.5h18', 'M7 17.5l4.5-5L7 7.5', 'M17 17.5l-4.5-5L17 7.5'],
  pioneer: ['M12 21.4a9.4 9.4 0 1 0 0-18.8 9.4 9.4 0 0 0 0 18.8z', 'M15.3 8.7 13.2 13l-4.4 2.1 2.1-4.3z'],
  route_opened: ['M5.5 18.8a1.9 1.9 0 1 0 .01 0', 'M18.5 5.2a1.9 1.9 0 1 0 .01 0', 'M6.8 17.4C9.5 15 8.4 11 12 9.5c2.1-.9 3.7-1.3 4.9-2.6'],
  frontier: ['M7 21.5V3.5', 'M7 4.8h9.6l-2.2 3.2 2.2 3.2H7', 'M3.5 21.5h11'],
  pathfinder: ['M5.2 5.8a1.7 1.7 0 1 0 .01 0', 'M18.8 7.8a1.7 1.7 0 1 0 .01 0', 'M8.8 18.2a1.7 1.7 0 1 0 .01 0', 'M17.2 16.4a1.7 1.7 0 1 0 .01 0', 'M6.8 6.9l10.4 1.4', 'M6 7.4l2.4 9.2', 'M10.4 17.7l5.2-.9', 'M18.3 9.5l-1 5.3'],
  crew_member: ['M12 4.2a2.1 2.1 0 1 0 .01 0', 'M5.2 15.8a2.1 2.1 0 1 0 .01 0', 'M18.8 15.8a2.1 2.1 0 1 0 .01 0', 'M10.9 7.2 6.4 14', 'M13.1 7.2l4.5 6.8', 'M7.4 17.9h9.2'],
  war_room: ['M12 21.4a9.4 9.4 0 1 1 9.4-9.4', 'M12 12V4.4', 'M12 12l5.4 3.2', 'M16.6 8.2v.01', 'M7.6 15.6v.01'],
  raid_leader: ['M3.5 12h13', 'M11 5.5 17.5 12 11 18.5', 'M20 4.5l1.6-1.6', 'M20 19.5l1.6 1.6'],
  united_front: ['M12 12.8c2.5-1 4-2.7 4-5V5.6L12 4 8 5.6v2.2c0 2.3 1.5 4 4 5z', 'M6.5 20.4c2-.8 3.2-2.2 3.2-4v-1.7L6.5 13.4l-3.2 1.3v1.7c0 1.8 1.2 3.2 3.2 4z', 'M17.5 20.4c2-.8 3.2-2.2 3.2-4v-1.7l-3.2-1.3-3.2 1.3v1.7c0 1.8 1.2 3.2 3.2 4z'],
  long_run: ['M4 13.5c0-1 .9-1.8 2-1.8h3l3.3-3.4c.5 2 1.6 3 4.2 3.5 1.5.3 2.6 1 2.6 2.4v1.1H4z', 'M3.5 19h17', 'M7 19v-1.8', 'M12 19v-1.8', 'M17 19v-1.8'],
  streak_7: ['M12 21c3.7 0 6.2-2.3 6.2-5.7 0-2.5-1.3-4.4-2.9-6.2-.4 1.2-1 2-1.9 2.5.1-2.1-.5-4.8-2.9-7.6-.3 2.9-1.2 4.4-2.5 6-1.2 1.5-2.2 3.2-2.2 5.3 0 3.4 2.5 5.7 6.2 5.7z'],
  elite_form: ['M12 21.4a9.4 9.4 0 1 0 0-18.8 9.4 9.4 0 0 0 0 18.8z', 'M12 16.6a4.6 4.6 0 1 0 0-9.2', 'M12.8 2.6v2', 'M12.8 19.4v2'],
  season_legend: ['M12 2.6l7.6 4.4v10L12 21.4 4.4 17V7z', 'M12 6.6l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z', 'M12 1v1.2', 'M12 21.8V23'],

  // ── Complémentaires (même style planche) — couverture des 200 badges ──
  /** Attaque — flèches croisées. */
  crossed_arrows: ['M5 19 19 5', 'M13.8 5H19v5.2', 'M5 5l14 14', 'M19 13.8V19h-5.2'],
  /** Performance — éclair au trait. */
  bolt: ['M13 2.5 6.8 13.4h4.4L9.6 21.5l7.6-11.1h-4.4z'],
  /** Healthy — feuille nervurée. */
  leaf: ['M6 18C6 10 12 4.5 19 4c.5 7-4 14-13 14z', 'M6 18c3-5 6-8 10-10.5'],
  /** Saison — médaille étoilée à rubans. */
  medal: ['M12 15.8a5.4 5.4 0 1 0 0-10.8 5.4 5.4 0 0 0 0 10.8z', 'M12 7.6l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z', 'M9.2 15l-2 6 4.8-2.6L16.8 21l-2-6'],
  /** Verified — pouls (ECG). */
  pulse: ['M3 12.5h4l2-4.5 3 9 2.5-6 1.5 1.5h5'],
  /** Secret — point d'interrogation. */
  question: ['M9 8.6c0-1.9 1.4-3.1 3-3.1s3 1.1 3 2.9c0 2.4-2.9 2.7-2.9 4.9v.7', 'M12.1 18.3v.01'],
  /** Invitation — coureur recruté (+). */
  invite: ['M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4.5 20c.5-3.4 2.8-5 5.5-5 1.2 0 2.3.3 3.2.8', 'M18 14v6', 'M15 17h6'],
  /** Encouragement — cœur. */
  heart: ['M12 20s-7-4.4-7-9.3C5 7.9 7 6 9.4 6c1.2 0 2.1.5 2.6 1.4C12.5 6.5 13.4 6 14.6 6 17 6 19 7.9 19 10.7c0 4.9-7 9.3-7 9.3z'],
  /** Record perso — chrono. */
  stopwatch: ['M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z', 'M12 9.5v4l2.8 1.6', 'M9.5 3h5', 'M12 3v3'],
  /** Semaine / saison — calendrier validé. */
  calendar: ['M4.5 6.5h15V20h-15z', 'M4.5 10.5h15', 'M8 4v4', 'M16 4v4', 'M8.5 14.8l2.3 2.3 4.4-4.4'],
  /** Distance vie entière — route vers l'horizon. */
  horizon: ['M5 20 11 4', 'M19 20 13 4', 'M12 8.5v2', 'M12 13.5v2', 'M12 18.5v1.5'],
  /** Avant-poste — tour à fanion. */
  outpost: ['M8 21V9h8v12', 'M6 21h12', 'M8 13h8', 'M12 9V4.5', 'M12 4.5h4l-1.4 1.7L16 8h-4'],
  /** Allure en progression — courbe montante. */
  pace: ['M4 17l5-5 3 3 7-8', 'M14.5 7H19v4.5'],
  /** Classement crew — podium. */
  podium: ['M9 20V8.5h6V20', 'M3 20v-5h6', 'M15 20v-8h6', 'M2.5 20h19'],
  /** Nuit / repos — croissant de lune. */
  moon: ['M19 14.5A8 8 0 0 1 9.5 5 8 8 0 1 0 19 14.5z'],
  /** Boucle / comeback — flèche circulaire. */
  loop: ['M18.5 12a6.5 6.5 0 1 1-1.9-4.6', 'M16.6 3.4v4h-4'],
  /** Précision — cible. */
  target: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M12 12v.01'],
  /** Partage — flèche sortante. */
  share: ['M4.5 12v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7', 'M12 14.5V4', 'M8 7.5 12 3.5l4 4'],
} as const satisfies Record<string, BadgeIconPaths>;

export type BadgeIconName = keyof typeof BADGE_ICONS;

// ─── Résolution slug → icône ─────────────────────────────────────────────────

/**
 * Mapping planche → keys RÉELLES du catalogue (badges.ts) + badges simples.
 * (first run→premiers_pas, first capture→enclenche, founder→fondateur,
 * first defense→defenseur_premier, verified→first_verified, …)
 */
const BADGE_ICON_BY_SLUG: Readonly<Record<string, BadgeIconName>> = {
  // Onboarding
  premiers_pas: 'first_run',
  enclenche: 'first_capture',
  first_crew: 'crew_member',
  defenseur_premier: 'first_defense',
  first_share: 'share',
  first_verified: 'verified',
  fondateur: 'founder',
  saison_0: 'season_legend',
  // Crew / social motivationnels
  first_invite: 'invite',
  crew_helper: 'invite',
  recruiter: 'crew_member',
  group_run: 'crew_member',
  encourager: 'heart',
  // Mastery
  personal_best: 'stopwatch',
  clean_week: 'calendar',
  // Healthy
  easy_run: 'leaf',
  recovery_run: 'heart',
  balanced_week: 'calendar',
  smart_runner: 'verified',
  // Secrets (icône du badge une fois RÉVÉLÉ ; masqué = « ? » d'état)
  secret_la_boucle: 'loop',
  secret_dix_pile: 'target',
  secret_triple: 'hex_hunter',
  secret_heure_du_loup: 'moon',
  secret_ligne_droite: 'raid_leader',
  secret_centurion: 'territory_lord',
  secret_premiere_foulee: 'first_run',
  secret_semaine_parfaite: 'streak_7',
  secret_fidele_au_poste: 'outpost',
  secret_comeback: 'loop',
  secret_silent_takeover: 'zone_taker',
  secret_no_map_run: 'pathfinder',
  // Héritage Saison 0
  explorateur: 'pioneer',
  solitaire: 'moon',
  sprinter: 'bolt',
};

/**
 * Icône par FAMILLE PROGRESSIVE (familySlug → tous ses niveaux _1.._5/_legend) :
 * hex hunter→famille hex, zone taker/city grab→city_control, wall/fortress/
 * hold the line→défense, pioneer/frontier/pathfinder→exploration & routes,
 * crew member/united front→crew, long run→distance, streak→consistency,
 * elite form→score forme, season legend→rangs saison, territory lord→captain.
 */
const BADGE_ICON_BY_FAMILY_SLUG: Readonly<Record<string, BadgeIconName>> = {
  distance_runner: 'long_run',
  season_distance: 'calendar',
  lifetime_distance: 'horizon',
  hex_hunter: 'hex_hunter',
  zone_taker: 'zone_taker',
  city_control: 'city_grab',
  raider: 'crossed_arrows',
  sector_breaker: 'war_room',
  raid_leader: 'raid_leader',
  defender: 'wall',
  hold_the_line: 'hold_line',
  fortress: 'fortress',
  pioneer: 'pioneer',
  frontier_runner: 'frontier',
  route_opened: 'route_opened',
  outpost_builder: 'outpost',
  supply_line: 'pathfinder',
  crew_member: 'crew_member',
  crew_captain: 'territory_lord',
  united_front: 'united_front',
  pace_progress: 'pace',
  consistency: 'streak_7',
  score_forme: 'elite_form',
  gryd_verified: 'verified',
  clean_runner: 'pulse',
  season_rank: 'season_legend',
  national_rank: 'medal',
  crew_season: 'podium',
};

/**
 * Fallback par FAMILLE : distance=chaussure, territoire=hexes, attaque=flèches
 * croisées, défense=bouclier-pouls, exploration=boussole, routes=tracé,
 * crew=trio, performance=éclair, healthy=feuille, saison=étoile-médaille,
 * verified=pouls, secret=« ? ».
 */
const BADGE_ICON_BY_FAMILY: Readonly<Record<BadgeFamily, BadgeIconName>> = {
  onboarding: 'first_run',
  distance: 'long_run',
  territoire: 'hex_hunter',
  attaque: 'crossed_arrows',
  defense: 'verified', // bouclier + pouls (emblème planche « verified »)
  exploration: 'pioneer', // boussole
  routes: 'route_opened',
  crew: 'crew_member',
  performance: 'bolt',
  healthy: 'leaf',
  saison: 'medal',
  verified: 'pulse',
  secret: 'question',
};

/** Icône par défaut si ni slug ni famille ne matchent (hex + drapeau planté). */
const DEFAULT_BADGE_ICON: BadgeIconName = 'first_capture';

/** Suffixe de niveau des familles progressives (`_1.._5` / `_legend`). */
const LEVEL_SUFFIX = /_(?:[1-5]|legend)$/;

/**
 * Résout les paths d'icône d'un badge : slug exact → famille progressive
 * (préfixe) → famille → défaut. `family` accepte string (BadgeFamilyId UI).
 */
export function badgeIconFor(slug?: string | null, family?: string | null): BadgeIconPaths {
  if (slug) {
    const exact = BADGE_ICON_BY_SLUG[slug];
    if (exact) return BADGE_ICONS[exact];
    const progressive = BADGE_ICON_BY_FAMILY_SLUG[slug.replace(LEVEL_SUFFIX, '')];
    if (progressive) return BADGE_ICONS[progressive];
  }
  if (family && family in BADGE_ICON_BY_FAMILY) {
    return BADGE_ICONS[BADGE_ICON_BY_FAMILY[family as BadgeFamily]];
  }
  return BADGE_ICONS[DEFAULT_BADGE_ICON];
}

// ─── Reverse lookup name → key (BadgeCard reçoit `name`, pas la key) ─────────

/** Les names du catalogue sont uniques (niveaux en chiffres romains/LEGEND). */
const BADGE_KEY_BY_NAME: ReadonlyMap<string, string> = new Map(
  BADGES.map((b) => [b.name, b.key]),
);

/** Key catalogue d'un badge depuis son `name` affiché (ou undefined). */
export function badgeKeyByName(name: string): string | undefined {
  return BADGE_KEY_BY_NAME.get(name);
}
