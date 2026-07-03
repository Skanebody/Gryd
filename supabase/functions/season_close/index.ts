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
import {
  computeFinalRanks,
  founderBadges,
  resetPlan,
  type SeasonScoreInput,
} from './logic.ts';

const SEASON_PRIORITY = 6; // pas d'urgence : info saison, jamais un push de tension

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
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
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
  // 1. Scores + critères d'égalité §13, agrégés en mémoire (volume MVP ok).
  const scores = await loadScoreInputs(season);

  // 2. Classement final (pur) puis gel de rank_cache.
  const ranked = computeFinalRanks(scores);
  for (const r of ranked) {
    const { error } = await supabase
      .from('season_scores')
      .update({ rank_cache: r.rank })
      .eq('season_id', season.id)
      .eq('user_id', r.userId);
    if (error) throw new Error(`rank_cache freeze: ${error.message}`);
  }

  // 3. Badges : Fondateur pour tous les participants, titre local pour le n°1.
  const awards = founderBadges(ranked);
  if (awards.length > 0) {
    const { error } = await supabase.from('user_badges').upsert(
      awards.map((a) => ({ user_id: a.userId, badge_key: a.badgeKey })),
      { onConflict: 'user_id,badge_key', ignoreDuplicates: true },
    );
    if (error) throw new Error(`user_badges insert: ${error.message}`);
  }

  // 4. Plan de clôture (règlement §1) + notifications de fin de saison.
  const plan = resetPlan(new Date(season.ends_at));
  if (ranked.length > 0) {
    const { error } = await supabase.from('notifications').insert(
      ranked.map((r) => ({
        user_id: r.userId,
        type: 'season',
        priority: SEASON_PRIORITY,
        payload: {
          title: 'Saison terminée',
          body: `Classement final : n°${r.rank}${r.tied ? ' (ex æquo)' : ''}. ` +
            `La carte reset le ${plan.resetAt.toISOString().slice(0, 10)} — ` +
            'tes badges, ton niveau et tes récompenses restent.',
          seasonId: season.id,
          rank: r.rank,
          tied: r.tied,
          points: r.points,
          resetAt: plan.resetAt.toISOString(),
        },
      })),
    );
    if (error) throw new Error(`notifications insert: ${error.message}`);
  }

  // TODO(semaine 10) — posters-souvenir (SPEC §3.6) : générer l'image haute
  // résolution du territoire de saison de chaque joueur (rendu H3 → PNG),
  // l'uploader dans Storage `posters/` et pousser une notification 'reward'
  // avec l'URL. La génération d'images n'existe pas encore.

  // 5. Statut 'closed' + date du wipe : le reset effectif attend reset_at.
  const { error } = await supabase
    .from('seasons')
    .update({ status: 'closed', reset_at: plan.resetAt.toISOString() })
    .eq('id', season.id)
    .eq('status', 'active'); // garde-fou : ne clôt qu'une saison encore active
  if (error) throw new Error(`seasons close: ${error.message}`);
}

/** Charge season_scores + agrège les critères §13 depuis runs et hex_claims. */
async function loadScoreInputs(season: SeasonRow): Promise<SeasonScoreInput[]> {
  const { data: scoreRows, error: scoresError } = await supabase
    .from('season_scores')
    .select('user_id, points')
    .eq('season_id', season.id);
  if (scoresError) throw new Error(`season_scores read: ${scoresError.message}`);
  const userIds = (scoreRows ?? []).map((r) => r.user_id as string);
  if (userIds.length === 0) return [];

  // Courses valides + jours actifs sur la fenêtre de saison (§13.1/§13.2).
  const { data: runRows, error: runsError } = await supabase
    .from('runs')
    .select('user_id, started_at, status')
    .in('user_id', userIds)
    .in('status', ['valid', 'partial'])
    .gte('started_at', season.starts_at)
    .lt('started_at', season.ends_at);
  if (runsError) throw new Error(`runs read: ${runsError.message}`);

  const validRuns = new Map<string, number>();
  const activeDays = new Map<string, Set<string>>();
  for (const r of runRows ?? []) {
    validRuns.set(r.user_id, (validRuns.get(r.user_id) ?? 0) + 1);
    const day = String(r.started_at).slice(0, 10);
    if (!activeDays.has(r.user_id)) activeDays.set(r.user_id, new Set());
    activeDays.get(r.user_id)!.add(day);
  }

  // Hexes défendus + ancienneté de 1re capture (§13.3/§13.5).
  // Approximation MVP : lue sur l'état FINAL de hex_claims (les hexes perdus ou
  // decayés en cours de saison sortent du compte) — suffisant pour départager.
  const { data: hexRows, error: hexError } = await supabase
    .from('hex_claims')
    .select('owner_user_id, claim_type, claimed_at')
    .in('owner_user_id', userIds);
  if (hexError) throw new Error(`hex_claims read: ${hexError.message}`);

  const defended = new Map<string, number>();
  const firstCapture = new Map<string, Date>();
  for (const h of hexRows ?? []) {
    const uid = h.owner_user_id as string;
    if (h.claim_type === 'defended') defended.set(uid, (defended.get(uid) ?? 0) + 1);
    const claimedAt = new Date(h.claimed_at);
    const prev = firstCapture.get(uid);
    if (!prev || claimedAt.getTime() < prev.getTime()) firstCapture.set(uid, claimedAt);
  }

  return (scoreRows ?? []).map((r) => ({
    userId: r.user_id as string,
    points: r.points as number,
    validRuns: validRuns.get(r.user_id) ?? 0,
    activeDays: activeDays.get(r.user_id)?.size ?? 0,
    defendedHexes: defended.get(r.user_id) ?? 0,
    firstCaptureAt: firstCapture.get(r.user_id) ?? null,
  }));
}

// ─── Phase 2 : reset (règlement §2) ──────────────────────────────────────────

async function resetSeason(season: SeasonRow): Promise<void> {
  // Reset total de la carte (SPEC §3.6 — fresh start assumé). Les lignes
  // hex_claims sont SUPPRIMÉES : nouvelle saison = nouvelle histoire de la
  // carte, le bonus pionnier repart de zéro (contrairement au decay, qui
  // conserve la mémoire everOwned à l'intérieur d'une saison).
  // Saison 0 France entière : le wipe est global, pas borné à la city_zone.
  const { error: hexError } = await supabase
    .from('hex_claims')
    .delete()
    .gte('h3index', 0); // delete all — PostgREST exige un filtre
  if (hexError) throw new Error(`hex_claims wipe: ${hexError.message}`);

  // Boucliers : reset (règlement §2). L'historique d'achat reste dans purchases.
  const { error: shieldError } = await supabase
    .from('shields')
    .delete()
    .gte('activated_at', '1970-01-01');
  if (shieldError) throw new Error(`shields wipe: ${shieldError.message}`);

  const { error } = await supabase
    .from('seasons')
    .update({ status: 'reset' })
    .eq('id', season.id)
    .eq('status', 'closed');
  if (error) throw new Error(`seasons reset: ${error.message}`);
}
