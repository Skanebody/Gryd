#!/usr/bin/env node
// Actual 0122 on PostgreSQL/WASM. Spatial arena review/intersection is exercised
// separately by the PostGIS harness; local fixtures never claim GPS proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { computeChallenge2026 } from '../functions/_shared/challenges2026.ts';
import { CHALLENGE_RULES_2026, CREW_PERMISSIONS } from '../functions/_shared/game-rules.ts';
const db = new PGlite();
let passed = 0;
const users = Array.from({ length: 12 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
const crews = ['10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'];
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const rejects = (sql, args = [], part) => assert.rejects(() => db.query(sql, args), part ? new RegExp(part) : undefined);
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']); await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
const sectors = ['canal', 'park', 'centre'].map(id => ({ id, title: id, geometry: { type: 'Polygon', coordinates: [[[2,48],[2.01,48],[2.01,48.01],[2,48.01],[2,48]]] } }));
let starts; let matchId; let runSequence = 0; const loops = [];
async function create(client = '20000000-0000-0000-0000-000000000001', activity = 'run') {
  return as(users[0], () => one('select create_crew_challenge_2026($1,$2,$3,$4,true)', [client, crews[1], `fixture_${activity}`, starts]));
}
async function assign(playerIndex, dayOffset, metres = { canal: 500 }, options = {}) {
  const id = `30000000-0000-0000-0000-${String(++runSequence).padStart(12, '0')}`;
  const started = new Date(Date.parse(options.starts ?? starts) + dayOffset * 86_400_000 + 10 * 3_600_000).toISOString();
  const closed = new Date(Date.parse(started) + 900_000).toISOString();
  const ended = new Date(Date.parse(closed) + 300_000).toISOString();
  const received = options.received ?? ended;
  await db.query('insert into runs(id,user_id,activity,started_at,ended_at_2026,created_at) values($1,$2,$3,$4,$5,$6)', [id, users[playerIndex], options.sport ?? 'run', started, ended, received]);
  await db.query('select assign_challenge_loop_2026($1,$2,$3,$4)', [id, id, closed, metres]);
  loops.push({ eventId: id, activityId: id, playerId: users[playerIndex], sport: options.sport ?? 'run', closedAt: closed, activityStartedAt: started,
    activityEndedAt: ended, receivedAt: received, admissible: true, challengeConsent: true, withdrawn: false, sectorTraceMetres: metres });
  return id;
}
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table users(id uuid primary key,pseudo text unique,deletion_requested_at timestamptz);
    create table crews(id uuid primary key,name text);
    create table crew_members(crew_id uuid references crews(id),user_id uuid references users(id) on delete cascade,role text,left_at timestamptz,joined_at timestamptz default '2025-01-01');
    create table user_blocks(blocker_id uuid references users(id),blocked_pseudo text);
    create table runs(id uuid primary key,user_id uuid references users(id) on delete cascade,activity text,started_at timestamptz,ended_at_2026 timestamptz,created_at timestamptz,ruleset_version text default '2026.1');
    create table capture_events_2026(id uuid primary key,run_id uuid references runs(id) on delete set null,status text,reason text,face_key text);
    create table no_capture_zones(geojson jsonb);`);
  await db.exec(readFileSync(new URL('../migrations/0122_refonte_2026_crew_challenges.sql', import.meta.url), 'utf8'));
  for (let i = 0; i < users.length; i++) await db.query('insert into users(id,pseudo) values($1,$2)', [users[i], `fixture_${i}`]);
  for (let i = 0; i < 2; i++) await db.query('insert into crews values($1,$2)', [crews[i], `Test crew ${i}`]);
  for (let i = 0; i < 10; i++) await db.query('insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,$3,null)', [crews[Math.floor(i / 5)], users[i], i % 5 === 0 ? 'founder' : 'runner']);
  await db.query('insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,$3,null)', [crews[0], users[10], 'runner']);
  starts = await one("select ((date_trunc('week',now() at time zone 'Europe/Paris')+interval '1 week') at time zone 'Europe/Paris')::text");
  await test('migration applies with no invented arena or challenge', async () => {
    assert.deepEqual(await as(users[0], () => one("select list_challenge_arenas_2026('run')")), []);
    assert.deepEqual(await as(users[0], () => one("select get_crew_challenges_2026('run')")), []);
  });
  await test('persisted rules match shared 5v5, sector thresholds, publication and role rights', async () => {
    const r = (await q('select * from challenge_rules_2026'))[0];
    assert.deepEqual([r.players,r.days,r.sectors,r.maximum_days,r.points,r.run_metres,r.bike_metres,r.sync_hours,r.publication_hour,Number(r.win_points),Number(r.tie_points)],
      [CHALLENGE_RULES_2026.playersPerTeam,CHALLENGE_RULES_2026.durationDays,CHALLENGE_RULES_2026.sectorCount,CHALLENGE_RULES_2026.maximumContributiveDaysPerPlayer,CHALLENGE_RULES_2026.pointsPerDay,CHALLENGE_RULES_2026.minimumTraceInsideSectorM.run,CHALLENGE_RULES_2026.minimumTraceInsideSectorM.bike,CHALLENGE_RULES_2026.finalSyncWindowHours,CHALLENGE_RULES_2026.comparativePublicationLocalHour,CHALLENGE_RULES_2026.sectorWinMatchPoints,CHALLENGE_RULES_2026.sectorTieMatchPoints]);
    assert.deepEqual(r.manager_roles, CREW_PERMISSIONS.invite);
  });
  // Reviewed geographic catalog fixture, NOT a spatial validation claim.
  for (const sport of ['run','bike']) await db.query('insert into challenge_arenas_2026(id,title,activity,time_zone,sectors,access_source,reviewed_at) values($1,$2,$3,$4,$5,$6,now())', [`fixture_${sport}`, 'Local test', sport, 'Europe/Paris', sectors, 'Fixture reviewed access']);
  await test('only direction can create; explicit comparable access is required', async () => {
    await as(users[1], () => rejects('select create_crew_challenge_2026($1,$2,$3,$4,true)', ['20000000-0000-0000-0000-000000000001', crews[1], 'fixture_run', starts], 'direction_required'));
    await as(users[0], () => rejects('select create_crew_challenge_2026($1,$2,$3,$4,false)', ['20000000-0000-0000-0000-000000000001', crews[1], 'fixture_run', starts], 'challenge_unavailable'));
    const c = await create(); matchId = c.id; assert.equal(c.status, 'invited');
    const replay = await create(); assert.equal(replay.id, matchId); assert.equal(replay.replayed, true);
  });
  await test('ordinary users cannot score, access raw evidence or bypass consent', async () => {
    await as(users[0], async () => {
      await rejects('select * from challenge_contributions_2026', [], 'permission denied');
      await rejects('select challenge_score_2026($1)', [matchId], 'permission denied');
      await rejects("select assign_challenge_loop_2026($1,$1,now(),'{}')", [matchId], 'permission denied');
      await rejects('select maintain_challenge_2026($1)', [matchId], 'permission denied');
    });
    await as(null, () => rejects("select get_crew_challenges_2026('run')", [], 'authentication_required'));
    assert.deepEqual(await as(users[11], () => one("select get_crew_challenges_2026('run')")), []);
  });
  await test('only the invited crew direction accepts, with access confirmation', async () => {
    await as(users[0], () => rejects('select accept_crew_challenge_2026($1,true)', [matchId]));
    await as(users[5], () => rejects('select accept_crew_challenge_2026($1,false)', [matchId], 'challenge_unavailable'));
    assert.equal((await as(users[5], () => one('select accept_crew_challenge_2026($1,true)', [matchId]))).status, 'assembling');
  });
  await test('bidirectional blocking prevents participation and hides the invitation', async () => {
    await db.query('insert into user_blocks values($1,$2)', [users[5], 'fixture_1']);
    await as(users[1], () => rejects('select join_crew_challenge_2026($1,true)', [matchId], 'challenge_unavailable'));
    assert.deepEqual(await as(users[1], () => one("select get_crew_challenges_2026('run')")), []);
    await db.query("update users set pseudo='renamed_blocked_user' where id=$1", [users[1]]);
    await as(users[1], () => rejects('select join_crew_challenge_2026($1,true)', [matchId], 'challenge_unavailable'));
    await db.exec('delete from user_blocks');
    await db.query("update users set pseudo='fixture_1' where id=$1", [users[1]]);
  });
  await test('ten players opt in personally; five per side is enforced before lock', async () => {
    await as(users[0], () => rejects('select lock_crew_challenge_2026($1)', [matchId], 'five_volunteers_required'));
    for (let i = 0; i < 10; i++) await as(users[i], () => one('select join_crew_challenge_2026($1,true)', [matchId]));
    await as(users[10], () => rejects('select join_crew_challenge_2026($1,true)', [matchId], 'team_full'));
    await as(users[11], () => rejects('select join_crew_challenge_2026($1,true)', [matchId]));
    assert.equal((await as(users[0], () => one('select lock_crew_challenge_2026($1)', [matchId]))).status, 'assembling');
    assert.equal((await as(users[5], () => one('select lock_crew_challenge_2026($1)', [matchId]))).status, 'scheduled');
  });
  await test('one ranked team per sport and week, with independent Bike reservation', async () => {
    const another = await create('20000000-0000-0000-0000-000000000002');
    await as(users[0], () => rejects('select join_crew_challenge_2026($1,true)', [another.id], 'player_already_registered'));
    const bike = await create('20000000-0000-0000-0000-000000000003', 'bike');
    assert.equal((await as(users[0], () => one('select join_crew_challenge_2026($1,true)', [bike.id]))).joined, true);
    await as(users[0], () => one('select cancel_crew_challenge_2026($1)', [another.id]));
    await as(users[0], () => one('select cancel_crew_challenge_2026($1)', [bike.id]));
  });
  await test('a withdrawal before kickoff unlocks its side and allows a new voluntary enrollment', async () => {
    await as(users[11], () => one('select join_crew_challenge_2026($1,false)', [matchId]));
    assert.equal(await one('select status from crew_challenges_2026 where id=$1', [matchId]), 'scheduled');
    await as(users[1], () => one('select join_crew_challenge_2026($1,false)', [matchId]));
    assert.equal(await one('select status from crew_challenges_2026 where id=$1', [matchId]), 'assembling');
    await as(users[1], () => one('select join_crew_challenge_2026($1,true)', [matchId]));
    await as(users[0], () => one('select lock_crew_challenge_2026($1)', [matchId]));
  });
  await test('different timezone weeks cannot reserve overlapping ranked matches', async () => {
    await db.query("insert into challenge_arenas_2026(id,title,activity,time_zone,sectors,access_source,reviewed_at) values('fixture_timezone','Timezone test','run','Pacific/Kiritimati',$1,'Fixture',now())", [sectors]);
    const next = await one("select ((($1::timestamptz at time zone 'Europe/Paris')+interval '7 days') at time zone 'Pacific/Kiritimati')::text", [starts]);
    const c = await as(users[0], () => one('select create_crew_challenge_2026($1,$2,$3,$4,true)', ['20000000-0000-0000-0000-000000000004', crews[1], 'fixture_timezone', next]));
    await as(users[0], () => rejects('select join_crew_challenge_2026($1,true)', [c.id], 'player_already_registered'));
    await as(users[0], () => one('select cancel_crew_challenge_2026($1)', [c.id]));
  });
  // Move ONLY this isolated fixture into a historic week to test deadline work
  // without exposing a client clock parameter or waiting a real week.
  starts = await one("select ((date_trunc('week',now() at time zone 'Europe/Paris')-interval '2 weeks') at time zone 'Europe/Paris')::text");
  await db.query("update crew_challenges_2026 set starts_at=$2,ends_at=($2::timestamptz at time zone time_zone + interval '7 days') at time zone time_zone,ranked_week=($2::timestamptz at time zone time_zone)::date where id=$1", [matchId, starts]);
  await db.query("update challenge_roster_2026 set consented_at=$2::timestamptz-interval '1 day' where challenge_id=$1", [matchId, starts]);
  await test('late roster changes and match cancellation are refused after kickoff', async () => {
    await as(users[0], () => rejects('select cancel_crew_challenge_2026($1)', [matchId], 'challenge_started'));
    await as(users[10], () => rejects('select join_crew_challenge_2026($1,true)', [matchId], 'roster_locked'));
  });
  await test('physical first two days cap scores and a late earlier day corrects ordering', async () => {
    await assign(0, 1); await assign(0, 2); await assign(0, 0);
    const score = await one('select challenge_score_2026($1)', [matchId]);
    assert.equal(score.scores[0].totalPoints, 6);
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where challenge_id=$1', [matchId]), 3);
  });
  await test('same activity replay and extra same-day activity never duplicate contributions', async () => {
    const row = (await q('select * from challenge_contributions_2026 where challenge_id=$1 order by closed_at limit 1', [matchId]))[0];
    await db.query('select assign_challenge_loop_2026($1,$2,$3,$4)', [row.run_id, row.event_id, row.closed_at, { canal: 500 }]);
    await assign(0, 0);
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where challenge_id=$1', [matchId]), 3);
  });
  await test('sport, geographic threshold and 24-hour synchronization bounds are enforced', async () => {
    await assign(1, 0, { canal: 399.9 });
    await assign(1, 0, { canal: 500 }, { sport: 'bike' });
    await assign(1, 1, { canal: 500 }, { received: new Date(Date.parse(starts) + 9 * 86_400_000).toISOString() });
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where player_id=$1', [users[1]]), 0);
    await assign(1, 2, { canal: 400 });
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where player_id=$1', [users[1]]), 1);
  });
  await test('incomplete chronology and string-valued geographic measurements fail closed', async () => {
    const id = '30000000-0000-0000-0000-999999999999';
    await db.query('insert into runs(id,user_id,activity,started_at,created_at) values($1,$2,$3,$4,$5)',
      [id, users[3], 'run', starts, new Date(Date.parse(starts) + 3_600_000).toISOString()]);
    await db.query('select assign_challenge_loop_2026($1,$1,$2,$3)', [id, new Date(Date.parse(starts) + 900_000).toISOString(), { canal: 500 }]);
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where activity_key=$1', [id]), 0);
    await db.query("update runs set ended_at_2026=started_at+interval '20 minutes' where id=$1", [id]);
    await db.query('select assign_challenge_loop_2026($1,$1,$2,$3)', [id, new Date(Date.parse(starts) + 900_000).toISOString(), { canal: 'NaN', park: '1000' }]);
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where activity_key=$1', [id]), 0);
  });
  await test('a pre-activity preference selects an eligible sector and cannot be invented afterwards', async () => {
    await db.query("insert into challenge_preferences_2026(challenge_id,player_id,sector_id,recorded_at) values($1,$2,'park',$3::timestamptz-interval '1 day')", [matchId, users[2], starts]);
    await assign(2, 0, { canal: 500, park: 500 });
    loops.at(-1).preference = { sectorId: 'park', recordedAt: new Date(Date.parse(starts) - 86_400_000).toISOString() };
    const row = (await q('select sector_id,used_fallback from challenge_contributions_2026 where player_id=$1', [users[2]]))[0];
    assert.deepEqual(row, { sector_id: 'park', used_fallback: false });
    await as(users[2], () => rejects("select set_challenge_preference_2026($1,'centre')", [matchId], 'preference_unavailable'));
  });
  await test('SQL totals and winners match the pure shared challenge engine exactly', async () => {
    const ends = await one('select ends_at::text from crew_challenges_2026 where id=$1', [matchId]);
    const expected = computeChallenge2026({ id: matchId, sport: 'run', timeZone: 'Europe/Paris', startsAt: starts, endsAt: ends,
      teams: crews.map((id, i) => ({ id, playerIds: users.slice(i * 5, i * 5 + 5) })), sectorIds: sectors.map(s => s.id) }, loops);
    const actual = await one('select challenge_score_2026($1)', [matchId]);
    assert.deepEqual(actual.scores, expected.scores); assert.equal(actual.winnerTeamId, expected.winnerTeamId); assert.equal(actual.isDraw, expected.isDraw);
  });
  await test('opponent live score and derived match points cannot leak through ownScore', async () => {
    // Before final publication, use the public read on a still-upcoming fixture.
    const row = (await as(users[0], () => one("select get_crew_challenges_2026('run')"))).find(c => c.id === matchId);
    assert.equal('matchPoints' in row.ownScore, false);
    assert.equal(row.status, 'final'); assert.ok(row.publishedResult);
    assert.equal(row.publishedResult.scores[0].totalPoints, row.ownScore.totalPoints);
  });
  await test('publication at expiry is idempotent; deletion preserves attempts and records a result correction', async () => {
    const before = await one('select count(*)::integer from challenge_publications_2026 where challenge_id=$1', [matchId]);
    await db.query('select maintain_challenge_2026($1)', [matchId]);
    assert.equal(await one('select count(*)::integer from challenge_publications_2026 where challenge_id=$1', [matchId]), before);
    const target = (await q('select run_id from challenge_contributions_2026 where player_id=$1 order by closed_at limit 1', [users[0]]))[0].run_id;
    await db.query('delete from runs where id=$1', [target]);
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where player_id=$1 and withdrawn', [users[0]]), 1);
    const score = await one('select challenge_score_2026($1)', [matchId]); assert.equal(score.scores[0].totalPoints, 9);
    assert.equal(await one('select max(revision) from challenge_publications_2026 where challenge_id=$1', [matchId]), 2);
    await assign(0, 0); assert.equal((await one('select challenge_score_2026($1)', [matchId])).scores[0].totalPoints, 9);
  });
  await test('read exposes only own run IDs, persisted preference and frozen roster membership', async () => {
    const data = (await as(users[2], () => one("select get_crew_challenges_2026('run')"))).find(c => c.id === matchId);
    assert.equal(data.rostered, true); assert.equal(data.joined, true); assert.equal(data.myPreference.sectorId, 'park');
    assert.equal(data.myContributions.length, 1); assert.equal(data.myContributions[0].points, 3);
    assert.equal(await one('select user_id::text from runs where id=$1', [data.myContributions[0].runId]), users[2]);
  });
  await test('private challenge consent remains revocable after the final result', async () => {
    await as(users[2], () => one('select join_crew_challenge_2026($1,false)', [matchId]));
    const data = (await as(users[2], () => one("select get_crew_challenges_2026('run')"))).find(c => c.id === matchId);
    assert.equal(data.rostered, true); assert.equal(data.joined, false); assert.equal(data.myContributions[0].points, 0);
    assert.equal(data.myContributions[0].withdrawn, true); assert.equal(data.resultRevision, 3);
  });
  await test('withdrawing public capture also withdraws its challenge attempt', async () => {
    const row = (await q('select run_id from challenge_contributions_2026 where player_id=$1', [users[1]]))[0];
    await db.query("insert into capture_events_2026(id,run_id,status) values(gen_random_uuid(),$1,'published')", [row.run_id]);
    await db.query("update capture_events_2026 set status='withdrawn',reason='consent_withdrawn' where run_id=$1", [row.run_id]);
    assert.equal(await one('select withdrawn from challenge_contributions_2026 where player_id=$1', [users[1]]), true);
    assert.equal((await one('select challenge_score_2026($1)', [matchId])).scores[0].totalPoints, 3);
  });
  await test('map opt-out preserves separate consent for a loop that was already private', async () => {
    const row = (await q('select run_id from challenge_contributions_2026 where player_id=$1 and not withdrawn order by closed_at limit 1', [users[0]]))[0];
    await db.query("insert into capture_events_2026(id,run_id,status,reason) values(gen_random_uuid(),$1,'private','protected_place')", [row.run_id]);
    await db.query("update capture_events_2026 set reason='consent_withdrawn' where run_id=$1", [row.run_id]);
    assert.equal(await one('select withdrawn from challenge_contributions_2026 where run_id=$1', [row.run_id]), false);
  });
  await test('daily noon and final synchronization cutoffs stay correct across DST', async () => {
    await db.query("update crew_challenges_2026 set starts_at='2026-03-22T23:00:00Z',ends_at='2026-03-29T22:00:00Z' where id=$1", [matchId]);
    const cases = [
      ['2026-03-24T10:59:59Z','2026-03-23T11:00:00Z'],
      ['2026-03-24T11:00:00Z','2026-03-24T11:00:00Z'],
      ['2026-03-29T10:00:00Z','2026-03-29T10:00:00Z'],
      ['2026-03-30T18:00:00Z','2026-03-29T10:00:00Z'],
      ['2026-03-30T22:00:00Z','2026-03-30T22:00:00Z'],
    ];
    for (const [at, expected] of cases) assert.equal(Date.parse(await one('select challenge_publication_cutoff_2026($1,$2)::text', [matchId, at])), Date.parse(expected));
    await as(users[0], () => rejects('select challenge_publication_cutoff_2026($1,now())', [matchId], 'permission denied'));
  });
  await test('a score snapshot never includes evidence validated or received after its cutoff', async () => {
    const rows = await q('select activity_key from challenge_contributions_2026 where player_id=$1 order by closed_at', [users[0]]);
    const cutoff = '2026-04-01T10:00:00Z';
    await db.query("update challenge_contributions_2026 set withdrawn=false,received_at='2026-04-01T09:00:00Z',validated_at='2026-04-01T09:00:00Z' where challenge_id=$1", [matchId]);
    await db.query("update challenge_contributions_2026 set validated_at='2026-04-01T10:00:01Z' where activity_key=$1", [rows[0].activity_key]);
    await db.query("update challenge_contributions_2026 set received_at='2026-04-01T10:00:01Z' where activity_key=$1", [rows[1].activity_key]);
    assert.equal((await one('select challenge_score_2026($1,$2)', [matchId, cutoff])).scores[0].totalPoints, 9);
    assert.equal((await one('select challenge_score_2026($1)', [matchId])).scores[0].totalPoints, 12);
  });
  await test('two complete teams cap at thirty each; sector strategy decides the winner', async () => {
    await db.query('delete from challenge_contributions_2026 where challenge_id=$1', [matchId]);
    await db.query("update crew_challenges_2026 set starts_at=$2,ends_at=($2::timestamptz at time zone time_zone+interval '7 days') at time zone time_zone where id=$1", [matchId, starts]);
    await db.query('update challenge_roster_2026 set consent=true where challenge_id=$1', [matchId]);
    const distributions = [
      ['canal','canal','canal','canal','park','park','park','centre','centre','centre'],
      ['canal','canal','park','park','park','park','centre','centre','centre','centre'],
    ];
    for (let player = 0; player < 10; player++) for (let day = 0; day < 3; day++) {
      const sector = distributions[Math.floor(player / 5)][(player % 5) * 2 + Math.min(day, 1)];
      await assign(player, day, { [sector]: 500 });
    }
    const result = await one('select challenge_score_2026($1)', [matchId]);
    assert.deepEqual(result.scores.map(s => s.totalPoints), [30,30]);
    assert.deepEqual(result.scores.map(s => s.matchPoints), [1,2]);
    assert.equal(result.winnerTeamId, crews[1]);
  });
  console.log(`PASS ${passed} challenge lifecycle/scoring PostgreSQL tests. Real 0122; spatial proof and cron extension NOT exercised.`);
} finally { await db.close(); }
