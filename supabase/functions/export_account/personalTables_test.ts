/**
 * GRYD — L'EXPORT RGPD NE PEUT PLUS PRENDRE DU RETARD SUR LE SCHÉMA.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ═══════════════════════════════════════════
 * Le premier test reconstitue la liste TELLE QU'ELLE ÉTAIT avant le 10/09/2026
 * (celle de `index.ts`, entièrement legacy) et montre qu'elle ne couvrait AUCUNE
 * table `*_2026`. Sans cette étape, rien ne distinguerait un correctif d'un
 * no-op : la liste actuelle pourrait passer pour « ça a toujours marché ».
 *
 * ═══ CE QUE LE TEST VÉRIFIE ═════════════════════════════════════════════════
 * Il relit les VRAIES migrations, y trouve chaque table `*_2026` porteuse d'une
 * colonne d'identité, et exige qu'elle soit exportée. Ce n'est pas une liste
 * recopiée : c'est le schéma qui dicte, et un `create table` ajouté demain fera
 * rougir ce test tant que l'export l'ignorera.
 *
 * SENS UNIQUE, ET C'EST DÉLIBÉRÉ : on exige « tout ce que le schéma porte est
 * exporté », pas l'inverse. Une entrée qui survivrait à la suppression de sa
 * table dégraderait l'export en `partialErrors` (best-effort côté `index.ts`),
 * jamais en fuite ni en réponse fausse — alors qu'une table oubliée est, elle,
 * une demande d'accès à laquelle on répond faux.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { PERSONAL_TABLES } from './personalTables.ts';

const MIGRATIONS = new URL('../../migrations/', import.meta.url);

/** Colonnes qui désignent le COMPTE DEMANDEUR (jamais un tiers). */
const IDENTITY_COLUMNS = [
  'user_id',
  'owner_id',
  'author_id',
  'reporter_id',
  'blocker_id',
  'player_id',
  'created_by',
  // Ajoutées le 10/09/2026 au soir, avec les tables de 0082 que le lot L
  // réutilise : `leaderboard_entries.subject_id` (le sujet classé) et
  // `leaderboard_snapshots.audience_user_id` (la personne POUR QUI un classement
  // d'amis est calculé). Vérifié : aucune table `*_2026` ne les porte, cet ajout
  // n'élargit donc la règle que là où il le doit.
  'subject_id',
  'audience_user_id',
  // Ajoutée le 10/09/2026 avec `handle_holds_2026` (0175) : la réservation de
  // quatorze jours d'un ancien @pseudo appartient à son ancien titulaire, et
  // `held_for` est la seule colonne qui le désigne. Vérifié : aucune autre
  // table du schéma ne porte ce nom, cet ajout n'élargit donc la règle que là
  // où il le doit.
  'held_for',
] as const;

/** La refonte 2026 commence à 0118 (`refonte_2026_polygon_authority`). */
const REFONTE_FIRST_MIGRATION = 118;

/** Les fichiers de migration, triés — une seule lecture du disque. */
function migrationFiles(): { name: string; sql: string }[] {
  return [...Deno.readDirSync(MIGRATIONS)]
    .filter((e) => e.isFile && e.name.endsWith('.sql'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ name: e.name, sql: Deno.readTextFileSync(new URL(e.name, MIGRATIONS)) }));
}

/**
 * TOUTES les tables déclarées par les migrations, avec leurs colonnes
 * d'identité — sans distinction de nom : c'est l'appelant qui décide lesquelles
 * il exige, et le critère n'est pas le suffixe (voir `refonteWrittenTables`).
 */
