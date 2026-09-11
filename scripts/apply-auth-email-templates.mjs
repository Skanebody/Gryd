#!/usr/bin/env node
/**
 * Applique les gabarits d'e-mail d'authentification GRYD au projet Supabase.
 *
 * SOURCE DE VÉRITÉ : `supabase/email-templates/2026-09/*.html` + `subjects.json`.
 * Le tableau de bord Supabase n'est PAS la source : ce qu'on y tape à la main
 * disparaît du dépôt et personne ne sait plus ce qui est parti au joueur. On
 * édite les fichiers, on relance ce script.
 *
 * Le jeton de gestion vient de l'ENVIRONNEMENT (`SUPABASE_ACCESS_TOKEN`),
 * jamais d'un fichier versionné :
 *   set -a && . ./scratchpad-secrets.local && set +a
 *   node scripts/apply-auth-email-templates.mjs
 *
 * Options :
 *   --dry-run   compare l'état distant aux fichiers, n'écrit rien, sort 1 si ça diffère
 *   --verify    ne fait QUE la relecture (GET) et la comparaison
 *
 * Après le PATCH, le script RELIT la configuration (GET) et compare octet à
 * octet : un PATCH accepté n'est pas une preuve que le contenu est enregistré
 * (le plan hébergé a déjà refusé des gabarits en répondant 200).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'supabase', 'email-templates', '2026-09');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'sydwxwwirinjoheeodcg';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

/** Clé d'API Supabase → fichier HTML. Les six gabarits du parcours e-mail. */
const GABARITS = {
  confirmation: 'confirmation.html',
  magic_link: 'magic-link.html',
  recovery: 'recovery.html',
  email_change: 'email-change.html',
  invite: 'invite.html',
  reauthentication: 'reauthentication.html',
};

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN absent de l\'environnement.');
  console.error('  set -a && . ./scratchpad-secrets.local && set +a');
  process.exit(2);
}

const dryRun = process.argv.includes('--dry-run');
const verifyOnly = process.argv.includes('--verify');

const subjects = JSON.parse(readFileSync(join(dir, 'subjects.json'), 'utf8'));
/** Ce qu'on VEUT : la paire objet + contenu de chacun des six gabarits. */
const voulu = {};
for (const [cle, fichier] of Object.entries(GABARITS)) {
  if (typeof subjects[cle] !== 'string' || !subjects[cle].trim()) {
    console.error(`subjects.json : objet manquant pour « ${cle} »`);
    process.exit(2);
  }
  voulu[`mailer_subjects_${cle}`] = subjects[cle];
  voulu[`mailer_templates_${cle}_content`] = readFileSync(join(dir, fichier), 'utf8');
}

async function lire() {
  const r = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`GET config/auth : HTTP ${r.status}`);
  return r.json();
}

/** Rend le verdict champ par champ, sans jamais imprimer le jeton. */
function compare(distant) {
  const ecarts = [];
  for (const [champ, attendu] of Object.entries(voulu)) {
    if (distant[champ] !== attendu) {
      ecarts.push({ champ, attenduOctets: Buffer.byteLength(attendu), distantOctets: distant[champ] == null ? 0 : Buffer.byteLength(String(distant[champ])) });
    }
  }
  return ecarts;
}

const avant = await lire();
const ecartsAvant = compare(avant);

if (verifyOnly || dryRun) {
  if (ecartsAvant.length === 0) {
    console.log(`✓ ${Object.keys(voulu).length} champs déjà conformes aux fichiers du dépôt.`);
    process.exit(0);
  }
  console.log(`${ecartsAvant.length} champ(s) diffèrent du dépôt :`);
  for (const e of ecartsAvant) console.log(`  · ${e.champ} (dépôt ${e.attenduOctets} o, distant ${e.distantOctets} o)`);
  process.exit(1);
}

if (ecartsAvant.length === 0) {
  console.log('Rien à faire : la configuration distante est déjà celle du dépôt.');
  process.exit(0);
}

const res = await fetch(API, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(voulu),
});
console.log(`PATCH config/auth : HTTP ${res.status}`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

// RELECTURE : le 200 ne prouve rien, seul le contenu relu le prouve.
const apres = await lire();
const ecartsApres = compare(apres);
if (ecartsApres.length > 0) {
  console.error(`✗ ${ecartsApres.length} champ(s) NON enregistré(s) malgré le HTTP ${res.status} :`);
  for (const e of ecartsApres) console.error(`  · ${e.champ} (dépôt ${e.attenduOctets} o, distant ${e.distantOctets} o)`);
  process.exit(1);
}
console.log(`✓ relu par GET : les ${Object.keys(voulu).length} champs sont identiques aux fichiers du dépôt.`);
for (const cle of Object.keys(GABARITS)) console.log(`  · ${cle} : « ${subjects[cle]} »`);
