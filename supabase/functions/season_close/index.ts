/**
 * GRYD — Edge Function season_close (cron, SPEC §3.6/§6.3, règlement §1/§2/§3).
 *
 * Deux phases, mêmes cron :
 *   1. CLÔTURE — saisons 'active' dont ends_at est passé : gel des classements
 *      (rank_cache figé avec les égalités §13), badges Fondateur + titre local,
 *      notifications type 'season', statut → 'closed', reset_at posé
 *      (resetPlan : gel 24 h → résultats J+1 → intersaison 7 j).
 *   2. RESET — saisons 'closed' dont reset_at est passé (« reset_due ») : wipe
 *      des hex_claims + boucliers (règlement §2 — propriété, locks, boucliers),
 *      statut → 'reset'. Ce qui reste (§3 : compte, badges, XP, Foulées,
 *      posters…) n'est PAS touché.
 *
 * Toute la logique vit dans logic.ts — ce fichier ne fait que de l'I/O.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { secretsMatch } from '../_shared/secret.ts';
import { ACTIVITIES, type Activity } from '../_shared/game-rules.ts';
import {
  buildScoreInputs,
  computeFinalRanks,
  founderBadges,
  multiWorldUsers,
  resetPlan,
  type SeasonScoreInput,
} from './logic.ts';

const SEASON_PRIORITY = 6; // pas d'urgence : info saison, jamais un push de tension

/** Une valeur de base est-elle une discipline que le jeu connaît ? */
const isActivity = (v: unknown): v is Activity =>
  typeof v === 'string' && (ACTIVITIES as readonly string[]).includes(v);

/**
 * Comment on NOMME un monde au joueur — QUAND il y a un monde à nommer.
 * Table exhaustive sur `Activity` : ajouter une discipline sans écrire son
 * libellé casse le typecheck plutôt que de sortir un texte vide.
 *
 * ⚠ Ce libellé n'est ajouté qu'aux joueurs RÉELLEMENT multi-mondes
 * (`multiWorldUsers`). « n°3 » est ambigu dès qu'il y a DEUX classements ; pour
 * qui n'en a qu'un, il est exact — et le qualifier reviendrait à imposer une
 * distinction que le produit n'offre pas encore.
 */
