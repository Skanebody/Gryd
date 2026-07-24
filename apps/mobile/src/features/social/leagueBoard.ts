/**
 * GRYD — classement Joueurs de la saison active (O1 Pass A « lecture », 11/07/2026).
 *
 * Lecture SEULE du board « Joueurs » de MA ville depuis Supabase quand une session
 * existe. Même pattern que features/social/economy.ts : session → remote, et
 * AUCUNE ligne inventée quand la lecture ne donne rien.
 *
 * Source réelle = la VUE `public.player_leaderboard` (season_scores ⋈ seasons ⋈
 * users), explicitement `grant select to authenticated` (0003_rls.sql) — elle
 * contourne le RLS owner-only de `users` et porte déjà `pseudo`. On cible la
 * saison `status='active'` de la ville du joueur, triée par points desc. Le client
 * n'écrit jamais un score (season_scores = service_role via season_close/ingest).
 *
 * ─── LE CLASSEMENT D'UNE AUTRE VILLE (23/07/2026) ────────────────────────────
 * AVANT : on rapatriait TOUTES les saisons actives (`eq('status','active')`,
 * sans `order` ni `limit`) puis, si `users.city_id` était NULL, on retombait sur
 * `active[0]` — la première ligne que Postgres voulait bien rendre. Les lignes
 * affichées étaient RÉELLES, mais c'était le classement de la ville de quelqu'un
 * d'autre, présenté comme celui du joueur, sous un gabarit qui ne nomme aucune
 * ville. Un mensonge d'autant plus grand que la voie d'ouverture de villes
 * (migration 0066) crée UNE saison active PAR ville ouverte : la requête non
 * bornée grossissait avec le monde.
 *
 * MAINTENANT : la saison est ciblée EN UNE REQUÊTE bornée (`eq('city_id', …)`,
 * `order('starts_at')`, `limit(1)`), et il n'y a PLUS de repli. Ville inconnue =
 * état DISTINCT et dit (`status: 'city_unknown'`), jamais le classement d'une
 * autre ville. Le nom de la ville est LU dans `city_zones` et remonté pour que
 * l'écran puisse nommer ce qu'il montre.
 *
 * QUATRE ÉTATS DISTINCTS, jamais confondus (CLAUDE.md) : `loading` (lecture en
 * cours — n'affirme rien), `signed_out`, `unavailable` (la lecture a ÉCHOUÉ),
 * `empty` (la lecture a RÉUSSI et il n'y a personne). `city_unknown` s'ajoute :
 * c'est ni un vide ni une panne, c'est une ville pas encore rattachée.
 *
 * Périmètre : SEUL le board Joueurs (ville du joueur) est câblé au serveur. Joueurs·France /
 * Crews / Ville n'ont aucune source réelle au MVP — c'est à l'écran Saison de
 * dire ce qui n'est pas encore mesuré, pas à ce hook d'inventer des lignes. Le rang est dérivé de l'ordre
 * (index+1) — robuste que `rank_cache` soit calculé ou non.
 *
 * ─── LA FUITE COLMATÉE (21/07/2026) ──────────────────────────────────────────
 * AVANT : sans session, classement réel vide, ou lecture en échec, on servait le
 * podium de démonstration — des joueurs qui n'existent pas, présentés comme le
 * classement de la saison en cours, avec « TOI » quelque part dedans. Un
 * classement inventé est un mensonge sur la communauté ET sur le rang du joueur.
 *
 * MAINTENANT (mode vitrine ABANDONNÉ, 21/07/2026) : le podium de démonstration
 * n'est plus servi nulle part. Un board sans lignes réelles ressort VIDE
 * (`rows: []`) — à l'écran de dire « personne n'a encore couru cette saison, sois
 * le premier ». Seul le GABARIT du board (titre, unité) vient encore de
 * `LEAGUE_BOARDS` : ce sont des libellés de jeu, pas des données de joueur.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { LEAGUE_BOARDS, type LeagueBoard, type LeagueRow } from './league';

/** Nombre max de lignes lues (podium + liste + « Voir tout »). */
const LEADERBOARD_LIMIT = 50;

/** GABARIT du board « Joueurs » : id/label/kind/valueLabel seulement, jamais ses lignes. */
const JOUEURS_BOARD_TEMPLATE: LeagueBoard =
  LEAGUE_BOARDS.find((b) => b.id === 'joueurs') ?? LEAGUE_BOARDS[0]!;

