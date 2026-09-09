#!/usr/bin/env node
/**
 * GRYD — « Ta commune, cette semaine » : migrations 0160 → 0164 (ADR-013 §2.1).
 *
 * ═══ CE QUE CE FICHIER PROUVE ══════════════════════════════════════════════
 *  0. LE DÉFAUT EXISTAIT. Avant 0160, un classement de commune était
 *     structurellement IMPOSSIBLE : le `check` de 0082 refuse le mot
 *     « commune », aucune des cinq fonctions n'existe, aucun job ne tourne, et
 *     les deux tables de snapshots sont vides depuis le 28/07/2026.
 *  1. Les cinq migrations s'appliquent par-dessus la LIGNÉE RÉELLE 0002 → 0128
 *     (celle qui est en production), sans créer une seule ligne.
 *  2. Le miroir SQL des règles est IDENTIQUE à `LEADERBOARD_RULES_2026`
 *     (packages/shared/src/game-rules.ts) — champ par champ, lu dans le fichier.
 *  3. La semaine est lundi 00:00 → dimanche 23:59 à PARIS, heure d'été comprise.
 *  4. Les six exclusions d'ADR-013 : `pending` ne compte pas, un discret
 *     n'apparaît pas, un non-consentement sort, une carte non partagée sort, un
 *     compte supprimé sort, et COURSE ET VÉLO NE SE MÉLANGENT JAMAIS.
 *  5. Sous `minRankedSubjects`, la RPC ne rend PAS de classement — et ce n'est
 *     ni « vide » ni « en panne » : c'est un état nommé.
 *  6. Le rang est celui du moteur pur : mêmes règles, mêmes cas.
 *  7. Le preneur de snapshot n'appelle JAMAIS `rebuild_ownership_2026`
 *     (vérifié sur le TEXTE des fonctions, pas sur une promesse de docblock).
 *  8. Les privilèges : `anon` ne lit rien, le preneur est service_role, et les
 *     tableaux 2026 ne se lisent pas en direct (policy RESTRICTIVE).
 *
 * ═══ CE QU'IL NE PROUVE PAS, DIT ICI PLUTÔT QUE LAISSÉ CROIRE ══════════════
 *  · L'AIRE. PGlite n'a pas PostGIS. `board_source_metrics_2026` est écrite en
 *    plpgsql exprès pour que la migration S'APPLIQUE sans PostGIS tout en
 *    refusant de S'EXÉCUTER ; ici, elle est REMPLACÉE par une table de mesures
 *    fournie (§6). Aucune intersection commune × événement, aucun `ST_Area`
 *    n'est exécuté par ce fichier. La preuve spatiale vit dans
 *    `leaderboard_2026.postgis.test.mjs`, qui exige un PostgreSQL/PostGIS local
 *    et sort en 2 quand il n'y en a pas — jamais en vert.
 *  · L'EFFET DES POLICIES. PGlite tourne en SUPERUTILISATEUR : on vérifie que
 *    les policies EXISTENT, ce qu'elles NOMMENT et que les privilèges sont
 *    absents du catalogue — pas qu'un tiers se fasse refuser.
 *  · L'ÉQUIVALENCE AVEC LE MOTEUR n'est pas prouvée par un appel croisé :
 *    importer `packages/engine/src/leaderboard.ts` depuis Node dépendrait du
 *    strip-types de Node ≥ 22.18, et une preuve qui ne tourne pas partout n'est
 *    pas une preuve. Elle est prouvée par IDENTITÉ DES CAS : les scénarios de
 *    §6 sont ceux de `packages/engine/src/leaderboard.test.ts` (« hebdo — … »),
 *    rejoués en SQL. Si les deux implémentations divergent, une des deux suites
 *    rougit.
 *
 * ═══ LES QUATRE SUBSTITUTIONS DU SOCLE, ET POURQUOI ELLES SONT HONNÊTES ════
 * La lignée est rejouée TELLE QUELLE sauf :
 *   · `cron` — schéma bouchon qui ENREGISTRE les jobs au lieu de les planifier.
 *     Sans lui, cinq migrations tomberaient ; avec lui, on peut VÉRIFIER que
 *     0163 pose bien un job horaire, ce qu'aucun test ne faisait jusqu'ici.
 *   · `storage` — deux tables vides pour 0124 (avatars). Hors sujet ici.
 *   · `extensions.gen_random_bytes` — un octet aléatoire, comme pgcrypto.
 *   · 0118 : le TYPE `geometry` devient `text` et les index GiST sautent. Rien
 *     d'autre n'est touché — mêmes colonnes, mêmes `check`, mêmes RLS, mêmes
 *     fonctions. C'est la seule façon d'avoir les VRAIES tables de capture sans
 *     PostGIS, et c'est aussi pourquoi ce fichier ne mesure aucune aire.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const GAME_RULES = join(HERE, '..', '..', 'packages', 'shared', 'src', 'game-rules.ts');

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(
    'NON EXÉCUTÉ — PGlite est introuvable. Ce test n’a rien vérifié ;\n' +
      `ne le comptez pas comme vert (sortie 2, jamais 0).\n  cause : ${err.message}`,
  );
  process.exit(2);
}

// ─── Micro-harnais ──────────────────────────────────────────────────────────
let passed = 0;
const failures = [];
const t = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
};
const ok = (cond, what) => { if (!cond) throw new Error(what); };
const rejects = async (sql, params, needle, what) => {
  try {
    await db.query(sql, params);
  } catch (err) {
    if (!String(err.message).includes(needle)) {
      throw new Error(`${what} : refusé, mais pour une autre raison — « ${err.message} »`);
    }
    return;
  }
  throw new Error(`${what} : ACCEPTÉ alors qu'il devait être refusé`);
};

const db = new PGlite();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
// Le numéro est EN TÊTE de l'uuid : `handle_new_user` (0028) dérive le pseudo
// des 12 premiers caractères hexadécimaux, et des identifiants qui ne diffèrent
// qu'à la fin produiraient tous le même pseudo — collision d'unicité.
const id = (n) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const as = async (n) => db.query("select set_config('request.jwt.claim.sub',$1,false)", [n === null ? '' : id(n)]);
const defined = (signature) => `to_regprocedure('public.${signature}') is not null`;

// ─── Le socle Supabase, et les bouchons nommés dans l'en-tête ───────────────
await db.exec(`
  set time zone 'UTC';
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
  create schema extensions;
  create function extensions.gen_random_bytes(int) returns bytea language sql as $$ select decode(md5(random()::text),'hex') $$;
  create schema cron;
  create table cron.job(jobid bigserial primary key, jobname text unique, schedule text, command text);
  create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
    insert into cron.job(jobname,schedule,command) values(p_name,p_schedule,p_command)
    on conflict(jobname) do update set schedule=excluded.schedule, command=excluded.command returning jobid $$;
  create function cron.unschedule(p_name text) returns boolean language sql as $$ delete from cron.job where jobname=p_name returning true $$;
  create schema storage;
  create table storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

/** 0118 sans PostGIS : le TYPE change, la migration reste la vraie (en-tête §4). */
const withoutPostgis = (sql) =>
  sql
    .replaceAll('extensions.geometry(MultiPolygon,4326)', 'text')
    .replace(
      'declare r public.runs; f jsonb; m jsonb; g geometry; mask geometry;\n  exclusions geometry;',
      'declare r public.runs; f jsonb; m jsonb; g text; mask text;\n  exclusions text;',
    )
    .replace(
      'declare e public.capture_events_2026; mine geometry; all_owned geometry; empty_geom geometry; visited geometry; fresh geometry;',
      'declare e public.capture_events_2026; mine text; all_owned text; empty_geom text; visited text; fresh text;',
    )
    .split('\n')
    .filter((line) => !/using gist\(/.test(line))
    .join('\n');

// `pgcrypto` (0001) et la publication realtime (0020) sont hors schéma ; les
// trois migrations de cron créent l'EXTENSION, que PGlite n'a pas — leurs jobs
// ne concernent pas ce lot.
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
// Borne HAUTE : la lignée de PRODUCTION s'arrête à 0128 (vérifié le 09/09/2026).
// D'autres lots déposent 0129+ en parallèle ; ce test répond de sa propre
// lignée, il ne doit pas rougir parce qu'un voisin a livré.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 128)
  .sort()
  .filter((f) => !SKIP.has(f));

for (const file of LINEAGE) {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  try {
    await db.exec(file.startsWith('0118_') ? withoutPostgis(raw) : raw);
  } catch (err) {
    console.error(`\nSOCLE CASSÉ : la migration ${file} n’a pas pu s’appliquer.\n  ${err.message}`);
    process.exit(1);
  }
}

console.log('leaderboard_2026 — « Ta commune, cette semaine » (ADR-013 §2.1) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0128)\n`);

// ════════════════════════════════════════════════════════════════════════════
// 0. LE DÉFAUT EXISTAIT
// ════════════════════════════════════════════════════════════════════════════
console.log('ÉTAPE 0 — ce qui manquait avant 0160\n');

await t('étape 0 — aucune des cinq fonctions du classement n’existe', async () => {
  for (const signature of [
    'leaderboard_rules_2026()',
    'leaderboard_week_bounds_2026(timestamptz)',
    'board_scope_communes_2026(text,text)',
    'board_eligible_events_2026(text,timestamptz,timestamptz)',
    'board_source_metrics_2026(text,text,text,timestamptz,timestamptz)',
    'take_leaderboard_snapshot_2026(text,text,text,timestamptz)',
    'take_active_leaderboard_snapshots_2026(timestamptz)',
    'read_leaderboard_2026(text,text,text)',
    'my_leaderboard_scopes_2026(text)',
  ]) {
    eq(await one(`select ${defined(signature)}`), false, `${signature} existait déjà`);
  }
});

await t('étape 0 — le mot « commune » est REFUSÉ par le check de 0082', async () => {
  // C'est la preuve la plus dure du défaut : même en écrivant le snapshot à la
  // main, on ne pouvait pas enregistrer un classement de commune.
  await rejects(
    `insert into public.leaderboard_snapshots(period,scope,scope_ref,activity,subject_type,period_start,period_end,taken_at)
     values('weekly','commune','insee-76540','run','user',now(),now()+interval '7 days',now())`,
    [],
    'leaderboard_snapshots_scope_check',
    'la portée « commune » était déjà acceptée',
  );
});

await t('étape 0 — ni le compte de sujets ni la mesure qui classe n’ont de colonne', async () => {
  const cols = await q(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name='leaderboard_snapshots' and column_name in ('subjects_count','metric')`,
  );
  eq(cols, [], 'les colonnes de 0160 existaient déjà');
});

await t('étape 0 — les tables de 0082 sont VIDES : aucun écrivain depuis le 28/07/2026', async () => {
  eq(await one('select count(*)::int from public.leaderboard_snapshots'), 0, 'des snapshots préexistaient');
  eq(await one('select count(*)::int from public.leaderboard_entries'), 0, 'des lignes préexistaient');
});

await t('étape 0 — la policy de 0082 aurait ouvert un tableau 2026 à TOUT compte', async () => {
  const policies = await q(
    `select policyname, permissive from pg_policies
     where schemaname='public' and tablename='leaderboard_snapshots' order by policyname`,
  );
  eq(
    policies,
    [{ policyname: 'leaderboard_snapshots_select_visible', permissive: 'PERMISSIVE' }],
    'une policy restrictive existait déjà',
  );
});

await t('étape 0 — aucun job ne prend de snapshot de classement', async () => {
  eq(await one("select count(*)::int from cron.job where jobname like '%leaderboard%'"), 0, 'un job existait déjà');
});

// ════════════════════════════════════════════════════════════════════════════
// 1. LES CINQ MIGRATIONS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n0160 → 0164\n');

const LOT = [
  '0160_leaderboard_2026_scopes.sql',
  '0161_leaderboard_2026_source_metrics.sql',
  '0162_leaderboard_2026_snapshot_taker.sql',
  '0163_leaderboard_2026_hourly_job.sql',
  '0164_leaderboard_2026_read.sql',
];
let lotError = null;
for (const file of LOT) {
  try {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  } catch (err) {
    lotError = new Error(`${file} : ${err.message}`);
    break;
  }
}

await t('les cinq migrations s’appliquent sur la lignée réelle, telles quelles', () => {
  if (lotError) throw lotError;
});

await t('elles ne créent AUCUNE ligne — une table vide ne ment à personne', async () => {
  eq(await one('select count(*)::int from public.leaderboard_snapshots'), 0, 'un snapshot a été semé');
  eq(await one('select count(*)::int from public.leaderboard_entries'), 0, 'une ligne a été semée');
});

await t('aucune fonction du lot ne peut déclencher rebuild_ownership_2026 (ADR-013 §4)', async () => {
  // `rebuild_ownership_2026(` — la forme APPELÉE. Les docblocks du lot citent
  // la fonction par son nom pour dire qu'ils ne l'appellent pas : c'est une
  // phrase, pas un appel, et les distinguer est tout l'intérêt du test.
  for (const file of LOT) {
    const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
    ok(!raw.includes('rebuild_ownership_2026('), `${file} appelle rebuild_ownership_2026`);
  }
  for (const signature of [
    'take_leaderboard_snapshot_2026(text,text,text,timestamptz)',
    'take_active_leaderboard_snapshots_2026(timestamptz)',
    'board_source_metrics_2026(text,text,text,timestamptz,timestamptz)',
  ]) {
    const body = await one(`select pg_get_functiondef('public.${signature}'::regprocedure)`);
    ok(!body.includes('rebuild_ownership'), `${signature} appelle rebuild_ownership_2026`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE MIROIR DES RÈGLES — game-rules.ts EST LA SOURCE, LE SQL EST LA COPIE
// ════════════════════════════════════════════════════════════════════════════
await t('leaderboard_rules_2026() est IDENTIQUE à LEADERBOARD_RULES_2026 (ADR-003)', async () => {
  const source = readFileSync(GAME_RULES, 'utf8');
  const block = source.slice(
    source.indexOf('export const LEADERBOARD_RULES_2026 = {'),
    source.indexOf('} as const;', source.indexOf('export const LEADERBOARD_RULES_2026 = {')),
  );
  const scalar = (key) => {
    const m = new RegExp(`\\n\\s*${key}: ('([^']*)'|\\d+),`).exec(block);
    if (!m) throw new Error(`${key} introuvable dans game-rules.ts`);
    return m[2] !== undefined ? m[2] : Number(m[1]);
  };
  const list = (key) => {
    const m = new RegExp(`\\n\\s*${key}: \\[([^\\]]*)\\],`).exec(block);
    if (!m) throw new Error(`${key} introuvable dans game-rules.ts`);
    return m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
  };
  const rules = await one('select public.leaderboard_rules_2026()');
  for (const key of ['subject', 'metric', 'stateMetric', 'weekStartsOn', 'timeZone']) {
    eq(rules[key], scalar(key), `${key} a divergé entre le SQL et game-rules.ts`);
  }
  for (const key of ['minRankedSubjects', 'snapshotIntervalMinutes', 'snapshotMaxAgeMinutes']) {
    eq(rules[key], scalar(key), `${key} a divergé entre le SQL et game-rules.ts`);
  }
  for (const key of ['scopes', 'declaredNotServed']) {
    eq(rules[key], list(key), `${key} a divergé entre le SQL et game-rules.ts`);
  }
  const rowsLimit = /export const LEADERBOARD_ROWS_LIMIT = (\d+);/.exec(source);
  eq(rules.maxRows, Number(rowsLimit[1]), 'maxRows a divergé de LEADERBOARD_ROWS_LIMIT');
});

await t('le seuil n’est NI un paramètre d’appel NI une valeur de requête', async () => {
  // Aucune des deux RPC de lecture n'accepte un seuil : un client ne peut pas
  // demander « classe-moi ces trois personnes ».
  const args = await q(
    `select p.proname, pg_get_function_arguments(p.oid) as args from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname in ('read_leaderboard_2026','my_leaderboard_scopes_2026') order by 1`,
  );
  for (const row of args) ok(!/min|seuil|threshold|count/i.test(row.args), `${row.proname} accepte un seuil : ${row.args}`);
  // …et le nombre 5 n'est écrit nulle part ailleurs que dans le miroir.
  for (const signature of ['read_leaderboard_2026(text,text,text)', 'my_leaderboard_scopes_2026(text)']) {
    const body = await one(`select pg_get_functiondef('public.${signature}'::regprocedure)`);
    ok(body.includes('leaderboard_rules_2026'), `${signature} n’interroge pas le miroir des règles`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LA SEMAINE — LUNDI → DIMANCHE, À PARIS
// ════════════════════════════════════════════════════════════════════════════
const bounds = async (instant) =>
  (await q('select week_start, week_end from public.leaderboard_week_bounds_2026($1::timestamptz)', [instant]))[0];

await t('la fenêtre commence le LUNDI 00:00 à Paris et dure exactement 7 jours', async () => {
  // 10/09/2026 est un jeudi ; à Paris on est en heure d'ÉTÉ (UTC+2), donc le
  // lundi 00:00 local vaut dimanche 22:00 UTC.
  const w = await bounds('2026-09-10T12:00:00Z');
  eq(w.week_start.toISOString(), '2026-09-06T22:00:00.000Z', 'le lundi parisien n’est pas au bon endroit');
  eq(w.week_end.toISOString(), '2026-09-13T22:00:00.000Z', 'la semaine ne dure pas sept jours');
});

await t('dimanche 23:59 est DANS la semaine ; lundi 00:00 ouvre la suivante', async () => {
  const sunday = await bounds('2026-09-13T21:59:00Z'); // 23:59 heure de Paris
  const monday = await bounds('2026-09-13T22:00:00Z'); // 00:00 heure de Paris
  eq(sunday.week_start.toISOString(), '2026-09-06T22:00:00.000Z', 'dimanche soir a basculé trop tôt');
  eq(monday.week_start.toISOString(), '2026-09-13T22:00:00.000Z', 'lundi minuit n’a pas basculé');
});

await t('le fuseau est NOMMÉ : l’heure d’hiver ne décale pas le lundi', async () => {
  // En janvier, Paris est à UTC+1 : le lundi 00:00 local vaut dimanche 23:00 UTC.
  const w = await bounds('2027-01-06T12:00:00Z');
  eq(w.week_start.toISOString(), '2027-01-03T23:00:00.000Z', 'un décalage fixe a été enterré dans le SQL');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. LA PORTÉE — DES COMMUNES RÉELLES, JAMAIS UN RECTANGLE
// ════════════════════════════════════════════════════════════════════════════
// Les trois codes INSEE utilisés par ce test sont vérifiés contre `fr_communes`
// (0068, 34 969 communes, Etalab) : aucune commune n'est inventée ici.
const ROUEN = 'insee-76540';
const LE_HAVRE = 'insee-76351';
const CAEN = 'insee-14118';

await t('les communes du test existent réellement dans le référentiel INSEE', async () => {
  const rows = await q(
    "select insee, nom from public.fr_communes where insee in ('76540','76351','14118') order by insee",
  );
  eq(rows.map((r) => r.insee), ['14118', '76351', '76540'], 'un code INSEE du test n’existe pas');
  eq(rows.map((r) => r.nom), ['Caen', 'Le Havre', 'Rouen'], 'un nom de commune du test ne correspond pas');
});

const openCommune = async (cityId, name) => {
  await db.query(
    `insert into public.city_zones(city_id,name,geojson,status,min_lat,max_lat,min_lng,max_lng)
     values($1,$2,'{"type":"Polygon","coordinates":[[[1,49],[1.1,49],[1.1,49.1],[1,49.1],[1,49]]]}'::jsonb,'wild',49,49.1,1,1.1)`,
    [cityId, name],
  );
};
await openCommune(ROUEN, 'Rouen');
await openCommune(LE_HAVRE, 'Le Havre');
await openCommune(CAEN, 'Caen');

await t('une commune se résout par son identifiant « insee-<code> »', async () => {
  const rows = await q("select city_id, insee, name from public.board_scope_communes_2026('commune',$1)", [ROUEN]);
  eq(rows, [{ city_id: ROUEN, insee: '76540', name: 'Rouen' }], 'la commune ne se résout pas');
});

await t('le département est DÉDUIT du code INSEE, sans table ajoutée', async () => {
  const rows = await q("select city_id from public.board_scope_communes_2026('department','76') order by city_id");
  eq(rows.map((r) => r.city_id), [LE_HAVRE, ROUEN], 'le département ne regroupe pas ses communes');
  eq(
    (await q("select city_id from public.board_scope_communes_2026('department','14')")).map((r) => r.city_id),
    [CAEN],
    'le département 14 a fui',
  );
});

await t('les deux rectangles de démarrage ne sont PAS des communes', async () => {
  // 'paris' et 'lille' (0004) sont des boîtes englobantes sans code INSEE.
  eq(await one("select count(*)::int from public.board_scope_communes_2026('commune','paris')"), 0, 'Paris a été traité en commune');
  eq(await one("select count(*)::int from public.board_scope_communes_2026('country','FR')"), 3, 'le pays ne compte pas les bonnes communes');
});

await t('une portée inconnue ne résout rien — et le preneur la REFUSE', async () => {
  eq(await one("select count(*)::int from public.board_scope_communes_2026('commune','insee-99999')"), 0, 'une commune inventée s’est résolue');
  await rejects(
    "select public.take_leaderboard_snapshot_2026('run','commune','insee-99999')",
    [],
    'unknown_scope_ref',
    'un snapshot d’un lieu inexistant',
  );
  await rejects("select public.take_leaderboard_snapshot_2026('swim','commune',$1)", [ROUEN], 'invalid_activity', 'une discipline inventée');
  await rejects("select public.take_leaderboard_snapshot_2026('run','region',$1)", [ROUEN], 'invalid_scope', 'une portée déclarée mais non servie');
});

// ════════════════════════════════════════════════════════════════════════════
// 5. QUI A LE DROIT D'ÊTRE COMPTÉ — LES SIX EXCLUSIONS D'ADR-013 §2.1
// ════════════════════════════════════════════════════════════════════════════
// Ces tests-là s'exécutent POUR DE VRAI : `board_eligible_events_2026` ne
// touche aucune géométrie, c'est exactement pour ça qu'elle est séparée de la
// mesure (0161, en-tête). La fenêtre est celle de la SEMAINE EN COURS, lue dans
// la base : un test qui figerait une date deviendrait faux le lundi suivant.
const week = (await q('select week_start, week_end from public.leaderboard_week_bounds_2026(now())'))[0];
const WEEK_START = week.week_start.toISOString();
const WEEK_END = week.week_end.toISOString();
const inWeek = (hours) => `${new Date(week.week_start.getTime() + hours * 3600_000).toISOString()}`;

for (let n = 1; n <= 9; n += 1) {
  // `public.users` est créée par le trigger de provisionnement (0028) : on ne
  // court-circuite pas le chemin réel de création de compte.
  await db.query('insert into auth.users(id) values($1) on conflict do nothing', [id(n)]);
  await db.query(
    "insert into public.user_profiles(user_id,handle,display_name,profile_visibility,map_sharing,discreet_mode) values($1,$2,$3,'public','simplified',false)",
    [id(n), `coureur${n}`, `Coureur ${n}`],
  );
}
await db.query("update public.user_profiles set discreet_mode=true where user_id=$1", [id(6)]);
await db.query("update public.user_profiles set map_sharing='none' where user_id=$1", [id(7)]);
await db.query('update public.users set deletion_requested_at=now() where id=$1', [id(8)]);

/** Une sortie 2026 et son événement de capture, aussi réels que le permet PGlite. */
let seq = 0;
const capture = async (opts) => {
  seq += 1;
  const runId = id(100 + seq);
  const eventId = id(200 + seq);
  await db.query(
    `insert into public.runs(id,user_id,client_run_id,source,started_at,distance_m,duration_s,status,activity,ruleset_version,shared_map_consent_2026,game_status_2026)
     values($1,$2,gen_random_uuid(),'gps',$3,5000,1800,'valid',$4,'2026.1',$5,$6)`,
    [runId, opts.owner, opts.closedAt, opts.activity ?? 'run', opts.consent ?? true, opts.runStatus ?? 'published'],
  );
  await db.query(
    `insert into public.capture_events_2026(id,run_id,owner_id,activity,face_key,closed_at,received_at,publish_after,geometry,status,new_geometry)
     values($1,$2,$3,$4,'0',$5,$5,$5,'GEOMETRY',$6,$7)`,
    [eventId, runId, opts.owner, opts.activity ?? 'run', opts.closedAt, opts.status ?? 'published',
      opts.newGeometry === null ? null : 'NEW_GEOMETRY'],
  );
  return eventId;
};

const eligible = async (activity = 'run', from = WEEK_START, to = WEEK_END) =>
  (await q('select owner_id from public.board_eligible_events_2026($1,$2::timestamptz,$3::timestamptz) order by owner_id', [activity, from, to]))
    .map((r) => r.owner_id);

await capture({ owner: id(1), closedAt: inWeek(10) });

await t('un événement publié, consenti et partagé compte', async () => {
  eq(await eligible(), [id(1)], 'l’événement de référence ne compte pas');
});

await t('une activité PENDING ne compte pas — ni par son événement, ni par sa sortie', async () => {
  // §18.4 : conserver l'activité / autoriser le jeu libre / AUTORISER UN RANG
  // sont trois décisions. Les deux chemins par lesquels « en attente » arrive
  // sont fermés : l'événement lui-même, et la sortie repassée en revue alors
  // que ses polygones sont déjà publiés.
  await capture({ owner: id(2), closedAt: inWeek(11), status: 'pending' });
  await capture({ owner: id(3), closedAt: inWeek(11), runStatus: 'pending' });
  eq(await eligible(), [id(1)], 'une activité en attente est entrée dans le classement');
});

await t('ni privé, ni programmé, ni retiré : seul « publié » classe', async () => {
  for (const status of ['private', 'scheduled', 'withdrawn']) {
    await capture({ owner: id(4), closedAt: inWeek(12), status });
  }
  eq(await eligible(), [id(1)], 'un état non publié est entré dans le classement');
});

await t('hors de la semaine, rien ne compte — bornes half-open', async () => {
  await capture({ owner: id(4), closedAt: new Date(week.week_start.getTime() - 60_000).toISOString() });
  await capture({ owner: id(4), closedAt: week.week_end.toISOString() });
  eq(await eligible(), [id(1)], 'un événement hors fenêtre a été compté');
});

await t('sans consentement de carte partagée, la sortie ne classe pas', async () => {
  await capture({ owner: id(5), closedAt: inWeek(13), consent: false });
  eq(await eligible(), [id(1)], 'une sortie non consentie est entrée dans le classement');
});

await t('un DISCRET n’apparaît pas, et une carte non partagée non plus', async () => {
  await capture({ owner: id(6), closedAt: inWeek(14) });
  await capture({ owner: id(7), closedAt: inWeek(14) });
  eq(await eligible(), [id(1)], 'la discrétion ou le non-partage a été ignoré');
});

await t('un compte dont la suppression est demandée sort du classement', async () => {
  await capture({ owner: id(8), closedAt: inWeek(15) });
  eq(await eligible(), [id(1)], 'un compte en suppression est resté classé');
});

await t('sans terrain NOUVEAU, il n’y a rien à classer', async () => {
  await capture({ owner: id(9), closedAt: inWeek(16), newGeometry: null });
  eq(await eligible(), [id(1)], 'un événement sans terrain nouveau a été compté');
});

await t('COURSE ET VÉLO NE SE MÉLANGENT JAMAIS', async () => {
  await capture({ owner: id(2), closedAt: inWeek(17), activity: 'bike' });
  eq(await eligible('run'), [id(1)], 'un cycliste est entré dans le classement des coureurs');
  eq(await eligible('bike'), [id(2)], 'le classement vélo n’a pas son cycliste');
});

// ════════════════════════════════════════════════════════════════════════════
// 6. LE PRENEUR DE SNAPSHOT — LES MÊMES CAS QUE LE MOTEUR PUR
// ════════════════════════════════════════════════════════════════════════════
// ⚠️ SUBSTITUTION EXPLICITE, ET C'EST LA SEULE DU FICHIER : `board_source_metrics_2026`
// calcule des AIRES (PostGIS). PGlite n'en a pas. Elle est donc remplacée par
// une table de mesures fournie — le CHIFFRE devient une donnée de test, la
// RÈGLE (seuil, tri, ex æquo, ancienneté, disciplines) reste celle du code.
// Rien d'autre n'est remplacé : le preneur, la lecture et les policies sont les
// vraies fonctions des migrations.
await db.exec(`
  create table public.tst_measures(
    activity text, scope text, scope_ref text, subject_id uuid,
    new_terrain_m2 double precision, held_area_m2 double precision
  );
  create or replace function public.board_source_metrics_2026(
    p_activity text, p_scope text, p_scope_ref text, p_from timestamptz, p_to timestamptz
  ) returns table (subject_id uuid, new_terrain_m2 double precision, held_area_m2 double precision)
  language sql stable security definer set search_path = public, pg_temp as $$
    select m.subject_id, m.new_terrain_m2, m.held_area_m2 from public.tst_measures m
    where m.activity = p_activity and m.scope = p_scope and m.scope_ref = p_scope_ref
  $$;
`);
const measure = async (scopeRef, rows, activity = 'run', scope = 'commune') => {
  await db.query('delete from public.tst_measures where scope_ref=$1 and activity=$2', [scopeRef, activity]);
  for (const [subject, taken, held] of rows) {
    await db.query('insert into public.tst_measures values($1,$2,$3,$4,$5,$6)', [activity, scope, scopeRef, id(subject), taken, held]);
  }
};
const take = async (scopeRef, activity = 'run', scope = 'commune') =>
  one('select public.take_leaderboard_snapshot_2026($1,$2,$3)', [activity, scope, scopeRef]);
const entriesOf = async (snapshot) =>
  q(`select subject_id, rank, tied_count, controlled_area_m2, conquered_area_m2, previous_snapshot_at
     from public.leaderboard_entries where snapshot_id=$1 order by rank, subject_id`, [snapshot]);

await t('le snapshot écrit ce qu’il a mesuré : rangs, compte, fenêtre, mesure qui classe', async () => {
  await measure(ROUEN, [[1, 5000, 10], [2, 4000, 20], [3, 3000, 30], [4, 2000, 40], [5, 1000, 50]]);
  const snapshot = await take(ROUEN);
  const header = (await q('select * from public.leaderboard_snapshots where id=$1', [snapshot]))[0];
  eq(header.period, 'weekly', 'la période n’est pas hebdomadaire');
  eq(header.scope, 'commune', 'la portée n’a pas été écrite');
  eq(header.subject_type, 'user', 'le sujet classé n’est pas le joueur');
  eq(header.metric, 'weekly_new_terrain_m2', 'la mesure qui classe n’est pas nommée');
  eq(header.subjects_count, 5, 'le compte de sujets est faux');
  eq(header.city_id, ROUEN, 'la commune n’est pas rattachée au snapshot');
  eq(header.period_start.toISOString(), WEEK_START, 'la fenêtre du snapshot n’est pas la semaine');
  eq(header.period_end.toISOString(), WEEK_END, 'la fenêtre du snapshot n’est pas la semaine');
  const rows = await entriesOf(snapshot);
  eq(rows.map((r) => [r.subject_id, r.rank]), [[id(1), 1], [id(2), 2], [id(3), 3], [id(4), 4], [id(5), 5]], 'les rangs sont faux');
  // Chaque colonne de 0082 garde son sens : tenu dans « contrôlé », pris dans
  // « conquis ». C'est `metric` qui dit laquelle a fait le rang.
  eq(rows.map((r) => r.controlled_area_m2), [10, 20, 30, 40, 50], 'le terrain TENU n’est pas dans controlled_area_m2');
  eq(rows.map((r) => r.conquered_area_m2), [5000, 4000, 3000, 2000, 1000], 'le terrain PRIS n’est pas dans conquered_area_m2');
});

await t('c’est le terrain PRIS qui classe, jamais le terrain TENU', async () => {
  // Le cas exact de `packages/engine/src/leaderboard.test.ts` : l'installé tient
  // 100 000 fois plus et n'a rien pris ; l'arrivante a pris 1 m².
  await measure(CAEN, [[1, 0.0001, 1_000_000], [2, 1, 0]]);
  const rows = await entriesOf(await take(CAEN));
  eq(rows.map((r) => [r.subject_id, r.rank]), [[id(2), 1], [id(1), 2]], 'le stock a repris la main sur le flux');
});

await t('ex æquo : le rang est PARTAGÉ et le suivant SAUTE', async () => {
  await measure(LE_HAVRE, [[1, 500, 0], [2, 500, 9_999_999], [3, 100, 0]]);
  const rows = await entriesOf(await take(LE_HAVRE));
  eq(rows.map((r) => [r.subject_id, r.rank, r.tied_count]), [[id(1), 1, 2], [id(2), 1, 2], [id(3), 3, 1]], 'les ex æquo ne partagent pas leur rang');
  // …et le terrain tenu n'a PAS départagé : l'état ne devient jamais un rang,
  // pas même par la petite porte du départage.
});

await t('à surface égale, l’ancienneté dans CE classement départage, le nouveau derrière', async () => {
  await measure(CAEN, [[3, 700, 0]]);
  await take(CAEN); // 3 est désormais installé dans ce tableau
  await measure(CAEN, [[3, 700, 0], [4, 700, 0]]);
  const rows = await entriesOf(await take(CAEN));
  eq(rows.map((r) => [r.subject_id, r.rank]), [[id(3), 1], [id(4), 2]], 'l’arrivant est passé devant l’installé à surface égale');
  ok(rows[0].previous_snapshot_at !== null, 'l’ancienneté de l’installé n’a pas été reportée');
  eq(rows[1].previous_snapshot_at, null, 'une ancienneté a été inventée pour un nouveau venu');
});

await t('la chaîne des snapshots se suit sans jamais se réécrire', async () => {
  const list = await q(
    "select id, previous_snapshot_id, taken_at from public.leaderboard_snapshots where scope='commune' and scope_ref=$1 and activity='run' order by taken_at",
    [CAEN],
  );
  ok(list.length >= 3, 'la série de snapshots de Caen est incomplète');
  eq(list[0].previous_snapshot_id, null, 'le premier snapshot a un prédécesseur');
  eq(list[1].previous_snapshot_id, list[0].id, 'la chaîne est rompue');
});

await t('course et vélo produisent DEUX tableaux, jamais un', async () => {
  await measure(ROUEN, [[1, 42, 0]], 'bike');
  const bike = await take(ROUEN, 'bike');
  const rows = await entriesOf(bike);
  eq(rows.map((r) => r.conquered_area_m2), [42], 'le tableau vélo ne contient pas sa mesure vélo');
  const run = (await q(
    "select subjects_count from public.leaderboard_snapshots where scope_ref=$1 and activity='run' order by taken_at desc limit 1",
    [ROUEN],
  ))[0];
  eq(run.subjects_count, 5, 'le tableau course a bougé quand le vélo a été mesuré');
});

// ════════════════════════════════════════════════════════════════════════════
// 7. LA LECTURE — QUATRE ÉTATS, JAMAIS UN TABLEAU VIDE
// ════════════════════════════════════════════════════════════════════════════
const read = async (viewer, scopeRef, activity = 'run', scope = 'commune') => {
  await as(viewer);
  return one('select public.read_leaderboard_2026($1,$2,$3)', [activity, scope, scopeRef]);
};

await t('sous le seuil, AUCUNE ligne n’est servie — et ce n’est pas « vide »', async () => {
  await measure(LE_HAVRE, [[1, 500, 0], [2, 400, 0], [3, 300, 0], [4, 200, 0]]);
  await take(LE_HAVRE);
  const board = await read(1, LE_HAVRE);
  eq(board.status, 'not_enough_people', 'un classement à quatre a été servi');
  eq(board.reason, 'below_threshold', 'la raison n’est pas nommée');
  eq(board.entries, [], 'des lignes ont fui sous le seuil');
  eq(board.subjectsCount, 4, 'le nombre réel de personnes n’est pas dit');
  eq(board.minRankedSubjects, 5, 'le seuil affiché ne vient pas des règles');
  ok(board.measuredAt !== null, 'la mesure existe : sa date doit être servie');
});

await t('au seuil, le classement s’ouvre — avec sa date de mesure', async () => {
  const board = await read(1, ROUEN);
  eq(board.status, 'ranked', 'le classement ne s’est pas ouvert à cinq');
  eq(board.entries.length, 5, 'le nombre de lignes servies est faux');
  eq(board.entries.map((e) => e.rank), [1, 2, 3, 4, 5], 'les rangs servis sont faux');
  eq(board.scopeLabel, 'Rouen', 'le nom réel de la commune n’est pas servi');
  eq(board.stale, false, 'une mesure fraîche est déclarée périmée');
  ok(board.measuredAt !== null, 'un classement sans date de mesure est un mensonge d’écran');
  eq(board.window.timeZone, 'Europe/Paris', 'le fuseau de la fenêtre n’est pas servi');
});

await t('« moi » est servi dans les deux cas, et sans chiffre quand il n’y a rien à dire', async () => {
  const mine = await read(1, ROUEN);
  eq(mine.me.rank, 1, 'mon rang n’est pas servi');
  eq(mine.me.ranked, true, 'je suis classé et l’objet dit le contraire');
  eq(mine.entries.find((e) => e.isMe).subjectId, id(1), 'ma ligne ne porte pas mon identifiant');
  // Un lecteur absent du snapshot : mesuré, non classé, AUCUN « 0 » nu.
  const absent = (await read(9, ROUEN)).me;
  eq(absent.ranked, false, 'un lecteur absent du snapshot est déclaré classé');
  eq([absent.rank, absent.tiedCount, absent.newTerrainM2, absent.heldM2], [null, null, null, null], 'un « 0 » nu a été servi');
});

await t('les identifiants des autres ne sortent JAMAIS', async () => {
  const board = await read(1, ROUEN);
  eq(board.entries.filter((e) => !e.isMe).every((e) => e.subjectId === null), true, 'un identifiant de tiers a fui');
  eq(board.entries.every((e) => /^[a-f0-9]{32}$/.test(e.key)), true, 'une ligne n’a pas de pseudonyme scopé');
});

await t('une identité non visible garde son RANG et perd son NOM', async () => {
  await db.query("update public.user_profiles set profile_visibility='crew' where user_id=$1", [id(3)]);
  const board = await read(1, ROUEN);
  const masked = board.entries.find((e) => e.rank === 3);
  eq(masked.label, null, 'le nom d’un profil réservé au crew a été publié');
  eq(board.entries.length, 5, 'une ligne a été retirée du classement au lieu d’être anonymisée');
  eq(board.subjectsCount, 5, 'le compte a bougé parce qu’un nom était masqué');
  await db.query("update public.user_profiles set profile_visibility='public' where user_id=$1", [id(3)]);
});

await t('un blocage retire le nom, jamais la ligne', async () => {
  await db.query("insert into public.friendships(requester_id,addressee_id,status) values($1,$2,'blocked')", [id(1), id(4)]);
  const board = await read(1, ROUEN);
  eq(board.entries.find((e) => e.rank === 4).label, null, 'le nom d’un compte bloqué a été servi');
  eq(board.entries.length, 5, 'le blocage a faussé le classement de tout le monde');
  await db.query('delete from public.friendships where requester_id=$1', [id(1)]);
});

await t('sans mesure de la semaine, on le DIT — on ne sert pas du vide horodaté', async () => {
  // Le département 76 EXISTE (deux communes ouvertes) et n'a jamais été mesuré :
  // c'est exactement le cas où un tableau vide horodaté serait un mensonge.
  const board = await read(1, '76', 'run', 'department');
  eq(board.status, 'unavailable', 'une portée jamais mesurée a rendu autre chose qu’indisponible');
  eq(board.reason, 'not_measured_yet', 'la raison n’est pas nommée');
  eq(board.measuredAt, null, 'une date de mesure a été inventée');
  eq(board.entries, [], 'des lignes ont été servies sans mesure');
  eq(board.me, null, 'un « moi » a été servi sans mesure');
});

await t('une commune qui n’est pas ouverte est INDISPONIBLE, pas vide', async () => {
  const board = await read(1, 'insee-99999');
  eq([board.status, board.reason], ['unavailable', 'unknown_scope'], 'une commune inconnue n’est pas dite inconnue');
  eq(board.scopeLabel, null, 'un nom de commune a été inventé');
});

await t('un snapshot périmé le DIT au lieu d’être servi comme frais', async () => {
  await db.query(
    "update public.leaderboard_snapshots set taken_at = taken_at - interval '4 hours' where scope_ref=$1 and activity='run'",
    [ROUEN],
  );
  const board = await read(1, ROUEN);
  eq(board.stale, true, 'une mesure de plus de trois heures est servie comme fraîche');
  eq(board.status, 'ranked', 'un classement périmé a été supprimé au lieu d’être daté');
});

await t('hors session, la lecture est REFUSÉE (le seuil ne se contourne pas par un anonyme)', async () => {
  await as(null);
  await rejects("select public.read_leaderboard_2026('run','commune',$1)", [ROUEN], 'authentication_required', 'une lecture anonyme');
  await rejects("select public.my_leaderboard_scopes_2026('run')", [], 'authentication_required', 'une liste de portées anonyme');
});

await t('une discipline ou une portée inventée est refusée à la lecture', async () => {
  await as(1);
  await rejects("select public.read_leaderboard_2026('swim','commune',$1)", [ROUEN], 'invalid_activity', 'une discipline inventée');
  await rejects("select public.read_leaderboard_2026('run','europe',$1)", [ROUEN], 'invalid_scope', 'une portée déclarée non servie');
});

// ════════════════════════════════════════════════════════════════════════════
// 8. L'OUVERTURE PAR PRÉSENCE — ON NE PEINT QUE CE QUI EXISTE
// ════════════════════════════════════════════════════════════════════════════
await t('ma commune se déduit de mes classements passés, jamais d’un GPS', async () => {
  // Le dernier tableau de commune où j'ai figuré fait foi : ici Rouen, mesurée
  // à l'instant. (Avant cette prise, c'était Le Havre — la déduction suit
  // vraiment la dernière mesure, elle ne fige pas une ville de profil.)
  await measure(ROUEN, [[1, 5000, 10], [2, 4000, 20], [3, 3000, 30], [4, 2000, 40], [5, 1000, 50]]);
  await take(ROUEN);
  await as(1);
  const scopes = await one("select public.my_leaderboard_scopes_2026('run')");
  eq(scopes.commune, ROUEN, 'ma commune n’a pas été déduite de mon classement');
  eq(scopes.scopes.map((s) => s.scope), ['commune', 'department', 'country'], 'les trois portées ne sont pas proposées');
  eq(scopes.scopes[0].open, true, 'ma commune classée n’est pas ouverte');
  eq(scopes.scopes[0].label, 'Rouen', 'le nom réel de ma commune n’est pas servi');
  eq(scopes.scopes[1].open, false, 'un département jamais mesuré est déclaré ouvert');
  eq(scopes.scopes[1].subjectsCount, null, 'un compte a été inventé pour une portée non mesurée');
  const body = await one("select pg_get_functiondef('public.my_leaderboard_scopes_2026(text)'::regprocedure)");
  // Mots ENTIERS : « lateral » et « latest » sont du SQL, pas des coordonnées.
  ok(!/\blat\b|\blng\b|\blatitude\b|\blongitude\b|ST_[A-Za-z]|geometry/.test(body),
    'la déduction de commune touche à une position');
});

await t('à défaut, la ville du compte — si c’est une commune réelle', async () => {
  await db.query('update public.users set city_id=$1 where id=$2', [CAEN, id(9)]);
  await as(9);
  eq((await one("select public.my_leaderboard_scopes_2026('run')")).commune, CAEN, 'le repli sur la ville du compte ne marche pas');
  // Un rectangle de démarrage n'est pas une commune : on ne propose rien.
  await db.query("update public.users set city_id='paris' where id=$1", [id(9)]);
  eq((await one("select public.my_leaderboard_scopes_2026('run')")).commune, null, 'un rectangle de démarrage a été servi comme commune');
});

await t('région et Europe sont DÉCLARÉES et jamais servies', async () => {
  await as(1);
  const scopes = await one("select public.my_leaderboard_scopes_2026('run')");
  eq(scopes.declaredNotServed, ['region', 'europe'], 'les portées déclarées ont changé sans passer par game-rules.ts');
  eq(scopes.scopes.some((s) => ['region', 'europe'].includes(s.scope)), false, 'une portée non servie a été proposée à l’écran');
});

// ════════════════════════════════════════════════════════════════════════════
// 9. LES PRIVILÈGES, LES POLICIES ET L'HORLOGE
// ════════════════════════════════════════════════════════════════════════════
await t('anon ne lit AUCUNE des deux RPC ; un compte lit les deux', async () => {
  for (const signature of ['read_leaderboard_2026(text,text,text)', 'my_leaderboard_scopes_2026(text)']) {
    eq(await one(`select has_function_privilege('anon','public.${signature}','EXECUTE')`), false, `anon exécute ${signature}`);
    eq(await one(`select has_function_privilege('authenticated','public.${signature}','EXECUTE')`), true, `un compte n’exécute pas ${signature}`);
  }
});

await t('la mesure et le preneur restent au SERVEUR', async () => {
  for (const signature of [
    'board_scope_communes_2026(text,text)',
    'board_eligible_events_2026(text,timestamptz,timestamptz)',
    'board_source_metrics_2026(text,text,text,timestamptz,timestamptz)',
    'take_leaderboard_snapshot_2026(text,text,text,timestamptz)',
    'take_active_leaderboard_snapshots_2026(timestamptz)',
    'active_leaderboard_scopes_2026(timestamptz)',
  ]) {
    for (const role of ['anon', 'authenticated']) {
      eq(await one(`select has_function_privilege('${role}','public.${signature}','EXECUTE')`), false, `${role} exécute ${signature}`);
    }
    eq(await one(`select has_function_privilege('service_role','public.${signature}','EXECUTE')`), true, `service_role n’exécute pas ${signature}`);
  }
});

await t('un tableau 2026 ne se lit pas en direct : la policy est RESTRICTIVE', async () => {
  const policies = await q(
    `select tablename, policyname, permissive from pg_policies
     where schemaname='public' and tablename in ('leaderboard_snapshots','leaderboard_entries')
       and policyname like '%2026_via_rpc_only' order by tablename`,
  );
  eq(
    policies,
    [
      { tablename: 'leaderboard_entries', policyname: 'leaderboard_entries_2026_via_rpc_only', permissive: 'RESTRICTIVE' },
      { tablename: 'leaderboard_snapshots', policyname: 'leaderboard_snapshots_2026_via_rpc_only', permissive: 'RESTRICTIVE' },
    ],
    'la fermeture des tableaux 2026 n’est pas restrictive',
  );
});

await t('le job horaire est POSÉ, et il appelle le balayage des portées actives', async () => {
  const job = (await q("select jobname, schedule, command from cron.job where jobname='leaderboard-snapshots-2026'"))[0];
  eq(job.schedule, '0 * * * *', 'la cadence du snapshot n’est pas horaire');
  eq(job.command, 'select public.take_active_leaderboard_snapshots_2026()', 'le job n’appelle pas le balayage');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} échec(s) sur ${passed + failures.length} :`);
  for (const f of failures) console.error(`  · ${f.name}\n    ${f.err.message}`);
  await db.close();
  process.exit(1);
}
console.log(`${passed} vérifications passées. AUCUNE AIRE N'A ÉTÉ CALCULÉE : PGlite n'a pas PostGIS,`);
console.log("la mesure est remplacée (§6) et l'intersection commune × événement reste à prouver ailleurs.");
await db.close();
