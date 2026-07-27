#!/usr/bin/env node
/**
 * GRYD — LES TESTS SQL DEVIENNENT EXÉCUTABLES PAR LE GATE.
 *
 * ─── LE TROU QUE CE RUNNER BOUCHE (27/07/2026) ──────────────────────────────
 * `supabase/tests/*.pglite.test.mjs` existaient depuis des semaines — 23
 * fichiers, dont les seules preuves de la RLS, de l'opposabilité serveur de
 * `map_sharing` et de l'anti-pay-to-win des RPC sociales. Mais :
 *   · `@electric-sql/pglite` n'était déclaré dans AUCUN package.json du
 *     monorepo, donc pas installé : chaque test sortait en 2 avec « NON EXÉCUTÉ
 *     — PGlite est introuvable » ;
 *   · le `gate` (typecheck + sync + packages + mobile + functions) n'appelait
 *     aucun d'eux.
 * Une preuve que personne ne peut rejouer n'est pas une preuve. Docker étant
 * indisponible sur ce poste (CLAUDE.md), PGlite EST le seul Postgres du dépôt :
 * il est désormais une dépendance déclarée, et ce runner est dans le gate.
 *
 * ─── CE QUE PGlite NE PROUVE PAS, ET QU'AUCUN VERT NE DOIT LAISSER CROIRE ───
 * PGlite s'exécute en SUPERUTILISATEUR et n'a pas PostGIS. Les tests le disent
 * fichier par fichier : ils prouvent le SQL (le `where` d'une vue, les
 * privilèges `revoke`, la logique d'une RPC, la présence d'une policy), jamais
 * l'EFFET d'une policy sur un rôle restreint. Ce runner ne change rien à cette
 * limite — il rend seulement les tests rejouables.
 *
 * Chaque fichier tourne dans son PROPRE processus : ils créent tous une base en
 * mémoire et rejouent une lignée de migrations, les isoler est la seule façon
 * qu'un état ne fuie pas de l'un à l'autre.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TESTS = join(HERE, '..', 'supabase', 'tests');

const files = readdirSync(TESTS)
  .filter((f) => f.endsWith('.pglite.test.mjs'))
  .sort();

if (files.length === 0) {
  console.error('Aucun test SQL trouvé dans supabase/tests/ — le runner ne prouve rien.');
  process.exit(1);
}

console.log(`Tests SQL (PGlite) — ${files.length} fichiers\n`);

const failed = [];
for (const file of files) {
  const res = spawnSync(process.execPath, [join(TESTS, file)], { stdio: 'pipe', encoding: 'utf8' });
  const ok = res.status === 0;
  if (!ok) {
    failed.push(file);
    process.stdout.write(res.stdout ?? '');
    process.stderr.write(res.stderr ?? '');
  }
  console.log(`  ${ok ? 'ok  ' : 'ÉCHEC'} ${file}`);
}

console.log('');
if (failed.length > 0) {
  console.error(`${failed.length} fichier(s) SQL en échec :`);
  for (const f of failed) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`${files.length} fichiers SQL verts.`);
