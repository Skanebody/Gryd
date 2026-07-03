#!/usr/bin/env node
/**
 * Génère les copies Deno de supabase/functions/_shared/ (les Edge Functions ne
 * peuvent pas importer hors de supabase/functions/ au deploy) :
 *  1. packages/shared/src/{badges,game-rules,types}.ts → _shared/ (copie byte à byte) ;
 *  2. packages/engine/src/*.ts → _shared/engine/ (imports réécrits pour Deno).
 * Un test Deno (ingest_run/drift_test.ts) vérifie l'absence de drift — ne
 * jamais éditer les copies à la main.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'supabase', 'functions', '_shared');
mkdirSync(dest, { recursive: true });

for (const f of ['badges.ts', 'game-rules.ts', 'types.ts']) {
  copyFileSync(join(root, 'packages', 'shared', 'src', f), join(dest, f));
  console.log(`sync: ${f} → supabase/functions/_shared/`);
}

// ─── Moteur de jeu : packages/engine/src → _shared/engine (imports Deno-ifiés) ─
// Transformation par regex simple, ligne à ligne. Les imports relatifs entre
// fichiers engine (`./x.ts`, extension incluse) sont laissés tels quels.
// ⚠ MIROIR EXACT dans supabase/functions/ingest_run/drift_test.ts
//   (engineHeader + transformEngineLine) — toute modification ici doit y être
//   répliquée à l'identique.

const engineHeader = (name) =>
  `// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.\n` +
  `// Source : packages/engine/src/${name}\n\n`;

const transformEngineLine = (line) =>
  line
    .replace(/(['"])@klaim\/shared\/badges\1/g, '$1../badges.ts$1')
    .replace(/(['"])@klaim\/shared\/game-rules\1/g, '$1../game-rules.ts$1')
    .replace(/(['"])@klaim\/shared\/types\1/g, '$1../types.ts$1')
    .replace(/(['"])h3-js\1/g, '$1npm:h3-js@^4.1$1');

const engineSrc = join(root, 'packages', 'engine', 'src');
const engineDest = join(dest, 'engine');
mkdirSync(engineDest, { recursive: true });

for (const f of readdirSync(engineSrc).filter((n) => n.endsWith('.ts')).sort()) {
  const source = readFileSync(join(engineSrc, f), 'utf8');
  const out = engineHeader(f) + source.split('\n').map(transformEngineLine).join('\n');
  writeFileSync(join(engineDest, f), out);
  console.log(`sync: engine/${f} → supabase/functions/_shared/engine/`);
}