export type LeagueSource = 'local' | 'server';

/**
 * État du board Joueurs — un seul à la fois, jamais confondus.
 *  · `loading`      la lecture est EN COURS : n'affirme rien sur le joueur ;
 *  · `signed_out`   aucune session : il n'y a pas de « ma ville », donc pas de saison ;
 *  · `city_unknown` connecté, mais `users.city_id` est NULL : aucune saison ne
 *                   peut être ciblée. On ne montre PAS celle d'une autre ville ;
 *  · `unavailable`  la lecture a ÉCHOUÉ (réseau, RLS, vue absente) — on ne
 *                   déguise pas une panne en « personne n'a couru » ;
 *  · `empty`        la lecture a RÉUSSI et il n'y a aucune ligne : c'est vrai ;
 *  · `ready`        des lignes réelles, celles de la ville du joueur.
 */
export type LeagueBoardStatus =
  | 'loading'
  | 'signed_out'
  | 'city_unknown'
  | 'unavailable'
  | 'empty'
  | 'ready';

export interface SeasonLeaderboard {
  /** Board Joueurs de MA ville : lignes réelles (saison active), sinon vide. */
  joueursBoard: LeagueBoard;
  source: LeagueSource;
  loading: boolean;
  /** L'état exact de la lecture — l'écran ne devine jamais la cause d'un vide. */
  status: LeagueBoardStatus;
  /**
   * Nom de la ville dont ce classement est celui, LU dans `city_zones`. `null`
   * quand il n'y a pas de ville rattachée, ou que la base n'a pas rendu de nom —
   * jamais un libellé deviné (« Paris » par défaut serait exactement la faute
   * que ce fichier vient de corriger).
   */
  cityName: string | null;
}

