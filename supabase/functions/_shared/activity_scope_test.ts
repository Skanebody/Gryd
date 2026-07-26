/**
 * GRYD — LA FRONTIÈRE « SÉPARÉ / GLOBAL » EST UNE PROPRIÉTÉ VÉRIFIÉE.
 *
 * DÉCISION FONDATEUR DU 26/07/2026, mot pour mot : « SÉPARÉS par discipline :
 * les TERRITOIRES, les COURSES, les CLASSEMENTS de saison, les statistiques,
 * l'historique, les missions. […] GLOBAL, partagé par les deux : LE NIVEAU ET
 * L'XP DU JOUEUR. Un kilomètre à vélo fait progresser le même joueur qu'un
 * kilomètre à pied. »
 *
 * C'est un OVERRIDE EXPLICITE de la planche E12 (« Run et Bike ont des rangs
 * SÉPARÉS ») sur le seul point du NIVEAU. Une décision produit qui contredit une
 * planche ne survit pas en commentaire : le prochain agent lit la planche,
 * « corrige la conformité », et casse l'intention sans que rien ne plante.
 *
 * CE FICHIER EST LE FILET. Il fait échouer la suite si quelqu'un :
 *   · SCINDE l'XP ou le niveau par discipline (table de scope, moteur, schéma) ;
 *   · SOMME les territoires ou les points de saison des deux mondes ;
 *   · réintroduit, dans une migration POSTÉRIEURE à 0070, une clé d'unicité qui
 *     avait été rendue composite exprès.
 *
 * Il lit les SOURCES RÉELLES (game-rules, moteur pur, SQL de la migration
 * appliquée) — pas une copie de la règle qui pourrait dériver avec elle.
 */
import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@^1';
import { ACTIVITIES, ACTIVITY_SCOPE, type Activity } from './game-rules.ts';
import {
  activityScopeOf,
  isGlobalScope,
  isPerActivity,
  splitByActivity,
  totalAcrossActivities,
  writeActivityFor,
} from './engine/activityScope.ts';

// ════════════════════════════════════════════════════════════════════════════
// 1. LA TABLE DE VÉRITÉ — ce que la décision fondateur dit, dimension par dimension
// ════════════════════════════════════════════════════════════════════════════

Deno.test('SÉPARÉS : territoires, courses, points et rangs de saison, classements, historique, missions', () => {
  for (
    const dim of [
      'territory',
      'runs',
      'seasonPoints',
      'seasonRank',
      'leaderboards',
      'history',
      'missions',
    ] as const
  ) {
    assertEquals(
      activityScopeOf(dim),
      'per_activity',
      `« ${dim} » doit rester SÉPARÉ par discipline (E14 : jamais Run + Bike ` +
        `dans une même lecture compétitive).`,
    );
  }
});

Deno.test('GLOBAUX : XP et NIVEAU — override fondateur du 26/07/2026 sur la planche E12', () => {
  assertEquals(
    activityScopeOf('xp'),
    'global',
    'Scinder l’XP par discipline contredit « LE NIVEAU DOIT ÊTRE GLOBAL ». ' +
      'Si la règle produit a réellement changé, c’est ICI que ça se décide — ' +
      'pas dans un lecteur qui ajoute un .eq("activity") en passant.',
  );
  assertEquals(activityScopeOf('level'), 'global');
});

Deno.test('le niveau ne peut pas quitter l’XP : ils partagent le même camp', () => {
  // `users.level` est DÉRIVÉ de `users.xp` (RPC de crédit, migrations 0005/0021).
  // Les mettre dans deux camps différents produirait un niveau qu’aucune XP ne
  // justifie — donc un chiffre affiché que rien ne soutient.
  assertEquals(activityScopeOf('level'), activityScopeOf('xp'));
});

