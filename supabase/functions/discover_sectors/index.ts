/**
 * GRYD — Edge Function discover_sectors (job, AMENDEMENT-41 §1 : nommage serveur).
 *
 * Rattache les captures à leur SECTEUR (H3 res 7) et CRÉE + NOMME les secteurs
 * « wild » manquants — c'est ce qui rend la carte réelle PARTOUT en Europe, sans
 * toucher au chemin chaud d'ingest_run (aucun risque sur la soumission de course).
 *
 * Pipeline : auth cron secret → hex_claims où `sector_id IS NULL` (batch borné) →
 * res-7 parent de chaque hex → find-or-create du secteur (reverse-geocode Nominatim
 * + hiérarchie PURE `sectorNameFromAddress`, repli grille — JAMAIS un faux lieu) →
 * backfill `hex_claims.sector_id`. Le nommage rejoue la MÊME hiérarchie que le
 * client (§1). Le job `recompute_sectors` prend ensuite le relais pour le snapshot §C.
 *
 * Nommage borné + rate-limité (Nominatim ≈ 1 req/s) : au plus MAX_NEW_SECTORS
 * secteurs créés par run ; le reste au run suivant (leurs hexes restent non
 * rattachés, honnête). Idempotent : ne repasse jamais un hex déjà rattaché.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { cellToLatLng, cellToParent } from 'npm:h3-js@^4.1';
import { secretsMatch } from '../_shared/secret.ts';
import { sectorNameFromAddress, gridFallbackLabel, type SectorAddress } from '../_shared/sectorName.ts';
import { H3_RESOLUTION, SECTOR_H3_RESOLUTION } from '../_shared/game-rules.ts';

const CLAIM_BATCH = 2000; // hexes non rattachés lus par run (borne le travail)
const MAX_NEW_SECTORS = 20; // secteurs NOMMÉS créés par run (rate-limit Nominatim)
const NOMINATIM_GAP_MS = 1100; // politique Nominatim : ≤ 1 req/s
const GEOCODE_TIMEOUT_MS = 5000;
const UPDATE_CHUNK = 500;
/** Enfants res-10 d'un hex res-7 : aperture H3 = 7 (propriété fixe de H3, pas de jeu). */
const HEXES_PER_SECTOR = 7 ** (H3_RESOLUTION - SECTOR_H3_RESOLUTION); // 7^3 = 343
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const h3ToDb = (h3: string): string => BigInt(`0x${h3}`).toString();
const dbToH3 = (db: string | number): string => BigInt(db).toString(16);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Nom RÉEL du secteur à ce centre (Nominatim + hiérarchie), sinon repli grille. */
async function resolveName(lat: number, lng: number): Promise<string> {
  const fallback = gridFallbackLabel(lat, lng);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), GEOCODE_TIMEOUT_MS);
    const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GRYD/1.0 (sector naming)', Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const jsonBody = (await res.json()) as { address?: SectorAddress };
    return sectorNameFromAddress(jsonBody.address, fallback);
  } catch {
    return fallback; // réseau HS / timeout → repli grille (jamais un faux lieu)
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || !secretsMatch(req.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    // 1. Captures non rattachées à un secteur.
    const { data: claimRows, error: readErr } = await supabase
      .from('hex_claims')
      .select('h3index')
      .is('sector_id', null)
      .limit(CLAIM_BATCH);
    if (readErr) return json({ error: `hex_claims read: ${readErr.message}` }, 500);
    const claims = (claimRows ?? []) as { h3index: number | string }[];
    if (claims.length === 0) return json({ ok: true, scanned: 0, created: 0, attached: 0 });

    // 2. Regrouper les hexes par cellule res-7 parente.
    const parentToHexDb = new Map<string, string[]>(); // res7 h3 → [h3index db]
    for (const c of claims) {
      const h3 = dbToH3(c.h3index);
      const parent = cellToParent(h3, SECTOR_H3_RESOLUTION);
      const arr = parentToHexDb.get(parent) ?? [];
      arr.push(String(c.h3index));
      parentToHexDb.set(parent, arr);
    }

    // 3. Secteurs DÉJÀ existants pour ces cellules (seed Paris/Lille ou runs passés).
    const parents = [...parentToHexDb.keys()];
    const parentDbToSector = new Map<string, string>(); // center_h3_res7 db → sector id
    for (const batch of chunk(parents.map(h3ToDb), UPDATE_CHUNK)) {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, center_h3_res7')
        .in('center_h3_res7', batch);
      if (error) return json({ error: `sectors read: ${error.message}` }, 500);
      for (const s of (data ?? []) as { id: string; center_h3_res7: number | string }[]) {
        parentDbToSector.set(String(s.center_h3_res7), s.id);
      }
    }

    // 4. Créer + NOMMER les secteurs wild manquants (borné + rate-limité).
    let created = 0;
    for (const parent of parents) {
      const parentDb = h3ToDb(parent);
      if (parentDbToSector.has(parentDb)) continue; // existe déjà
      if (created >= MAX_NEW_SECTORS) break; // reste au run suivant (honnête)
      const [lat, lng] = cellToLatLng(parent);
      const name = await resolveName(lat, lng);
      const { data: ins, error: insErr } = await supabase
        .from('sectors')
        .insert({
          name,
          type: 'wild',
          center_h3_res7: parentDb,
          total_hexes: HEXES_PER_SECTOR,
          city_id: null,
        })
        .select('id')
        .single();
      if (insErr) {
        // Course/unicité : un autre run a pu créer le secteur → on le relit.
        const { data: again } = await supabase
          .from('sectors')
          .select('id')
          .eq('center_h3_res7', parentDb)
          .maybeSingle();
        if (again?.id) parentDbToSector.set(parentDb, again.id);
        continue;
      }
      if (ins?.id) {
        parentDbToSector.set(parentDb, ins.id);
        created += 1;
      }
      await sleep(NOMINATIM_GAP_MS); // politesse Nominatim
    }

    // 5. Backfill hex_claims.sector_id (par secteur → update .in()).
    const sectorToHexDb = new Map<string, string[]>();
    for (const [parent, hexes] of parentToHexDb.entries()) {
      const sectorId = parentDbToSector.get(h3ToDb(parent));
      if (!sectorId) continue; // secteur pas encore créé (cap atteint) → run suivant
      const arr = sectorToHexDb.get(sectorId) ?? [];
      arr.push(...hexes);
      sectorToHexDb.set(sectorId, arr);
    }
    let attached = 0;
    for (const [sectorId, hexes] of sectorToHexDb.entries()) {
      for (const batch of chunk(hexes, UPDATE_CHUNK)) {
        const { error } = await supabase
          .from('hex_claims')
          .update({ sector_id: sectorId })
          .in('h3index', batch);
        if (error) return json({ error: `hex_claims backfill: ${error.message}` }, 500);
        attached += batch.length;
      }
    }

    return json({ ok: true, scanned: claims.length, created, attached });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