function asInt(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

type BoardRow = { user_id?: unknown; pseudo?: unknown; points?: unknown };

/** Résultat de lecture — porte l'état ET ce qui a été lu, jamais l'un sans l'autre. */
type RemoteBoard =
  | { status: 'city_unknown' }
  | { status: 'unavailable' }
  | { status: 'empty'; cityName: string | null }
  | { status: 'ready'; cityName: string | null; rows: LeagueRow[] };

function asName(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Board Joueurs de la saison active de MA ville. Trois requêtes bornées, aucune
 * non filtrée : `users` (ma ligne), puis `seasons` + `city_zones` de MA ville en
 * parallèle, puis la vue du classement.
 *
 * Ne lève JAMAIS : chaque échec devient l'état `unavailable`, distinct du vide.
 */
async function fetchRemoteJoueurs(userId: string): Promise<RemoteBoard> {
  if (!supabase) return { status: 'unavailable' };

  const meResult = await supabase.from('users').select('city_id').eq('id', userId).maybeSingle();
  if (meResult.error) return { status: 'unavailable' };

  const myCity = (meResult.data as { city_id?: unknown } | null)?.city_id;
  // `users.city_id` est écrit par `ingest_run/ensureHomeCity` au premier run
  // rattaché à une zone. Tant qu'il est NULL, aucune saison n'est LA sienne.
  if (typeof myCity !== 'string' || myCity.length === 0) return { status: 'city_unknown' };

  const [seasonResult, cityResult] = await Promise.all([
    // BORNÉE : une seule ville, un seul statut, un ordre déterministe, une ligne.
    // (L'index partiel `seasons_one_active_per_city` garantit déjà l'unicité —
    // l'ordre et la limite rendent la requête stable même si l'index changeait.)
    supabase
      .from('seasons')
      .select('id')
      .eq('city_id', myCity)
      .eq('status', 'active')
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Le NOM affiché vient de la base, pas d'une table en dur côté client.
    supabase.from('city_zones').select('name').eq('city_id', myCity).maybeSingle(),
  ]);
  if (seasonResult.error) return { status: 'unavailable' };

  // Un nom introuvable n'est pas une panne du classement : on classe quand même,
  // sans nommer. (`cityResult.error` → `null`, jamais un nom inventé.)
  const cityName = cityResult.error ? null : asName((cityResult.data as { name?: unknown } | null)?.name);

  const seasonId = (seasonResult.data as { id?: unknown } | null)?.id;
  // Ville rattachée mais sans saison active : rien à classer, et c'est vrai.
  if (typeof seasonId !== 'string') return { status: 'empty', cityName };

  const boardResult = await supabase
    .from('player_leaderboard')
    .select('user_id, pseudo, points')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .limit(LEADERBOARD_LIMIT);
  if (boardResult.error) return { status: 'unavailable' };

  const rows = (boardResult.data ?? []) as BoardRow[];
  if (rows.length === 0) return { status: 'empty', cityName };

  return {
    status: 'ready',
    cityName,
    rows: rows.map((r, i) => ({
      rank: i + 1,
      name: typeof r.pseudo === 'string' ? r.pseudo : '—',
      value: asInt(r.points),
      me: r.user_id === userId,
    })),
  };
}

/**
 * Board Joueurs de la saison : lignes réelles (Supabase) si session configurée,
 * sinon board VIDE — jamais un podium fabriqué.
 * La ligne « TOI », l'écart et le rank-up sont dérivés du board par l'écran.
 */
export function useSeasonLeaderboard(): SeasonLeaderboard {
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteBoard | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!configured || !userId || !supabase) {
      setRemote(null);
      setRemoteLoading(false);
      return;
    }
    let alive = true;
    // On JETTE le résultat précédent avant de relire : sans ça, un changement de
    // compte laisserait le board du compte sortant à l'écran le temps d'un
    // aller-retour — une autre variante du classement de quelqu'un d'autre.
    setRemote(null);
    setRemoteLoading(true);
    void fetchRemoteJoueurs(userId)
      .then((result) => {
        if (alive) setRemote(result);
      })
      .catch(() => {
        // `fetchRemoteJoueurs` ne lève pas ; ce catch couvre l'imprévu (parse,
        // client cassé) et le nomme pour ce qu'il est : la lecture a échoué.
        if (alive) setRemote({ status: 'unavailable' });
      })
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [configured, userId]);

  return useMemo<SeasonLeaderboard>(() => {
    const loading = sessionLoading || remoteLoading;
    const empty = { ...JOUEURS_BOARD_TEMPLATE, rows: [] as readonly LeagueRow[] };
    // Un chargement n'affirme RIEN : il ne dit ni « vide », ni « pas de ville ».
    if (loading) {
      return { joueursBoard: empty, source: 'local', loading, status: 'loading', cityName: null };
    }
    if (!configured || !userId) {
      return { joueursBoard: empty, source: 'local', loading, status: 'signed_out', cityName: null };
    }
    // Session posée, lecture terminée, mais rien n'est encore revenu de l'effet :
    // on ne conclut pas — on reste en lecture (jamais un vide affirmé à tort).
    if (!remote) {
      return { joueursBoard: empty, source: 'local', loading: true, status: 'loading', cityName: null };
    }
    if (remote.status === 'ready') {
      return {
        joueursBoard: { ...JOUEURS_BOARD_TEMPLATE, rows: remote.rows },
        source: 'server',
        loading,
        status: 'ready',
        cityName: remote.cityName,
      };
    }
    // Aucune ligne inventée : le gabarit du board (titre/unité) sans ses lignes.
    return {
      joueursBoard: empty,
      source: 'local',
      loading,
      status: remote.status,
      cityName: remote.status === 'empty' ? remote.cityName : null,
    };
  }, [remote, sessionLoading, remoteLoading, configured, userId]);
}

// ─── Classements par SPÉCIALITÉ (§16) — vue specialty_leaderboard (migration 0069) ─

/** Les 4 spécialités §16 dérivées des compteurs LIFETIME de user_stats. */
export type Specialty = 'conqueror' | 'defender' | 'thief' | 'pioneer';

/** Spécialité → colonne RÉELLE de la vue. Clés fermées : jamais d'entrée client. */
const SPECIALTY_COLUMN: Record<Specialty, 'hexes_captured' | 'defends' | 'steals' | 'pioneer_hexes'> = {
  conqueror: 'hexes_captured',
  defender: 'defends',
  thief: 'steals',
  pioneer: 'pioneer_hexes',
};

export interface SpecialtyLeaderboard {
  rows: readonly LeagueRow[];
  source: LeagueSource;
  loading: boolean;
  status: LeagueBoardStatus;
  cityName: string | null;
}

