/**
 * GRYD — Edge Function close_offensives (cron toutes les 10 min, §38.3).
 *
 * ═══ CE QUE CE JOB FERME ════════════════════════════════════════════════════
 * La machinerie d'offensive était complète… sans personne pour la finir.
 * `ingest_run` écrit les contributions (en production, coefficient crew_mission
 * ×1,1), le moteur sait juger — mais `offensives` n'apparaissait dans AUCUN job :
 * rien ne passait jamais 'active' → 'done', rien n'écrivait `result`, donc les
 * 200 XP crew ne tombaient jamais et la métrique `offensivesJoined` (badges Raid
 * Leader, skill Strategist) restait INATTEIGNABLE. C'est ce job.
 *
 * ═══ LES TROIS PASSES (ordre contraignant) ══════════════════════════════════
 *   A. `activate_due_offensives()`      preparation → active (idempotente).
 *   B. `claim_offensive_close(id)`      fenêtre close → 'done' + hexes FIGÉS,
 *                                       sous verrou. NE CRÉDITE RIEN.
 *   C. `finalize_offensive(id, …)`      verdict du moteur PUR + crédit UNIQUE
 *                                       (XP crew, coffre, offensives_joined).
 *
 * ═══ IDEMPOTENCE (le cron rejoue toutes les 10 min) ═════════════════════════
 * La garde est en base (0064), pas dans ce fichier : B ne passe qu'une fois
 * (`status <> 'done'`), C ne crédite qu'une fois (`result IS NULL`), et les deux
 * écrivent leur crédit dans la MÊME transaction que leur transition. Une
 * offensive déjà clôturée n'est donc ni recalculée ni recréditée — ce passage
 * la compte simplement en `alreadyClosed`. Un crash entre B et C laisse
 * 'done'/result NULL : la PASSE C du passage SUIVANT la reprend (c'est pourquoi
 * elle balaye `status='done' and result is null`, et pas seulement ce que B
 * vient de clôturer). Le job est donc rejouable, interruptible, et sûr même si
 * deux invocations se chevauchent.
 *
 * ═══ CE QUE CE JOB NE FAIT PAS ══════════════════════════════════════════════
 * · Il ne juge rien lui-même : le verdict vient de `offensiveResult()` et la
 *   récompense de `offensiveAward()` (moteur PUR partagé). Aucun barème en SQL,
 *   aucun nombre magique ici.
 * · Il ne touche PAS à `ingest_run` : `offensivesCompleted: 0` y reste correct —
 *   la clôture est un job, pas une course. Les 200 XP arrivent par ici.
 * · ANTI PAY-TO-WIN : aucune lecture d'un statut payant, nulle part.
 *
 * ═══ HONNÊTETÉ DE LA RÉPONSE ════════════════════════════════════════════════
 * Les compteurs sont RÉELS. Sur une base sans offensive (l'état de la prod
 * aujourd'hui : 0 crew), la réponse est un rapport à zéro — pas un « ok »
 * décoratif. Un échec isolé sur une offensive n'arrête pas le balayage des
 * autres, mais fait tomber `ok` à false et apparaît dans `failures`.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { CREW_XP_TABLE } from '../_shared/game-rules.ts';
import { secretsMatch } from '../_shared/secret.ts';
import {
  type ContributionRow,
  type DueOffensiveRow,
  emptyReport,
  isoWeekStart,
  parseActivated,
  parseClaim,
  parseFinalize,
  type PendingFinalizeRow,
  planFinalization,
  recordClaim,
  recordFailure,
  recordFinalize,
} from './logic.ts';

/** PostgREST plafonne les lectures à 1000 lignes : toute liste se lit PAGINÉE. */
const PAGE = 1000;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * Filtre de lecture, décrit en DONNÉES et non en callback : le type du query
 * builder de supabase-js est trop profond pour être renvoyé par une lambda
 * générique (TS2589), et un `any` masquerait une faute de colonne.
 */
type Filter =
  | { op: 'eq'; column: string; value: string }
  | { op: 'neq'; column: string; value: string }
  | { op: 'lte'; column: string; value: string }
  | { op: 'isNull'; column: string };

/**
 * Lit TOUTES les lignes d'une table (paginé + ORDONNÉ).
 *
 * L'ordre explicite n'est pas cosmétique : sans `order`, deux pages successives
 * peuvent se recouvrir ou sauter des lignes, et le job clôturerait « presque
 * toutes » les offensives sans que rien ne le signale. Le repo vient de corriger
 * exactement ce défaut dans recompute_sectors — on ne le refait pas ici.
 * L'ordre se termine toujours par `id` pour être TOTAL (deux offensives peuvent
 * partager `ends_at` à la seconde près).
 */
