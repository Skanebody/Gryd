/**
 * GRYD — Edge Function recompute_sectors (job, AMENDEMENT-41 §2 / §C).
 *
 * Pipeline : auth cron secret → lecture de `sector_holdings` (vue 0061 : le
 * contrôle par DÉTENTEUR — crew, OU joueur sans crew) → `computeSectorSnapshot`
 * (MOTEUR PUR engine/sectorSnapshot) par secteur → upsert `sector_snapshot`
 * (owner/rival + identité crew ou solo + parts + pressure_score + statut §C) →
 * neutralisation des secteurs devenus vides (claims décayés → sortis de la vue
 * → on retire leur snapshot obsolète, pas de mensonge).
 *
 * Ce fichier ne fait que de l'I/O ; toute la dérivation §C vit dans le moteur,
 * et toutes les TRANSFORMATIONS (lignes → moteur, snapshot → payload) dans
 * `logic.ts` (pur, testé).
 *
 * ─── CE QUE LA SOURCE `sector_holdings` CHANGE (0061) ───────────────────────
 * La matview `sector_control` (0002) ne joignait que les membres de crew : un
 * joueur SANS crew n'y produisait aucune ligne, et son secteur ressortait
 * « neutre à 100 % » alors qu'il était RÉELLEMENT tenu. On lit désormais
 * `sector_holdings`, qui attribue les hexes au crew du joueur s'il en a un,
 * SINON au joueur lui-même. Le job écrit donc aussi `owner_user_id` /
 * `top_rival_user_id`. Il n'écrit JAMAIS `owner_kind` / `top_rival_kind` :
 * colonnes GÉNÉRÉES, dérivées de l'identité présente.
 *
 * Corollaire du PLANCHER DE DOMINATION (moteur, `SECTOR_CONTROL_THRESHOLDS`)
 * : un secteur simplement traversé n'a AUCUN propriétaire. C'est le cas le plus
 * fréquent, pas une erreur — le job écrit ce neutre tel quel (owner null,
 * neutre 100 %) et ne saute jamais la ligne.
 *
 * `refresh_sector_control` reste appelé, mais N'EST PLUS la source de ce job :
 * la matview par crew est lisible par les clients (grant authenticated, 0003)
 * et ce passage (cron 0038, toutes les 15 min) en est le seul rafraîchissement
 * régulier (decay_job ne la
 * rafraîchit que s'il a neutralisé quelque chose). Son échec n'interrompt donc
 * plus le recompute : il est signalé dans la réponse (`sectorControlRefreshed`)
 * plutôt que de faire échouer un snapshot qui, lui, n'en dépend pas.
 *
 * Signaux d'activité : CÂBLÉS (état vérifié le 23/07/2026). L'étape 3 ci-dessous
 * lit la vue `sector_activity` (migration 0040) et en tire, par secteur,
 * zones_lost_recent / rival_reclaimed_24h / last_attack_at / decay_fraction, qui
 * nourrissent la pression et le statut §C au même titre que l'équilibre
 * owner↔rival. Un secteur absent de la vue reçoit une activité VIDE (`{}`) — le
 * moteur retombe alors sur le seul équilibre de contrôle, il n'invente rien.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { secretsMatch } from '../_shared/secret.ts';
import { computeSectorSnapshot } from '../_shared/engine/sectorSnapshot.ts';
import {
  groupHoldingsBySector,
  indexActivityBySector,
  toSnapshotPayload,
  type ActivityRow,
  type HoldingRow,
} from './logic.ts';

const PAGE = 1000; // PostgREST plafonne les lectures à 1000 lignes
const UPSERT_CHUNK = 500;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Lit TOUTES les lignes d'une vue (paginé — elles peuvent dépasser 1000).
 * L'ORDRE EXPLICITE n'est pas cosmétique : `sector_holdings` / `sector_activity`
 * sont des vues calculées à la volée, sans ordre garanti — sans `order`, deux
 * pages successives pourraient se recouvrir ou sauter des détenteurs, et le
 * snapshot serait faux sans que rien ne le signale.
 */
