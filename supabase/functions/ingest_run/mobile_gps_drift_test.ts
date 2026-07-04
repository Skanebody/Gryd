/**
 * Test anti-drift des copies MOBILE du moteur GPS (AMENDEMENT-15 §2) générées
 * par scripts/sync-game-rules.mjs vers apps/mobile/src/features/run/gps/engine/
 * (Metro/tsconfig Expo ne résolvent ni `@klaim/shared/*` en subpath ni les
 * imports Deno `./x.ts` — la copie est GÉNÉRÉE, jamais éditée à la main).
 * ⚠ MIROIR EXACT de scripts/sync-game-rules.mjs (mobileHeader +
 *   transformMobileLine + MOBILE_ENGINE_FILES) — toute modification là-bas
 *   doit être répliquée ici.
 */
import { assertEquals } from 'jsr:@std/assert@^1';

const MOBILE_ENGINE_FILES = ['gps.ts', 'validation.ts'] as const;

const mobileHeader = (name: string): string =>
  `// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.\n` +
  `// Source : packages/engine/src/${name} (drift testé côté Deno).\n\n`;

const transformMobileLine = (line: string): string =>
  line
    .replace(/(['"])@klaim\/shared\/game-rules\1/g, '$1@klaim/shared$1')
    .replace(/(['"])@klaim\/shared\/types\1/g, '$1@klaim/shared$1')
    .replace(/(['"])\.\/validation\.ts\1/g, '$1./validation$1');

const engineSrcDir = new URL('../../../packages/engine/src/', import.meta.url);
const mobileCopyDir = new URL(
  '../../../apps/mobile/src/features/run/gps/engine/',
  import.meta.url,
);

for (const file of MOBILE_ENGINE_FILES) {
  Deno.test(`drift : mobile gps/engine/${file} = transformation de packages/engine/src/${file}`, async () => {
    const source = await Deno.readTextFile(new URL(file, engineSrcDir));
    const expected = mobileHeader(file) +
      source.split('\n').map(transformMobileLine).join('\n');
    const copy = await Deno.readTextFile(new URL(file, mobileCopyDir));
    assertEquals(
      copy,
      expected,
      `apps/mobile/src/features/run/gps/engine/${file} a dérivé de packages/engine/src/${file} — ` +
        `lancer node scripts/sync-game-rules.mjs`,
    );
  });
}
