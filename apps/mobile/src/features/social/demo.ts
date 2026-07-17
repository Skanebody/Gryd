/**
 * GRYD — données démo DÉTERMINISTES du social (AMENDEMENT-07 §8, doc social
 * Partie C). Profil renforcé de KORO + amis / demandes / suggestions, cohérents
 * avec le crew (LES FOULÉES 9³) et le classement factices. AUCUN câblage :
 * TODO(O1) brancher user_profiles / friendships / crew_applications (0011).
 * Aucun nombre magique de barème ici : le niveau/tier/rang sont DÉRIVÉS des
 * règles réelles côté écran (features/crew/rules). Ce fichier ne porte que de
 * la DATA d'affichage (handles, villes, libellés).
 */

/** Statut d'une relation d'amitié (miroir UI de friendships.status, 0011). */
export type FriendState = 'accepted' | 'incoming' | 'suggested';

export interface FriendDemo {
  handle: string;
  displayName: string;
  city: string;
  /** XP perso → niveau/tier dérivés à l'affichage (playerLevelForXp). */
  xp: number;
  /** Tag du crew d'appartenance (undefined = sans crew). */
  crewTag?: string;
  state: FriendState;
  /** Suggestion : raison douce (« 3 amis en commun », « même crew »). */
  reason?: string;
  /** Ami déjà dans MON crew → on masque le bouton « Inviter au crew ». */
  inMyCrew?: boolean;
  /**
   * Dispo courte de jeu (« Dispo défense », « Dispo guerre » — AMENDEMENT-08
   * §8, doc §19). Jamais de formulation négative (anti-shame).
   */
  availability?: string;
  /** Runs cette semaine (absent = non partagé — privacy/mode discret). */
  runsThisWeek?: number;
}

/** Profil renforcé de l'utilisateur (§8) — cohérent avec profil.tsx / crew demo. */
export const MY_SOCIAL_PROFILE = {
  handle: 'koro',
  displayName: 'KORO',
  city: 'Paris',
  country: 'France',
  /** Titre éditorial (badge rare mis en avant) — pas de gameplay. */
  title: 'Tenace du 19ᵉ',
  crewName: 'LES FOULÉES 9³',
  crewTag: '9³',
  /** XP perso (1:1 points, cohérent avec profil.tsx) → niveau/tier dérivés. */
  xp: 4210,
  /** Rang de saison (affichage) — le serveur décide, ici DATA démo. */
  seasonRank: 8,
  seasonScope: 'Paris',
  /** Score Forme (motivation) — 0-100, cohérent avec badges demo (formeScore 78). */
  formeScore: 78,
  /** Contribution au coffre de crew cette semaine (%) — formulation anti-shame. */
  crewChestContribPct: 12,
  friendsCount: 14,
} as const;

/**
 * Amis / demandes / suggestions démo. `accepted` = mes amis, `incoming` =
 * demandes reçues (à accepter/refuser), `suggested` = suggestions (à ajouter).
 * Handles en minuscules (HANDLE_REGEX). XP volontairement variés pour illustrer
 * plusieurs tiers d'avatar.
 */
export const FRIENDS: readonly FriendDemo[] = [
  { handle: 'lena_run', displayName: 'LENA_RUN', city: 'Paris', xp: 3800, crewTag: '9³', state: 'accepted', inMyCrew: true, availability: 'Dispo défense', runsThisWeek: 3 },
  { handle: 'molokai', displayName: 'MOLOKAÏ', city: 'Paris', xp: 5200, crewTag: '9³', state: 'accepted', inMyCrew: true, availability: 'Dispo guerre', runsThisWeek: 5 },
  { handle: 'pacer20e', displayName: 'PACER·20E', city: 'Paris', xp: 2100, crewTag: '9³', state: 'accepted', inMyCrew: true, availability: 'Dispo défense', runsThisWeek: 2 },
  { handle: 'nadia.k', displayName: 'NADIA.K', city: 'Lille', xp: 6400, crewTag: 'N11', state: 'accepted', availability: 'Exploration', runsThisWeek: 4 },
  { handle: 'yanis_ep', displayName: 'YANIS_EP', city: 'Paris', xp: 900, state: 'accepted', runsThisWeek: 1 },
  { handle: 'sofia.trail', displayName: 'SOFIA.TRAIL', city: 'Lille', xp: 11_800, crewTag: 'MEL', state: 'accepted', availability: 'Dispo guerre', runsThisWeek: 6 },

  { handle: 'theo_canal', displayName: 'THEO_CANAL', city: 'Paris', xp: 4700, crewTag: 'CAN', state: 'incoming', reason: '2 amis en commun' },
  { handle: 'maya.59', displayName: 'MAYA.59', city: 'Lille', xp: 1500, state: 'incoming', reason: 'Scanné ton QR' },

  { handle: 'jog.parmentier', displayName: 'JOG.PARMENTIER', city: 'Paris', xp: 2600, crewTag: '9³', state: 'suggested', reason: 'Même crew', inMyCrew: true },
  { handle: 'toutdroit', displayName: 'TOUTDROIT', city: 'Paris', xp: 1200, crewTag: '9³', state: 'suggested', reason: 'Même crew', inMyCrew: true },
  { handle: 'bpm_bastille', displayName: 'BPM_BASTILLE', city: 'Paris', xp: 3300, crewTag: 'BPM', state: 'suggested', reason: '3 amis en commun' },
  { handle: 'ines.11', displayName: 'INES.11', city: 'Paris', xp: 8100, crewTag: 'N11', state: 'suggested', reason: 'Court ton quartier' },
];

/** Lien d'invitation crew factice (Copier lien + toast, §8). */
export const CREW_INVITE_LINK = 'gryd.run/c/9cube';
