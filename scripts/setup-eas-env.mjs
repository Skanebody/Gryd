#!/usr/bin/env node
/**
 * GRYD — Option C : configure SUPABASE_ANON_KEY sur EAS (sensible, hors repo).
 * La clé publishable est injectée au build via app.config.ts → extra — jamais
 * commitée, jamais dans eas.json.
 *
 * Usage :
 *   export EXPO_TOKEN=...
 *   export SUPABASE_ANON_KEY=sb_publishable_...   (PAS sb_secret_*)
 *   npm run setup:eas
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/mobile');
const ANON_KEY = (
  process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)?.trim();
const EXPO_TOKEN = process.env.EXPO_TOKEN?.trim();

const EAS_ENVS = ['preview', 'development', 'production'];

function run(args) {
  const line = `npx eas-cli@latest ${args.join(' ')}`;
  console.log(`→ ${line.replace(ANON_KEY ?? '', '***')}`);
  const r = spawnSync('npx', ['--yes', 'eas-cli@latest', ...args], {
    stdio: 'inherit',
    cwd: MOBILE,
    env: { ...process.env, EXPO_TOKEN: EXPO_TOKEN ?? process.env.EXPO_TOKEN },
  });
  return r.status ?? 1;
}

if (!EXPO_TOKEN) {
  console.error('EXPO_TOKEN manquant.');
  process.exit(1);
}

if (!ANON_KEY) {
  console.error('SUPABASE_ANON_KEY manquant (clé publishable uniquement, pas sb_secret_*).');
  process.exit(1);
}

if (ANON_KEY.startsWith('sb_secret_')) {
  console.error('Refus : sb_secret_* ne doit jamais être configurée sur l’app mobile.');
  process.exit(1);
}

console.log('GRYD — configuration EAS SUPABASE_ANON_KEY (hors repo)\n');

const whoami = run(['whoami']);
if (whoami !== 0) process.exit(whoami);

for (const envName of EAS_ENVS) {
  console.log(`\n── EAS environment : ${envName} ──`);
  const code = run([
    'env:create',
    envName,
    '--name',
    'SUPABASE_ANON_KEY',
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

console.log('\n✓ SUPABASE_ANON_KEY configurée (sensitive). Vérification :');
process.exit(run(['env:list', '--environment', 'production']));