function declaredTables(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const { sql } of migrationFiles()) {
    const blocks = sql.matchAll(/create table (?:if not exists )?public\.([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/g);
    for (const block of blocks) {
      const [, table, body] = block;
      const columns = IDENTITY_COLUMNS.filter((c) =>
        new RegExp(`(^|[\\s,(])${c}\\s+(uuid|bigint)`).test(body)
      );
      if (columns.length > 0) found.set(table, [...columns]);
    }
  }
  return found;
}

/** Tables `*_2026` porteuses d'une identité (la règle d'origine). */
function tablesFromMigrations(): Map<string, string[]> {
  return new Map([...declaredTables()].filter(([t]) => t.endsWith('_2026')));
}

/**
 * Tables que les migrations de la REFONTE écrivent réellement (insert/update),
 * quel que soit leur nom.
 *
 * ═══ POURQUOI CE SECOND CRITÈRE EXISTE ══════════════════════════════════════
 * Le suffixe `_2026` est une convention de nommage, pas une propriété du
 * schéma : il dit qui a créé une table, jamais qui l'écrit AUJOURD'HUI. Le lot L
 * (0160-0164) l'a démontré le jour même où la règle a été écrite, en publiant le
 * classement de commune dans `leaderboard_snapshots` / `leaderboard_entries`
 * (0082). Une table ressuscitée par la refonte porte des données du joueur
 * VIVANT, exactement comme une table neuve.
 */
function refonteWrittenTables(): Set<string> {
  const written = new Set<string>();
  for (const { name, sql } of migrationFiles()) {
    if (Number.parseInt(name.slice(0, 4), 10) < REFONTE_FIRST_MIGRATION) continue;
    for (const m of sql.matchAll(/(?:insert into|update)\s+public\.([a-z0-9_]+)/gi)) {
      written.add(m[1]);
    }
  }
  return written;
}

/** Ce que l'export DOIT couvrir : l'union des deux critères. */
function tablesOwedToTheRequester(): Map<string, string[]> {
  const declared = declaredTables();
  const written = refonteWrittenTables();
  return new Map(
    [...declared].filter(([t]) => t.endsWith('_2026') || written.has(t)),
  );
}

Deno.test('étape 0 — la liste d’avant n’exportait AUCUNE table de la refonte 2026', () => {
  // Copie littérale de la liste que portait `index.ts` jusqu'au 10/09/2026.
  const before = [
    'users', 'user_stats', 'runs', 'hex_claims', 'season_scores', 'user_badges',
    'user_inventory', 'purchases', 'crew_members', 'privacy_zones',
    'mission_progress', 'notifications', 'imported_activities',
    'content_reports', 'user_blocks',
  ];
  assertEquals(before.filter((t) => t.endsWith('_2026')), []);

  // …alors que le schéma en portait déjà beaucoup, dont la géométrie des captures.
  const schema = tablesFromMigrations();
  assert(schema.size >= 25, `le schéma 2026 porte ${schema.size} tables personnelles`);
  for (const critical of [
    'capture_events_2026',
    'ownership_2026',
    'progress_accounts_2026',
    'social_posts_2026',
    'crew_messages_2026',
    'premium_receipts_2026',
  ]) {
    assert(schema.has(critical), `${critical} porte une colonne d’identité`);
    assertEquals(before.includes(critical), false, `${critical} était bien ABSENT de l’export`);
  }
});

Deno.test('étape 0 (bis) — le SUFFIXE `_2026` laissait passer trois tables', () => {
  // La règle du matin ne cherchait que `create table public.*_2026`. Le lot L
  // (0160-0164) a publié le classement de commune le soir même, dans les tables
  // de 0082 : `leaderboard_entries` reçoit MON rang, MA surface prise et MA
  // surface tenue à chaque snapshot horaire (0162). 0129, lui, écrit les droits
  // premium dans `feature_entitlements` (0026). Aucune des trois ne porte le
  // suffixe : aucune n'était donc exigée, et aucune n'était exportée.
  const suffixOnly = tablesFromMigrations();
  const owed = tablesOwedToTheRequester();
  const invisibles = [...owed.keys()].filter((t) => !suffixOnly.has(t)).sort();
  for (const blindSpot of ['feature_entitlements', 'leaderboard_entries', 'leaderboard_snapshots']) {
    assertEquals(suffixOnly.has(blindSpot), false, `${blindSpot} échappait à la règle du suffixe`);
    assert(invisibles.includes(blindSpot), `${blindSpot} doit être rattrapé par la règle des écrivains`);
  }
  // Ces tables sont bel et bien ÉCRITES par la refonte : ce n'est pas un
  // ratissage large du legacy, c'est le schéma vivant.
  const written = refonteWrittenTables();
  for (const t of invisibles) assert(written.has(t), `${t} n'est écrite par aucune migration ≥ 0118`);
});

Deno.test('chaque table porteuse d’une identité, 2026 OU écrite par la refonte, est exportée', () => {
  const exported = new Map(PERSONAL_TABLES.map((t) => [t.table, t.column]));
  const missing: string[] = [];
  const wrongColumn: string[] = [];
  for (const [table, columns] of tablesOwedToTheRequester()) {
    const column = exported.get(table);
    if (column === undefined) {
      missing.push(table);
      continue;
    }
    // La colonne choisie doit exister dans la table : un filtre sur une colonne
    // absente rendrait `[]` en silence — un export vide qui a l'air complet.
    if (!columns.includes(column)) wrongColumn.push(`${table}.${column} (vu : ${columns.join(', ')})`);
  }
  assertEquals(
    missing,
    [],
    'ces tables portent des données personnelles vivantes et ne sont PAS exportées',
  );
  assertEquals(wrongColumn, [], 'ces filtres portent sur une colonne que la table n’a pas');
});

Deno.test('une table POLYMORPHE ne se filtre pas sur le seul identifiant', () => {
  // `leaderboard_entries.subject_id` désigne un joueur OU un crew (0082 : deux
  // tables cibles, aucune clé étrangère). Sans `subject_type`, l'export parierait
  // sur le fait qu'aucun `crews.id` ne vaut un `users.id`.
  const entry = PERSONAL_TABLES.find((t) => t.table === 'leaderboard_entries');
  assert(entry !== undefined, 'le classement doit être exporté');
  assertEquals(entry?.also, { subject_type: 'user' });

  // Et la fonction doit APPLIQUER ce filtre : une liste juste et un lecteur qui
  // l'ignore, c'est la même fuite avec une preuve verte.
  const fn = Deno.readTextFileSync(new URL('./index.ts', import.meta.url));
  assert(fn.includes('t.also ? base.match(t.also) : base'), 'index.ts doit appliquer `also`');
});

Deno.test('les tables des lots livrés APRÈS cette liste y sont, nommément', () => {
  // La règle générale les couvre déjà. On les NOMME quand même : chacune vient
  // d'un lot qui a atterri le même jour, et un nom dans un test est ce qui
  // permet de répondre « oui, vérifié » sans relire un algorithme.
  const exported = new Set(PERSONAL_TABLES.map((t) => t.table));
  const perLot: Record<string, string[]> = {
    'lot N · notifications (0140, 0141)': ['notification_preferences_2026', 'notification_log_2026'],
    'lot L · classement de commune (0160-0164)': ['leaderboard_entries', 'leaderboard_snapshots'],
    'lot Q · quêtes hebdomadaires (0165-0168)': [
      'weekly_quest_assignments_2026',
      'weekly_quest_faces_2026',
      'weekly_quest_reward_ownership_2026',
    ],
    'audit sécurité (0129) · droits premium': ['feature_entitlements'],
  };
  for (const [lot, tables] of Object.entries(perLot)) {
    for (const table of tables) {
      assert(exported.has(table), `${lot} : ${table} n'est pas exportée`);
    }
  }
});

Deno.test('aucune clé de sortie en double, aucune table en double', () => {
  const keys = PERSONAL_TABLES.map((t) => t.key);
  assertEquals(keys.length, new Set(keys).size, 'deux entrées écriraient la même clé JSON');
  const tables = PERSONAL_TABLES.map((t) => t.table);
  assertEquals(tables.length, new Set(tables).size, 'une table est lue deux fois');
});

Deno.test('l’export ne livre JAMAIS les lignes où le joueur est la CIBLE', () => {
  // « qui t'a bloqué » n'est pas une donnée qu'un export doit désigner : ce
  // serait transformer le droit d'accès en outil de représailles.
  const forbidden = ['target_id', 'blocked_user_id', 'addressee_id'];
  for (const t of PERSONAL_TABLES) {
    assertEquals(
      forbidden.includes(t.column),
      false,
      `${t.table} est filtrée sur ${t.column} : elle livrerait des lignes de tiers`,
    );
  }
});

Deno.test('les tables à une ligne par compte sont marquées `single`', () => {
  const single = PERSONAL_TABLES.filter((t) => t.single === true).map((t) => t.table).sort();
  assertEquals(single, [
    'notification_preferences_2026',
    'progress_accounts_2026',
    'user_profiles',
    'user_stats',
    'users',
  ]);
});
