/**
 * Tests anti-drift des copies générées par scripts/sync-game-rules.mjs
 * (CLAUDE.md, D12 — ne jamais les éditer à la main) :
 *  1. _shared/{badges,game-rules,types}.ts : identiques BYTE À BYTE aux sources
 *     packages/shared/src/ ;
 *  2. _shared/engine/*.ts : identiques au résultat de la TRANSFORMATION des
 *     sources packages/engine/src/*.ts (imports Deno-ifiés + header généré) —
 *     la transformation est re-appliquée ici et comparée.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';

const FILES = ['badges.ts', 'game-rules.ts', 'types.ts'] as const;

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

for (const file of FILES) {
  Deno.test(`drift : _shared/${file} identique à packages/shared/src/${file}`, async () => {
    const source = await Deno.readFile(
      new URL(`../../../packages/shared/src/${file}`, import.meta.url),
    );
    const copy = await Deno.readFile(new URL(`../_shared/${file}`, import.meta.url));
    assert(
      bytesEqual(source, copy),
      `supabase/functions/_shared/${file} a dérivé de packages/shared/src/${file} — ` +
        `lancer node scripts/sync-game-rules.mjs`,
    );
  });
}

// ─── DATA bonus : _shared/bonuses.ts = transformation de la source ───────────
// bonuses.ts n'est PAS copié byte à byte : ses imports relatifs À VALEUR sont
// réécrits avec l'extension .ts (Deno deploy l'exige). MIROIR EXACT de
// scripts/sync-game-rules.mjs (transformSharedDataLine).
const transformSharedDataLine = (line: string): string =>
  line
    .replace(/(['"])\.\/game-rules\1/g, '$1./game-rules.ts$1')
    .replace(/(['"])\.\/types\1/g, '$1./types.ts$1');

// `streak.ts` (LOT 1) suit le même chemin : moteur PUR de la série hébergé dans
// `shared` pour rester importable par le mobile sans tirer h3-js.
// ⚠ MIROIR EXACT de scripts/sync-game-rules.mjs (SHARED_DATA_FILES).
const SHARED_DATA_FILES = ['bonuses.ts', 'streak.ts', 'habits.ts', 'season.ts'] as const;

for (const f of SHARED_DATA_FILES) {
  Deno.test(`drift : _shared/${f} = transformation de packages/shared/src/${f}`, async () => {
    const source = await Deno.readTextFile(
      new URL(`../../../packages/shared/src/${f}`, import.meta.url),
    );
    const expected = source.split('\n').map(transformSharedDataLine).join('\n');
    const copy = await Deno.readTextFile(new URL(`../_shared/${f}`, import.meta.url));
    assertEquals(
      copy,
      expected,
      `supabase/functions/_shared/${f} a dérivé de packages/shared/src/${f} — ` +
        'lancer node scripts/sync-game-rules.mjs',
    );
  });
}

// ─── Moteur : _shared/engine/*.ts = transformation de packages/engine/src ────
// ⚠ MIROIR EXACT de scripts/sync-game-rules.mjs (engineHeader +
//   transformEngineLine) — toute modification là-bas doit être répliquée ici.

const engineHeader = (name: string): string =>
  `// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.\n` +
  `// Source : packages/engine/src/${name}\n\n`;

const transformEngineLine = (line: string): string =>
  line
    .replace(/(['"])@klaim\/shared\/badges\1/g, '$1../badges.ts$1')
    .replace(/(['"])@klaim\/shared\/bonuses\1/g, '$1../bonuses.ts$1')
    .replace(/(['"])@klaim\/shared\/game-rules\1/g, '$1../game-rules.ts$1')
    .replace(/(['"])@klaim\/shared\/streak\1/g, '$1../streak.ts$1')
    .replace(/(['"])@klaim\/shared\/types\1/g, '$1../types.ts$1')
    .replace(/(['"])h3-js\1/g, '$1npm:h3-js@^4.1$1');

const engineSrcDir = new URL('../../../packages/engine/src/', import.meta.url);
const engineCopyDir = new URL('../_shared/engine/', import.meta.url);

const listTs = (dir: URL): string[] =>
  [...Deno.readDirSync(dir)]
    .filter((e) => e.isFile && e.name.endsWith('.ts'))
    .map((e) => e.name)
    .sort();

const engineFiles = listTs(engineSrcDir);

Deno.test('drift : _shared/engine/ contient exactement les fichiers de packages/engine/src/', () => {
  assertEquals(
    listTs(engineCopyDir),
    engineFiles,
    'supabase/functions/_shared/engine/ ne reflète pas packages/engine/src/ — ' +
      'lancer node scripts/sync-game-rules.mjs',
  );
});

for (const file of engineFiles) {
  Deno.test(`drift : _shared/engine/${file} = transformation de packages/engine/src/${file}`, async () => {
    const source = await Deno.readTextFile(new URL(file, engineSrcDir));
    const expected = engineHeader(file) +
      source.split('\n').map(transformEngineLine).join('\n');
    const copy = await Deno.readTextFile(new URL(file, engineCopyDir));
    assertEquals(
      copy,
      expected,
      `supabase/functions/_shared/engine/${file} a dérivé de packages/engine/src/${file} — ` +
        `lancer node scripts/sync-game-rules.mjs`,
    );
  });
}
