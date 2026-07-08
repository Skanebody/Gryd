#!/usr/bin/env node
/**
 * GRYD — échoue si des secrets Supabase/Expo apparaissent dans le repo tracké.
 * Usage : npm run check:secrets
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Valeurs réelles — pas les mentions doc (sb_secret_* sans payload, etc.). */
const PATTERNS = [
  { name: 'supabase_service_key', regex: 'sb_secret_[A-Za-z0-9_-]{10,}' },
  { name: 'supabase_publishable_key', regex: 'sb_publishable_[A-Za-z0-9_-]{10,}' },
  { name: 'supabase_pat', regex: 'sbp_[a-f0-9]{40}' },
  { name: 'expo_token', regex: 'j792d_[A-Za-z0-9_-]{10,}' },
];

const EXCLUDES = [
  ':!scripts/check-no-secrets.mjs',
  ':!DEPLOY.md',
  ':!**/*.md',
  ':!supabase/migrations/**',
  ':!apps/mobile/.env.example',
];

let failed = false;

for (const { name, regex } of PATTERNS) {
  try {
    const out = execSync(
      `git grep -n -E "${regex}" -- . ${EXCLUDES.join(' ')} 2>/dev/null || true`,
      { cwd: ROOT, encoding: 'utf8' },
    ).trim();
    if (out) {
      console.error(`Secret pattern matched (${name}):\n${out}`);
      failed = true;
    }
  } catch {
    // no matches
  }
}

if (failed) {
  console.error('\n✗ Secrets détectés dans le repo — retire-les avant commit.');
  process.exit(1);
}

console.log('✓ Aucun secret évident dans le repo tracké.');
