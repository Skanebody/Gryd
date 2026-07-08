#!/usr/bin/env node
/**
 * GRYD — pipeline complet staging : Supabase deploy + build iOS TestFlight.
 *
 *   export SUPABASE_ACCESS_TOKEN=...
 *   export EXPO_TOKEN=...
 *   node scripts/ship-staging.mjs
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(label, cmd, args) {
  console.log(`\n═══ ${label} ═══`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} a échoué (code ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

run('Sync game-rules', 'node', ['scripts/sync-game-rules.mjs']);
run('Deploy Supabase staging', 'node', ['scripts/deploy-staging.mjs']);
run('TestFlight iOS build', 'node', ['scripts/testflight-build.mjs', '--profile', 'preview']);

console.log('\n✓ Ship staging terminé. Suivre le build sur https://expo.dev');
