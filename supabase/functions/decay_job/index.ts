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
import {
  ACTIVITIES,
  type Activity,
  DECAY_WARNING_DAYS_BEFORE,
  DEFAULT_ACTIVITY,
} from '../_shared/game-rules.ts';
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
import {
  buildDecayWarningBody,
  type DecayHexKey,
  type DecayHexRow,
  groupKeysByActivity,
  partitionDecay,
} from './logic.ts';

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

const isActivity = (v: unknown): v is Activity =>
  typeof v === 'string' && (ACTIVITIES as readonly string[]).includes(v);

/**
 * Discipline d'une ligne `hex_claims` lue en base.
 *
 * · ABSENTE (null/undefined) ⇒ `run`. Ce n'est pas un repli prudent, c'est un
 *   FAIT : tout ce qui existait avant la migration 0070 est de la course à pied
 *   (`default 'run'`), et le vélo n'a jamais pu être ingéré avant elle.
 * · ILLISIBLE (valeur hors ACTIVITIES) ⇒ on LÈVE. La contrainte
 *   `hex_claims_activity_check` rend le cas impossible en base ; s'il survenait
 *   quand même, traiter la ligne comme de la course la ferait écrire dans le
 *   MAUVAIS monde — c'est-à-dire neutraliser ou marquer une zone qui n'est pas
 *   celle-là. Un job qui s'arrête se voit ; une zone effacée par erreur, non.
 */
function readActivity(value: unknown): Activity {
  if (value === null || value === undefined) return DEFAULT_ACTIVITY;
  if (isActivity(value)) return value;
  throw new Error(`hex_claims read: discipline illisible « ${value} »`);
}

/**
 * Écrit une mise à jour sur `hex_claims` UNE DISCIPLINE À LA FOIS.
 *
 * Depuis 0070 la clé primaire est `(h3index, activity)` : un `.in('h3index', …)`
 * seul frappe les DEUX lignes d'un hexagone tenu à la fois à pied et à vélo. Ce
 * helper existe pour qu'aucun appelant n'ait à s'en souvenir — la discipline
 * fait partie du prédicat, toujours.
 */
