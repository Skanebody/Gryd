#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0066 (`provision_city` + boîte
 * englobante des `city_zones`) sur PGlite.
 *
 * ═══ POURQUOI ═══════════════════════════════════════════════════════════════
 * 0066 est la VOIE d'ouverture d'une ville. Une migration jamais exécutée est
 * une intention, pas un mécanisme — et celle-ci porte deux pièges que seule
 * l'exécution révèle :
 *   1. la SAISON. Insérer `city_zones` ne suffit pas : `claim_hexes` ne remplit
 *      `season_scores` que s'il trouve une saison ACTIVE (0005 l.69-73). Une
 *      ville ouverte sans saison a un classement vide À JAMAIS, sans erreur
 *      nulle part. On vérifie donc que les DEUX lignes sortent d'un seul appel ;
 *   2. la BOÎTE ENGLOBANTE, qui devient le pré-filtre de rattachement de
 *      `ingest_run`. Une zone dont la boîte serait NULL cesserait
 *      silencieusement d'exister pour le rattachement — d'où le rattrapage des
 *      lignes déjà en base, puis les NOT NULL, testés ici.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *   · LA RLS. PGlite tourne en superutilisateur et n'a ni schéma `auth` ni
 *     rôles Supabase réels : on les stubbe. Ce qui est prouvé côté sécurité,
 *     c'est le périmètre d'EXECUTE (has_function_privilege) — pas l'effet des
 *     politiques de `city_zones`, garanti par 0003_rls.sql (revu, non rejoué).
 *   · Le contenu réel de `city_zones` en production : les stubs reproduisent la
 *     FORME de 0002 (colonnes, check de statut, index partiel d'unicité de
 *     saison), pas les données.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/open_city.pglite.test.mjs
 *
 * Sans PGlite : sortie CODE 2 avec message explicite (un test non exécuté ne
 * doit jamais ressembler à un test vert).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(
    'NON EXÉCUTÉ — PGlite est introuvable. Ce test n’a rien vérifié ;\n' +
      'ne le comptez pas comme vert (sortie 2, jamais 0).\n' +
      `  cause : ${err.message}\n\n` +
      '  mkdir -p /tmp/pglite && cd /tmp/pglite\n' +
      '  echo \'{"name":"pglite-scratch","private":true}\' > package.json\n' +
      '  npm i --ignore-scripts @electric-sql/pglite\n' +
      '  cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \\\n' +
      '    node supabase/tests/open_city.pglite.test.mjs',
  );
  process.exit(2);
}

// ─── Micro-harnais d'assertions ──────────────────────────────────────────────
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
const ok = (cond, what) => {
  if (!cond) throw new Error(what);
};

const db = new PGlite();

// ─── Stubs : rôles Supabase + la FORME des tables de 0002 ────────────────────
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;

  create table public.city_zones (
    city_id    text primary key,
    name       text not null,
    geojson    jsonb not null,
    status     text not null default 'wild' check (status in ('active', 'emerging', 'pioneer', 'wild')),
    created_at timestamptz not null default now()
  );
  create table public.seasons (
    id        uuid primary key default gen_random_uuid(),
    city_id   text not null references public.city_zones (city_id) on delete restrict,
    starts_at timestamptz not null,
    ends_at   timestamptz not null check (ends_at > starts_at),
    status    text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed'))
  );
  create unique index seasons_one_active_per_city
    on public.seasons (city_id) where status = 'active';
`);

// ── Une zone DÉJÀ EN BASE avant 0066 : c'est le cas de Paris/Lille (0004+0033).
// Elle n'a pas de boîte englobante ; le rattrapage de la migration doit la lui
// donner, sinon le pré-filtre de `ingest_run` cesserait de la voir.
await db.exec(`
  insert into public.city_zones (city_id, name, geojson, status) values (
    'paris', 'Paris',
    '{"type":"Polygon","coordinates":[[[2.13,48.69],[2.61,48.69],[2.61,48.99],[2.13,48.99],[2.13,48.69]]]}'::jsonb,
    'active'
  );
