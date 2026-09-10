// GRYD — 0195/0196 : LA CONSERVATION D'UN TRACÉ DEVIENT UNE OPTION DU JOUEUR.
//
// Décision du fondateur, 11/09/2026 : « Trace GPS : ce qui est le plus adapté,
// ou mettre dans les réglages l'option, mais ne pas purger directement. »
//
// ═══ CE QUE CE FICHIER PROUVE, DANS L'ORDRE ═════════════════════════════════
// ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il est REJOUÉ sur un vrai Postgres :
//   · aucune préférence de conservation n'existe (ni colonne, ni RPC) ;
//   · `purge_expired_polylines(90)` (0101) efface `polyline_masked` pour TOUT
//     LE MONDE, sans rien demander — et laisse `trace_points_2026` intacte.
//     Deux formes de la même trace, deux durées de vie opposées ;
//   · 0102 planifie cette purge tous les jours, sous le nom
//     `gryd_purge_polylines`, avec 90 écrit en dur.
// Sans cette étape, rien ne distinguerait ce lot d'un no-op.
//
// PUIS 0195 + 0196, et les garanties du lot : défaut qui ne purge RIEN même à
// 400 jours, les DEUX formes qui partent ensemble quand une durée est choisie,
// les statistiques et le territoire intacts, le plancher anti-triche,
// l'idempotence, l'effacement à la demande, et les privilèges.
//
// ⚠️ CE QUE PGlite NE PROUVE PAS. Il tourne en SUPERUTILISATEUR et n'a ni
// PostGIS ni `pg_cron`. Donc :
//   · la RLS n'est pas prouvée ici — seulement les GRANTS (`has_function_privilege`) ;
//   · `capture_events_2026` est reconstruite avec une géométrie en `text` : ce
//     qui est prouvé, c'est qu'AUCUNE instruction de la purge n'atteint cette
//     table, pas une propriété géométrique ;
//   · le schéma `cron` n'existe pas : le `do $$ … $$` conditionnel de 0196 ne
//     pose donc rien, et la RUPTURE (retrait du job de 0102) est prouvée sur le
//     TEXTE des deux migrations, pas sur `cron.job`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const as = async (n, fn) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n === null ? '' : id(n)]);
  return await fn();
};
const test = async (name, fn) => {
  await fn();
  console.log(`ok ${++passed} - ${name}`);
};
const fn = (signature) => `to_regprocedure('public.${signature}') is not null`;
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
const apply = (name) => db.exec(migration(name));

/** Traces d'une sortie : la paire lue partout dans le lot. */
const traceOf = async (run) =>
  (await q(
    'select trace_points_2026 is not null as full, polyline_masked is not null as masked from public.runs where id=$1',
    [run],
  ))[0];

/** Pose une sortie AVEC ses deux formes de trace et ses statistiques. */
const seedRun = async (run, user, daysAgo) => {
  await db.query(
    `insert into public.runs
       (id,user_id,started_at,activity,distance_m,duration_s,avg_pace_s_km,status,
        points_awarded,xp_awarded,trace_points_2026,polyline_masked)
     values ($1,$2,now()-make_interval(days=>$3),'run',10000,3000,300,'valid',120,45,
             '[{"lat":49.44,"lng":1.09,"t":1}]'::jsonb,'[[49.44,1.09],[49.45,1.10]]')`,
    [run, user, daysAgo],
  );
};