async function updateClaimsScoped(
  keys: readonly DecayHexKey[],
  patch: Record<string, unknown>,
  label: string,
): Promise<void> {
  for (const [activity, ids] of groupKeysByActivity(keys)) {
    for (const batch of chunk(ids, DB_CHUNK)) {
      const { error } = await supabase
        .from('hex_claims')
        .update(patch)
        .in('h3index', batch)
        .eq('activity', activity);
      if (error) throw new Error(`${label} (${activity}): ${error.message}`);
    }
  }
}

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
    // La lecture reste TOUTES DISCIPLINES CONFONDUES, volontairement : une
    // échéance échue est échue, quel que soit le monde (l'index
    // `hex_claims_decay_idx (decay_at)` est resté non discipliné pour ça, 0070).
    // C'est l'ÉCRITURE qui doit se restreindre, et elle le fait ligne par ligne.
    const { data, error } = await supabase
      .from('hex_claims')
      .select('h3index, activity, owner_user_id, decay_at, decay_warned_at')
      .not('decay_at', 'is', null)
      .lte('decay_at', horizon.toISOString());
    if (error) throw new Error(`hex_claims read: ${error.message}`);

    const rows: DecayHexRow[] = (data ?? []).map((r) => ({
      id: String(r.h3index),
      activity: readActivity(r.activity),
      ownerUserId: r.owner_user_id,
      decayAt: r.decay_at ? new Date(r.decay_at) : null,
      decayWarnedAt: r.decay_warned_at ? new Date(r.decay_warned_at) : null,
    }));

    // ── Décision (pur) ───────────────────────────────────────────────────────
    const { toNeutralize, warnings } = partitionDecay(rows, now);

    // ── Neutralisation : update, PAS delete — la ligne conservée garde la
    // mémoire « déjà possédé » (pas de re-bonus pionnier après decay).
    // PAR DISCIPLINE : neutraliser la zone échue d'un coureur ne doit pas
    // effacer la zone encore vivante du cycliste sur le même hexagone.
    await updateClaimsScoped(
      toNeutralize.map((h) => ({ id: h.id, activity: h.activity })),
      {
        owner_user_id: null,
        crew_color_cache: null,
        locked_until: null,
        shielded_until: null,
        decay_at: null,
        decay_warned_at: null,
      },
      'hex_claims neutralize',
    );

    // ── Notifications groupées : 1 « ton quartier s'efface » par joueur ──────
    // Le CONTENU, lui, est discipliné : un compte par monde, jamais leur somme
    // (0071 — E14, `ACTIVITY_SCOPE.territory = 'per_activity'`). Aucun nombre
    // « tous mondes confondus » ne sort d'ici : le payload porte le détail, la
    // copie l'énonce, et rien n'additionne.
    if (warnings.length > 0) {
      const { error: notifError } = await supabase.from('notifications').insert(
        warnings.map((w) => ({
          user_id: w.userId,
          type: 'decay_warning',
          priority: DECAY_WARNING_PRIORITY,
          payload: {
            title: 'Ton quartier s’efface',
            body: buildDecayWarningBody(w, now),
            // Comptes PAR MONDE, exploitables par l'app (ouvrir la carte sur la
            // bonne discipline). L'ancien `hexCount` mêlé n'existe plus : un
            // client ne peut donc plus le réafficher par mégarde.
            byActivity: w.perActivity.map((p) => ({
              activity: p.activity,
              hexCount: p.hexCount,
              earliestDecayAt: p.earliestDecayAt.toISOString(),
            })),
            earliestDecayAt: w.earliestDecayAt.toISOString(),
            cta: 'defend',
          },
        })),
      );
      if (notifError) throw new Error(`notifications insert: ${notifError.message}`);

      // Marquage anti double-warning (cycle courant, cf. logic.ts). PAR
      // DISCIPLINE : sans ça, une passe de course marquerait « déjà prévenue »
      // la ligne vélo du même hexagone — dont l'échéance est peut-être
      // lointaine —, et le cycliste perdrait SON avertissement. Le garde-fou
      // SQL de 0070 ne couvre que le cas « aucune échéance », pas celui-là.
      await updateClaimsScoped(
        warnings.flatMap((w) => w.hexKeys),
        { decay_warned_at: now.toISOString() },
        'hex_claims mark warned',
      );
    }

    // ── Livraison push : aller chercher le joueur AVANT qu'il perde sa zone ──
    // L'inbox est déjà écrite ci-dessus ; le push n'est qu'un raccourci vers
    // elle. Un échec de livraison ne doit donc JAMAIS faire échouer le job de
    // decay lui-même (les hexes sont déjà neutralisés/marqués).
    //
    // TOUS LES JOUEURS AVERTIS SONT POUSSÉS (26/07/2026). Ça n'a pas toujours
    // été vrai, et le rappeler évite qu'on rétablisse le filtre par prudence
    // mal placée : tant que `DECAY_COPY` (_shared/push.ts) n'avait qu'UNE
    // formulation — « {n} zones… Une course dessus les garde. » —, pousser à un
    // cycliste lui aurait prescrit une action qui NE SAUVE PAS sa zone, et
    // pousser à un joueur menacé dans les deux mondes aurait exigé la somme
    // que E14 interdit. Le job ne poussait donc que la menace entièrement à
    // pied : honnête, mais la moitié du jeu perdait son territoire sans
    // avertissement. La copie existe désormais par discipline ET pour la
    // menace mixte ; le filtre n'a plus de raison d'être, et le retirer est le
    // correctif — pas un relâchement.
    let delivery: DecayDelivery = { pushedUsers: 0, suppressed: 0 };
    try {
      delivery = await deliverDecayPushes(
        // Le compte reste PAR MONDE de bout en bout : `perActivity` passe tel
        // quel, aucun total mêlé n'est reconstruit pour l'occasion.
        warnings.map((w) => ({
          userId: w.userId,
          perActivity: w.perActivity,
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
      // PAR MONDE, y compris dans l'observabilité : un total mêlé ferait mentir
      // les métriques du job comme il faisait mentir la notification (0071).
      warnedHexesByActivity: Object.fromEntries(
        ACTIVITIES.map((a) => [
          a,
          warnings.reduce(
            (n, w) => n + (w.perActivity.find((p) => p.activity === a)?.hexCount ?? 0),
            0,
          ),
        ]),
      ),
      // Observabilité honnête : « averti en inbox » ≠ « poussé sur le téléphone ».
      // Tout écart entre `warnedUsers` et `pushedUsers` s'explique désormais par
      // les seules préférences du joueur (canal, quiet hours, cap) — comptées
      // dans `pushSuppressed` —, plus jamais par un trou de copie.
      pushedUsers: delivery.pushedUsers,
      pushSuppressed: delivery.suppressed,
      pushTransportError: delivery.transportError,
    });
  } catch (err) {
    console.error('decay_job:', err);
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});
