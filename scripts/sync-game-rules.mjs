#!/usr/bin/env node
/**
 * Copie packages/shared/src/{game-rules,types}.ts vers supabase/functions/_shared/.
 * Les Edge Functions Deno ne peuvent pas importer hors de supabase/functions/ au deploy.
 * Un test Deno vérifie l'absence de drift — ne jamais éditer les copies à la main.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'supabase', 'functions', '_shared');
mkdirSync(dest, { recursive: true });

for (const f of ['game-rules.ts', 'types.ts']) {
  copyFileSync(join(root, 'packages', 'shared', 'src', f), join(dest, f));
  console.log(`sync: ${f} → supabase/functions/_shared/`);
}
