#!/usr/bin/env node
/**
 * GRYD — lance un build iOS EAS (TestFlight internal via profil preview).
 *
 * Prérequis :
 *   export EXPO_TOKEN=<expo.dev access token>
 *   cd apps/mobile && eas init   (une fois — lie le projectId)
 *   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon>
 *
 * Usage :
 *   node scripts/testflight-build.mjs [--profile preview|development] [--wait]
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOBILE = path.join(ROOT, 'apps/mobile');

const argv = process.argv.slice(2);
const profileIdx = argv.indexOf('--profile');
const profile = profileIdx >= 0 ? argv[profileIdx + 1] ?? 'preview' : 'preview';
const wait = argv.includes('--wait');

if (!process.env.EXPO_TOKEN) {
  console.error('EXPO_TOKEN manquant. Créer un token sur https://expo.dev/settings/access-tokens');
  process.exit(1);
}

const args = [
  '--yes',
  'eas-cli@latest',
  'build',
  '--platform',
  'ios',
  '--profile',
  profile,
  '--non-interactive',
];
if (!wait) args.push('--no-wait');

console.log(`GRYD TestFlight build — profile ${profile}`);
const result = spawnSync('npx', args, { stdio: 'inherit', cwd: MOBILE });
process.exit(result.status ?? 1);
