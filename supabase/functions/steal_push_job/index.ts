/**
 * GRYD — Edge Function steal_push_job : « quelqu'un a pris ton territoire ».
 *
 * C'est la boucle de rétention du jeu : on te prend ta zone, tu reviens la
 * reprendre. Sans ce job, un joueur dépossédé ne l'apprend jamais.
 *
 * ═══ L'ORDRE DES ÉTAPES EST LA FONCTIONNALITÉ ═══════════════════════════════
 * Ce fichier a été réécrit pour une seule raison : **la consommation de la file
 * arrivait en dernier.** Le job lisait, envoyait, écrivait des journaux, puis
 * marquait `processed_at`. Trois défauts en découlaient, tous le même :
 *   · deux drains qui se chevauchent lisaient le MÊME lot (`.is('processed_at',
 *     null)` est une lecture, pas une réservation) et envoyaient DEUX FOIS le
 *     même message ;
 *   · toute erreur d'écriture APRÈS l'envoi empêchait d'atteindre le marquage :
 *     le lot repartait au créneau suivant, toutes les 5 min, pendant 24 h ;
 *   · un échec de transport (`okTokens: []`) était lu comme « rien n'est
 *     parti », ce qui rouvrait la même boucle de renvoi.
 * Le mécanisme conçu POUR ne pas spammer pouvait donc spammer.
 *
 * L'ordre est désormais :
 *   1. RÉSERVER (atomique, par victime)   ─┐
 *   2. lire le contexte (secteurs, appareils, journal)  │ AVANT tout envoi :
 *   3. décider (pur)                       │ rien ici ne peut faire
 *   4. écrire l'inbox                      │ renvoyer un message
 *   5. FINALISER la file (atomique)       ─┘ ← POINT DE NON-RETOUR
 *   6. envoyer les pushs
 *   7. journaux post-envoi (best-effort : ils journalisent, ils ne relancent
 *      RIEN)
 *
 * Le compromis, écrit et assumé : si le job meurt entre 5 et 6, le PUSH est
 * perdu. C'est voulu — « au plus une fois » vaut mieux que « au moins une
 * fois » pour un push. Perdre une alerte est un désagrément ; en envoyer dix
 * est une raison de désinstaller. La perte est comptée (`outcome`), jamais tue.
 * L'INBOX, elle, est écrite à l'étape 4, donc AVANT ce point de rupture : ce
 * qu'un crash coûte, c'est la notification sur l'écran verrouillé, pas la trace
 * dans l'app.
 *
 * ═══ CE QUE LA MIGRATION 0058 A CORRIGÉ (et que ce fichier tenait mal) ═══════
 *   · un vol PÉRIMÉ était consommé sans push ET sans inbox : la victime ne
 *     l'apprenait jamais. Le périmé perd le droit de DÉRANGER, pas celui d'être
 *     RACONTÉ — il a désormais son entrée d'inbox, datée de l'événement ;
 *   · le cooldown de 3 h, unique garde contre le renvoi entre deux drains,
 *     était armé par `push_log` — écrit en best-effort et seulement en cas de
 *     livraison. Une panne Expo le désarmait. Il est maintenant armé par la
 *     consommation `outcome = 'pushed'`, donc par la DÉCISION d'envoyer ;
 *   · une victime dont une partie des lignes était réservée par un drain mort
 *     voyait son agrégat TRONQUÉ (« 5 zones » pour 17 prises). Elle est
 *     désormais écartée du lot ENTIÈRE jusqu'à ce que la réservation soit
 *     finalisée ou réapée : un retard borné vaut mieux qu'un chiffre faux.
 *
 * POURQUOI CE JOB EXISTE (et pas un envoi depuis ingest_run) : voir l'en-tête de
 * `supabase/migrations/0056_steal_push_queue.sql`. En un mot : ingest_run est
 * sur le chemin critique de la fin de course et n'a aucune raison de faire
 * attendre le coureur pour prévenir QUELQU'UN D'AUTRE — il n'écrit qu'une ligne
 * en file. Ici, hors du chemin critique, on peut lire, agréger et reporter.
 *
 * CE JOB N'EST QU'UN MESSAGER. Il ne touche NI hex_claims, NI les scores, NI
 * une horloge de jeu : le vol est déjà appliqué et payé par claim_hexes. Sur
 * une file vide, il ne fait strictement rien.
 *
 * ANTI PAY-TO-WIN (AMENDEMENT-45 C1, §22). Aucune lecture d'abonnement, de pass
 * ni de niveau nulle part dans ce fichier, ni dans les RPC qu'il appelle : deux
 * joueurs qui perdent la même chose au même moment sont traités identiquement,
 * dans le MÊME drain, servis par ancienneté du vol. « Être prévenu plus tôt
 * d'une attaque, c'est défendre en premier » — cet avantage n'est achetable par
 * aucun chemin de code.
 *
 * Toute la logique de décision vit dans logic.ts et _shared/push.ts (pures et
 * testées) — ce fichier ne fait que de l'I/O et de l'ordonnancement.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { cellToParent } from 'npm:h3-js@^4.1';
import {
  SECTOR_H3_RESOLUTION,
  STEAL_PUSH_COOLDOWN_MINUTES,
  STEAL_QUEUE_MAX_AGE_HOURS,
  STEAL_QUEUE_MAX_VICTIMS_PER_DRAIN,
  STEAL_QUEUE_RESERVATION_GRACE_MINUTES,
} from '../_shared/game-rules.ts';
import { secretsMatch } from '../_shared/secret.ts';
import { sendExpoPush } from '../_shared/expo-push.ts';
import {
  aggregateStealEvents,
  type NotifChannel,
  planStealPushes,
  PUSH_LOCALES,
  type PushDevice,
  type PushLocale,
  type StealEvent,
  type StealTarget,
} from '../_shared/push.ts';
import {
  classifyDelivery,
  deliveredUserIds,
  deliveryTally,
  partitionStealQueue,
  planDrainOutcome,
  type StealQueueRow,
} from './logic.ts';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const DB_CHUNK = 500; // taille des batches pour les clauses `in(...)`
/** Vol majeur / offensive crew = P1 (GRYD_notifications_logic.md §2). */
const STEAL_PRIORITY = 1;
/** `push_log.type` du vol subi — c'est aussi la clé du cooldown de vol. */
const STEAL_PUSH_TYPE = 'steal';
/**
 * Fenêtre de lecture de push_log. Doit couvrir À LA FOIS le « jour local » de
 * canPush (cap PUSH_MAX_PER_DAY, tous types confondus) et le cooldown de vol.
 */
