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


// ═══════════════════════════════════════════════════════════════════════════
// AUDIT DE SÉCURITÉ DU 10/09/2026 — les sept vérifications ci-dessous ont été
// ajoutées APRÈS avoir trouvé, en production, trois trous que les onze
// premières ne voyaient pas : une RPC premium ouverte à l'anonyme, une fonction
// orpheline qui contournait la RLS, et 68 tables où `anon` détenait TRUNCATE.
// Elles couvrent la refonte 2026 (36 tables) et deviennent le garde-fou du
// défaut de privilège Supabase, que `ALTER DEFAULT PRIVILEGES` ne sait pas
// refermer seul (Postgres fusionne toujours le grant PUBLIC d'`acldefault`).
// ═══════════════════════════════════════════════════════════════════════════

// ── 7. Les 36 tables de la refonte 2026 sont fermées au client ──────────────
// Une table 2026 ne s'écrit QUE par une RPC `security definer`. On vérifie le
// privilège au catalogue (INSERT/UPDATE/DELETE) : c'est plus fort qu'un essai,
// parce qu'un essai qui échoue peut échouer pour une contrainte, pas pour un
// droit.
const { rows: tables2026 } = await c.query(`
  select c.relname,
    has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
    has_table_privilege('authenticated', c.oid, 'INSERT') as ins,
    has_table_privilege('authenticated', c.oid, 'UPDATE') as upd,
    has_table_privilege('authenticated', c.oid, 'DELETE') as del,
    c.relrowsecurity as rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like '%2026%'
  order by 1`);
const writable2026 = tables2026.filter((t) => t.ins || t.upd || t.del);
const anonReadable2026 = tables2026.filter((t) => t.anon_select);
const noRls2026 = tables2026.filter((t) => !t.rls);
writable2026.length === 0 && anonReadable2026.length === 0 && noRls2026.length === 0
  ? ok(`refonte 2026 : ${tables2026.length} tables fermées au client`,
    'aucune écriture cliente, aucune lecture anon, RLS partout')
  : ko('refonte 2026 : tables fermées au client',
    [writable2026.length ? `ÉCRITURE : ${writable2026.map((t) => t.relname).join(', ')}` : '',
      anonReadable2026.length ? `LECTURE anon : ${anonReadable2026.map((t) => t.relname).join(', ')}` : '',
      noRls2026.length ? `SANS RLS : ${noRls2026.map((t) => t.relname).join(', ')}` : ''
    ].filter(Boolean).join(' | '));

// ── 8. La trace GPS brute ne se lit QUE par son propriétaire ───────────────
// Deux exigences, pas une : les tables de géométrie de capture n'ont AUCUNE
// lecture cliente ; `runs` — qui porte `trace_points_2026`, la trace brute —
// reste lisible par son auteur et par personne d'autre. La deuxième se prouve
// sur les POLICIES : un `using (true)` ou une policy visant `anon`/`public`
// suffirait à publier des itinéraires domicile-travail.
const geoOpen = [];
for (const table of ['capture_events_2026', 'ownership_2026', 'recording_sessions_2026']) {
  const { rows } = await c.query(
    `select has_table_privilege('anon', $1::regclass, 'SELECT') as a,
            has_table_privilege('authenticated', $1::regclass, 'SELECT') as u`, [`public.${table}`]);
  if (rows[0].a || rows[0].u) geoOpen.push(table);
}
const { rows: runsPolicies } = await c.query(`
  select array_to_string(p.polroles::regrole[]::text[], ',') as roles,
         coalesce(pg_get_expr(p.polqual, p.polrelid), '') as qual
  from pg_policy p where p.polrelid = 'public.runs'::regclass and p.polcmd in ('r', '*')`);
const runsLeaks = runsPolicies.filter((p) =>
  p.qual.trim() === 'true' || /(^|,)(anon|public|-)(,|$)/.test(p.roles) || !/auth\.uid\(\)/.test(p.qual));
geoOpen.length === 0 && runsPolicies.length > 0 && runsLeaks.length === 0
  ? ok('trace GPS brute : propriétaire uniquement',
    `capture_events_2026 / ownership_2026 / recording_sessions_2026 fermées ; runs : ${runsPolicies.length} policy(ies), toutes en auth.uid()`)
  : ko('trace GPS brute : propriétaire uniquement',
    [geoOpen.length ? `LISIBLES : ${geoOpen.join(', ')}` : '',
      runsPolicies.length === 0 ? 'runs n’a AUCUNE policy de lecture' : '',
      runsLeaks.length ? `runs : policy non restreinte au propriétaire (${runsLeaks.map((p) => p.roles).join(', ')})` : ''
    ].filter(Boolean).join(' | '));

// ── 9. Aucune fonction ouverte à l'anonyme hors de cette liste ──────────────
// LE GARDE-FOU CENTRAL. Supabase accorde EXECUTE à `anon` sur toute fonction
// créée dans `public` ; une migration qui oublie son `revoke` ouvre une porte
// sans que personne ne le voie. Cette liste est la SEULE réponse acceptable :
// des helpers purs (aucune donnée), plus trois surfaces publiques assumées.
// Toute autre fonction exécutable par `anon` fait ÉCHOUER ce script.
const ANON_ALLOWED = new Set([
  // Helpers purs — ne lisent aucune table.
  '_free_feature_keys', 'commune_norm', 'gryd_dept_of_insee', 'gryd_geo_bucket',
  'moderation_has_invisible', 'moderation_invisible_class', 'moderation_mixed_scripts',
  'search_communes', 'territory_state_is_controlled',
  // Surfaces publiques assumées.
  'peek_crew_invite',              // aperçu d'invitation : exige 130 bits de jeton
  'waitlist_join',                 // formulaire de la landing
  'get_commercial_collections_2026', // catalogue de collections, aucune donnée perso
]);
const { rows: anonFns } = await c.query(`
  select p.proname, p.prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
  order by 1`);
