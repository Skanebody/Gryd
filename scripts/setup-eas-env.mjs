#!/usr/bin/env node
/**
 * GRYD — Option C : configure les variables EAS pour les builds cloud.
 *
 * Prérequis (une fois) :
 *   cd apps/mobile && npx eas-cli login && npx eas-cli init
 *
 * Usage :
 *   export EXPO_TOKEN=<expo.dev access token>
 *   export EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key Supabase staging>
 *   npm run setup:eas
 *
 * Crée EXPO_PUBLIC_SUPABASE_ANON_KEY sur les environnements preview + development.
 * L'URL Supabase est déjà dans eas.json (pas secrète).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/mobile');
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const EXPO_TOKEN = process.env.EXPO_TOKEN?.trim();

const EAS_ENVS = ['preview', 'development', 'production'];

function run(args) {
  const line = `npx eas-cli@latest ${args.join(' ')}`;
  console.log(`→ ${line}`);
  const r = spawnSync('npx', ['--yes', 'eas-cli@latest', ...args], {
    stdio: 'inherit',
    cwd: MOBILE,
    env: { ...process.env, EXPO_TOKEN: EXPO_TOKEN ?? process.env.EXPO_TOKEN },
  });
  return r.status ?? 1;
}

if (!EXPO_TOKEN) {
  console.error(
    'EXPO_TOKEN manquant.\n' +
      '1. Chrome → https://expo.dev/settings/access-tokens → Create token\n' +
      '2. export EXPO_TOKEN=<token>',
  );
  process.exit(1);
}

if (!ANON_KEY) {
  console.error(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY manquant.\n' +
      '1. Chrome → https://supabase.com/dashboard/project/sydwxwwirinjoheeodcg/settings/api\n' +
      '2. Copier la clé anon public\n' +
      '3. export EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon>',
  );
  process.exit(1);
}

console.log('GRYD — configuration EAS env (Option C)\n');

const whoami = run(['whoami']);
if (whoami !== 0) process.exit(whoami);

for (const envName of EAS_ENVS) {
  console.log(`\n── Environnement EAS : ${envName} ──`);
  const code = run([
    'env:create',
    envName,
    '--name',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    '--value',
    ANON_KEY,
    '--visibility',
    'sensitive',
    '--scope',
    'project',
    '--environment',
    envName,
    '--non-interactive',
    '--force',
  ]);
  if (code !== 0) process.exit(code);
}

console.log('\n✓ EAS configuré. Vérification :');
const list = run(['env:list', '--environment', 'preview']);
process.exit(list);