const PUSH_LOG_WINDOW_MS = Math.max(
  2 * 24 * MS_PER_HOUR,
  STEAL_PUSH_COOLDOWN_MINUTES * MS_PER_MINUTE,
);

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

const h3ToDb = (h3: string): string => BigInt(`0x${h3}`).toString();
const dbToH3 = (v: string | number): string => BigInt(v).toString(16);

const isPushLocale = (v: unknown): v is PushLocale =>
  typeof v === 'string' && (PUSH_LOCALES as readonly string[]).includes(v);

/**
 * Journalise sans jamais faire échouer le drain. Réservé aux écritures qui
 * suivent le POINT DE NON-RETOUR : à ce stade la file est déjà finalisée, et
 * lever une exception ne réparerait rien — ça ne ferait que transformer un
 * drain partiellement réussi en 500, sans annuler le moindre push déjà parti.
 */
function logFailure(step: string, message: string): void {
  console.error(`steal_push_job[${step}] (non bloquant):`, message);
}

/**
 * Nom RÉEL du secteur de chaque hex volé — jamais fabriqué.
 *
 * Les secteurs sont nommés par `discover_sectors` (géocodage inverse). Un hex
 * dont le secteur n'existe pas encore en base, ou dont le nom est vide, ressort
 * avec `null` : `buildStealPush` bascule alors sur un titre SANS lieu. On ne se
 * rabat sur aucune approximation — « l'app ne ment jamais » vaut aussi pour un
 * nom de quartier.
 *
 * VIE PRIVÉE (§7) : le secteur nommé est celui que la VICTIME possédait, à la
 * maille res-7 (~5 km²). Ce n'est ni une position, ni un trajet, ni un point de
 * départ — et rien de l'attaquant n'est résolu ici.
 */
