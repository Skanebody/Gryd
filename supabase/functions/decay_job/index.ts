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
import { sendExpoPush } from '../_shared/expo-push.ts';
import {
  type DecayTarget,
  planDecayPushes,
  type PushDevice,
  PUSH_LOCALES,
  type PushLocale,
  type NotifChannel,
} from '../_shared/push.ts';
import { type DecayHexRow, partitionDecay } from './logic.ts';

const MS_PER_DAY = 86_400_000;
const DB_CHUNK = 500; // taille des batches pour les clauses `in(...)`
const DECAY_WARNING_PRIORITY = 2; // P2 decay (GRYD_notifications_logic.md §2)
/** Fenêtre de lecture de push_log : couvre le « jour local » de canPush. */
const PUSH_LOG_WINDOW_MS = 2 * MS_PER_DAY;

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

const isPushLocale = (v: unknown): v is PushLocale =>
  typeof v === 'string' && (PUSH_LOCALES as readonly string[]).includes(v);

interface DecayDelivery {
  pushedUsers: number;
  suppressed: number;
  transportError?: string;
}

/**
 * Livraison push de l'avertissement de decay (PÉRIMÈTRE 3).
 *
 * L'inbox a DÉJÀ été écrite par l'appelant : ce qui suit ne fait qu'aller
 * chercher le joueur là où il est. Toute suppression (pas d'appareil, canal
 * coupé, quiet hours, cap) est donc une perte de rapidité, jamais une perte
 * d'information.
 *
 * INVARIANT : `push_log` n'est écrit QUE pour les tokens qu'Expo a réellement
 * acceptés. Journaliser un envoi qui n'a pas eu lieu consommerait le cap
 * quotidien du joueur avec un push fantôme — et ferait mentir les stats.
 */
async function deliverDecayPushes(
  targets: readonly DecayTarget[],
  now: Date,
): Promise<DecayDelivery> {
  if (targets.length === 0) return { pushedUsers: 0, suppressed: 0 };
  const userIds = targets.map((t) => t.userId);

  // ── Appareils (les désactivés sont exclus en SQL) ──────────────────────────
  const devicesByUser = new Map<string, PushDevice[]>();
  for (const batch of chunk(userIds, DB_CHUNK)) {
    const { data, error } = await supabase
      .from('push_devices')
      .select('user_id, expo_token, locale, time_zone, notif_channels')
      .is('disabled_at', null)
      .in('user_id', batch);
    if (error) throw new Error(`push_devices read: ${error.message}`);
    for (const row of data ?? []) {
      const device: PushDevice = {
        userId: String(row.user_id),
        expoToken: String(row.expo_token),
        locale: isPushLocale(row.locale) ? row.locale : 'fr',
        timeZone: String(row.time_zone ?? 'Europe/Paris'),
        channels: (row.notif_channels ?? []) as NotifChannel[],
      };
      const list = devicesByUser.get(device.userId);
      if (list) list.push(device);
      else devicesByUser.set(device.userId, [device]);
    }
  }
  // Personne n'a d'appareil enregistré : aucun appel réseau, aucun log.
  if (devicesByUser.size === 0) return { pushedUsers: 0, suppressed: targets.length };

  // ── Envois récents (cap journalier, tous types confondus) ──────────────────
  const pushLogByUser = new Map<string, Date[]>();
  const since = new Date(now.getTime() - PUSH_LOG_WINDOW_MS).toISOString();
  for (const batch of chunk(userIds, DB_CHUNK)) {
    const { data, error } = await supabase
      .from('push_log')
      .select('user_id, sent_at')
      .gte('sent_at', since)
      .in('user_id', batch);
    if (error) throw new Error(`push_log read: ${error.message}`);
    for (const row of data ?? []) {
      const uid = String(row.user_id);
      const list = pushLogByUser.get(uid);
      if (list) list.push(new Date(row.sent_at));
      else pushLogByUser.set(uid, [new Date(row.sent_at)]);
    }
  }

  // ── Décision (pure) puis envoi réel ───────────────────────────────────────
  const plan = planDecayPushes(targets, devicesByUser, pushLogByUser, now);
  if (plan.sends.length === 0) return { pushedUsers: 0, suppressed: plan.suppressed.length };

  const messages = plan.sends.flatMap((s) => s.messages);
  const sent = await sendExpoPush(messages, Deno.env.get('EXPO_ACCESS_TOKEN') ?? undefined);

  // Un joueur compte comme poussé si AU MOINS un de ses appareils a reçu.
  const okTokens = new Set(sent.okTokens);
  const pushedUsers = plan.sends
    .filter((s) => s.messages.some((m) => okTokens.has(m.to)))
    .map((s) => s.userId);

  if (pushedUsers.length > 0) {
    const { error } = await supabase.from('push_log').insert(
      pushedUsers.map((userId) => ({
        user_id: userId,
        sent_at: now.toISOString(),
        type: 'decay_warning',
      })),
    );
    if (error) throw new Error(`push_log insert: ${error.message}`);
  }

  // Appareils morts (app désinstallée) : on cesse d'envoyer, sans rien effacer
  // — un ré-enregistrement légitime remettra `disabled_at` à null.
  if (sent.deadTokens.length > 0) {
    for (const batch of chunk(sent.deadTokens, DB_CHUNK)) {
      const { error } = await supabase
        .from('push_devices')
        .update({ disabled_at: now.toISOString() })
        .in('expo_token', batch);
      if (error) throw new Error(`push_devices disable: ${error.message}`);
    }
  }

  return {
    pushedUsers: pushedUsers.length,
    suppressed: plan.suppressed.length,
    transportError: sent.transportError,
  };
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

    // ── Livraison push : aller chercher le joueur AVANT qu'il perde sa zone ──
    // L'inbox est déjà écrite ci-dessus ; le push n'est qu'un raccourci vers
    // elle. Un échec de livraison ne doit donc JAMAIS faire échouer le job de
    // decay lui-même (les hexes sont déjà neutralisés/marqués).
    let delivery: DecayDelivery = { pushedUsers: 0, suppressed: 0 };
    try {
      delivery = await deliverDecayPushes(
        warnings.map((w) => ({
          userId: w.userId,
          hexCount: w.hexCount,
          earliestDecayAt: w.earliestDecayAt,
        })),
        now,
      );
    } catch (pushErr) {
      console.error('decay_job push:', pushErr);
      delivery.transportError = `${pushErr}`;
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
      // Observabilité honnête : « averti en inbox » ≠ « poussé sur le téléphone ».
      pushedUsers: delivery.pushedUsers,
      pushSuppressed: delivery.suppressed,
      pushTransportError: delivery.transportError,
    });
  } catch (err) {
    console.error('decay_job:', err);
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});