try {
  // ── LE SOCLE : ce dont 0101, 0135, 0195 et 0196 ont besoin ────────────────
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$
      select current_setting('request.jwt.claim.role',true) $$;
    grant usage on schema auth to authenticated, service_role;

    create table public.users (id uuid primary key);

    create table public.runs (
      id uuid primary key,
      user_id uuid not null references public.users(id) on delete cascade,
      started_at timestamptz not null default now(),
      activity text,
      distance_m integer not null default 0,
      duration_s integer not null default 0,
      avg_pace_s_km integer,
      status text,
      points_awarded integer not null default 0,
      xp_awarded integer not null default 0,
      celebration jsonb,
      polyline_masked text,
      trace_points_2026 jsonb
    );

    -- 0081, réduit à ce que le PLANCHER interroge : le statut d'une revue et
    -- celui d'un recours. Les domaines sont ceux des vrais \`check\`.
    create table public.anticheat_reviews (
      id uuid primary key,
      run_id uuid not null unique references public.runs(id) on delete cascade,
      user_id uuid not null references public.users(id) on delete cascade,
      status text not null default 'open' check (status in ('open','in_progress','closed'))
    );
    create table public.anticheat_appeals (
      id uuid primary key,
      review_id uuid not null unique references public.anticheat_reviews(id) on delete cascade,
      user_id uuid not null references public.users(id) on delete cascade,
      status text not null default 'received' check (status in ('received','in_progress','closed'))
    );

    -- 0118, réduit : la GÉOMÉTRIE d'une capture vit ici et NON sur la trace.
    -- \`text\` au lieu de \`geometry\` — PGlite n'a pas PostGIS ; ce qu'on
    -- prouve, c'est qu'aucune instruction de la purge n'atteint cette table.
    create table public.capture_events_2026 (
      id uuid primary key,
      run_id uuid references public.runs(id) on delete set null,
      owner_id uuid references public.users(id) on delete set null,
      status text not null,
      geometry text not null
    );
  `);

  // `user_profiles` : la VRAIE DDL de 0011, extraite sans être réécrite — un
  // défaut de colonne inventé ici prouverait un réglage inventé.
  const social0011 = migration('0011_social.sql');
  await db.exec(
    social0011.slice(
      social0011.indexOf('create table if not exists public.user_profiles'),
      social0011.indexOf('-- ═══ 3. friendships'),
    ),
  );

  await apply('0101_polyline_masked_retention.sql');
  await apply('0135_privacy_settings_2026.sql');

  await db.query('insert into public.users values($1),($2),($3)', [id(1), id(2), id(3)]);
  await db.query(
    `insert into public.user_profiles(user_id,handle,display_name)
     values($1,'runner1','Runner 1'),($2,'runner2','Runner 2')`,
    [id(1), id(2)],
  );

  // ════════════════════════════════════════════════════════════════════════
  // ÉTAPE 0 — LE DÉFAUT EXISTAIT
  // ════════════════════════════════════════════════════════════════════════
  await test('étape 0 — avant 0195, AUCUNE préférence de conservation n’existe', async () => {
    assert.equal(
      await one(`select exists(
        select 1 from information_schema.columns
         where table_schema='public' and table_name='user_profiles'
           and column_name='trace_retention_2026')`),
      false,
      'la colonne ne doit pas encore exister',
    );
    for (const signature of [
      'set_trace_retention_2026(text)',
      'delete_run_trace_2026(uuid)',
      'purge_traces_by_retention_2026(timestamptz)',
    ]) {
      assert.equal(await one(`select ${fn(signature)}`), false, `${signature} ne doit pas exister`);
    }
    // …et la RPC de réglages, elle, existe SANS parler de conservation.
    const read = await as(1, () => one('select my_privacy_settings_2026()'));
    assert.equal(Object.hasOwn(read, 'traceRetention'), false);
    assert.equal(read.mapSharing, 'simplified');
  });

  await test('étape 0 — 0101 purge polyline_masked pour TOUT LE MONDE, et laisse la trace complète', async () => {
    await seedRun(id(101), id(1), 200); // vieille de 200 jours
    await seedRun(id(102), id(2), 200);
    await seedRun(id(103), id(1), 10); // récente
    assert.deepEqual(await traceOf(id(101)), { full: true, masked: true });

    const purged = await one('select purge_expired_polylines(90)');
    assert.equal(purged, 2, 'les deux comptes sont purgés, aucun n’a rien demandé');
    // LE DÉFAUT, EN UNE LIGNE : la forme PROTÉGÉE disparaît, la forme COMPLÈTE
    // (points horodatés) survit indéfiniment. C'est l'inverse de ce qu'une
    // purge de vie privée devrait produire.
    assert.deepEqual(await traceOf(id(101)), { full: true, masked: false });
    assert.deepEqual(await traceOf(id(102)), { full: true, masked: false });
    assert.deepEqual(await traceOf(id(103)), { full: true, masked: true });
  });

  await test('étape 0 — 0102 planifie cette purge chaque jour, avec 90 écrit en dur', async () => {
    const sql = migration('0102_schedule_polyline_purge.sql');
    assert.ok(sql.includes("'gryd_purge_polylines'"), 'le job porte ce nom');
    assert.ok(sql.includes('purge_expired_polylines(90)'), 'et cette rétention uniforme');
    assert.ok(/cron\.schedule\(/.test(sql), 'et il est bien ordonnancé');
  });

  // On remet les traces effacées par l'étape 0 : la suite juge les MIGRATIONS
  // du lot, pas les séquelles d'une démonstration.
  await db.query(
    "update public.runs set polyline_masked='[[49.44,1.09],[49.45,1.10]]' where polyline_masked is null",
  );

  // ════════════════════════════════════════════════════════════════════════
  // LES MIGRATIONS DU LOT
  // ════════════════════════════════════════════════════════════════════════
  await apply('0195_trace_retention_2026.sql');
  await apply('0196_trace_retention_job_2026.sql');

  await test('0195 s’applique sans effacer un seul tracé, et pose « keep » partout', async () => {
    assert.deepEqual(await traceOf(id(101)), { full: true, masked: true });
    const rows = await q('select user_id,trace_retention_2026 from public.user_profiles order by handle');
    assert.deepEqual(rows.map((r) => r.trace_retention_2026), ['keep', 'keep']);
    // Le journal n'a rien à raconter : aucune purge n'a eu lieu à l'application.
    assert.equal(await one('select count(*)::int from public.trace_purge_log_2026'), 0);
  });

  await test('la lecture rend la conservation, et l’absence de profil n’en invente pas une', async () => {
    const mine = await as(1, () => one('select my_privacy_settings_2026()'));
    assert.equal(mine.traceRetention, 'keep');
    assert.equal(mine.hasProfile, true);
    // Compte sans ligne de profil : `keep` y est le FAIT exact (le job ne le
    // voit pas), et `hasProfile:false` dit que rien n’a été choisi.
    const none = await as(3, () => one('select my_privacy_settings_2026()'));
    assert.equal(none.hasProfile, false);
    assert.equal(none.traceRetention, 'keep');
    assert.equal(await as(null, () => one('select my_privacy_settings_2026()')), null);
  });

  await test('LE DÉFAUT NE PURGE RIEN — même 400 jours plus tard', async () => {
    const out = await one("select purge_traces_by_retention_2026(now()+interval '400 days')");
    assert.deepEqual({ p: out.purged, h: out.heldForReview }, { p: 0, h: 0 });
    assert.deepEqual(await traceOf(id(101)), { full: true, masked: true });
    assert.deepEqual(await traceOf(id(102)), { full: true, masked: true });
    // …et le passage est journalisé MÊME À VIDE : un job mort et un job sans
    // travail ne doivent pas se ressembler.
    const log = (await q("select * from public.trace_purge_log_2026 where source='retention_job'"))[0];
    assert.equal(log.runs_purged, 0);
    assert.ok(log.measured_at !== null);
  });

  await test('les valeurs hors domaine sont refusées et n’écrivent rien', async () => {
    for (const arg of ["'forever'", "'90'", "'days_30'", 'null', "''"]) {
      await assert.rejects(
        () => as(1, () => one(`select set_trace_retention_2026(${arg})`)),
        /invalid_trace_retention/,
        `refus attendu pour ${arg}`,
      );
    }
    await assert.rejects(
      () => as(null, () => one("select set_trace_retention_2026('days_90')")),
      /authentication_required/,
    );
    await assert.rejects(
      () => as(3, () => one("select set_trace_retention_2026('days_90')")),
      /profile_required/,
    );
    assert.equal(
      await one("select count(*)::int from public.user_profiles where trace_retention_2026<>'keep'"),
      0,
    );
  });

  await test('« 90 jours » efface LES DEUX formes à 91 jours, et sur le seul compte qui l’a choisi', async () => {
    // La capture de la sortie : sa géométrie vit ICI, pas sur la trace.
    await db.query(
      "insert into public.capture_events_2026 values($1,$2,$3,'published','MULTIPOLYGON(((0 0,0 1,1 1,0 0)))')",
      [id(201), id(101), id(1)],
    );
    const saved = await as(1, () => one("select set_trace_retention_2026('days_90')"));
    assert.equal(saved.traceRetention, 'days_90');

    // À 89 jours après le départ (la sortie a 200 jours… on mesure donc à un
    // instant PASSÉ) rien n'est dû : la borne est bien une durée depuis le
    // départ, pas un mur de minuit.
    const early = await one("select purge_traces_by_retention_2026(now()-interval '111 days')");
    assert.equal(early.purged, 0, 'à 89 jours de la sortie, rien n’est dû');
    assert.deepEqual(await traceOf(id(101)), { full: true, masked: true });

    const out = await one('select purge_traces_by_retention_2026()');
    assert.deepEqual({ p: out.purged, h: out.heldForReview }, { p: 1, h: 0 });
    // LES DEUX FORMES PARTENT ENSEMBLE.
    assert.deepEqual(await traceOf(id(101)), { full: false, masked: false });
    // La sortie récente du même compte (10 jours) n'est PAS touchée.
    assert.deepEqual(await traceOf(id(103)), { full: true, masked: true });
    // Le compte qui n'a rien choisi garde tout.
    assert.deepEqual(await traceOf(id(102)), { full: true, masked: true });
  });

  await test('la sortie, ses statistiques et son territoire sont INTACTS', async () => {
    const run = (await q(
      `select distance_m,duration_s,avg_pace_s_km,status,points_awarded,xp_awarded
         from public.runs where id=$1`,
      [id(101)],
    ))[0];
    assert.deepEqual(run, {
      distance_m: 10000, duration_s: 3000, avg_pace_s_km: 300,
      status: 'valid', points_awarded: 120, xp_awarded: 45,
    });
    // La capture — donc le terrain — n'a pas bougé d'un caractère.
    const capture = (await q('select run_id,owner_id,status,geometry from public.capture_events_2026'))[0];
    assert.deepEqual(capture, {
      run_id: id(101), owner_id: id(1), status: 'published',
      geometry: 'MULTIPOLYGON(((0 0,0 1,1 1,0 0)))',
    });
  });

  await test('idempotence — un second passage ne touche aucune ligne', async () => {
    const before = await one('select count(*)::int from public.trace_purge_log_2026');
    const out = await one('select purge_traces_by_retention_2026()');
    assert.equal(out.purged, 0);
    // Le passage est quand même journalisé : c'est ce qui prouve qu'il a tourné.
    assert.equal(await one('select count(*)::int from public.trace_purge_log_2026'), before + 1);
  });

  await test('« 1 an » ne se déclenche pas à 91 jours, et se déclenche à 366', async () => {
    await seedRun(id(104), id(2), 100);
    await as(2, () => one("select set_trace_retention_2026('days_365')"));
    const early = await one('select purge_traces_by_retention_2026()');
    assert.equal(early.purged, 0, 'une sortie de 100 jours n’atteint pas 1 an');
    assert.deepEqual(await traceOf(id(104)), { full: true, masked: true });

    const late = await one("select purge_traces_by_retention_2026(now()+interval '266 days')");
    assert.ok(late.purged >= 1);
    assert.deepEqual(await traceOf(id(104)), { full: false, masked: false });
  });

  await test('PLANCHER — une revue anti-triche OUVERTE retient le tracé, et le journal le compte', async () => {
    await seedRun(id(105), id(1), 200);
    await db.query('insert into public.anticheat_reviews values($1,$2,$3,$4)', [
      id(301), id(105), id(1), 'open',
    ]);
    const out = await one('select purge_traces_by_retention_2026()');
    assert.deepEqual({ p: out.purged, h: out.heldForReview }, { p: 0, h: 1 });
    assert.deepEqual(await traceOf(id(105)), { full: true, masked: true });

    // Une revue CLOSE ne retient plus rien : le tracé part au passage suivant.
    await db.query("update public.anticheat_reviews set status='closed' where id=$1", [id(301)]);
    const after = await one('select purge_traces_by_retention_2026()');
    assert.deepEqual({ p: after.purged, h: after.heldForReview }, { p: 1, h: 0 });
    assert.deepEqual(await traceOf(id(105)), { full: false, masked: false });
  });

  await test('PLANCHER — un RECOURS ouvert retient, même sur une revue close', async () => {
    await seedRun(id(106), id(1), 200);
    await db.query("insert into public.anticheat_reviews values($1,$2,$3,'closed')", [
      id(302), id(106), id(1),
    ]);
    await db.query("insert into public.anticheat_appeals values($1,$2,$3,'in_progress')", [
      id(303), id(302), id(1),
    ]);
    const out = await one('select purge_traces_by_retention_2026()');
    assert.deepEqual({ p: out.purged, h: out.heldForReview }, { p: 0, h: 1 });
    assert.deepEqual(await traceOf(id(106)), { full: true, masked: true });
  });

  // ════════════════════════════════════════════════════════════════════════
  // L'EFFACEMENT À LA DEMANDE
  // ════════════════════════════════════════════════════════════════════════
  await test('delete_run_trace_2026 — immédiat, journalisé, et il ne touche que la trace', async () => {
    await seedRun(id(110), id(2), 3);
    await db.query(
      "insert into public.capture_events_2026 values($1,$2,$3,'published','MULTIPOLYGON(((2 2,2 3,3 3,2 2)))')",
      [id(210), id(110), id(2)],
    );
    const out = await as(2, () => one('select delete_run_trace_2026($1)', [id(110)]));
    assert.equal(out.deleted, true);
    assert.deepEqual(await traceOf(id(110)), { full: false, masked: false });
    // La sortie existe toujours, avec ses chiffres et sa capture.
    assert.equal(await one('select distance_m from public.runs where id=$1', [id(110)]), 10000);
    assert.equal(await one('select count(*)::int from public.capture_events_2026 where id=$1', [id(210)]), 1);
    // Le geste est journalisé, nommément, pour le seul demandeur.
    const log = (await q("select * from public.trace_purge_log_2026 where source='on_demand'"))[0];
    assert.deepEqual({ u: log.user_id, r: log.run_id, m: log.measured_at }, {
      u: id(2), r: id(110), m: null,
    });
  });

  await test('delete_run_trace_2026 — idempotente, et un second tap n’ajoute pas une preuve fausse', async () => {
    const before = await one("select count(*)::int from public.trace_purge_log_2026 where source='on_demand'");
    const out = await as(2, () => one('select delete_run_trace_2026($1)', [id(110)]));
    assert.deepEqual({ d: out.deleted, r: out.reason }, { d: false, r: 'already_empty' });
    assert.equal(
      await one("select count(*)::int from public.trace_purge_log_2026 where source='on_demand'"),
      before,
      'un effacement qui n’efface rien ne se journalise pas',
    );
  });

  await test('delete_run_trace_2026 — la sortie d’autrui et l’identifiant inconnu ont le MÊME refus', async () => {
    await seedRun(id(111), id(1), 3);
    await assert.rejects(() => as(2, () => one('select delete_run_trace_2026($1)', [id(111)])), /not_found/);
    await assert.rejects(() => as(2, () => one('select delete_run_trace_2026($1)', [id(999)])), /not_found/);
    assert.deepEqual(await traceOf(id(111)), { full: true, masked: true }, 'rien n’a été touché');
    await assert.rejects(
      () => as(null, () => one('select delete_run_trace_2026($1)', [id(111)])),
      /authentication_required/,
    );
  });

  await test('delete_run_trace_2026 — refus NOMMÉ tant qu’une revue est ouverte', async () => {
    await db.query("insert into public.anticheat_reviews values($1,$2,$3,'in_progress')", [
      id(304), id(111), id(1),
    ]);
    await assert.rejects(() => as(1, () => one('select delete_run_trace_2026($1)', [id(111)])), /review_open/);
    assert.deepEqual(await traceOf(id(111)), { full: true, masked: true });
    // Dossier clos : le joueur reprend la main sur SA donnée.
    await db.query("update public.anticheat_reviews set status='closed' where id=$1", [id(304)]);
    assert.equal((await as(1, () => one('select delete_run_trace_2026($1)', [id(111)]))).deleted, true);
  });

  // ════════════════════════════════════════════════════════════════════════
  // DIAGNOSTIC, RUPTURE, MIROIR ET PRIVILÈGES
  // ════════════════════════════════════════════════════════════════════════
  await test('le diagnostic ne crie plus au loup sur un tracé gardé par CHOIX', async () => {
    await db.query("update public.user_profiles set trace_retention_2026='keep'");
    await seedRun(id(120), id(1), 5000); // très vieille, mais gardée par choix
    const health = (await q('select * from public.trace_retention_health_2026'))[0];
    assert.equal(Number(health.traces_overdue), 0, 'aucun retard : personne n’a demandé de purge');
    assert.ok(Number(health.traces_kept_by_choice) >= 1);
    assert.ok(health.last_job_at !== null, 'le passage du job est lisible');
    // …et l'ancienne vue, dont le seuil uniforme ne veut plus rien dire, est partie.
    assert.equal(await one("select to_regclass('public.polyline_retention_health') is null"), true);
  });

  await test('RUPTURE — 0196 retire le job uniforme de 0102 et pose le sien', async () => {
    const sql = migration('0196_trace_retention_job_2026.sql');
    assert.ok(
      /cron\.unschedule\('gryd_purge_polylines'\)/.test(sql),
      'le job qui purgeait sans demander doit être RETIRÉ, sinon il contredirait « keep » chaque nuit',
    );
    assert.ok(/cron\.schedule\(\s*'trace-retention-purge-2026'/.test(sql));
    assert.ok(sql.includes('purge_traces_by_retention_2026()'), 'et il appelle la purge qui obéit');
    // La fonction de 0101 SURVIT (une migration ne se réécrit jamais), et son
    // commentaire dit qu'elle n'est plus ordonnancée.
    assert.equal(await one(`select ${fn('purge_expired_polylines(integer)')}`), true);
    assert.ok(
      (await one("select obj_description('public.purge_expired_polylines(integer)'::regprocedure)"))
        .includes('N\'EST PLUS ORDONNANCÉE'),
    );
  });

  await test('MIROIR — les durées du SQL sont celles de game-rules.ts', async () => {
    const rules = readFileSync(
      new URL('../../packages/shared/src/game-rules.ts', import.meta.url),
      'utf8',
    );
    const section = rules.slice(rules.indexOf('TRACE_RETENTION_DAYS_2026'));
    assert.ok(/days_90:\s*90/.test(section), 'days_90 vaut 90 côté TypeScript');
    assert.ok(/days_365:\s*365/.test(section), 'days_365 vaut 365 côté TypeScript');
    assert.ok(/keep:\s*null/.test(section), 'keep n’a AUCUNE durée');
    // Le SQL ne peut pas lire un module TypeScript : il recopie. Les deux
    // recopies sont confrontées ici, pour qu'une divergence soit rouge.
    const job = migration('0196_trace_retention_job_2026.sql');
    assert.ok(job.includes("when 'days_90'  then 90"));
    assert.ok(job.includes("when 'days_365' then 365"));
    // Et le domaine de la colonne est celui de TRACE_RETENTION_CHOICES_2026 —
    // opposé par un `check`, donc prouvé par un refus RÉEL, pas par une lecture
    // de catalogue.
    assert.ok(rules.includes("TRACE_RETENTION_CHOICES_2026 = ['keep', 'days_90', 'days_365']"));
    await assert.rejects(
      () => db.query("update public.user_profiles set trace_retention_2026='days_30'"),
      /user_profiles_trace_retention_2026_check/,
    );
  });

  await test('privilèges — jamais public ni anon ; la purge globale est service_role SEUL', async () => {
    const client = ['set_trace_retention_2026(text)', 'delete_run_trace_2026(uuid)', 'my_privacy_settings_2026()'];
    for (const signature of client) {
      assert.equal(
        await one(`select has_function_privilege('anon','public.${signature}','execute')`), false,
        `anon ne doit pas exécuter ${signature}`,
      );
      for (const role of ['authenticated', 'service_role']) {
        assert.equal(
          await one(`select has_function_privilege($1,'public.${signature}','execute')`, [role]), true,
          `${role} doit exécuter ${signature}`,
        );
      }
      assert.equal(
        await one(
          `select coalesce(bool_or(a.privilege_type='EXECUTE'),false) from pg_proc p,
             aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
           where p.oid='public.${signature}'::regprocedure and a.grantee=0`,
        ),
        false,
        `PUBLIC ne doit pas exécuter ${signature}`,
      );
    }
    // La purge GLOBALE : ni anon, ni authenticated. Un joueur qui pourrait la
    // déclencher choisirait le moment d'effacer les traces des autres.
    for (const role of ['anon', 'authenticated']) {
      assert.equal(
        await one(
          `select has_function_privilege($1,'public.purge_traces_by_retention_2026(timestamptz)','execute')`,
          [role],
        ),
        false,
      );
    }
    assert.equal(
      await one(
        `select has_function_privilege('service_role','public.purge_traces_by_retention_2026(timestamptz)','execute')`,
      ),
      true,
    );
    // Le journal et le diagnostic ne sont servis à aucun client.
    for (const object of ['public.trace_purge_log_2026', 'public.trace_retention_health_2026']) {
      for (const role of ['anon', 'authenticated']) {
        assert.equal(
          await one(`select has_table_privilege($1,$2,'select')`, [role, object]), false,
          `${role} ne doit pas lire ${object}`,
        );
      }
    }
  });

  console.log(
    `${passed} contrôles PostgreSQL passés (0195/0196). RLS non prouvée ici : PGlite est superutilisateur.`,
  );
} finally {
  await db.close();
}
