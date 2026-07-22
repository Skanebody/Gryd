#!/usr/bin/env node
/**
 * Génère les copies Deno de supabase/functions/_shared/ (les Edge Functions ne
 * peuvent pas importer hors de supabase/functions/ au deploy) :
 *  1. packages/shared/src/{badges,bonuses,game-rules,types}.ts → _shared/ (copie byte à byte) ;
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

for (const f of ['badges.ts', 'game-rules.ts', 'types.ts', 'sectorName.ts']) {
  copyFileSync(join(root, 'packages', 'shared', 'src', f), join(dest, f));
  console.log(`sync: ${f} → supabase/functions/_shared/`);
}

// ─── DATA bonus (packages/shared/src/bonuses.ts) → _shared (imports .ts-ifiés) ─
// bonuses.ts a des imports RELATIFS À VALEUR (`./game-rules`, `./types`, sans
// extension : shared est en moduleResolution=bundler). Le bundler de Supabase
// (Deno deploy) exige l'extension `.ts` sur ces imports runtime — on les réécrit
// à la copie (game-rules.ts et types.ts sont eux copiés byte à byte à côté).
// NB : les imports `import type` seuls seraient effacés, mais bonuses.ts importe
// des VALEURS (constantes) → réécriture obligatoire, contrairement à types.ts.
// ⚠ MIROIR EXACT dans supabase/functions/ingest_run/drift_test.ts
//   (transformSharedDataLine) — toute modification ici doit y être répliquée.
const transformSharedDataLine = (line) =>
  line
    .replace(/(['"])\.\/game-rules\1/g, '$1./game-rules.ts$1')
    .replace(/(['"])\.\/types\1/g, '$1./types.ts$1');

// Même traitement pour streak.ts (LOT 1 « LA SÉRIE VISIBLE ») : moteur PUR de la
// série, hébergé dans `shared` (et non `engine`) pour que le mobile l'importe
// sans tirer h3-js dans le bundle Metro — il n'importe que des constantes.
// ⚠ MIROIR EXACT dans drift_test.ts (SHARED_DATA_FILES).
const SHARED_DATA_FILES = ['bonuses.ts', 'streak.ts', 'habits.ts', 'season.ts'];
for (const f of SHARED_DATA_FILES) {
  const source = readFileSync(join(root, 'packages', 'shared', 'src', f), 'utf8');
  const out = source.split('\n').map(transformSharedDataLine).join('\n');
  writeFileSync(join(dest, f), out);
  console.log(`sync: ${f} → supabase/functions/_shared/ (imports .ts-ifiés)`);
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
    .replace(/(['"])@klaim\/shared\/bonuses\1/g, '$1../bonuses.ts$1')
    .replace(/(['"])@klaim\/shared\/game-rules\1/g, '$1../game-rules.ts$1')
    .replace(/(['"])@klaim\/shared\/streak\1/g, '$1../streak.ts$1')
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

// ─── Moteur mobile : sous-ensembles de packages/engine → Expo ────────────────
// Metro/tsconfig Expo ne résolvent ni les subpath exports `@klaim/shared/*`
// ni les imports Deno `./x.ts` de packages/engine — comme pour _shared/, on
// GÉNÈRE une copie (imports réécrits pour Metro) au lieu de mirrorer à la main.
// SEULEMENT les fichiers dont l'écran a besoin, pour ne pas tirer h3-js ni le
// moteur de claim dans le bundle mobile.
//   · run/gps/engine   : tracking GPS (AMENDEMENT-15 §2) ;
//   · crew/engine      : mission prioritaire du crew (AMENDEMENT-43 §0 maillon 3)
//                        — crewMission.ts n'importe QUE game-rules, aucun h3.
// ⚠ MIROIR EXACT dans supabase/functions/ingest_run/mobile_gps_drift_test.ts
//   (mobileHeader + transformMobileLine + MOBILE_ENGINE_TARGETS).

const MOBILE_ENGINE_TARGETS = [
  { files: ['gps.ts', 'validation.ts'], dir: ['apps', 'mobile', 'src', 'features', 'run', 'gps', 'engine'] },
  {
    files: ['crewMission.ts', 'crewSignals.ts'],
    dir: ['apps', 'mobile', 'src', 'features', 'crew', 'engine'],
  },
  // LOT 3 (A-45 §3) : Zone du Jour + défi 7 jours d'accueil. Ni dailyZone.ts ni
  // welcomeChallenge.ts n'importent h3-js — seulement game-rules.
  {
    files: ['dailyZone.ts', 'welcomeChallenge.ts'],
    dir: ['apps', 'mobile', 'src', 'features', 'daily', 'engine'],
  },
];

const mobileHeader = (name) =>
  `// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.\n` +
  `// Source : packages/engine/src/${name} (drift testé côté Deno).\n\n`;

const transformMobileLine = (line) =>
  line
    .replace(/(['"])@klaim\/shared\/game-rules\1/g, '$1@klaim/shared$1')
    .replace(/(['"])@klaim\/shared\/types\1/g, '$1@klaim/shared$1')
    // Imports relatifs ENTRE fichiers engine : Deno exige l'extension `.ts`,
    // Metro/tsconfig Expo la refusent. Règle GÉNÉRIQUE (et non fichier par
    // fichier) : sinon chaque nouveau fichier engine tiré côté mobile
    // demanderait d'éditer deux regex miroirs — et l'oubli ne casserait qu'au
    // bundling, pas au typecheck.
    .replace(/(['"])(\.\/[A-Za-z0-9_-]+)\.ts\1/g, '$1$2$1');

for (const target of MOBILE_ENGINE_TARGETS) {
  const mobileDest = join(root, ...target.dir);
  mkdirSync(mobileDest, { recursive: true });
  for (const f of target.files) {
    const source = readFileSync(join(engineSrc, f), 'utf8');
    const out = mobileHeader(f) + source.split('\n').map(transformMobileLine).join('\n');
    writeFileSync(join(mobileDest, f), out);
    console.log(`sync: engine/${f} → ${target.dir.join('/')}/`);
  }
}
