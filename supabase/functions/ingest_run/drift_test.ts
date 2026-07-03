/**
 * Test anti-drift : les copies supabase/functions/_shared/{game-rules,types}.ts
 * doivent être STRICTEMENT identiques (byte à byte) aux sources
 * packages/shared/src/. Elles sont générées par scripts/sync-game-rules.mjs et
 * ne doivent jamais être éditées à la main (CLAUDE.md).
 */
import { assert } from 'jsr:@std/assert@^1';

const FILES = ['game-rules.ts', 'types.ts'] as const;

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
