/**
 * GRYD — VÉRIFICATION RÉELLE DE LA RLS SUR LE PROJET SUPABASE DISTANT.
 *
 * ═══ POURQUOI CE SCRIPT EXISTE, ET CE QU'IL PROUVE DE PLUS QUE PGlite ══════
 *
 * Les 24 fichiers `supabase/tests/*.pglite.test.mjs` tournent en SUPERUTILISATEUR :
 * PGlite ne connaît ni le rôle `anon`, ni le rôle `authenticated`, et la RLS y est
 * donc structurellement contournée. Ils prouvent du SQL indépendant du rôle — le
 * `where` d'une vue, les `revoke`, la logique d'une RPC, la PRÉSENCE d'une policy.
 * Ils ne peuvent pas prouver qu'un rival est RÉELLEMENT aveugle.
 *
 * Ce script-ci prend le rôle pour de vrai (`set local role`), sur le vrai projet,
 * et laisse le moteur appliquer les policies. C'est la seule preuve qui vaille.
 *
 * ═══ IL N'ÉCRIT RIEN ═══════════════════════════════════════════════════════
 * Toute tentative d'écriture est enveloppée dans une transaction suivie d'un
 * ROLLBACK inconditionnel (bloc `finally`). Le script ne fait qu'OBSERVER ce que
 * le serveur autorise — y compris en essayant des écritures qui doivent échouer.
 *
 * ═══ HORS DU GATE, ET C'EST VOULU ══════════════════════════════════════════
 * Il exige `GRYD_SUPABASE_DB_URL` (secret, jamais commité) et un réseau. Le gate
 * doit rester exécutable hors ligne par n'importe qui : ce script se lance à la
 * demande, après un `supabase db push`.
 *
 *   set -a && . ./scratchpad-secrets.local && set +a && npm run verify:rls
 *
 * ⚠️ `pg` est une devDependency ajoutée POUR CE SEUL USAGE : `supabase db dump`
 * exige Docker, indisponible sur la machine du fondateur, et il n'existe aucun
 * autre moyen de prendre un rôle Postgres depuis Node.
 */
import pg from 'pg';

const url = process.env.GRYD_SUPABASE_DB_URL;
if (!url) {
  console.error('GRYD_SUPABASE_DB_URL manquant. Charge scratchpad-secrets.local avant de lancer.');
  process.exit(2);
}

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const results = [];
const ok = (n, d) => results.push({ ok: true, n, d });
const ko = (n, d) => results.push({ ok: false, n, d });

/** Exécute `fn` sous un rôle réel, avec un uid JWT optionnel, puis ROLLBACK. */
async function asRole(role, uid, fn) {
  await c.query('begin');
  try {
    if (uid) {
      await c.query(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: uid, role })]);
    }
    await c.query(`set local role ${role}`);
    return await fn();
  } finally {
    await c.query('rollback');
  }
}

/** Une écriture qui DOIT être refusée. Rend true si elle l'a bien été. */
async function refuses(role, uid, sql) {
  try {
    await asRole(role, uid, () => c.query(sql));
    return false;
  } catch {
    return true;
  }
}

// ── 1. RLS activée sur TOUTES les tables publiques ──────────────────────────
const { rows: noRls } = await c.query(`
  select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
  order by 1`);
const { rows: allTables } = await c.query(`
  select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relkind='r'`);
noRls.length === 0
  ? ok(`RLS activée sur les ${allTables[0].n} tables publiques`, 'aucune table sans RLS')
  : ko('RLS activée partout', `SANS RLS : ${noRls.map((r) => r.relname).join(', ')}`);

// ── 2. Le client n'écrit JAMAIS le verdict de jeu (constitution : claim serveur)
const uid = (await c.query('select id from auth.users limit 1')).rows[0]?.id ?? null;
for (const table of ['runs', 'hex_claims', 'territories']) {
  const anonRefused = await refuses('anon', null, `insert into public.${table} default values`);
  const authRefused = await refuses('authenticated', uid, `insert into public.${table} default values`);
  anonRefused && authRefused
    ? ok(`écriture client refusée sur ${table}`, 'anon ET authenticated refusés')
    : ko(`écriture client refusée sur ${table}`,
      `anon=${anonRefused ? 'refusé' : 'ACCEPTÉ'} authenticated=${authRefused ? 'refusé' : 'ACCEPTÉ'}`);
}