async function readAllPaged<T>(
  table: string,
  columns: string,
  orderBy: readonly string[],
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select(columns);
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

  // Auth job : secret partagé avec le scheduler (pas de JWT utilisateur ici).
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || !secretsMatch(req.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    // 1. Tenir à jour la matview PAR CREW lisible par les clients. Ce job n'en
    //    dépend plus (il lit `sector_holdings`, calculée à la volée) : un échec
    //    est rapporté, il n'annule pas le recompute.
    let sectorControlRefreshed = true;
    const { error: refErr } = await supabase.rpc('refresh_sector_control');
    if (refErr) {
      sectorControlRefreshed = false;
      console.error('recompute_sectors refresh_sector_control:', refErr.message);
    }

    // 2. Lire le contrôle par DÉTENTEUR (crews + joueurs sans crew) + grouper.
    //    Aucun filtrage ici : le plancher de domination est au moteur.
    const holdings = await readAllPaged<HoldingRow>(
      'sector_holdings',
      'sector_id, crew_id, holder_user_id, control_percent',
      ['sector_id', 'crew_id', 'holder_user_id'],
    );
    const bySector = groupHoldingsBySector(holdings);

    // 3. Signaux d'ACTIVITÉ par secteur (vue sector_activity, 0040) : vols récents +
    //    decay imminent → nourrissent pression/statut (attaque active, urgence…).
    const activityBySector = indexActivityBySector(
      await readAllPaged<ActivityRow>(
        'sector_activity',
        'sector_id, zones_lost_recent, rival_reclaimed_24h, last_attack_at, decay_fraction',
        ['sector_id'],
      ),
    );

    // 4. Snapshot §C par secteur (moteur pur) + activité réelle. Un secteur dont
    //    aucun détenteur n'atteint le plancher ressort NEUTRE : on l'écrit tel quel.
    const now = new Date();
    const nowIso = now.toISOString();
    const snapshots = [...bySector.entries()].map(([sectorId, ctrl]) => {
      const act = activityBySector.get(sectorId) ?? {};
      return toSnapshotPayload(sectorId, computeSectorSnapshot(ctrl, act, now), act.lastAttackAt, nowIso);
    });
    const neutral = snapshots.filter((s) => s.owner_crew_id === null && s.owner_user_id === null).length;

    // 5. Upsert les secteurs actifs (idempotent : même entrée → même ligne).
    for (const batch of chunk(snapshots, UPSERT_CHUNK)) {
      const { error } = await supabase.from('sector_snapshot').upsert(batch, { onConflict: 'sector_id' });
      if (error) return json({ error: `sector_snapshot upsert: ${error.message}` }, 500);
    }

    // 6. Neutraliser les secteurs devenus VIDES (plus aucun claim non-décayé → sortis
    //    de la vue) : on retire leur snapshot pour ne pas montrer un ancien owner.
    //    Lecture PAGINÉE et ORDONNÉE, comme les deux autres sources : un simple
    //    `select` s'arrête à la limite PostgREST (1000). Au-delà, les snapshots
    //    obsolètes hors des 1000 premières lignes n'étaient jamais supprimés — et
    //    la carte continuait d'afficher un ancien propriétaire d'un secteur devenu
    //    vide. Exactement le mensonge que l'étape est censée empêcher.
    const activeIds = new Set(bySector.keys());
    let existing: { sector_id: string }[];
    try {
      existing = await readAllPaged<{ sector_id: string }>('sector_snapshot', 'sector_id', ['sector_id']);
    } catch (e) {
      return json({ error: `sector_snapshot scan: ${(e as Error).message}` }, 500);
    }
    const stale = existing.map((r) => r.sector_id).filter((id) => !activeIds.has(id));
    for (const batch of chunk(stale, UPSERT_CHUNK)) {
      const { error } = await supabase.from('sector_snapshot').delete().in('sector_id', batch);
      if (error) return json({ error: `sector_snapshot cleanup: ${error.message}` }, 500);
    }

    return json({
      ok: true,
      sectors: snapshots.length,
      // Secteurs écrits SANS propriétaire (aucun détenteur au-dessus du plancher) :
      // un état réel et attendu, pas un échec — visible pour ne pas se lire à l'envers.
      ownerless: neutral,
      neutralized: stale.length,
      sectorControlRefreshed,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