/**
 * Board d'une spécialité de MA ville, MÊME contrat honnête que fetchRemoteJoueurs :
 * users.city_id → nom de ville (city_zones) → vue specialty_leaderboard filtrée sur
 * MA ville, triée par la colonne de la spécialité. Ne lève jamais ; aucune ligne
 * inventée. Compteurs LIFETIME (user_stats cumulatif) — l'écran le nomme « de tous
 * les temps ». Tant que la migration 0069 n'est pas déployée, la lecture échoue →
 * `unavailable` (état vide honnête), jamais une ligne fabriquée.
 */
async function fetchRemoteSpecialty(userId: string, specialty: Specialty): Promise<RemoteBoard> {
  if (!supabase) return { status: 'unavailable' };
  const col = SPECIALTY_COLUMN[specialty];

  const meResult = await supabase.from('users').select('city_id').eq('id', userId).maybeSingle();
  if (meResult.error) return { status: 'unavailable' };
  const myCity = (meResult.data as { city_id?: unknown } | null)?.city_id;
  if (typeof myCity !== 'string' || myCity.length === 0) return { status: 'city_unknown' };

  const cityResult = await supabase.from('city_zones').select('name').eq('city_id', myCity).maybeSingle();
  const cityName = cityResult.error ? null : asName((cityResult.data as { name?: unknown } | null)?.name);

  const boardResult = await supabase
    .from('specialty_leaderboard')
    .select(`user_id, pseudo, ${col}`)
    .eq('city_id', myCity)
    .order(col, { ascending: false })
    .limit(LEADERBOARD_LIMIT);
  if (boardResult.error) return { status: 'unavailable' };

  const rows = (boardResult.data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return { status: 'empty', cityName };

  return {
    status: 'ready',
    cityName,
    rows: rows.map((r, i) => ({
      rank: i + 1,
      name: typeof r.pseudo === 'string' ? r.pseudo : '—',
      value: asInt(r[col]),
      me: r.user_id === userId,
    })),
  };
}

/** Hook d'une spécialité — 6 états honnêtes, jamais un podium fabriqué. */
export function useSpecialtyLeaderboard(specialty: Specialty): SpecialtyLeaderboard {
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteBoard | null>(null);
  // La spécialité à laquelle `remote` APPARTIENT : le setSpecialty re-rend AVANT
  // que l'effet ne relise, donc sans ça un board Conquérant réel s'afficherait une
  // frame sous le libellé « défenses ». On ne montre des lignes que quand la
  // réponse est bien celle de la spécialité courante (jamais des valeurs mal étiquetées).
  const [remoteSpec, setRemoteSpec] = useState<Specialty | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!configured || !userId || !supabase) {
      setRemote(null);
      setRemoteSpec(null);
      setRemoteLoading(false);
      return;
    }
    let alive = true;
    setRemote(null);
    setRemoteSpec(null);
    setRemoteLoading(true);
    void fetchRemoteSpecialty(userId, specialty)
      .then((result) => {
        if (alive) {
          setRemote(result);
          setRemoteSpec(specialty);
        }
      })
      .catch(() => {
        if (alive) {
          setRemote({ status: 'unavailable' });
          setRemoteSpec(specialty);
        }
      })
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [configured, userId, specialty]);

  return useMemo<SpecialtyLeaderboard>(() => {
    const loading = sessionLoading || remoteLoading;
    const empty: readonly LeagueRow[] = [];
    if (loading) return { rows: empty, source: 'local', loading, status: 'loading', cityName: null };
    if (!configured || !userId) {
      return { rows: empty, source: 'local', loading, status: 'signed_out', cityName: null };
    }
    // `remote` d'une AUTRE spécialité (le tap a précédé l'effet) = pas encore la
    // réponse courante : on reste en lecture, jamais des lignes sous le mauvais libellé.
    if (!remote || remoteSpec !== specialty) {
      return { rows: empty, source: 'local', loading: true, status: 'loading', cityName: null };
    }
    if (remote.status === 'ready') {
      return { rows: remote.rows, source: 'server', loading, status: 'ready', cityName: remote.cityName };
    }
    return {
      rows: empty,
      source: 'local',
      loading,
      status: remote.status,
      cityName: remote.status === 'empty' ? remote.cityName : null,
    };
  }, [remote, remoteSpec, specialty, sessionLoading, remoteLoading, configured, userId]);
}