Deno.test('toute dimension déclarée a un camp, et un seul des deux', () => {
  const dims = Object.keys(ACTIVITY_SCOPE) as (keyof typeof ACTIVITY_SCOPE)[];
  assert(dims.length > 0);
  for (const dim of dims) {
    const scope = activityScopeOf(dim);
    assert(
      scope === 'per_activity' || scope === 'global',
      `« ${dim} » n’a pas choisi son camp (${scope}).`,
    );
    // Les deux prédicats sont exclusifs par construction : si l’un devenait
    // faux pour les deux valeurs, une dimension pourrait échapper aux DEUX
    // verrous du moteur sans qu’aucun test ne le voie.
    assertEquals(isPerActivity(dim), !isGlobalScope(dim));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE MOTEUR — les deux fautes silencieuses deviennent des erreurs bruyantes
// ════════════════════════════════════════════════════════════════════════════

Deno.test('SCINDER L’XP par discipline LÈVE (le verrou de l’override E12)', () => {
  assertThrows(
    () =>
      splitByActivity('xp', [
        { activity: 'run', value: 120 },
        { activity: 'bike', value: 80 },
      ]),
    Error,
    'GLOBAL',
  );
});

Deno.test('SCINDER LE NIVEAU par discipline LÈVE', () => {
  assertThrows(() => splitByActivity('level', []), Error, 'GLOBAL');
});

Deno.test('SOMMER LES TERRITOIRES des deux mondes LÈVE', () => {
  assertThrows(
    () =>
      totalAcrossActivities('territory', [
        { activity: 'run', value: 42 },
        { activity: 'bike', value: 17 },
      ]),
    Error,
    'SÉPARÉ',
  );
});

Deno.test('SOMMER LES POINTS DE SAISON des deux mondes LÈVE', () => {
  assertThrows(() => totalAcrossActivities('seasonPoints', []), Error, 'SÉPARÉ');
});

Deno.test('territoire : deux comptes côte à côte, jamais un total', () => {
  const split = splitByActivity('territory', [
    { activity: 'run', value: 40 },
    { activity: 'run', value: 2 },
    { activity: 'bike', value: 17 },
  ]);
  assertEquals(split, { run: 42, bike: 17 });
});

Deno.test('un monde sans donnée vaut 0, jamais une clé absente', () => {
  // « Vous n’avez pas encore de territoire à vélo » est un FAIT honnête ; une
  // clé manquante ferait disparaître le monde de l’écran (commutateur E14).
  const split = splitByActivity('territory', [{ activity: 'run', value: 3 }]);
  assertEquals(split, { run: 3, bike: 0 });
  for (const a of ACTIVITIES) assert(a in split);
});

Deno.test('XP : la somme des deux disciplines est LA progression du joueur', () => {
  assertEquals(
    totalAcrossActivities('xp', [
      { activity: 'run', value: 2_340 },
      { activity: 'bike', value: 660 },
    ]),
    3_000,
  );
});

Deno.test('un kilomètre à vélo vaut un kilomètre à pied dans l’XP (aucun coefficient)', () => {
  // Le fondateur : « un kilomètre à vélo fait progresser le MÊME joueur qu’un
  // kilomètre à pied ». Pas « un peu moins » : pas de pondération cachée.
  const run = totalAcrossActivities('xp', [{ activity: 'run', value: 100 }]);
  const bike = totalAcrossActivities('xp', [{ activity: 'bike', value: 100 }]);
  assertEquals(run, bike);
});

Deno.test('une discipline inconnue n’est jamais repliée en silence', () => {
  const bogus = { activity: 'scooter' as unknown as Activity, value: 1 };
  assertThrows(() => splitByActivity('territory', [bogus]), Error, 'inconnue');
  assertThrows(() => totalAcrossActivities('xp', [bogus]), Error, 'inconnue');
});

Deno.test('writeActivityFor : une ligne globale ne porte AUCUNE discipline', () => {
  assertEquals(writeActivityFor('territory', 'bike'), 'bike');
  assertEquals(writeActivityFor('seasonPoints', 'bike'), 'bike');
  // `null` et non 'run' : écrire « run » sur une ligne d’XP laisserait croire,
  // six mois plus tard, que l’XP a une discipline.
  assertEquals(writeActivityFor('xp', 'bike'), null);
  assertEquals(writeActivityFor('level', 'run'), null);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LE SCHÉMA — la même frontière, lue dans le SQL RÉELLEMENT APPLIQUÉ
//    (migration 0070, en production depuis le 25/07/2026 : elle n’est jamais
//     réécrite, donc la lire est le seul moyen honnête de savoir ce qui est en
//     base. Ces assertions sont des lectures de TEXTE, pas une exécution SQL :
//     elles prouvent l’intention du fichier, pas l’état du serveur.)
// ════════════════════════════════════════════════════════════════════════════

const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url);

const readMigration = (name: string): string =>
  Deno.readTextFileSync(new URL(name, MIGRATIONS_DIR));

/** Normalise les espaces : le SQL se lit sur son SENS, pas sur son indentation. */
const flat = (sql: string): string => sql.replace(/\s+/g, ' ');

Deno.test('0070 : la clé de `hex_claims` est (hexagone, discipline) — deux mondes, deux propriétaires', () => {
  const sql = flat(readMigration('0070_activity_dimension.sql'));
  assert(
    sql.includes('hex_claims_pkey primary key (h3index, activity)'),
    'Sans clé composite, un cycliste VOLE la zone d’un coureur.',
  );
});

Deno.test('0070 : la clé de `season_scores` porte la discipline — deux classements, jamais une somme', () => {
  const sql = flat(readMigration('0070_activity_dimension.sql'));
  assert(sql.includes('primary key (season_id, user_id, activity)'));
  assert(
    sql.includes('on conflict (season_id, user_id, activity) do update'),
    'L’upsert de points doit viser la clé DISCIPLINÉE, sinon les points des ' +
      'deux mondes retombent dans la même ligne et s’additionnent.',
  );
});

Deno.test('0070 : `claim_hexes` crédite l’XP SANS discipline — le joueur progresse, pas son sport', () => {
  const sql = flat(readMigration('0070_activity_dimension.sql'));
  // Le crédit d’XP/Foulées vise UN joueur, par son id seul. Un `and activity =`
  // dans ce `where` serait exactement la scission que l’override interdit.
  assert(
    sql.includes('update public.users set foulees = foulees + coalesce(v_foulees, 0), xp = xp + v_xp where id = p_user_id;'),
    'Le crédit d’XP doit rester GLOBAL : un seul prédicat, l’identité du joueur.',
  );
});

Deno.test('0070 : les vues de classement EXPOSENT la discipline (le lecteur choisit son monde)', () => {
  const sql = flat(readMigration('0070_activity_dimension.sql'));
  assert(sql.includes('ss.activity,'), 'player_leaderboard doit rendre la discipline.');
  assert(
    sql.includes('crew_leaderboard_crew_idx on public.crew_leaderboard (crew_id, activity)'),
    'crew_leaderboard doit avoir UNE LIGNE PAR (crew, discipline) — E14 : ' +
      '« deux métriques côte à côte, JAMAIS SOMMÉES ».',
  );
  assert(
    sql.includes('sector_control_sector_crew_idx on public.sector_control (sector_id, crew_id, activity)'),
    'sector_control doit se compter par monde.',
  );
});

// ─── Le filet qui vise l’AVENIR, pas le passé ───────────────────────────────
// Les migrations ANTÉRIEURES à 0070 contiennent légitimement les anciennes
// formes : une migration appliquée n’est jamais réécrite, leur texte est de
// l’HISTOIRE. Ce qui doit être surveillé, c’est ce qui s’écrit APRÈS.

const laterMigrations = (): { name: string; sql: string }[] =>
  [...Deno.readDirSync(MIGRATIONS_DIR)]
    .filter((e) => e.isFile && /^\d{4}_.*\.sql$/.test(e.name))
    .filter((e) => Number(e.name.slice(0, 4)) > 70)
    .map((e) => ({ name: e.name, sql: flat(readMigration(e.name)) }));

Deno.test('aucune migration APRÈS 0070 ne re-fusionne les deux mondes', () => {
  for (const { name, sql } of laterMigrations()) {
    assert(
      !sql.includes('on conflict (season_id, user_id) do'),
      `${name} réintroduit un upsert de score SANS discipline : les points ` +
        `Run et Bike y seraient additionnés (E12/E14 l’interdisent).`,
    );
    assert(
      !sql.includes('on conflict (h3index) do'),
      `${name} réintroduit un upsert de territoire SANS discipline : un ` +
        `cycliste y volerait la zone d’un coureur.`,
    );
  }
});

Deno.test('aucune migration ne donne de discipline à `users` (ce serait scinder l’XP en base)', () => {
  for (const e of Deno.readDirSync(MIGRATIONS_DIR)) {
    if (!e.isFile || !e.name.endsWith('.sql')) continue;
    const sql = flat(readMigration(e.name));
    assert(
      !/alter table public\.users add column (if not exists )?activity\b/.test(sql),
      `${e.name} ajoute une discipline à \`users\` — l’XP et le niveau y vivent, ` +
        `et la décision fondateur du 26/07/2026 les veut GLOBAUX.`,
    );
  }
});