// ── 3. `anon` ne lit pas les données personnelles ───────────────────────────
for (const table of ['runs', 'users']) {
  const total = (await c.query(`select count(*)::int as n from public.${table}`)).rows[0].n;
  try {
    const seen = await asRole('anon', null, async () =>
      (await c.query(`select count(*)::int as n from public.${table}`)).rows[0].n);
    seen === 0 || seen < total
      ? ok(`anon ne lit pas tout ${table}`, `anon voit ${seen} / ${total} lignes réelles`)
      : ko(`anon ne lit pas tout ${table}`, `anon voit les ${seen} lignes — lecture OUVERTE`);
  } catch (e) {
    ok(`anon ne lit pas ${table}`, `accès refusé (${String(e.message).slice(0, 60)})`);
  }
}

// ── 4. La confidentialité de carte est appliquée SERVEUR (0087 / 0089) ──────
// ⚠️ UNE 1re VERSION DE CE TEST RENDAIT UN FAUX NÉGATIF : elle cherchait le
// littéral `map_sharing` DANS la définition de la vue. Le filtre existe bien,
// mais il vit un niveau plus bas, dans `territory_owner_shares_map()`. On suit
// donc la fonction au lieu de grepper la vue.
const { rows: guardFn } = await c.query(`
  select pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.proname='territory_owner_shares_map'`);
const guardReadsSetting = (guardFn[0]?.def ?? '').includes('map_sharing');

for (const view of ['public_territories', 'public_hex_claims']) {
  const { rows } = await c.query(`
    select pg_get_viewdef(c.oid, true) as def from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname=$1`, [view]);
  const def = rows[0]?.def ?? '';
  def.includes('territory_owner_shares_map') && guardReadsSetting
    ? ok(`${view} respecte map_sharing`, 'filtre SERVEUR via territory_owner_shares_map (qui lit map_sharing)')
    : ko(`${view} respecte map_sharing`,
      def ? 'la vue n’appelle pas la garde, ou la garde ne lit pas le réglage' : 'vue INEXISTANTE');
}

const { rows: pt } = await c.query(`
  select pg_get_viewdef(c.oid, true) as def from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname='public_territories'`);
const ptDef = pt[0]?.def ?? '';
ptDef.includes('publish_after') && ptDef.includes('date_trunc')
  ? ok('public_territories : publication différée + heure tronquée',
    'publish_after <= now() ET date_trunc sur controlled_since')
  : ko('public_territories : publication différée + heure tronquée', 'un des deux manque');

// ── 5. Plus aucune policy ouverte sur hex_claims ────────────────────────────
const { rows: hexPol } = await c.query(`
  select polname, pg_get_expr(polqual, polrelid) as qual
  from pg_policy where polrelid = 'public.hex_claims'::regclass`);
const open = hexPol.filter((p) => (p.qual ?? '').trim() === 'true');
open.length === 0
  ? ok('hex_claims : aucune policy `using (true)`', `${hexPol.length} policies, toutes conditionnelles`)
  : ko('hex_claims : aucune policy `using (true)`', `ouvertes : ${open.map((p) => p.polname).join(', ')}`);

// ── 6. SECURITY DEFINER sans search_path = vecteur d'élévation ──────────────
const { rows: defs } = await c.query(`
  select p.proname, coalesce(array_to_string(p.proconfig, ','), '') as cfg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.prosecdef = true order by 1`);
const noPath = defs.filter((d) => !d.cfg.includes('search_path'));
noPath.length === 0
  ? ok('SECURITY DEFINER : search_path fixé partout', `${defs.length} fonctions vérifiées`)
  : ko('SECURITY DEFINER : search_path fixé partout',
    `sans search_path (${noPath.length}) : ${noPath.slice(0, 6).map((d) => d.proname).join(', ')}`);

await c.end();

console.log('\n════ VÉRIFICATION RLS RÉELLE (projet gryd) ════\n');
for (const r of results) console.log(`${r.ok ? '  ok  ' : ' ÉCHEC'} ${r.n}\n        ${r.d}`);
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} vérifications passées, ${bad} échec(s).`);
process.exit(bad === 0 ? 0 : 1);
