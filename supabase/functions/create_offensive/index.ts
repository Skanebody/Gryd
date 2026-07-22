/**
 * GRYD — Edge Function create_offensive (§38 Offensives crew : L'ÉCRIVAIN).
 *
 * ═══ POURQUOI CETTE FONCTION EXISTE ═════════════════════════════════════════
 * La machinerie d'offensive était complète… sans personne pour en créer une.
 * `ingest_run` LIT les offensives actives et écrit `offensive_contributions`
 * (en production), le moteur sait juger un résultat, la migration 0064 a posé
 * la clôture — mais AUCUN insert sur `offensives` n'existait dans tout le repo
 * (le TODO(V1) de 0010 l.214). Toute la machine tournait sur une table vide à
 * jamais. Cette fonction est le premier écrivain.
 *
 * ═══ PIPELINE ══════════════════════════════════════════════════════════════
 *   POST + JWT utilisateur → identité dérivée du token (JAMAIS un id du corps)
 *   → lecture de FORME pure (logic.ts : UUID, théâtre H3 res 7, fenêtre)
 *   → lecture de l'adhésion ACTIVE + du rôle (crew_members, left_at is null)
 *   → lecture des offensives ouvertes du crew (compte + jumelle idempotente)
 *   → MOTEUR PUR validateOffensiveDraft (bornes de jeu, game-rules)
 *   → RPC `create_offensive` en service-role (re-vérifie tout SOUS VERROU)
 *   → réconciliation des doublons nés d'une course
 *   → réponse construite sur la ligne RÉELLEMENT persistée.
 *
 * ═══ CE QUI EST RÉELLEMENT OPPOSÉ (honnêteté sur les rôles) ═════════════════
 * `CREW_PERMISSIONS.launchOffensive` = ['co_captain', 'founder']. Ce gate est
 * RÉEL : `crew_members.role` n'est écrit que par le serveur (create_crew →
 * 'founder', join_crew_by_code → 'rookie', 0043) et l'écriture client y est
 * révoquée — personne ne peut s'auto-promouvoir. MAIS aucune RPC promote/
 * demote/kick n'existe encore dans le repo : en pratique, aujourd'hui, seul LE
 * FONDATEUR d'un crew peut lancer une offensive, parce que personne ne peut
 * devenir co_captain. Ce n'est pas une hiérarchie appliquée, c'est une
 * hiérarchie à UN SEUL échelon peuplé — la fonction n'en prétend pas plus.
 *
 * ═══ RÈGLES DURES TENUES ICI ════════════════════════════════════════════════
 * · ANTI PAY-TO-WIN : aucune lecture d'abonnement, d'entitlement ou de flag
 *   premium. Lancer une offensive dépend du RÔLE crew, point. Un abonné et un
 *   non-abonné obtiennent exactement la même réponse.
 * · TOUT EST DÉCIDÉ SERVEUR : le client ne choisit ni le statut, ni l'auteur,
 *   ni le crew (il propose un crewId, l'adhésion est re-vérifiée sous verrou).
 * · AUCUN NOMBRE MAGIQUE : plafond et rôles autorisés viennent de game-rules et
 *   sont PASSÉS à la RPC ; les bornes sont jugées par le moteur.
 * · JAMAIS DE 500 QUI FUIT DU POSTGRES : chaque refus a un code nommé et un
 *   statut HTTP propre ; les messages d'erreur SQL partent dans les logs
 *   serveur (console.error), jamais dans le corps de la réponse.
 * · L'APP NE MENT JAMAIS : la réponse décrit la ligne relue en base (id,
 *   statut, fenêtre), pas ce qu'on croit avoir écrit.
 *
 * ═══ IDEMPOTENCE ═══════════════════════════════════════════════════════════
 * Deux appels identiques ne créent jamais deux offensives :
 *   1. AVANT écriture — une jumelle ouverte (même crew, même théâtre, même
 *      objectif, même fenêtre, même auteur) est renvoyée telle quelle avec
 *      `created: false`. Couvre le cas réel : retry réseau, double-tap.
 *   2. APRÈS écriture — relecture et arbitrage déterministe (`resolveDuplicate`)
 *      pour la course entre deux requêtes simultanées : la plus ancienne
 *      survit, la nôtre se retire. Le retrait est REFUSÉ si la ligne porte déjà
 *      la moindre contribution (on ne détruit jamais un fait de jeu réel) —
 *      dans ce cas les deux subsistent et la réponse le dit (`duplicateKept`).
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import {
  CREW_PERMISSIONS,
  OFFENSIVE_MAX_ACTIVE_PER_CREW,
} from '../_shared/game-rules.ts';
import { validateOffensiveDraft } from '../_shared/engine/offensive.ts';
import {
  asCrewRole,
  type ExistingOffensiveRow,
  findIdempotentTwin,
  parseCreateOffensiveRequest,
  type ParsedOffensiveRequest,
  resolveDuplicate,
  type RpcRejectReason,
  statusForReject,
  toOffensiveDraft,
} from './logic.ts';

/**
 * Colonnes nécessaires à l'idempotence ET au compte d'offensives ouvertes.
 *
 * `center_h3::text` n'est PAS une coquetterie : `offensives.center_h3` est un
 * bigint, et PostgREST sérialise un bigint en NOMBRE JSON. Un index H3 res 7
 * dépasse 2^53 — le lire en `number` en perd les chiffres de poids faible, donc
 * deux théâtres différents se ressembleraient et deux appels identiques ne se
 * reconnaîtraient plus. Le cast en texte rend la comparaison exacte.
 */