async function readAllPaged<T>(
  table: string,
  columns: string,
  orderBy: readonly string[],
  filters: readonly Filter[] = [],
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select(columns);
    for (const f of filters) {
      if (f.op === 'eq') query = query.eq(f.column, f.value);
      else if (f.op === 'neq') query = query.neq(f.column, f.value);
      else if (f.op === 'lte') query = query.lte(f.column, f.value);
      else query = query.is(f.column, null);
    }
    for (const col of orderBy) query = query.order(col, { nullsFirst: true });
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} read: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Auth job : secret partagé avec le scheduler, comparé en TEMPS CONSTANT
  // (même gate que decay_job / season_close / recompute_sectors).
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || !secretsMatch(req.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const report = emptyReport();

  try {
    // ── PASSE A : preparation → active ───────────────────────────────────────
    // Idempotente et sans paramètre. Son échec ne doit PAS empêcher la clôture :
    // une offensive dont la fenêtre est close se clôture même si elle n'a jamais
    // été activée (shouldCloseOffensive ignore le statut de départ).
    const { data: activatedRaw, error: activateErr } = await supabase.rpc(
      'activate_due_offensives',
    );
    if (activateErr) recordFailure(report, 'activate', null, activateErr.message);
    else report.activated = parseActivated(activatedRaw).length;

    // ── PASSE B : réclamer la clôture des fenêtres échues ────────────────────
    // Prédicat = index `offensives_pending_close_idx`. On lit TOUT avant
    // d'écrire : la liste ne bouge pas sous nos pieds pendant la pagination.
    const due = await readAllPaged<DueOffensiveRow>(
      'offensives',
      'id',
      ['ends_at', 'id'],
      [{ op: 'neq', column: 'status', value: 'done' }, {
        op: 'lte',
        column: 'ends_at',
        value: nowIso,
      }],
    );
    report.due = due.length;

    for (const row of due) {
      const { data, error } = await supabase.rpc('claim_offensive_close', {
        p_offensive_id: row.id,
      });
      if (error) {
        recordFailure(report, 'close', row.id, error.message);
        continue;
      }
      // claimed=false ⇒ un autre passage a déjà clôturé : ON NE CRÉDITE RIEN
      // ici. Le crédit est le travail EXCLUSIF de la passe C, sous sa garde.
      recordClaim(report, parseClaim(data));
    }

    // ── PASSE C : juger et créditer, UNE seule fois ──────────────────────────
    // Index `offensives_pending_finalize_idx`. Ce balayage reprend AUSSI les
    // offensives clôturées lors d'un passage précédent qui a crashé avant de
    // finaliser — d'où la lecture par prédicat plutôt que par liste locale.
    const pending = await readAllPaged<PendingFinalizeRow>(
      'offensives',
      'id, crew_id, objectif_hexes, hexes_taken, closed_at',
      ['closed_at', 'id'],
      [{ op: 'eq', column: 'status', value: 'done' }, { op: 'isNull', column: 'result' }],
    );

    for (const row of pending) {
      // Qui a participé ? Lecture paginée : le nombre de contributeurs est borné
      // par la taille du crew, mais on ne parie pas là-dessus dans un job.
      let contributions: ContributionRow[];
      try {
        contributions = await readAllPaged<ContributionRow>(
          'offensive_contributions',
          'user_id, hexes',
          ['user_id'],
          [{ op: 'eq', column: 'offensive_id', value: row.id }],
        );
      } catch (e) {
        recordFailure(report, 'contributions', row.id, e instanceof Error ? e.message : String(e));
        continue;
      }

      // Verdict + récompense : MOTEUR PUR, rien n'est décidé ici ni en SQL.
      const plan = planFinalization(row, contributions, now);

      const { data, error } = await supabase.rpc('finalize_offensive', {
        p_offensive_id: plan.offensiveId,
        p_result: plan.result,
        p_crew_xp: plan.crewXp,
        p_chest_delta: plan.chestDelta,
        p_xp_table: CREW_XP_TABLE,
        p_week_start: plan.weekStart,
        p_joined_user_ids: plan.joinedUserIds,
      });
      if (error) {
        recordFailure(report, 'finalize', row.id, error.message);
        continue;
      }
      recordFinalize(report, plan, parseFinalize(data));
    }

    // 207 quand une offensive au moins a échoué : le balayage a bien eu lieu et
    // le reste est crédité, mais le passage n'est pas « tout vert ». Un 200 sec
    // rendrait l'échec invisible aux logs du scheduler.
    return json(report, report.ok ? 200 : 207);
  } catch (e) {
    // Échec GLOBAL (lecture impossible) : on rend ce qui a réellement été fait
    // avant l'arrêt, jamais un rapport vide qui laisserait croire à un no-op.
    console.error('close_offensives:', e);
    recordFailure(report, 'scan', null, e instanceof Error ? e.message : String(e));
    return json({ ...report, error: 'internal_error' }, 500);
  }
});
