/**
 * GRYD — 0197 : UNE SORTIE PEUT NE COMPTER QUE POUR LE SPORT.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL EST LU DANS LES FICHIERS DÉPLOYÉS ══
 * Avant ce lot, RIEN dans le schéma ne savait dire « cette sortie compte pour
 * le sport et pour rien d'autre ». On le prouve fichier par fichier :
 *   · 0155 `stage_capture_2026` n'a aucune notion de « sport seulement » : une
 *     sortie gardée en course arrivait en `scheduled`, donc prenait du terrain,
 *     donc entrait dans `board_eligible_events_2026` une fois publiée ;
 *   · 0155 `capture_state_for_reason_2026` range tout motif inconnu en
 *     `pending` — le motif du joueur serait tombé dans le purgatoire de 0118 ;
 *   · 0169 `stage_game_activity_2026` ne lit jamais un tel motif : sa garde de
 *     face n'exclut que `withdrawn`, `consent_withdrawn` et `source_deleted`,
 *     et laisse donc passer un événement `rejected` ;
 *   · 0167 `weekly_quest_satisfied_2026`, branche `validated_group_outing`,
 *     lit `runs` DIRECTEMENT sans le moindre filtre de ce genre.
 * Le dernier point est REJOUÉ pour de vrai ci-dessous : la même quête est
 * satisfaite avant 0197 et ne l'est plus après. Sans cette étape, rien ne
 * distinguerait 0197 d'un no-op.
 *
 * ═══ CE QUE PGlite PROUVE ICI ══════════════════════════════════════════════
 * La colonne et sa contrainte, la famille du motif (terminal, pas « en
 * attente »), l'exclusion RÉELLE d'une quête de la semaine, le catalogue de
 * notifications et son producteur, et les privilèges.
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 * PGlite tourne en SUPERUTILISATEUR et n'a pas PostGIS : les effets
 * géométriques de `stage_capture_2026` (donc l'insertion d'un événement en
 * `rejected` plutôt qu'en `scheduled`) ne sont pas exécutables ici. Ils sont
 * vérifiés par LECTURE du fichier, comme le fait déjà
 * `crew_challenge_measure_2026.pglite.test.mjs` pour la lignée des défis, et
 * aucun vert de ce fichier ne prétend avoir mesuré une aire.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
const ids = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const read = (f) => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');

const M0155 = read('0155_capture_admission_2026.sql');
const M0167 = read('0167_weekly_quests_2026_assignment.sql');
const M0169 = read('0169_challenge_measure_after_capture_admission_2026.sql');
const M0192 = read('0192_notification_inbox_2026.sql');
const M0197 = read('0197_sport_only_runs_2026.sql');
const RULES = readFileSync(new URL('../../packages/shared/src/game-rules.ts', import.meta.url), 'utf8');

/** Une section de 0197, depuis son titre jusqu'au suivant. */
const section = (title) => {
  const from = M0197.indexOf(title);
  assert.ok(from > 0, `section « ${title} » introuvable dans 0197`);
  const next = M0197.indexOf('\n-- ── ', from + title.length);
  return M0197.slice(from, next < 0 ? M0197.length : next);
};

