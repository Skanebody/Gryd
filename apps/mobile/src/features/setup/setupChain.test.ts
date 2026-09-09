import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SETUP_CHAIN, SETUP_EXIT } from './firstRun.ts';

const APP_DIR = new URL('../../../app/', import.meta.url);

async function code(rel: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(rel, APP_DIR));
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('les réglages de premier usage sont contextuels et sortent tous sur la carte', async () => {
  for (const route of SETUP_CHAIN) {
    const src = await code(`${route.slice(1)}.tsx`);
    assert(
      src.includes(`const NEXT_STEP = '${SETUP_EXIT}'`),
      `${route} ne doit pas imposer une autre étape de configuration`,
    );
  }
});

Deno.test('la navigation principale ne bloque plus la carte sur un profil incomplet', async () => {
  const src = await code('(tabs)/_layout.tsx');
  assertEquals(src.includes('decideFirstRun'), false);
  assertEquals(src.includes('useMinimalProfile'), false);
  assertEquals(src.includes('SETUP_ENTRY'), false);
});

Deno.test('les écrans contextuels restent de vraies routes Expo', async () => {
  for (const route of SETUP_CHAIN) {
    const path = new URL(`${route.slice(1)}.tsx`, APP_DIR);
    const stat = await Deno.stat(path);
    assert(stat.isFile);
  }
});