async function resolveSectorNames(
  hexIds: readonly string[],
): Promise<Map<string, { sectorId: string; sectorName: string | null }>> {
  const byHex = new Map<string, { sectorId: string; sectorName: string | null }>();
  if (hexIds.length === 0) return byHex;

  // hex res-10 → cellule res-7 parente (clé des secteurs).
  const parentByHex = new Map<string, string>();
  for (const hex of new Set(hexIds)) {
    try {
      parentByHex.set(hex, cellToParent(hex, SECTOR_H3_RESOLUTION));
    } catch {
      // Index H3 illisible (ne devrait pas arriver : il vient de hex_claims).
      // On l'ignore plutôt que d'échouer : le joueur aura un titre sans lieu.
    }
  }

  const parents = [...new Set(parentByHex.values())];
  const sectorByParentDb = new Map<string, { id: string; name: string | null }>();
  for (const batch of chunk(parents.map(h3ToDb), DB_CHUNK)) {
    const { data, error } = await supabase
      .from('sectors')
      .select('id, name, center_h3_res7')
      .in('center_h3_res7', batch);
    if (error) throw new Error(`sectors read: ${error.message}`);
    for (const s of data ?? []) {
      const name = typeof s.name === 'string' && s.name.trim().length > 0 ? s.name.trim() : null;
      sectorByParentDb.set(String(s.center_h3_res7), { id: String(s.id), name });
    }
  }

  for (const [hex, parent] of parentByHex) {
    const sector = sectorByParentDb.get(h3ToDb(parent));
    // Secteur inconnu (jamais découvert) : aucune entrée. L'agrégat verra un
    // `sectorId` absent et le titre se passera de lieu — pas d'invention.
    if (sector) byHex.set(hex, { sectorId: sector.id, sectorName: sector.name });
  }
  return byHex;
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

    // ── 1. RÉSERVATION ATOMIQUE ─────────────────────────────────────────────
    // `claim_steal_push_batch` (0057) prend un verrou consultatif de
    // transaction, réape les réservations abandonnées, sélectionne les VICTIMES
    // dues par ancienneté, verrouille TOUTES leurs lignes en attente
    // (`for update skip locked`) et pose `reserved_at` — le tout en UNE
    // instruction. Après ce retour, ces lignes sont invisibles de tout autre
    // drain, y compris une fois la transaction terminée : c'est une COLONNE qui
    // les exclut, pas un verrou.
    //
    // L'unité est la VICTIME, jamais la ligne : un message agrège tout ce
    // qu'une victime a perdu, et un agrégat coupé en deux annoncerait un
    // nombre FAUX.
    //
    // Un retour VIDE a deux causes indistinguables ici — rien n'est dû, ou un
    // autre drain tient le verrou. Les deux sont des no-op corrects.
    const { data: claimed, error: claimError } = await supabase.rpc('claim_steal_push_batch', {
      p_max_victims: STEAL_QUEUE_MAX_VICTIMS_PER_DRAIN,
      p_now: now.toISOString(),
      p_grace_minutes: STEAL_QUEUE_RESERVATION_GRACE_MINUTES,
    });
    if (claimError) throw new Error(`claim_steal_push_batch: ${claimError.message}`);

    const claimedRows = (claimed ?? []) as Record<string, unknown>[];
    const rows: StealQueueRow[] = claimedRows.map((r) => ({
      id: Number(r.id),
      victimUserId: String(r.victim_user_id),
      thiefUserId: String(r.thief_user_id),
      hexId: dbToH3(r.h3index as string | number),
      stolenAt: new Date(r.stolen_at as string),
    }));

    // ── 1 bis. HORLOGE DU COOLDOWN DE VOL ────────────────────────────────────
    // Elle vient de la RÉSERVATION (colonne `last_pushed_at`, 0058) : la plus
    // récente ligne de cette victime consommée avec `outcome = 'pushed'`, donc
    // écrite dans la transaction de `finalize_steal_push_batch`, AVANT tout
    // appel réseau. Le cooldown est ainsi armé par la DÉCISION d'envoyer.
    //
    // Auparavant il ne venait que de `push_log` — écrit uniquement pour les
    // issues `delivered`, et en best-effort. Une panne Expo ou un échec d'insert
    // du journal DÉSARMAIT donc la seule garde contre le renvoi entre deux
    // drains : le message repartait au plus tôt. Une panne de TRANSPORT ne doit
    // jamais élargir le droit de déranger quelqu'un.
    //
    // `push_log` reste néanmoins fusionné plus bas (on garde la date la PLUS
    // RÉCENTE des deux) : les pushs de vol envoyés avant 0058 n'ont pas d'autre
    // trace, et deux sources ne peuvent que retarder le prochain message —
    // jamais l'avancer. Dans le doute, on se tait.
    const lastStealPushByUser = new Map<string, Date>();
    for (const r of claimedRows) {
      const raw = r.last_pushed_at;
      if (typeof raw !== 'string') continue;
      const at = new Date(raw);
      if (Number.isNaN(at.getTime())) continue;
      const uid = String(r.victim_user_id);
      const prev = lastStealPushByUser.get(uid);
      if (!prev || at.getTime() > prev.getTime()) lastStealPushByUser.set(uid, at);
    }

    if (rows.length === 0) {
      await purgeConsumed(now);
      return json({ claimed: 0, expired: 0, victims: 0, consumed: 0, deferred: 0 });
    }

    // ── 2. Péremption (pur) ──────────────────────────────────────────────────
    // Un vol de plus de STEAL_QUEUE_MAX_AGE_HOURS n'est plus une NOUVELLE : il
    // est consommé sans push. En pratique il ne peut s'agir que d'une perte
    // restée sous le seuil (STEAL_PUSH_MIN_HEXES) pendant 24 h — c'est-à-dire
    // exactement le « on ne pousse pas pour chaque hex » du doc §4.
    //
    // MAIS IL GARDE SON INBOX (0058). Ce qui expire, c'est le droit de DÉRANGER
    // quelqu'un pour un fait qui n'est plus frais ; pas le droit du joueur de
    // savoir ce qu'il a perdu. Avant ce correctif, la victime d'un vol périmé
    // n'avait NI push NI inbox : elle ne l'apprenait jamais. Le compromis assumé
    // était « au plus une fois », pas « parfois rien du tout ».
    //
    // Les périmées partent dans la MÊME finalisation que le reste (étape 6) :
    // une seule écriture, une seule transaction.
    const { fresh, stale } = partitionStealQueue(rows, now);

    // ── 3. Contexte de décision (lectures seules) ────────────────────────────
    // Les noms de secteur sont résolus pour TOUTES les lignes, périmées
    // comprises : leur entrée d'inbox nomme le lieu comme les autres.
    const sectorByHex = await resolveSectorNames(rows.map((r) => r.hexId));
    const toEvent = (r: StealQueueRow): StealEvent => {
      const sector = sectorByHex.get(r.hexId);
      return {
        victimUserId: r.victimUserId,
        thiefUserId: r.thiefUserId,
        hexId: r.hexId,
        sectorId: sector?.sectorId ?? null,
        sectorName: sector?.sectorName ?? null,
        at: r.stolenAt,
      };
    };
    const events: StealEvent[] = fresh.map(toEvent);
    const staleEvents: StealEvent[] = stale.map(toEvent);

    const victimIds = [...new Set(fresh.map((r) => r.victimUserId))];

    // Appareils (les désactivés sont exclus en SQL).
    const devicesByUser = new Map<string, PushDevice[]>();
    for (const batch of chunk(victimIds, DB_CHUNK)) {
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

    // Journal de push : il porte le CAP JOURNALIER (tous types confondus, et il
    // doit rester adossé à un envoi réellement accepté — cf. étape 7).
    // Il ne porte PLUS le cooldown de vol à lui seul : celui-ci vient de la
    // réservation (étape 1 bis). On fusionne quand même les entrées `steal` en
    // gardant la date la plus RÉCENTE des deux sources — deux sources ne peuvent
    // que retarder le prochain message, jamais l'avancer.
    const pushLogByUser = new Map<string, Date[]>();
    const since = new Date(now.getTime() - PUSH_LOG_WINDOW_MS).toISOString();
    for (const batch of chunk(victimIds, DB_CHUNK)) {
      const { data, error } = await supabase
        .from('push_log')
        .select('user_id, sent_at, type')
        .gte('sent_at', since)
        .in('user_id', batch);
      if (error) throw new Error(`push_log read: ${error.message}`);
      for (const row of data ?? []) {
        const uid = String(row.user_id);
        const at = new Date(row.sent_at);
        const list = pushLogByUser.get(uid);
        if (list) list.push(at);
        else pushLogByUser.set(uid, [at]);
        if (row.type === STEAL_PUSH_TYPE) {
          const prev = lastStealPushByUser.get(uid);
          if (!prev || at.getTime() > prev.getTime()) lastStealPushByUser.set(uid, at);
        }
      }
    }

    // ── 4. Décision (pure, aucun effet de bord) ──────────────────────────────
    const plan = planStealPushes(events, devicesByUser, pushLogByUser, lastStealPushByUser, now);
    const decision = planDrainOutcome(fresh, plan, lastStealPushByUser, now);
    // Les périmées rejoignent les consommées : même transaction, même issue.
    const consumed = [
      ...decision.consumed,
      ...stale.map((r) => ({ id: r.id, outcome: 'expired' as const })),
    ];

    // ── 5. Inbox : ce que le joueur retrouvera dans l'app ────────────────────
    // Écrite AVANT l'envoi, et pour les victimes DONT LES LIGNES SONT CONSOMMÉES
    // — exactement une fois par événement, jamais en double. Une victime
    // reportée (quiet hours, cooldown, sous le seuil) n'a pas encore son entrée :
    // elle l'aura avec le message agrégé complet, pas en deux morceaux.
    //
    // CE QUE CE BLOC TIENT RÉELLEMENT, ligne par ligne :
    //   · un joueur sans appareil ou ayant coupé le canal `competition`
    //     (`undeliverable`) a son entrée. Couper le push ne coupe pas l'INBOX ;
    //   · une victime dont les vols sont PÉRIMÉS (`expired`) a son entrée, dans
    //     un agrégat SÉPARÉ (voir ci-dessous). Avant 0058 elle n'avait rien du
    //     tout — ni push ni inbox — et n'apprenait jamais sa perte ;
    //   · les seules lignes consommées SANS entrée sont les `invalid` (vol de
    //     soi-même, identifiant vide) : `aggregateStealEvents` les écarte, et il
    //     n'y a effectivement aucune perte à raconter.
    // C'est la SEULE compensation que le code tienne. Le marqueur de revanche,
    // lui, n'a aucune persistance serveur : cf. le suspens `revanche_windows`
    // documenté sur STEAL_PUSH_MIN_HEXES dans packages/shared/src/game-rules.ts.
    //
    // POURQUOI DEUX AGRÉGATS ET PAS UN. Fusionner le frais et le périmé
    // produirait un chiffre qui ne correspond à AUCUN message : le push, lui,
    // ne peut porter que le frais (annoncer un vol de trois jours comme une
    // nouvelle serait faux). Une victime qui a perdu 12 zones avant-hier et 5
    // ce matin reçoit donc DEUX entrées, chacune datée de SON événement — pas
    // une entrée « 17 » que le push contredirait à « 5 ».
    //
    // Un échec ici ne fait PAS échouer le drain : les lignes sont réservées, et
    // lever une exception les laisserait pourrir jusqu'à `abandoned` — le joueur
    // perdrait l'inbox ET le push. On journalise, on continue.
    const consumedIdSet = new Set(consumed.map((c) => c.id));
    const consumedVictims = new Set(
      fresh.filter((r) => consumedIdSet.has(r.id)).map((r) => r.victimUserId),
    );
    const inboxRows = [
      ...aggregateStealEvents(events).filter((t) => consumedVictims.has(t.userId)),
      // Toutes les lignes périmées sont consommées par construction : aucune
      // n'a besoin d'être filtrée sur `consumedVictims`.
      ...aggregateStealEvents(staleEvents),
    ].map((t) => inboxRow(t, now));
    let inboxWritten = 0;
    if (inboxRows.length > 0) {
      const { error } = await supabase.from('notifications').insert(inboxRows);
      if (error) logFailure('notifications insert', error.message);
      else inboxWritten = inboxRows.length;
    }

    // ── 6. POINT DE NON-RETOUR : finaliser la file AVANT d'envoyer ───────────
    // Une seule transaction pour les deux moitiés de la décision : consommer
    // (`processed_at` + `outcome`) et reporter (`next_attempt_at`). Les appliquer
    // séparément rouvrirait le défaut qu'on ferme — un échec entre les deux
    // laisserait des lignes réservées sans issue.
    //
    // CE QUI INTERROMPT LE DRAIN, EXACTEMENT. Cet appel lève, comme lèvent déjà
    // les lectures des étapes 1 et 3 (`claim_steal_push_batch`, `sectors`,
    // `push_devices`, `push_log`). Ce n'est donc pas « le seul échec bloquant » ;
    // c'est le DERNIER. La ligne de partage est ailleurs : tout ce qui lève se
    // situe AVANT le moindre envoi — un lot d'alertes peut être perdu, aucune ne
    // peut être doublée. Après cet appel, plus rien ne lève : l'étape 7
    // journalise ses échecs et continue.
    const { data: finalized, error: finalizeError } = await supabase.rpc(
      'finalize_steal_push_batch',
      {
        p_consumed: consumed,
        p_deferred: decision.deferred.map((d) => ({
          id: d.id,
          next_attempt_at: d.nextAttemptAt.toISOString(),
        })),
        p_now: now.toISOString(),
      },
    );
    if (finalizeError) throw new Error(`finalize_steal_push_batch: ${finalizeError.message}`);

    // CE QUE LA RPC A RÉELLEMENT ÉCRIT. Ces deux compteurs étaient renvoyés et
    // jamais lus : un drain qui n'a RIEN finalisé ressemblait alors exactement à
    // un drain calme. Un écart n'est pas anodin — il signifie que des lignes
    // qu'on croyait à nous ne l'étaient plus (typiquement : un drain si lent que
    // le réapeur a déclaré sa réservation `abandoned` entre-temps). Les pushs
    // partent quand même — mieux vaut une alerte qu'un silence, et les lignes
    // sont consommées dans les deux cas —, mais l'issue enregistrée sera
    // `abandoned` et non `pushed` : le cooldown de vol de ces victimes ne sera
    // PAS armé. La divergence doit donc être VISIBLE, jamais déduite.
    const finalizedRow = (finalized ?? [])[0] as Record<string, unknown> | undefined;
    const finalizedConsumed = asCount(finalizedRow?.consumed_count);
    const finalizedDeferred = asCount(finalizedRow?.deferred_count);
    if (finalizedConsumed === null || finalizedDeferred === null) {
      logFailure('finalize counts', 'compteurs illisibles — écart indétectable ce drain');
    } else if (
      finalizedConsumed !== consumed.length || finalizedDeferred !== decision.deferred.length
    ) {
      logFailure(
        'finalize counts',
        `écart : consumed ${finalizedConsumed}/${consumed.length}, ` +
          `deferred ${finalizedDeferred}/${decision.deferred.length} — ` +
          `des lignes réservées ne l'étaient plus (réapeur ?)`,
      );
    }

    // ── 7. Envoi réel ────────────────────────────────────────────────────────
    // À partir d'ici, PLUS AUCUNE erreur ne peut provoquer de renvoi : la file
    // est déjà finalisée. Tout ce qui suit journalise, rien ne relance.
    let delivery = { delivered: 0, rejected: 0, unknown: 0 };
    let transportError: string | undefined;
    if (plan.sends.length > 0) {
      const messages = plan.sends.flatMap((s) => s.messages);
      const sent = await sendExpoPush(messages, Deno.env.get('EXPO_ACCESS_TOKEN') ?? undefined);
      transportError = sent.transportError;

      // `okTokens: []` ne veut PAS dire « rien n'est parti » quand le transport
      // a échoué : ça veut dire « on ne sait pas ». La distinction est faite en
      // pur (classifyDelivery) et c'est elle qui décide qui va dans push_log.
      const byUser = classifyDelivery(
        plan,
        new Set(sent.okTokens),
        transportError !== undefined,
      );
      delivery = deliveryTally(byUser);

      // INVARIANT (identique au decay) : `push_log` n'est écrit QUE pour les
      // joueurs dont un appareil a RÉELLEMENT accepté le message. Il porte le
      // CAP JOURNALIER, et consommer le cap d'un joueur pour un message qu'il
      // n'a peut-être jamais reçu le rendrait injoignable pour rien.
      // Ce journal n'arme PLUS le cooldown de vol à lui seul (0058) : celui-ci
      // est armé par la consommation `pushed`, écrite à l'étape 6. Un échec
      // ci-dessous ne désarme donc plus la garde anti-renvoi — c'était le défaut
      // que 0058 ferme.
      const logged = deliveredUserIds(byUser);
      if (logged.length > 0) {
        const { error } = await supabase.from('push_log').insert(
          logged.map((userId) => ({
            user_id: userId,
            sent_at: now.toISOString(),
            type: STEAL_PUSH_TYPE,
          })),
        );
        // Échec : le CAP JOURNALIER de ces joueurs ne sera pas décompté — ils
        // pourront recevoir un push de plus aujourd'hui, toutes causes
        // confondues. Le cooldown de vol, lui, reste armé (étape 6).
        if (error) logFailure('push_log insert', error.message);
      }

      // Appareils morts (app désinstallée) : on cesse d'envoyer, sans rien
      // effacer — un ré-enregistrement légitime remettra `disabled_at` à null.
      if (sent.deadTokens.length > 0) {
        for (const batch of chunk(sent.deadTokens, DB_CHUNK)) {
          const { error } = await supabase
            .from('push_devices')
            .update({ disabled_at: now.toISOString() })
            .in('expo_token', batch);
          if (error) logFailure('push_devices disable', error.message);
        }
      }
    }

    await purgeConsumed(now);

    return json({
      // Observabilité honnête : « réservé » ≠ « consommé », « consommé » ≠
      // « poussé », « poussé » ≠ « reçu », et « inconnu » ≠ « refusé ».
      claimed: rows.length,
      expired: stale.length,
      victims: victimIds.length,
      consumed: consumed.length,
      deferred: decision.deferred.length,
      // Ce que la RPC a VRAIMENT écrit, à côté de ce qu'on lui a demandé : un
      // drain qui ne finalise rien ne doit pas ressembler à un drain calme.
      // `null` = compteurs illisibles, pas « zéro ».
      finalizedConsumed,
      finalizedDeferred,
      pushPlanned: plan.sends.length,
      pushSuppressed: plan.suppressed.length,
      pushDelivered: delivery.delivered,
      pushRejected: delivery.rejected,
      // > 0 = panne de transport. Doit être visible, pas ressembler au calme.
      pushUnknown: delivery.unknown,
      inboxWritten,
      pushTransportError: transportError,
    });
  } catch (err) {
    console.error('steal_push_job:', err);
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});