const intruders = anonFns.filter((f) => !ANON_ALLOWED.has(f.proname));
intruders.length === 0
  ? ok(`fonctions ouvertes à anon : ${anonFns.length}, toutes voulues`,
    [...ANON_ALLOWED].join(', '))
  : ko('fonctions ouvertes à anon : liste close',
    `HORS LISTE (${intruders.length}) : ${intruders.map((f) => f.proname + (f.prosecdef ? ' [SECURITY DEFINER]' : '')).join(', ')}`);

// ── 10. `sync_club_entitlements` ne s'atteint plus depuis un téléphone ──────
// Elle accorde cinq droits premium PERMANENTS à l'identifiant qu'on lui passe
// et n'a jamais lu `auth.uid()`. Deux barrières attendues : le privilège, puis
// une garde interne. L'appel d'essai vise un UUID INEXISTANT : même si la garde
// tombait, la clé étrangère refuserait l'écriture — et la transaction est de
// toute façon annulée.
{
  const target = '00000000-0000-4000-8000-0000000000ff';
  const call = `select public.sync_club_entitlements('${target}'::uuid, true)`;
  const priv = (await c.query(`
    select has_function_privilege('anon', 'public.sync_club_entitlements(uuid,boolean)', 'EXECUTE') as a,
           has_function_privilege('authenticated', 'public.sync_club_entitlements(uuid,boolean)', 'EXECUTE') as u`)).rows[0];
  let anonCode = null;
  try { await asRole('anon', null, () => c.query(call)); } catch (e) { anonCode = e.code ?? 'error'; }
  !priv.a && !priv.u && anonCode === '42501'
    ? ok('sync_club_entitlements : hors de portée du client',
      'privilège retiré à anon ET authenticated, appel anon refusé (42501)')
    : ko('sync_club_entitlements : hors de portée du client',
      `anon=${priv.a ? 'PEUT' : 'non'} authenticated=${priv.u ? 'PEUT' : 'non'} appel anon → ${anonCode ?? 'ACCEPTÉ'}` +
      (anonCode === '23503' ? ' (23503 = le corps a tourné : anti-pay-to-win contourné)' : ''));
}

// ── 11. TRUNCATE / REFERENCES / TRIGGER retirés aux rôles clients ───────────
// TRUNCATE ignore la RLS. PostgREST ne sait pas l'émettre : ce n'est donc pas
// une porte, c'est un multiplicateur de dégâts pour n'importe quelle autre
// faille. Il n'a aucune raison d'exister.
const { rows: overGrants } = await c.query(`
  select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and (has_table_privilege('anon', c.oid, 'TRUNCATE') or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
      or has_table_privilege('anon', c.oid, 'REFERENCES') or has_table_privilege('authenticated', c.oid, 'REFERENCES'))`);
overGrants[0].n === 0
  ? ok('aucun TRUNCATE/REFERENCES pour anon ou authenticated', 'privilèges inutiles retirés')
  : ko('aucun TRUNCATE/REFERENCES pour anon ou authenticated',
    `${overGrants[0].n} tables portent encore ces privilèges`);

// ── 12. Aucune vue matérialisée lisible par un client ───────────────────────
// Une vue MATÉRIALISÉE n'a PAS de RLS : ses lignes sortent telles quelles. En
// accorder la lecture à `authenticated`, c'est publier un agrégat que personne
// ne filtre plus.
const { rows: matviews } = await c.query(`
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'm'
    and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT'))
  order by 1`);
matviews.length === 0
  ? ok('aucune vue matérialisée lisible par anon/authenticated', 'la RLS ne s’y applique pas — elles restent service')
  : ko('aucune vue matérialisée lisible par anon/authenticated',
    `LISIBLES (la RLS ne s’y applique pas) : ${matviews.map((m) => m.relname).join(', ')}`);

// ── 13. Aucune fonction en base qui ne vienne d'une migration ───────────────
// `hex_claims_for_city` vivait en prod sans exister dans le dépôt : poussée par
// une branche Cursor abandonnée, puis renumérotée hors de la ligne. Un objet
// qu'aucune migration ne décrit est un objet que personne ne relit.
{
  const { readdirSync, readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
  const sql = readdirSync(dir).filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
  const { rows: fns } = await c.query(`
    select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' order by 1`);
  // Un `drop function if exists` NOMME la fonction sans la créer : chercher le
  // simple nom rendrait vert un orphelin que 0129 se contente de supprimer.
  // On exige une instruction de CRÉATION.
  const created = (name) =>
    new RegExp(`create\\s+(or\\s+replace\\s+)?function\\s+(public\\.)?${name}\\s*\\(`, 'i').test(sql);
  const orphans = fns.map((f) => f.proname).filter((name) => !created(name));
  orphans.length === 0
    ? ok(`${fns.length} fonctions publiques, toutes décrites par une migration`, 'aucune dérive de schéma')
    : ko('fonctions publiques toutes décrites par une migration',
      `ORPHELINES : ${orphans.join(', ')}`);
}

await c.end();

console.log('\n════ VÉRIFICATION RLS RÉELLE (projet gryd) ════\n');
for (const r of results) console.log(`${r.ok ? '  ok  ' : ' ÉCHEC'} ${r.n}\n        ${r.d}`);
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} vérifications passées, ${bad} échec(s).`);
process.exit(bad === 0 ? 0 : 1);