const DISCIPLINE_LABEL: Readonly<Record<Activity, string>> = {
  run: 'en course à pied',
  bike: 'à vélo',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

interface SeasonRow {
  id: string;
  city_id: string;
  starts_at: string;
  ends_at: string;
  reset_at: string | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || !secretsMatch(req.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const now = new Date();
    const closed: string[] = [];
    const resetDone: string[] = [];

    // ── Phase 1 : clôture des saisons actives arrivées à terme ───────────────
    const { data: toClose, error: toCloseError } = await supabase
      .from('seasons')
      .select('id, city_id, starts_at, ends_at, reset_at')
      .eq('status', 'active')
      .lt('ends_at', now.toISOString());
    if (toCloseError) throw new Error(`seasons read: ${toCloseError.message}`);

    for (const season of (toClose ?? []) as SeasonRow[]) {
      await closeSeason(season);
      closed.push(season.id);
    }

    // ── Phase 2 : reset des saisons 'closed' dont l'intersaison est finie ────
    const { data: resetDue, error: resetDueError } = await supabase
      .from('seasons')
      .select('id, city_id, starts_at, ends_at, reset_at')
      .eq('status', 'closed')
      .lte('reset_at', now.toISOString());
    if (resetDueError) throw new Error(`seasons reset read: ${resetDueError.message}`);

    for (const season of (resetDue ?? []) as SeasonRow[]) {
      await resetSeason(season);
      resetDone.push(season.id);
    }

    return json({ closed, resetDone });
  } catch (err) {
    console.error('season_close:', err);
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});

// ─── Phase 1 : clôture ───────────────────────────────────────────────────────

async function closeSeason(season: SeasonRow): Promise<void> {
  // 1. Faits de la saison, rangés PAR DISCIPLINE (E12 : rangs SÉPARÉS).
  //    Le tri est PUR (buildScoreInputs) : ici, que de l'I/O.
  const byActivity = await loadScoreInputs(season);

  // 2. UN CLASSEMENT PAR MONDE. Ce n'est pas un filtre posé sur un classement
  //    commun : c'est la clé de partition du calcul entier. Un joueur hybride
  //    a deux résultats indépendants, jamais une somme et jamais un doublon.
  const plan = resetPlan(new Date(season.ends_at));
  const awards: { userId: string; badgeKey: string }[] = [];
  const notifications: Record<string, unknown>[] = [];
  // Qui a DEUX résultats à distinguer — donc à qui la discipline apprend
  // quelque chose. Dérivé du classement lui-même, aucune lecture de plus.
  const twoWorlds = multiWorldUsers(byActivity);

  for (const [activity, scores] of byActivity) {
    const ranked = computeFinalRanks(scores);

    // Gel de rank_cache — filtré sur la DISCIPLINE aussi. Sans elle, l'update
    // écrasait les DEUX lignes du joueur hybride avec le dernier rang écrit.
    for (const r of ranked) {
      const { error } = await supabase
        .from('season_scores')
        .update({ rank_cache: r.rank })
        .eq('season_id', season.id)
        .eq('user_id', r.userId)
        .eq('activity', activity);
      if (error) throw new Error(`rank_cache freeze: ${error.message}`);
    }

    // Badges : Fondateur pour tous les participants, médailles Season Rank par
    // rang. Un rang gagné dans un monde EST un rang — le #1 cycliste local a
    // bien terminé #1 de son classement. Les doublons entre disciplines sont
    // absorbés par l'upsert `ignoreDuplicates` (un badge ne se gagne qu'une fois).
    awards.push(...founderBadges(ranked));

    // Notification : une par RÉSULTAT, donc une par monde joué. Elle NOMME sa
    // discipline UNIQUEMENT au joueur qui en a deux — « n°3 » est ambigu dès
    // qu'il y a deux classements, mais parfaitement exact quand il n'y en a
    // qu'un. Nommer le monde à tout le monde qualifierait une distinction que
    // le produit n'offre pas encore : au 25/07/2026, 100 % des joueurs sont en
    // course à pied et aucune ligne `bike` n'existe en base.
    for (const r of ranked) {
      const world = twoWorlds.has(r.userId) ? ` ${DISCIPLINE_LABEL[activity]}` : '';
      notifications.push({
        user_id: r.userId,
        type: 'season',
        priority: SEASON_PRIORITY,
        payload: {
          title: 'Saison terminée',
          body: `Classement final${world} : n°${r.rank}` +
            `${r.tied ? ' (ex æquo)' : ''}. ` +
            `La carte reset le ${plan.resetAt.toISOString().slice(0, 10)} — ` +
            'tes badges, ton niveau et tes récompenses restent.',
          seasonId: season.id,
          activity,
          rank: r.rank,
          tied: r.tied,
          points: r.points,
          resetAt: plan.resetAt.toISOString(),
        },
      });
    }
  }

  // 3. Badges (une seule écriture, tous mondes confondus).
  if (awards.length > 0) {
    const { error } = await supabase.from('user_badges').upsert(
      awards.map((a) => ({ user_id: a.userId, badge_key: a.badgeKey })),
      { onConflict: 'user_id,badge_key', ignoreDuplicates: true },
    );
    if (error) throw new Error(`user_badges insert: ${error.message}`);
  }

  // 4. Notifications de fin de saison (règlement §1).
  if (notifications.length > 0) {
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) throw new Error(`notifications insert: ${error.message}`);
  }

  // TODO(semaine 10) — posters-souvenir (SPEC §3.6) : générer l'image haute
  // résolution du territoire de saison de chaque joueur (rendu H3 → PNG),
  // l'uploader dans Storage `posters/` et pousser une notification 'reward'
  // avec l'URL. La génération d'images n'existe pas encore.

  // 5. Statut 'closed' + date du wipe : le reset effectif attend reset_at.
  //    UNE saison reste UNE fenêtre de temps pour une ville — pas deux. Les
  //    disciplines partagent la même clôture, seuls leurs CLASSEMENTS diffèrent
  //    (`seasons` n'est volontairement pas disciplinée, cf. 0070 §3).
  const { error } = await supabase
    .from('seasons')
    .update({ status: 'closed', reset_at: plan.resetAt.toISOString() })
    .eq('id', season.id)
    .eq('status', 'active'); // garde-fou : ne clôt qu'une saison encore active
  if (error) throw new Error(`seasons close: ${error.message}`);
}

/**
 * Charge les faits de la saison et les range PAR DISCIPLINE (le tri est pur :
 * `buildScoreInputs`). Ici, uniquement de l'I/O.
 *
 * ⚠️ LES TROIS LECTURES REMONTENT `activity`, et ce n'est pas cosmétique :
 *   · `season_scores` a une ligne PAR (joueur, discipline) depuis 0070 — sans
 *     la colonne, un joueur hybride apparaissait deux fois dans le MÊME
 *     classement ;
 *   · `runs` et `hex_claims` alimentent les DÉPARTAGES §13. Sans la discipline,
 *     une sortie vélo (ou 40 hexes défendus à vélo) départageait un rang de
 *     COURSE — au moment précis où ce rang est GELÉ dans `rank_cache`.
 *
 * Une discipline INCONNUE (valeur hors `ACTIVITIES`) est IGNORÉE plutôt que
 * repliée sur la course : ranger un monde qu'on n'a pas compris dans un autre
 * fabriquerait un classement. La contrainte `check (activity in ('run','bike'))`
 * rend le cas impossible en base ; le filtre est là pour que, s'il arrivait, la
 * conséquence soit une absence — pas un mensonge.
 */
