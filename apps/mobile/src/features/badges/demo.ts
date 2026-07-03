/**
 * GRYD — état FACTICE de la collection (aucun backend branché). Profil KORO,
 * runner Saison 0 actif ~6 semaines. Les DÉBLOCAGES sont DÉRIVÉS des stats
 * démo vs les seuils du catalogue (@klaim/shared) : un badge est débloqué ssi
 * `stat[metric] >= threshold`. Ça garde jauges, section « Proches du déblocage »
 * et compteurs parfaitement cohérents.
 * TODO(O1) : brancher `user_badges` + `user_stats` (Supabase) et la réponse
 * `newBadges` d'ingest_run (AMENDEMENT-04 §5) — supprimer ce fichier à ce moment.
 */
import { BADGES, type BadgeMetric } from '@klaim/shared';

/**
 * Stats de jeu démo (LifetimeStats côté moteur), réalistes pour ~6 semaines de
 * jeu. Toute métrique absente = 0 (badge verrouillé à 0, jamais « à venir »).
 */
export const DEMO_STATS: Partial<Record<BadgeMetric, number>> = {
  // Onboarding / simples
  runsValid: 41,
  firstShares: 1,
  crewsJoined: 1,
  seasonZeroHexes: 1,
  // Distance (m)
  bestRunDistanceM: 12_400, // meilleure course ~12,4 km
  seasonDistanceM: 168_000, // ~168 km cette saison
  totalDistanceM: 168_000, // pas d'historique avant S0
  // Territoire
  hexesCaptured: 720, // → jauge Hex Hunter III (720 / 1 000)
  sectorsControlled: 2,
  bestSectorControlPct: 44,
  // Attaque
  steals: 138,
  sectorsContested: 4,
  offensivesJoined: 3,
  // Défense
  defends: 82, // → Defender II (82 / 100)
  holdDays: 9,
  clustersProtected: 2,
  // Exploration
  pioneerHexes: 210,
  ruralZonesOpened: 4,
  // Routes / avant-postes
  routes: 6,
  outposts: 2,
  supplyLines: 3,
  // Crew
  crewContributions: 47,
  crewCaptainScore: 0, // KORO n'est pas capitaine
  activeMembersWeek: 6,
  // Performance
  paceImprovementSKm: 14,
  weeksActive: 6, // → Consistency III (6 / 8 semaines)
  formeScore: 78,
  // Verified / fair-play
  verifiedRuns: 38,
  cleanDays: 44,
  // Saison (décernées par season_close — non atteintes en cours de saison)
  // Secrets débloqués
  loopRuns: 1,
  exactTenRuns: 1,
  wolfHourRuns: 0,
  maxHexesInRun: 63,
  comebackRuns: 0,
  silentTakeoverRuns: 0,
  noMapRuns: 0,
};

/** Valeur de stat démo pour une métrique (0 par défaut). */
export function demoStat(metric: BadgeMetric): number {
  return DEMO_STATS[metric] ?? 0;
}

/**
 * Dates de déblocage affichables (badges effectivement obtenus). Sert de source
 * pour l'ordre chronologique de l'aperçu profil et la ligne « Débloqué le … ».
 * Doit rester cohérente avec les stats ci-dessus.
 */
export const UNLOCKED_DEMO: ReadonlyMap<string, string> = new Map([
  ['premiers_pas', '12 juin 2026'],
  ['enclenche', '12 juin 2026'],
  ['first_crew', '16 juin 2026'],
  ['first_share', '18 juin 2026'],
  ['first_verified', '19 juin 2026'],
  ['saison_0', '12 juin 2026'],
  ['distance_runner_1', '12 juin 2026'], // 3 km
  ['distance_runner_2', '14 juin 2026'], // 5 km
  ['distance_runner_3', '21 juin 2026'], // 10 km
  ['hex_hunter_1', '20 juin 2026'], // 100 hexes
  ['hex_hunter_2', '28 juin 2026'], // 500 hexes
  ['raider_1', '19 juin 2026'], // 10 volés
  ['raider_2', '30 juin 2026'], // 100 volés
  ['defender_1', '22 juin 2026'], // 10 défendus
  ['consistency_1', '19 juin 2026'], // 2 semaines
  ['consistency_2', '26 juin 2026'], // 4 semaines
  ['gryd_verified_1', '27 juin 2026'], // 10 vérifiées
  ['clean_runner_1', '1 juillet 2026'], // 30 j clean
  ['secret_la_boucle', '23 juin 2026'],
  ['secret_dix_pile', '25 juin 2026'],
]);

/**
 * Ids débloqués — DÉRIVÉS des stats (source de vérité de l'état). On croise
 * avec UNLOCKED_DEMO pour la date d'affichage, mais l'appartenance vient des
 * seuils : impossible d'afficher débloqué un badge dont la jauge n'est pas pleine.
 */
export const UNLOCKED_IDS: ReadonlySet<string> = new Set(
  BADGES.filter((b) => demoStat(b.metric) >= b.threshold).map((b) => b.key),
);

/** Les n derniers badges débloqués, du plus récent au plus ancien (aperçu profil). */
export function lastUnlockedIds(n: number): string[] {
  return [...UNLOCKED_DEMO.keys()]
    .filter((id) => UNLOCKED_IDS.has(id))
    .slice(-n)
    .reverse();
}