try {
  // ════════════════════════════════════════════════════════════════════════
  // ÉTAPE 0 — CE QUE LES FICHIERS DÉPLOYÉS DISENT
  // ════════════════════════════════════════════════════════════════════════

  await test('ÉTAPE 0 — aucun fichier déployé ne connaît « sport seulement »', () => {
    for (const [nom, sql] of [['0155', M0155], ['0167', M0167], ['0169', M0169]]) {
      assert.ok(!sql.includes('sport_only_reason_2026'),
        `${nom} ne doit rien savoir de la colonne ; sinon ce test ne parle plus du défaut`);
    }
  });

  await test('ÉTAPE 0 — 0155 range tout motif inconnu dans le purgatoire `pending`', () => {
    const famille = M0155.slice(M0155.indexOf('create function public.capture_state_for_reason_2026'));
    assert.ok(famille.includes("'clock_drift_too_large','receipt_window_expired','closure_crosses_known_barrier'"),
      'la liste terminale de 0155 est bien celle-là');
    assert.ok(!famille.includes('discipline_mismatch_kept'),
      'et elle ne contient PAS le motif du joueur : il serait tombé en `pending`');
  });

  await test('ÉTAPE 0 — la garde de face de 0169 laisse passer un événement `rejected`', () => {
    const garde = M0169.slice(M0169.indexOf("status<>'withdrawn'"));
    assert.ok(garde.startsWith("status<>'withdrawn' and coalesce(reason,'') not in('consent_withdrawn','source_deleted')"),
      'elle n’exclut que trois cas, aucun terminal : un `rejected` la traverse');
  });

  // ════════════════════════════════════════════════════════════════════════
  // 1. LA COLONNE ET SA CONTRAINTE
  // ════════════════════════════════════════════════════════════════════════

  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create table public.users(id uuid primary key, deletion_requested_at timestamptz);
    create table public.runs(
      id uuid primary key, user_id uuid references public.users(id), client_run_id uuid,
      activity text, source text, started_at timestamptz, created_at timestamptz default now(),
      status text, ruleset_version text not null default 'legacy');
  `);
  await db.query('insert into public.users values($1,null)', [ids(1)]);

  await test('ÉTAPE 0 — la colonne n’existait pas', async () => {
    assert.equal(
      await one("select count(*) from information_schema.columns where table_name='runs' and column_name='sport_only_reason_2026'"),
      0,
    );
  });

  await db.exec(section('-- ── 1. LA COLONNE'));

  await test('la colonne est NULLABLE : aucune sortie existante ne change de sens', async () => {
    await db.query(
      "insert into public.runs(id,user_id,activity,started_at,status,ruleset_version) values($1,$2,'run',now(),'valid','2026.1')",
      [ids(10), ids(1)],
    );
    assert.equal(await one('select sport_only_reason_2026 from public.runs where id=$1', [ids(10)]), null);
  });

  await test('seul un motif du registre est acceptable — pas de texte libre', async () => {
    await db.query("update public.runs set sport_only_reason_2026='discipline_mismatch_kept' where id=$1", [ids(10)]);
    assert.equal(await one('select sport_only_reason_2026 from public.runs where id=$1', [ids(10)]), 'discipline_mismatch_kept');
    await assert.rejects(
      db.query("update public.runs set sport_only_reason_2026='parce_que' where id=$1", [ids(10)]),
      /runs_sport_only_reason_2026_check/,
      'un motif inventé doit être refusé par la base, pas par la bonne volonté du serveur',
    );
  });

  await test('le registre SQL et le registre TypeScript disent la même chose', () => {
    const ts = RULES.slice(RULES.indexOf('export const SPORT_ONLY_REASONS_2026'));
    const motifs = [...ts.slice(0, ts.indexOf(']')).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    assert.deepEqual(motifs, ['discipline_mismatch_kept']);
    for (const motif of motifs) {
      assert.ok(M0197.includes(`'${motif}'`), `0197 doit connaître ${motif}`);
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // 2. LE MOTIF EST TERMINAL, PAS « EN ATTENTE »
  // ════════════════════════════════════════════════════════════════════════

  await db.exec(M0155.slice(
    M0155.indexOf('create function public.capture_state_for_reason_2026'),
    M0155.indexOf('revoke all on function public.capture_state_for_reason_2026'),
  ));

  await test('ÉTAPE 0 — avant 0197, le motif du joueur était rangé en `pending`', async () => {
    assert.equal(await one("select public.capture_state_for_reason_2026('discipline_mismatch_kept')"), 'pending',
      'purgatoire : la sortie aurait attendu un terrain qui ne vient jamais');
  });

  await db.exec(section('-- ── 2. LE MOTIF CHOISIT SON CAMP'));

  await test('0197 le range en `rejected` — une réponse donnée ne se rouvre pas', async () => {
    assert.equal(await one("select public.capture_state_for_reason_2026('discipline_mismatch_kept')"), 'rejected');
  });

  await test('les trois motifs terminaux d’origine ne bougent pas', async () => {
    for (const motif of ['clock_drift_too_large', 'receipt_window_expired', 'closure_crosses_known_barrier']) {
      assert.equal(await one('select public.capture_state_for_reason_2026($1)', [motif]), 'rejected', motif);
    }
    for (const motif of ['verification_required', 'source_or_clock_unconfirmed']) {
      assert.equal(await one('select public.capture_state_for_reason_2026($1)', [motif]), 'pending', motif);
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // 3. L'ADMISSION ET LES DÉFIS — LECTURE DE FICHIER (PGlite n'a pas PostGIS)
  // ════════════════════════════════════════════════════════════════════════

  await test('0197 pose la garde DANS l’admission, avant toute autre raison', () => {
    const stage = M0197.slice(
      M0197.indexOf('create or replace function public.stage_capture_2026('),
      M0197.indexOf('revoke all on function public.stage_capture_2026'),
    );
    const branche = stage.indexOf('if r.sport_only_reason_2026 is not null then');
    assert.ok(branche > 0, 'la branche existe');
    assert.ok(branche < stage.indexOf("why:='shared_map_not_authorized'"),
      'elle passe avant la confidentialité, comme le dit son commentaire');
    assert.ok(stage.includes('state:=public.capture_state_for_reason_2026(r.sport_only_reason_2026);'),
      'et elle dérive son état de la famille du motif, jamais d’un littéral');
    // Le corps de 0155 est REPRIS : la réévaluation et la mesure de face ne
    // doivent pas disparaître au passage.
    assert.ok(stage.includes("for e in select * from public.capture_events_2026 where run_id=r.id and status='pending' loop"),
      'la réévaluation de 0155 survit');
    assert.ok(stage.includes('public.capture_admission_2026('), 'et l’admission scalaire aussi');
  });

  await test('0197 arrête la mesure des défis AVANT la première boucle', () => {
    const stage = M0197.slice(
      M0197.indexOf('create or replace function public.stage_game_activity_2026('),
      M0197.indexOf('revoke all on function public.stage_game_activity_2026'),
    );
    const garde = stage.indexOf('if run.sport_only_reason_2026 is not null then return; end if;');
    assert.ok(garde > 0, 'la garde existe');
    assert.ok(garde < stage.indexOf('for c in select ch.*'),
      'et elle est posée avant la boucle sur les défis');
    // GARDE-FOU DE 0169 : la mesure reste DÉLÉGUÉE. Recopier un `ST_Boundary`
    // ici referait le défaut que 0169 existe pour empêcher.
    assert.ok(stage.includes('public.challenge_sector_metres_2026(p_segments'),
      'la mesure « dans le secteur » reste déléguée (garde-fou 0169)');
    assert.ok(!stage.includes('ST_Boundary'), 'aucune mesure recopiée');
  });

  // ════════════════════════════════════════════════════════════════════════
  // 4. LES QUÊTES DE LA SEMAINE — REJOUÉES POUR DE VRAI
  // ════════════════════════════════════════════════════════════════════════

  await db.exec(`
    create table public.weekly_quest_rules_2026(
      group_outing_minimum_participants integer not null default 2,
      group_outing_proximity_hours integer not null default 3,
      locality_tile_degrees double precision not null default 0.02);
    insert into public.weekly_quest_rules_2026 default values;
    create table public.weekly_quests_2026(quest_id text primary key, condition text, threshold integer);
    insert into public.weekly_quests_2026 values('group','validated_group_outing',1);
    create table public.weekly_quest_faces_2026(
      event_id uuid primary key, run_id uuid, owner_id uuid, activity text,
      closed_at timestamptz, locality text, signature text, area_m2 double precision);
    create table public.capture_events_2026(id uuid primary key, status text, reason text);
    create table public.crew_events(
      id uuid primary key, crew_id uuid, activity text, starts_at timestamptz,
      cancelled_at_2026 timestamptz, created_by uuid);
    create table public.crew_event_rsvps(event_id uuid, user_id uuid, choice text, updated_at timestamptz);
    create table public.crew_members(user_id uuid, crew_id uuid, left_at timestamptz);
    create table public.progress_accounts_2026(user_id uuid primary key, ledger jsonb);
    create table public.progress_activity_2026(run_id uuid primary key, user_id uuid, evidence jsonb);
    create function public.weekly_quest_week_bounds_2026(p_week_start date)
      returns table(starts_at timestamptz, ends_at timestamptz, expires_at timestamptz)
      language sql immutable as $$ select p_week_start::timestamptz, (p_week_start+7)::timestamptz, (p_week_start+14)::timestamptz $$;
    create function public.weekly_quest_active_days_2026(p_user_id uuid, p_week_start date)
      returns table(day date, has_run boolean, has_bike boolean)
      language sql stable as $$ select null::date, null::boolean, null::boolean where false $$;
  `);

  const WEEK = '2026-09-07';
  await db.query('insert into public.users values($1,null)', [ids(2)]);
  await db.query('insert into public.crew_members values($1,$2,null),($3,$2,null)', [ids(1), ids(50), ids(2)]);
  await db.query(
    "insert into public.crew_events values($1,$2,'run',$3,null,$4)",
    [ids(60), ids(50), `${WEEK}T09:00:00Z`, ids(2)],
  );
  await db.query(
    "insert into public.crew_event_rsvps values($1,$2,'coming',$3),($1,$4,'coming',$3)",
    [ids(60), ids(1), `${WEEK}T07:00:00Z`, ids(2)],
  );
  await db.query(
    "insert into public.runs(id,user_id,activity,started_at,status,ruleset_version) values($1,$2,'run',$3,'valid','2026.1')",
    [ids(11), ids(1), `${WEEK}T09:10:00Z`],
  );

  const quest0167 = M0167.slice(
    M0167.indexOf('create function public.weekly_quest_satisfied_2026('),
    M0167.indexOf("-- ── 5. L'attribution"),
  );
  await db.exec(quest0167);

  await test('ÉTAPE 0 — avant 0197, une sortie « gardée » validait la quête de groupe', async () => {
    assert.equal(
      await one('select public.weekly_quest_satisfied_2026($1,$2,$3,$4)', [ids(1), 'run', WEEK, 'group']),
      true,
      'la quête est bien satisfaite par la sortie honnête',
    );
    await db.query("update public.runs set sport_only_reason_2026='discipline_mismatch_kept' where id=$1", [ids(11)]);
    assert.equal(
      await one('select public.weekly_quest_satisfied_2026($1,$2,$3,$4)', [ids(1), 'run', WEEK, 'group']),
      true,
      'ET par la même sortie marquée « sport seulement » : le défaut est RÉEL',
    );
  });

  await db.exec(section('-- ── 5. LES QUÊTES DE LA SEMAINE'));

  await test('après 0197, la sortie « sport seulement » ne valide plus la quête', async () => {
    assert.equal(
      await one('select public.weekly_quest_satisfied_2026($1,$2,$3,$4)', [ids(1), 'run', WEEK, 'group']),
      false,
    );
  });

  await test('… et une sortie NORMALE la valide toujours (aucun dommage collatéral)', async () => {
    await db.query('update public.runs set sport_only_reason_2026=null where id=$1', [ids(11)]);
    assert.equal(
      await one('select public.weekly_quest_satisfied_2026($1,$2,$3,$4)', [ids(1), 'run', WEEK, 'group']),
      true,
    );
  });

  // ════════════════════════════════════════════════════════════════════════
  // 5. LA NOTIFICATION
  // ════════════════════════════════════════════════════════════════════════

  await db.exec(`
    create table public.notifications(
      id uuid primary key default gen_random_uuid(), user_id uuid, type text,
      priority smallint, payload jsonb, created_at timestamptz default now(),
      read_at timestamptz, event_id text);
    create unique index notifications_event_unique on public.notifications(user_id,event_id) where event_id is not null;
  `);
  await db.exec(M0192.slice(
    M0192.indexOf('create function public.notification_kinds_2026()'),
    M0192.indexOf('create function public.notification_deep_link_2026('),
  ));
  await db.exec(M0192.slice(
    M0192.indexOf('create function public.notification_inbox_write_2026('),
    M0192.indexOf('$$;', M0192.indexOf('create function public.notification_inbox_write_2026(')) + 3,
  ));

  await test('ÉTAPE 0 — le fait `run_sport_only` n’existait pas au catalogue', async () => {
    assert.equal(await one("select count(*) from public.notification_kinds_2026() where kind='run_sport_only'"), 0);
  });

  await db.exec(section('-- ── 6. LE FAIT, DANS LA BOÎTE'));
  await db.exec(section('-- ── 7. LE PRODUCTEUR'));

  await test('le catalogue SQL et le catalogue TypeScript portent le MÊME fait', async () => {
    const row = (await q("select * from public.notification_kinds_2026() where kind='run_sport_only'"))[0];
    assert.ok(row, 'le fait existe côté SQL');
    const ts = RULES.slice(RULES.indexOf('  run_sport_only: {'));
    const bloc = ts.slice(0, ts.indexOf('\n  },'));
    assert.ok(bloc.includes("category: 'results'"), 'même catégorie');
    assert.ok(bloc.includes('transactional: true'), 'même transactionnalité');
    assert.ok(bloc.includes('priority: 2'), 'même priorité');
    assert.ok(bloc.includes("emoji: '⚠️'"), 'même emoji');
    assert.ok(bloc.includes("family: 'result'"), 'même famille');
    assert.equal(row.category, 'results');
    assert.equal(row.transactional, true);
    assert.equal(Number(row.priority), 2);
    assert.equal(row.emoji, '⚠️');
    assert.equal(row.family, 'result');
    assert.equal(row.deep_link, '/course/{runId}');
  });

  await test('poser le motif écrit UNE notification, et une seule', async () => {
    await db.query(
      "insert into public.runs(id,user_id,activity,started_at,status,ruleset_version,sport_only_reason_2026) values($1,$2,'run',now(),'valid','2026.1','discipline_mismatch_kept')",
      [ids(12), ids(1)],
    );
    const rows = await q("select type,priority,payload,event_id from public.notifications where user_id=$1", [ids(1)]);
    assert.equal(rows.length, 1, 'une ligne, écrite à l’INSERT');
    assert.equal(rows[0].type, 'result');
    assert.equal(Number(rows[0].priority), 2);
    assert.equal(rows[0].payload.event, 'run_sport_only');
    assert.equal(rows[0].payload.runId, ids(12));
    assert.equal(rows[0].event_id, `run_sport_only:${ids(12)}`);
    // Réécrire le MÊME motif ne réannonce rien (idempotence de §14.3).
    await db.query("update public.runs set sport_only_reason_2026='discipline_mismatch_kept' where id=$1", [ids(12)]);
    assert.equal(await one('select count(*) from public.notifications where user_id=$1', [ids(1)]), 1);
  });

  await test('une sortie SANS motif n’annonce rien', async () => {
    await db.query(
      "insert into public.runs(id,user_id,activity,started_at,status,ruleset_version) values($1,$2,'run',now(),'valid','2026.1')",
      [ids(13), ids(2)],
    );
    assert.equal(await one('select count(*) from public.notifications where user_id=$1', [ids(2)]), 0);
  });

  await test('poser le motif APRÈS coup annonce aussi (le fait est l’état, pas l’instant)', async () => {
    await db.query("update public.runs set sport_only_reason_2026='discipline_mismatch_kept' where id=$1", [ids(13)]);
    assert.equal(await one('select count(*) from public.notifications where user_id=$1', [ids(2)]), 1);
  });

  // ════════════════════════════════════════════════════════════════════════
  // 6. PRIVILÈGES — RIEN DE NEUF N'EST OUVERT
  // ════════════════════════════════════════════════════════════════════════

  await test('le producteur de notification n’est exécutable par personne d’exposé', async () => {
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(
        await one("select has_function_privilege($1,'public.notify_run_sport_only_2026()','execute')", [role]),
        false,
        role,
      );
    }
  });

  await test('0197 n’accorde AUCUN droit d’écriture nouveau sur `runs`', () => {
    assert.ok(!/grant\s+(insert|update|all)[^;]*on\s+table\s+public\.runs/i.test(M0197),
      'la colonne reste écrite par le serveur seul (constitution : écriture client interdite)');
    assert.ok(!/create\s+policy/i.test(M0197),
      '0197 ne touche à aucune policy : la ligne `runs` était déjà bornée à son propriétaire');
  });

  console.log(`\n${passed} tests OK`);
} catch (error) {
  console.error(`\nÉCHEC après ${passed} tests :`, error.message);
  process.exitCode = 1;
}