async function loadScoreInputs(season: SeasonRow): Promise<Map<Activity, SeasonScoreInput[]>> {
  const { data: scoreRows, error: scoresError } = await supabase
    .from('season_scores')
    .select('user_id, points, activity')
    .eq('season_id', season.id);
  if (scoresError) throw new Error(`season_scores read: ${scoresError.message}`);
  const userIds = [...new Set((scoreRows ?? []).map((r) => r.user_id as string))];
  if (userIds.length === 0) return new Map();

  // Courses valides + jours actifs sur la fenêtre de saison (§13.1/§13.2).
  const { data: runRows, error: runsError } = await supabase
    .from('runs')
    .select('user_id, started_at, status, activity')
    .in('user_id', userIds)
    .in('status', ['valid', 'partial'])
    .gte('started_at', season.starts_at)
    .lt('started_at', season.ends_at);
  if (runsError) throw new Error(`runs read: ${runsError.message}`);

  // Hexes défendus + ancienneté de 1re capture (§13.3/§13.5).
  // Approximation MVP : lue sur l'état FINAL de hex_claims (les hexes perdus ou
  // decayés en cours de saison sortent du compte) — suffisant pour départager.
  const { data: hexRows, error: hexError } = await supabase
    .from('hex_claims')
    .select('owner_user_id, claim_type, claimed_at, activity')
    .in('owner_user_id', userIds);
  if (hexError) throw new Error(`hex_claims read: ${hexError.message}`);

  return buildScoreInputs({
    scores: (scoreRows ?? []).flatMap((r) =>
      isActivity(r.activity)
        ? [{ userId: r.user_id as string, points: r.points as number, activity: r.activity }]
        : []
    ),
    runs: (runRows ?? []).flatMap((r) =>
      isActivity(r.activity)
        ? [{ userId: r.user_id as string, startedAt: String(r.started_at), activity: r.activity }]
        : []
    ),
    hexes: (hexRows ?? []).flatMap((h) =>
      isActivity(h.activity)
        ? [{
          ownerUserId: h.owner_user_id as string,
          claimType: String(h.claim_type),
          claimedAt: String(h.claimed_at),
          activity: h.activity,
        }]
        : []
    ),
  });
}

// ─── Phase 2 : reset (règlement §2) ──────────────────────────────────────────

async function resetSeason(season: SeasonRow): Promise<void> {
  // ⚠️ LE RESET N'EFFACE PLUS RIEN (28/07/2026, décision fondateur).
  //
  // Il supprimait ici TOUTES les lignes `hex_claims` puis tous les `shields` —
  // un `delete` global, non borné à une ville. La carte de chaque joueur était
  // rasée en une nuit, y compris celle qu'il avait parfaitement défendue.
  //
  // POURQUOI C'ÉTAIT FAUX, et pas seulement dur : le DECAY (14 j) fait déjà le
  // travail qu'on attend d'une remise à zéro — il empêche le monopole du
  // premier arrivé, mais CONTINÛMENT et JUSTEMENT (on perd ce qu'on cesse de
  // défendre, jamais ce qu'on défend). La saison faisait donc double emploi sur
  // l'équité, tout en détruisant ce qui donne son sens à un jeu de territoire :
  // la DURÉE. « Ce quartier est à moi depuis mars » est la phrase que le
  // produit doit rendre possible ; un reset à huit semaines la rend impossible.
  //
  // La règle vit dans `SEASON_RESET_KEEPS` (game-rules) : `territory: true`,
  // `shields: true`, `badges: true`. Ce qui se remet à zéro, ce sont les
  // POINTS et les RANGS — le tableau, jamais la carte.
  //
  // Le job planifié est par ailleurs DÉPLANIFIÉ (migration 0106) : une saison
  // ne se clôture plus toute seule. Cette fonction reste appelable à la main,
  // et c'est pourquoi la garantie est ICI et pas seulement dans le cron.

  const { error } = await supabase
    .from('seasons')
    .update({ status: 'reset' })
    .eq('id', season.id)
    .eq('status', 'closed');
  if (error) throw new Error(`seasons reset: ${error.message}`);
}