`);

// Le VRAI SQL de la migration.
await db.exec(readFileSync(join(MIGRATIONS, '0066_open_city.sql'), 'utf8'));

console.log('open_city — migration 0066 sur PGlite\n');

const disc = (lat, lng, r = 0.2) =>
  JSON.stringify({
    type: 'Polygon',
    coordinates: [[
      [lng - r, lat - r],
      [lng + r, lat - r],
      [lng + r, lat + r],
      [lng - r, lat + r],
      [lng - r, lat - r],
    ]],
  });

/**
 * Appel de la RPC. Les trois derniers arguments sont le GARDE-FOU d'ouverture
 * (game-rules : CITY_OPEN_LIMIT_PER_USER / CITY_OPEN_LIMIT_WINDOW_H) ; par
 * défaut `openedBy` est NULL, donc AUCUN plafond ne s'applique — c'est ce qui
 * laisse les tests d'ouverture et d'idempotence mesurer ce qu'ils mesurent, et
 * c'est aussi le contrat de la fonction : sans porteur, pas de quota.
 */
const provision = async (
  cityId,
  name,
  geojson,
  weeks = 8,
  openedBy = null,
  limit = null,
  windowHours = null,
) =>
  (
    await db.query(
      'select public.provision_city($1, $2, $3::jsonb, $4, $5::uuid, $6, $7) as r',
      [cityId, name, geojson, weeks, openedBy, limit, windowHours],
    )
  ).rows[0].r;

const zone = async (cityId) =>
  (await db.query('select * from public.city_zones where city_id = $1', [cityId])).rows[0];

const seasons = async (cityId) =>
  (await db.query('select * from public.seasons where city_id = $1 order by starts_at', [cityId]))
    .rows;

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE RATTRAPAGE — les zones déjà en base ne deviennent pas invisibles
// ═══════════════════════════════════════════════════════════════════════════
await t('rattrapage : la zone préexistante reçoit sa boîte englobante', async () => {
  const z = await zone('paris');
  eq(Number(z.min_lng), 2.13, 'min_lng');
  eq(Number(z.max_lng), 2.61, 'max_lng');
  eq(Number(z.min_lat), 48.69, 'min_lat');
  eq(Number(z.max_lat), 48.99, 'max_lat');
});

await t('rattrapage : les bornes sont NOT NULL — une zone sans boîte est impossible', async () => {
  const cols = (
    await db.query(
      `select column_name, is_nullable from information_schema.columns
       where table_schema = 'public' and table_name = 'city_zones'
         and column_name in ('min_lat','max_lat','min_lng','max_lng')
       order by column_name`,
    )
  ).rows;
  eq(cols.length, 4, 'les 4 colonnes de boîte existent');
  for (const c of cols) eq(c.is_nullable, 'NO', `${c.column_name} doit être NOT NULL`);
});

await t('boîte : un MultiPolygon est mesuré aussi (extracteur récursif)', async () => {
  await db.exec(`
    insert into public.city_zones (city_id, name, geojson, status) values (
      'multi', 'Multi',
      '{"type":"MultiPolygon","coordinates":[[[[1.0,10.0],[2.0,10.0],[2.0,11.0],[1.0,10.0]]],[[[5.0,20.0],[6.0,20.0],[6.0,21.0],[5.0,20.0]]]]}'::jsonb,
      'wild'
    );
  `);
  const z = await zone('multi');
  eq([Number(z.min_lng), Number(z.max_lng)], [1, 6], 'longitudes des DEUX polygones');
  eq([Number(z.min_lat), Number(z.max_lat)], [10, 21], 'latitudes des DEUX polygones');
  await db.exec(`delete from public.city_zones where city_id = 'multi';`);
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. LA VOIE D'OUVERTURE — zone ET saison, sinon rien ne compte
// ═══════════════════════════════════════════════════════════════════════════
await t('ouvre une ville : la zone ET la saison sortent du MÊME appel', async () => {
  const r = await provision('2657896', 'Zürich', disc(47.36667, 8.55));
  eq(r.ok, true, 'la RPC doit réussir');
  eq(r.zoneCreated, true, 'zone créée');
  eq(r.seasonCreated, true, 'saison créée');

  const z = await zone('2657896');
  ok(z, 'la ligne city_zones doit exister');
  eq(z.name, 'Zürich', 'nom écrit');

  const s = await seasons('2657896');
  eq(s.length, 1, 'exactement une saison');
  eq(s[0].status, 'active', 'saison ACTIVE — sinon season_scores ne se peuple jamais');
});

await t('la ville ouverte est `wild` — jamais une densité qu’on n’a pas mesurée', async () => {
  // 'active' = mode Guerre. L'écrire sur une ville où personne n'a couru serait
  // affirmer une population inexistante (AMENDEMENT-35 §6, rétracté pour ça).
  eq((await zone('2657896')).status, 'wild', 'statut');
});

await t('la durée de saison est CELLE PASSÉE (aucune durée écrite dans le SQL)', async () => {
  await provision('3169070', 'Roma', disc(41.89193, 12.51133), 3);
  const s = (await seasons('3169070'))[0];
  const jours = (new Date(s.ends_at) - new Date(s.starts_at)) / 86400000;
  eq(Math.round(jours), 21, '3 semaines demandées');
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. IDEMPOTENCE — rejouable sans effet de bord
// ═══════════════════════════════════════════════════════════════════════════
await t('rejouer n’écrit rien de plus, et le dit', async () => {
  const r = await provision('2657896', 'Zürich', disc(47.36667, 8.55));
  eq(r.ok, true, 'toujours ok');
  eq(r.zoneCreated, false, 'aucune zone recréée');
  eq(r.seasonCreated, false, 'aucune saison recréée');
  eq((await seasons('2657896')).length, 1, 'toujours une seule saison');
});

await t('une zone existante n’est JAMAIS réécrite (Paris garde son contour réel)', async () => {
  const avant = await zone('paris');
  const r = await provision('paris', 'Paris Bidon', disc(0, 0));
  eq(r.ok, true, 'appel accepté');
  eq(r.zoneCreated, false, 'rien de créé');
  const apres = await zone('paris');
  eq(apres.name, 'Paris', 'le nom d’origine survit');
  eq(apres.geojson, avant.geojson, 'le contour de 0033 survit');
  // …et la réponse RELIT la base au lieu de renvoyer ce qu’on a proposé.
  eq(r.name, 'Paris', 'la RPC rend le nom RÉEL, pas celui proposé');
  eq(r.status, 'active', 'la RPC rend le statut RÉEL');
});

await t('une ville déjà ouverte mais SANS saison active en récupère une', async () => {
  // Cas réel : saison close par season_close, ville toujours ouverte. Sans ce
  // rattrapage, la ville existerait avec un classement gelé pour toujours.
  await db.exec(`update public.seasons set status = 'closed' where city_id = '2657896';`);
  const r = await provision('2657896', 'Zürich', disc(47.36667, 8.55));
  eq(r.seasonCreated, true, 'une nouvelle saison active est ouverte');
  eq((await seasons('2657896')).filter((s) => s.status === 'active').length, 1, 'une seule active');
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. REFUS NOMMÉS — jamais une écriture silencieusement bancale
// ═══════════════════════════════════════════════════════════════════════════
await t('refuse un city_id hors forme, sans rien écrire', async () => {
  for (const bad of ['', '   ', 'a,b', 'x'.repeat(65), 'Saint-Étienne']) {
    const r = await provision(bad, 'X', disc(48, 2));
    eq(r.ok, false, `« ${bad} » aurait dû être refusé`);
    eq(r.reason, 'bad_city_id', 'motif nommé');
  }
  eq(Number((await db.query('select count(*) as n from public.city_zones')).rows[0].n), 3, 'aucune zone en plus');
});

await t('refuse une géométrie dégénérée ou hors du globe', async () => {
  const cas = [
    ['type absent', JSON.stringify({ coordinates: [] })],
    ['type inconnu', JSON.stringify({ type: 'Point', coordinates: [2, 48] })],
    ['coordonnées vides', JSON.stringify({ type: 'Polygon', coordinates: [] })],
    [
      'aire nulle (un point répété)',
      JSON.stringify({ type: 'Polygon', coordinates: [[[2, 48], [2, 48], [2, 48]]] }),
    ],
    [
      'hors du globe',
      JSON.stringify({ type: 'Polygon', coordinates: [[[2, 48], [200, 48], [200, 49], [2, 48]]] }),
    ],
  ];
  for (const [quoi, geo] of cas) {
    const r = await provision('999001', 'X', geo);
    eq(r.ok, false, `${quoi} aurait dû être refusé`);
    eq(r.reason, 'bad_geometry', `${quoi} : motif`);
  }
  eq((await zone('999001')) ?? null, null, 'aucune zone écrite');
});

await t('refuse une durée de saison absente ou nulle (la constante vient de game-rules)', async () => {
  for (const w of [null, 0, -4]) {
    const r = await provision('999002', 'X', disc(48, 2), w);
    eq(r.ok, false, `weeks=${w} aurait dû être refusé`);
    eq(r.reason, 'bad_season_weeks', 'motif');
  }
});

await t('refuse un nom vide (une ville sans nom n’est pas affichable)', async () => {
  const r = await provision('999003', '   ', disc(48, 2));
  eq(r.ok, false, 'refusé');
  eq(r.reason, 'bad_name', 'motif');
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 bis. LE PLAFOND D'OUVERTURE — il borne le bruit, jamais l'usage honnête
// ═══════════════════════════════════════════════════════════════════════════
// Un compte pouvait provisionner autant de villes qu'il voulait. Ce qui est
// testé ici : le plafond COMPTE ce qui est réellement écrit, refuse en le
// NOMMANT (jamais un faux succès), n'existe que si l'appelant le passe, et
// n'est pas consommé par un appel idempotent.

const UID_A = '11111111-1111-4111-8111-111111111111';
const UID_B = '22222222-2222-4222-8222-222222222222';

await t('plafond : atteint, la RPC REFUSE en le nommant et n’écrit rien', async () => {
  // Limite 2 sur 24 h : deux ouvertures passent, la troisième est refusée.
  const r1 = await provision('3143244', 'Oslo', disc(59.91, 10.75), 8, UID_A, 2, 24);
  eq(r1.ok, true, '1re ouverture');
  eq(r1.zoneCreated, true, 'zone créée');
  const r2 = await provision('2673730', 'Stockholm', disc(59.33, 18.06), 8, UID_A, 2, 24);
  eq(r2.ok, true, '2e ouverture');

  const avant = Number((await db.query('select count(*) as n from public.city_zones')).rows[0].n);
  const r3 = await provision('658225', 'Helsinki', disc(60.17, 24.94), 8, UID_A, 2, 24);
  eq(r3.ok, false, '3e ouverture refusée');
  eq(r3.reason, 'open_quota_reached', 'motif NOMMÉ');
  eq(r3.limit, 2, 'le plafond qui a produit le refus est rendu');
  eq(r3.windowHours, 24, 'la fenêtre aussi');
  const apres = Number((await db.query('select count(*) as n from public.city_zones')).rows[0].n);
  eq(apres, avant, 'aucune zone écrite malgré le refus');
  eq((await zone('658225')) ?? null, null, 'la ville refusée n’existe pas');
});

await t('plafond : il est PAR COMPTE — un autre joueur n’est pas puni', async () => {
  const r = await provision('658225', 'Helsinki', disc(60.17, 24.94), 8, UID_B, 2, 24);
  eq(r.ok, true, 'le compte B a son propre budget');
  eq(r.zoneCreated, true, 'zone créée');
});

await t('plafond : rouvrir une ville DÉJÀ ouverte ne consomme rien', async () => {
  // Sinon un appel idempotent finirait refusé — et le motif du refus mentirait.
  // Le compte A est à 2/2 ; rejouer une de SES villes doit passer.
  const r = await provision('3143244', 'Oslo', disc(59.91, 10.75), 8, UID_A, 2, 24);
  eq(r.ok, true, 'idempotent malgré le plafond atteint');
  eq(r.zoneCreated, false, 'rien de créé, donc rien de débité');
});

await t('plafond : la fenêtre est GLISSANTE — les ouvertures anciennes sortent', async () => {
  await db.exec(
    `update public.city_zones set opened_at = now() - interval '48 hours'
     where opened_by = '${UID_A}';`,
  );
  const r = await provision('658226', 'Bergen', disc(60.39, 5.32), 8, UID_A, 2, 24);
  eq(r.ok, true, 'les ouvertures hors fenêtre ne comptent plus');
  await db.exec(`delete from public.seasons where city_id = '658226';`);
  await db.exec(`delete from public.city_zones where city_id = '658226';`);
});

await t('plafond : sans porteur ni plafond passés, aucun quota ne s’applique', async () => {
  // Le plafond est une DÉCISION DE L'APPELANT (game-rules), pas un défaut caché
  // du SQL : un appel de service sans `p_opened_by` reste illimité, et c'est dit.
  for (const id of ['901001', '901002', '901003', '901004', '901005', '901006']) {
    const r = await provision(id, `X${id}`, disc(10, 10));
    eq(r.ok, true, `${id} doit passer`);
  }
});

await t('traçabilité : les zones seedées gardent opened_by NULL', async () => {
  // Personne ne les a « ouvertes » par cette voie ; le prétendre serait faux.
  const z = await zone('paris');
  eq(z.opened_by, null, 'Paris n’a pas d’ouvreur');
  eq(z.opened_at, null, 'ni de date d’ouverture');
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. PÉRIMÈTRE D'EXÉCUTION
// ═══════════════════════════════════════════════════════════════════════════
await t('EXECUTE : service_role seulement — public, anon et authenticated exclus', async () => {
  const priv = async (role, sig) =>
    (await db.query(`select has_function_privilege($1, $2, 'execute') as ok`, [role, sig])).rows[0]
      .ok;
  const SIG = 'public.provision_city(text, text, jsonb, integer, uuid, integer, integer)';
  eq(await priv('service_role', SIG), true, 'service_role doit pouvoir exécuter');
  eq(await priv('authenticated', SIG), false, 'authenticated ne doit PAS pouvoir exécuter');
  eq(await priv('anon', SIG), false, 'anon ne doit PAS pouvoir exécuter');
  eq(await priv('public', SIG), false, 'public ne doit PAS pouvoir exécuter (tous en héritent)');
});

await t('EXECUTE : le helper de boîte n’est ouvert à aucun rôle client', async () => {
  const priv = async (role) =>
    (
      await db.query(
        `select has_function_privilege($1, 'public.geojson_coord_points(jsonb)', 'execute') as ok`,
        [role],
      )
    ).rows[0].ok;
  for (const role of ['public', 'anon', 'authenticated']) {
    eq(await priv(role), false, `${role} ne doit PAS pouvoir exécuter le helper`);
  }
});

await t('security definer : la fonction d’ouverture et le trigger le sont', async () => {
  const rows = (
    await db.query(
      `select p.proname, p.prosecdef
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('provision_city', 'city_zones_sync_bbox')
       order by p.proname`,
    )
  ).rows;
  eq(rows.length, 2, 'les deux fonctions existent');
  for (const r of rows) eq(r.prosecdef, true, `${r.proname} doit être security definer`);
});

// ─── Verdict ─────────────────────────────────────────────────────────────────
await db.close();
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
console.log(
  'RAPPEL : la RLS de `city_zones` (écriture révoquée aux rôles clients, 0003) ' +
    'n’est PAS couverte ici — PGlite tourne en superutilisateur. Seul le ' +
    'périmètre d’EXECUTE l’est.',
);
process.exit(failures.length === 0 ? 0 : 1);
