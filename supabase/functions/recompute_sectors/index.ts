/**
 * GRYD — Edge Function recompute_sectors (job, AMENDEMENT-41 §2 / §C).
 *
 * Pipeline : auth cron secret → refresh `sector_control` (vue matérialisée source)
 * → lecture des lignes (secteur, crew, %) → `computeSectorSnapshot` (MOTEUR PUR
 * engine/sectorSnapshot) par secteur → upsert `sector_snapshot` (owner/rival/neutre
 * + pressure_score + statut §C) → neutralisation des secteurs devenus vides (claims
 * décayés → sortis de la vue → on retire leur snapshot obsolète, pas de mensonge).
 *
 * Ce fichier ne fait que de l'I/O ; toute la dérivation §C vit dans le moteur.
 * Signaux d'activité (last_attack_at, reprises rivales) = non encore câblés (MVP) :
 * la pression vient donc du seul équilibre owner↔rival — honnête, pas fabriqué.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { secretsMatch } from '../_shared/secret.ts';
import {
  computeSectorSnapshot,
  type SectorActivity,
  type SectorControlRow,
} from '../_shared/engine/sectorSnapshot.ts';

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

interface ControlRow {
  sector_id: string;
  crew_id: string;
  control_percent: number | string;
}

/** Lit TOUTES les lignes de sector_control (paginé — la vue peut dépasser 1000). */
async function readAllControl(): Promise<ControlRow[]> {
  const all: ControlRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('sector_control')
      .select('sector_id, crew_id, control_percent')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`sector_control read: ${error.message}`);
    const rows = (data ?? []) as ControlRow[];
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
    // 1. Rafraîchir la source (mêmes données fraîches que decay_job).
    const { error: refErr } = await supabase.rpc('refresh_sector_control');
    if (refErr) return json({ error: `refresh_sector_control: ${refErr.message}` }, 500);

    // 2. Lire + grouper par secteur.
    const rows = await readAllControl();
    const bySector = new Map<string, SectorControlRow[]>();
    for (const r of rows) {
      const arr = bySector.get(r.sector_id) ?? [];
      arr.push({ crewId: r.crew_id, controlPercent: Number(r.control_percent) });
      bySector.set(r.sector_id, arr);
    }

    // 3. Signaux d'ACTIVITÉ par secteur (vue sector_activity, 0040) : vols récents +
    //    decay imminent → nourrissent pression/statut (attaque active, urgence…).
    const activityBySector = new Map<string, SectorActivity>();
    {
      const { data: acts, error: actErr } = await supabase
        .from('sector_activity')
        .select('sector_id, zones_lost_recent, rival_reclaimed_24h, last_attack_at, decay_fraction');
      if (actErr) return json({ error: `sector_activity read: ${actErr.message}` }, 500);
      for (const a of (acts ?? []) as Array<{
        sector_id: string;
        zones_lost_recent: number;
        rival_reclaimed_24h: number;
        last_attack_at: string | null;
        decay_fraction: number | string;
      }>) {
        activityBySector.set(a.sector_id, {
          zonesLostRecent: Number(a.zones_lost_recent) || 0,
          rivalReclaimed24h: Number(a.rival_reclaimed_24h) || 0,
          decayFraction: Number(a.decay_fraction) || 0,
          lastAttackAt: a.last_attack_at ? new Date(a.last_attack_at) : null,
        });
      }
    }

    // 4. Snapshot §C par secteur (moteur pur) + activité réelle.
    const now = new Date();
    const nowIso = now.toISOString();
    const snapshots = [...bySector.entries()].map(([sector_id, ctrl]) => {
      const act = activityBySector.get(sector_id) ?? {};
      const s = computeSectorSnapshot(ctrl, act, now);
      return {
        sector_id,
        owner_crew_id: s.ownerCrewId,
        owner_percent: s.ownerPercent,
        top_rival_crew_id: s.topRivalCrewId,
        top_rival_percent: s.topRivalPercent,
        neutral_percent: s.neutralPercent,
        pressure_score: s.pressureScore,
        status_level: s.statusLevel,
        contested: s.contested,
        last_attack_at: act.lastAttackAt ? act.lastAttackAt.toISOString() : null,
        updated_at: nowIso,
      };
    });

    // 5. Upsert les secteurs actifs.
    for (const batch of chunk(snapshots, UPSERT_CHUNK)) {
      const { error } = await supabase.from('sector_snapshot').upsert(batch, { onConflict: 'sector_id' });
      if (error) return json({ error: `sector_snapshot upsert: ${error.message}` }, 500);
    }

    // 6. Neutraliser les secteurs devenus VIDES (plus aucun claim non-décayé → sortis
    //    de la vue) : on retire leur snapshot pour ne pas montrer un ancien owner.
    const activeIds = new Set(bySector.keys());
    const { data: existing, error: exErr } = await supabase.from('sector_snapshot').select('sector_id');
    if (exErr) return json({ error: `sector_snapshot scan: ${exErr.message}` }, 500);
    const stale = (existing ?? [])
      .map((r) => (r as { sector_id: string }).sector_id)
      .filter((id) => !activeIds.has(id));
    for (const batch of chunk(stale, UPSERT_CHUNK)) {
      const { error } = await supabase.from('sector_snapshot').delete().in('sector_id', batch);
      if (error) return json({ error: `sector_snapshot cleanup: ${error.message}` }, 500);
    }

    return json({ ok: true, sectors: snapshots.length, neutralized: stale.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
