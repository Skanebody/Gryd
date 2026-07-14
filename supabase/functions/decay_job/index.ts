/**
 * GRYD — Edge Function decay_job (cron quotidien, SPEC §3.3/§6.3).
 *
 * Pipeline : auth cron secret → lecture des hex_claims menacés (decay_at dans
 * la fenêtre J-3 ou échu) → partitionDecay (pur) → neutralisation (update, la
 * ligne est CONSERVÉE : everOwned, cf. 0006) → notifications groupées
 * decay_warning (1/joueur) → marquage decay_warned_at → refresh sector_control.
 *
 * Toute la logique vit dans logic.ts — ce fichier ne fait que de l'I/O.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { DECAY_WARNING_DAYS_BEFORE } from '../_shared/game-rules.ts';
import { secretsMatch } from '../_shared/secret.ts';
import { type DecayHexRow, partitionDecay } from './logic.ts';

const MS_PER_DAY = 86_400_000;
const DB_CHUNK = 500; // taille des batches pour les clauses `in(...)`
const DECAY_WARNING_PRIORITY = 2; // P2 decay (GRYD_notifications_logic.md §2)

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

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Auth job : secret partagé avec le scheduler (pas de JWT utilisateur ici).
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || !secretsMatch(req.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const now = new Date();

    // ── Lecture : seuls les hexes dont la fenêtre J-3 est atteinte (ou échus)
    // nous intéressent — le prédicat exact est redécidé par partitionDecay.
    const horizon = new Date(now.getTime() + DECAY_WARNING_DAYS_BEFORE * MS_PER_DAY);
    const { data, error } = await supabase
      .from('hex_claims')
      .select('h3index, owner_user_id, decay_at, decay_warned_at')
      .not('decay_at', 'is', null)
      .lte('decay_at', horizon.toISOString());
    if (error) throw new Error(`hex_claims read: ${error.message}`);

    const rows: DecayHexRow[] = (data ?? []).map((r) => ({
      id: String(r.h3index),
      ownerUserId: r.owner_user_id,
      decayAt: r.decay_at ? new Date(r.decay_at) : null,
      decayWarnedAt: r.decay_warned_at ? new Date(r.decay_warned_at) : null,
    }));

    // ── Décision (pur) ───────────────────────────────────────────────────────
    const { toNeutralize, warnings } = partitionDecay(rows, now);

    // ── Neutralisation : update, PAS delete — la ligne conservée garde la
    // mémoire « déjà possédé » (pas de re-bonus pionnier après decay).
    for (const batch of chunk(toNeutralize.map((h) => h.id), DB_CHUNK)) {
      const { error: neutralizeError } = await supabase
        .from('hex_claims')
        .update({
          owner_user_id: null,
          crew_color_cache: null,
          locked_until: null,
          shielded_until: null,
          decay_at: null,
          decay_warned_at: null,
        })
        .in('h3index', batch);
      if (neutralizeError) throw new Error(`hex_claims neutralize: ${neutralizeError.message}`);
    }

    // ── Notifications groupées : 1 « ton quartier s'efface » par joueur ──────
    if (warnings.length > 0) {
      const { error: notifError } = await supabase.from('notifications').insert(
        warnings.map((w) => ({
          user_id: w.userId,
          type: 'decay_warning',
          priority: DECAY_WARNING_PRIORITY,
          payload: {
            title: 'Ton quartier s’efface',
            body: w.hexCount === 1
              ? '1 hex redevient neutre dans 3 jours. Repasse dessus pour le défendre.'
              : `${w.hexCount} hexes redeviennent neutres bientôt. Repasse dessus pour les défendre.`,
            hexCount: w.hexCount,
            earliestDecayAt: w.earliestDecayAt.toISOString(),
            cta: 'defend',
          },
        })),
      );
      if (notifError) throw new Error(`notifications insert: ${notifError.message}`);

      // Marquage anti double-warning (cycle courant, cf. logic.ts).
      const warnedIds = warnings.flatMap((w) => w.hexIds);
      for (const batch of chunk(warnedIds, DB_CHUNK)) {
        const { error: markError } = await supabase
          .from('hex_claims')
          .update({ decay_warned_at: now.toISOString() })
          .in('h3index', batch);
        if (markError) throw new Error(`hex_claims mark warned: ${markError.message}`);
      }
    }

    // ── Le contrôle de secteur reflète les hexes neutralisés ─────────────────
    if (toNeutralize.length > 0) {
      const { error: refreshError } = await supabase.rpc('refresh_sector_control');
      if (refreshError) throw new Error(`refresh_sector_control: ${refreshError.message}`);
    }

    return json({
      neutralized: toNeutralize.length,
      warnedUsers: warnings.length,
      warnedHexes: warnings.reduce((n, w) => n + w.hexCount, 0),
    });
  } catch (err) {
    console.error('decay_job:', err);
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});
