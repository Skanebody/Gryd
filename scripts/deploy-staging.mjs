#!/usr/bin/env node
/**
 * GRYD — déploiement Supabase staging (O1).
 * Applique les migrations SQL + déploie les Edge Functions MVP.
 *
 * Prérequis :
 *   export SUPABASE_ACCESS_TOKEN=<token dashboard.supabase.com/account/tokens>
 *   export SUPABASE_PROJECT_REF=sydwxwwirinjoheeodcg
 *
 * Usage : node scripts/deploy-staging.mjs
 * Options :
 *   --dry-run   Affiche les commandes sans les exécuter
 *   --skip-db   Edge functions uniquement
 *   --skip-fn   Migrations uniquement
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'sydwxwwirinjoheeodcg';

const EDGE_FUNCTIONS = [
  'ingest_run',
  'crew_membership',
  'claim_crew_chest',
  'crew_social',
  'decay_job',
  'digest_job',
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipDb = args.has('--skip-db');
const skipFn = args.has('--skip-fn');

function run(cmd, cmdArgs, opts = {}) {
  const line = `${cmd} ${cmdArgs.join(' ')}`;
  if (dryRun) {
    console.log(`[dry-run] ${line}`);
    return { status: 0 };
  }
  console.log(`→ ${line}`);
  return spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function npx(args) {
  return run('npx', ['--yes', 'supabase@latest', ...args]);
}

if (!process.env.SUPABASE_ACCESS_TOKEN && !dryRun) {
  console.error(
    'SUPABASE_ACCESS_TOKEN manquant. Créer un token sur https://supabase.com/dashboard/account/tokens',
  );
  process.exit(1);
}

const pat = process.env.SUPABASE_ACCESS_TOKEN ?? '';
if (!dryRun && pat.startsWith('sb_secret_')) {
  console.error(
    'SUPABASE_ACCESS_TOKEN est une clé service (sb_secret_*), pas un PAT (sbp_*).',
  );
  console.error(
    'Dashboard → Account → Access Tokens → générer un token, puis l’exporter en SUPABASE_ACCESS_TOKEN.',
  );
  process.exit(1);
}

console.log(`GRYD staging deploy — project ${PROJECT_REF}`);

// Sync game-rules → edge functions shared copy
const sync = run('node', ['scripts/sync-game-rules.mjs']);
if (sync.status !== 0) process.exit(sync.status ?? 1);

// Link project (idempotent)
const link = npx(['link', '--project-ref', PROJECT_REF]);
if (link.status !== 0 && !dryRun) process.exit(link.status ?? 1);

if (!skipDb) {
  const push = npx(['db', 'push', '--linked']);
  if (push.status !== 0 && !dryRun) process.exit(push.status ?? 1);
}

if (!skipFn) {
  for (const fn of EDGE_FUNCTIONS) {
    const deploy = npx([
      'functions',
      'deploy',
      fn,
      '--project-ref',
      PROJECT_REF,
      '--use-api',
    ]);
    if (deploy.status !== 0 && !dryRun) process.exit(deploy.status ?? 1);
  }
}

console.log('Staging deploy terminé.');
if (!skipDb) console.log('  Migrations : db push (incl. 0018_map_and_crew)');
if (!skipFn) console.log(`  Functions  : ${EDGE_FUNCTIONS.join(', ')}`);