/** Compteur renvoyé par une RPC : un nombre, ou `null` si illisible — jamais 0. */
function asCount(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Une entrée d'inbox pour UNE victime et UN agrégat. PURE (hors `now`).
 *
 * `created_at` est la date de l'ÉVÉNEMENT, pas celle du drain qui l'a remarqué.
 * C'est ce qui rend l'entrée d'un vol périmé honnête sans qu'aucun écran n'ait à
 * changer : elle se range à sa vraie place dans l'inbox et se lit « avant-hier »,
 * au lieu de se présenter comme une nouvelle du moment. Une date FUTURE
 * (horloge incohérente côté ingestion) est ramenée à `now` — `notifications`
 * contraint `read_at >= created_at`, et une entrée datée du futur serait
 * impossible à marquer comme lue.
 */
function inboxRow(t: StealTarget, now: Date): Record<string, unknown> {
  const createdAt = t.latestAt.getTime() > now.getTime() ? now : t.latestAt;
  return {
    user_id: t.userId,
    type: 'steal',
    priority: STEAL_PRIORITY,
    created_at: createdAt.toISOString(),
    payload: {
      // Même ton que le push : le fait, puis l'action. Jamais de reproche,
      // jamais de nom d'attaquant (cf. _shared/push.ts, « VIE PRIVÉE »).
      title: t.sectorName
        ? `Ton territoire à ${t.sectorName} a changé de mains`
        : 'Ton territoire a changé de mains',
      body: t.hexCount === 1
        ? '1 zone reprise. Repasse dessus pour la récupérer.'
        : `${t.hexCount} zones reprises. Repasse dessus pour les récupérer.`,
      hexCount: t.hexCount,
      // Comptes exposés à l'app (écran revanche), jamais mis en copie.
      sectorCount: t.sectorCount,
      rivalCount: t.rivalCount,
      ...(t.sectorId ? { sectorId: t.sectorId } : {}),
      latestAt: t.latestAt.toISOString(),
      cta: 'reclaim',
    },
  };
}

/**
 * Efface les lignes déjà consommées et vieilles. La file garde une trace courte
 * pour DEUX raisons, pas une :
 *   · l'observabilité (« combien de vols annoncés / supprimés / abandonnés ») ;
 *   · l'HORLOGE DU COOLDOWN DE VOL (0058) — c'est `processed_at` des lignes
 *     `outcome = 'pushed'` qui dit quand une victime a été prévenue pour la
 *     dernière fois. Purger trop tôt désarmerait cette garde.
 * D'où l'invariant testé dans logic_test.ts :
 * STEAL_QUEUE_MAX_AGE_HOURS × 60 ≥ STEAL_PUSH_COOLDOWN_MINUTES.
 *
 * Passé ce délai la file n'apprend plus rien à personne et n'a aucune raison de
 * conserver deux user_id. Best-effort : un échec de purge ne compromet rien
 * (il ne fait que retarder l'oubli — jamais avancer un push).
 */
async function purgeConsumed(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - STEAL_QUEUE_MAX_AGE_HOURS * MS_PER_HOUR).toISOString();
  const { error } = await supabase
    .from('steal_push_queue')
    .delete()
    .not('processed_at', 'is', null)
    .lt('processed_at', cutoff);
  if (error) console.error('steal_push_queue purge (best-effort):', error.message);
}
