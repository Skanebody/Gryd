#!/usr/bin/env node
/**
 * GRYD — LE NUMÉRO D'UNE MIGRATION EST UNIQUE, ET C'EST LE GATE QUI LE PROUVE.
 *
 * ─── LA FAUTE QUI A RENDU CE SCRIPT NÉCESSAIRE (26 → 27/07/2026) ────────────
 * Deux chantiers parallèles ont écrit le même soir
 * `0087_public_territories_respects_map_sharing.sql` (22:53) et
 * `0087_social_graph_and_duels.sql` (23:01). Chacun avait son test PGlite, vert,
 * et chacun rejouait une lignée où l'AUTRE 0087 n'existait pas : la collision
 * était structurellement invisible.
 *
 * Elle n'est pas cosmétique. `supabase db push` enregistre dans
 * `supabase_migrations.schema_migrations` la VERSION dérivée du préfixe, et
 * cette colonne est la clé primaire de la table : deux fichiers « 0087 » ne
 * peuvent pas y coexister. Selon l'ordre, l'un échoue en doublon de clé — ou,
 * pire, est considéré comme déjà appliqué et SAUTÉ EN SILENCE. Ici les deux
 * candidats au saut étaient une protection de vie privée (`map_sharing` opposé
 * côté serveur) et la totalité du graphe social avec sa RLS.
 *
 * ─── CE QUE CE SCRIPT VÉRIFIE, ET RIEN DE PLUS ──────────────────────────────
 *  1. Chaque fichier de `supabase/migrations/` porte un préfixe `NNNN_`.
 *  2. Aucun préfixe n'est porté par deux fichiers.
 * Il ne vérifie NI le contenu, NI l'ordre logique, NI la présence de RLS : ce
 * sont les tests PGlite qui le font (`npm run test:sql`). Un script qui
 * prétendrait plus que ça serait une garantie écrite au-dessus du code.
 *
 * Sortie 0 = aucune collision. Sortie 1 = collision, avec les fichiers nommés.
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'supabase', 'migrations');

const files = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort();

/** @type {Map<string, string[]>} */
const byVersion = new Map();
/** @type {string[]} */
const malformed = [];

for (const file of files) {
  const m = /^(\d{4})_/.exec(file);
  if (m === null) {
    malformed.push(file);
    continue;
  }
  const list = byVersion.get(m[1]) ?? [];
  list.push(file);
  byVersion.set(m[1], list);
}

const collisions = [...byVersion.entries()].filter(([, list]) => list.length > 1);

if (malformed.length > 0) {
  console.error('\nFICHIERS SANS PRÉFIXE DE VERSION `NNNN_` :');
  for (const f of malformed) console.error(`  ${f}`);
}

if (collisions.length > 0) {
  console.error('\nCOLLISION DE VERSION DE MIGRATION — `supabase db push` en sauterait une.');
  for (const [version, list] of collisions) {
    console.error(`  ${version} :`);
    for (const f of list) console.error(`     ${f}`);
  }
  console.error(
    '\nRenumérote le fichier le PLUS RÉCENT sur le prochain numéro libre, tant\n' +
      "qu'aucune base ne l'a reçu. Une migration DÉJÀ APPLIQUÉE ne se renumérote\n" +
      "jamais : elle s'empile.\n",
  );
}

if (malformed.length > 0 || collisions.length > 0) process.exit(1);

console.log(`Migrations : ${files.length} fichiers, ${byVersion.size} versions — aucune collision.`);