const OPEN_COLUMNS =
  'id, crew_id, center_h3::text, radius_km, objectif_hexes, starts_at, ends_at, created_by, created_at, status';

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

/** Refus nommé : code stable côté client, détail SQL réservé aux logs serveur. */
const refuse = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ error, ...extra }, status);

/** Toutes les offensives NON clôturées d'un crew (jamais plus de quelques lignes). */
async function readOpenOffensives(crewId: string): Promise<ExistingOffensiveRow[]> {
  const { data, error } = await supabase
    .from('offensives')
    .select(OPEN_COLUMNS)
    .eq('crew_id', crewId)
    .neq('status', 'done');
  if (error) throw new Error(`offensives read: ${error.message}`);
  return (data ?? []) as ExistingOffensiveRow[];
}

/** Vue publique d'une offensive : ce que la base contient VRAIMENT, rien de plus. */
function present(row: ExistingOffensiveRow) {
  return {
    offensiveId: row.id,
    crewId: row.crew_id,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    objectiveHexes: Number(row.objectif_hexes),
    radiusKm: Number(row.radius_km),
    centerH3: String(row.center_h3),
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return refuse('method_not_allowed', 405);

  // Sans clés serveur, on ne prétend pas travailler (précédent strava_import).
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return refuse('configuration_required', 503);
  }

  // ── 1. Identité : dérivée du JWT, jamais du corps ─────────────────────────
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return refuse('missing_authorization', 401);
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData?.user) return refuse('invalid_token', 401);
  const userId = userData.user.id;

  // ── 2. Forme de la demande (PUR) ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return refuse('invalid_body', 400);
  }
  const nowMs = Date.now();
  const parsedResult = parseCreateOffensiveRequest(raw, nowMs);
  if (!parsedResult.ok) return refuse(parsedResult.error, 400);
  const parsed: ParsedOffensiveRequest = parsedResult.value;

  try {
    // ── 3. Adhésion ACTIVE + rôle ───────────────────────────────────────────
    // `left_at is null` : un ancien membre n'a plus aucun droit sur le crew,
    // même si son historique d'adhésion reste en base (cooldown 7 j).
    const { data: member, error: memberError } = await supabase
      .from('crew_members')
      .select('role')
      .eq('crew_id', parsed.crewId)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle();
    if (memberError) {
      console.error('crew_members read failed', memberError.message);
      return refuse('membership_read_failed', 500);
    }
    if (!member) return refuse('not_member', statusForReject('not_member'));

    const role = asCrewRole((member as { role?: unknown }).role);
    if (role === null) {
      // Rôle inconnu de game-rules : aucun droit déduit d'une valeur qu'on ne
      // comprend pas (on refuse plutôt que d'inventer une hiérarchie).
      return refuse('forbidden_role', statusForReject('forbidden_role'));
    }

    // ── 4. Offensives ouvertes : plafond ET idempotence, une seule lecture ──
    const openRows = await readOpenOffensives(parsed.crewId);
    const twin = findIdempotentTwin(openRows, parsed, userId);
    if (twin) {
      // Même demande, déjà servie : on renvoie l'offensive EXISTANTE. Pas de
      // seconde écriture, pas d'erreur non plus — l'état voulu est déjà atteint.
      return json({ created: false, idempotent: true, ...present(twin) });
    }

    // ── 5. Bornes de jeu : MOTEUR PUR (game-rules), pas cette fonction ──────
    const verdict = validateOffensiveDraft(toOffensiveDraft(parsed), {
      nowMs,
      role,
      openOffensives: openRows.length,
    });
    if (!verdict.ok) return refuse(verdict.reason, statusForReject(verdict.reason));

    // ── 6. Écriture : la RPC re-vérifie tout SOUS VERROU ───────────────────
    // Le pré-contrôle ci-dessus sert à donner un motif PRÉCIS ; la garde qui
    // fait foi est celle de la RPC (adhésion, rôle et plafond recomptés sous
    // pg_advisory_xact_lock — sans quoi deux demandes simultanées passeraient
    // toutes les deux le plafond).
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_offensive', {
      p_crew_id: parsed.crewId,
      p_user_id: userId,
      p_zone_label: parsed.zoneLabel,
      p_center_h3: parsed.centerH3Db,
      p_radius_km: parsed.radiusKm,
      p_objectif_hexes: parsed.objectiveHexes,
      p_starts_at: new Date(parsed.startsAtMs).toISOString(),
      p_ends_at: new Date(parsed.endsAtMs).toISOString(),
      p_max_open: OFFENSIVE_MAX_ACTIVE_PER_CREW,
      p_allowed_roles: CREW_PERMISSIONS.launchOffensive,
    });
    if (rpcError) {
      console.error('create_offensive rpc failed', rpcError.message);
      return refuse('creation_failed', 500);
    }

    const rpc = (rpcData ?? {}) as {
      offensive_id?: string | null;
      rejected?: RpcRejectReason | null;
    };
    if (rpc.rejected) {
      return refuse(rpc.rejected, statusForReject(rpc.rejected));
    }
    const createdId = rpc.offensive_id;
    if (!createdId) {
      console.error('create_offensive rpc returned neither id nor reason');
      return refuse('creation_failed', 500);
    }

    // ── 7. Réconciliation d'un doublon né d'une course ─────────────────────
    const afterRows = await readOpenOffensives(parsed.crewId);
    const { keepId, discardId } = resolveDuplicate(createdId, afterRows, parsed, userId);
    let duplicateKept = false;

    if (discardId) {
      // On ne retire JAMAIS une offensive qui porte déjà une contribution : ce
      // serait détruire un fait de jeu réel pour faire joli.
      //
      // Cette garantie était un TOCTOU : on COMPTAIT les contributions, puis on
      // supprimait, en deux requêtes distinctes. `ingest_run` tourne en parallèle,
      // donc une contribution écrite entre les deux disparaissait en silence — la
      // promesse tenait dans le commentaire, pas dans le code. La condition et la
      // suppression sont désormais un seul énoncé SQL (`discard_duplicate_offensive`,
      // 0064) : soit il n'y a aucune contribution et la ligne part, soit elle reste.
      const { data: discarded, error: discardError } = await supabase.rpc(
        'discard_duplicate_offensive',
        { p_offensive_id: discardId, p_created_by: userId },
      );
      if (discardError) {
        console.error('duplicate offensive discard failed', discardError.message);
        duplicateKept = true;
      } else if (discarded !== true) {
        // La RPC n'a rien supprimé : la jumelle portait déjà une contribution (ou
        // était close). On la GARDE, et on le dit — jamais un succès décoratif.
        duplicateKept = true;
      }
    }

    const kept = afterRows.find((r) => r.id === keepId);
    if (!kept) {
      // L'offensive existe (la RPC a rendu son id) mais la relecture ne la voit
      // pas encore : on le dit, on n'invente ni statut ni fenêtre.
      return json({ created: true, offensiveId: keepId, status: null, readback: false });
    }

    return json({
      created: true,
      idempotent: false,
      readback: true,
      ...present(kept),
      ...(duplicateKept ? { duplicateKept: true } : {}),
      ...(parsed.usedDefaultDuration ? { usedDefaultDuration: true } : {}),
    });
  } catch (e) {
    console.error('create_offensive failed', e instanceof Error ? e.message : e);
    return refuse('creation_failed', 500);
  }
});
