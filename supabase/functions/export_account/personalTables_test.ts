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
] as const;

/** Tables `*_2026` déclarées par les migrations, avec leurs colonnes d'identité. */
function tablesFromMigrations(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const entry of [...Deno.readDirSync(MIGRATIONS)].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile || !entry.name.endsWith('.sql')) continue;
    const sql = Deno.readTextFileSync(new URL(entry.name, MIGRATIONS));
    const blocks = sql.matchAll(/create table (?:if not exists )?public\.([a-z0-9_]+_2026)\s*\(([\s\S]*?)\n\);/g);
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

Deno.test('chaque table 2026 porteuse d’une identité est exportée', () => {
  const exported = new Map(PERSONAL_TABLES.map((t) => [t.table, t.column]));
  const missing: string[] = [];
  const wrongColumn: string[] = [];
  for (const [table, columns] of tablesFromMigrations()) {
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
    'ces tables 2026 portent des données personnelles et ne sont PAS exportées',
  );
  assertEquals(wrongColumn, [], 'ces filtres portent sur une colonne que la table n’a pas');
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
