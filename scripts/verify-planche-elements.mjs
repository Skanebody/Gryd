#!/usr/bin/env node
/**
 * GRYD — VÉRIFICATION DES ÉLÉMENTS DE PLANCHE (utile ? branché ?).
 *
 * Complète `audit-routes.mjs` (portes d’écran) par un inventaire PLANCHE → CODE :
 * chaque élément dit s’il est utile au produit, et prouve s’il est câblé
 * (source, i18n, game-rules) ou volontairement absent (maquette / O1).
 *
 * Sortie :
 *   · stdout résumé + tableau
 *   · `docs/design/vague-1/VERIFY_ELEMENTS_REPORT.md` (écrasé à chaque run)
 *   · code 1 si un must_have/useful est non branché, ou si un maquette_only /
 *     retire est encore présent
 *
 * Usage :
 *   node scripts/verify-planche-elements.mjs
 *   node scripts/verify-planche-elements.mjs --screen E02
 *   npm run verify:planches
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANCHE_ELEMENTS } from './lib/planche-element-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = join(ROOT, 'docs/design/vague-1/VERIFY_ELEMENTS_REPORT.md');

const args = process.argv.slice(2);
const screenFilter = (() => {
  const i = args.indexOf('--screen');
  return i >= 0 ? args[i + 1] : null;
})();

/** @type {Map<string, string>} */
const fileCache = new Map();

function readRel(rel) {
  if (fileCache.has(rel)) return fileCache.get(rel);
  const abs = join(ROOT, rel);
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch {
    text = null;
  }
  fileCache.set(rel, text);
  return text;
}

/** Retire commentaires pour ne pas matcher de la prose. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Extrait le corps d’une fonction top-level `function Name(...) { ... }`
 * (accolades équilibrées). Null si introuvable.
 */
function extractFunction(src, name) {
  const re = new RegExp(`function\\s+${name}\\s*\\(`);
  const m = re.exec(src);
  if (!m) return null;
  const startBrace = src.indexOf('{', m.index);
  if (startBrace < 0) return null;
  let depth = 0;
  for (let i = startBrace; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(startBrace, i + 1);
    }
  }
  return null;
}

/**
 * @param {import('./lib/planche-element-registry.mjs').Check} check
 * @returns {{ ok: boolean, detail: string }}
 */
function runCheck(check) {
  const needles = Array.isArray(check.needle)
    ? check.needle
    : check.needle
      ? [check.needle]
      : [];

  if (check.kind === 'includes') {
    const missing = [];
    for (const file of check.files) {
      const raw = readRel(file);
      if (raw === null) {
        return { ok: false, detail: `${file} manquant` };
      }
      for (const n of needles) {
        if (!raw.includes(n)) {
          missing.push(`${file} ↛ « ${n} »`);
        }
      }
    }
    if (missing.length) {
      return { ok: false, detail: missing.slice(0, 6).join(' ; ') };
    }
    return { ok: true, detail: 'présent' };
  }

  if (check.kind === 'includes_any') {
    for (const file of check.files) {
      const raw = readRel(file);
      if (raw === null) continue;
      if (needles.every((n) => raw.includes(n))) {
        return { ok: true, detail: `${file}` };
      }
      // also allow ANY single needle across files
    }
    // Soft: at least one needle in at least one file for each needle? Spec:
    // all needles must appear somewhere among the files (union).
    const found = new Set();
    for (const file of check.files) {
      const raw = readRel(file);
      if (raw === null) continue;
      for (const n of needles) {
        if (raw.includes(n)) found.add(n);
      }
    }
    const missing = needles.filter((n) => !found.has(n));
    if (missing.length) {
      return { ok: false, detail: `manque : ${missing.join(', ')}` };
    }
    return { ok: true, detail: 'présent (union fichiers)' };
  }

  if (check.kind === 'absent') {
    const hits = [];
    for (const file of check.files) {
      const raw = readRel(file);
      if (raw === null) continue;
      const src = stripComments(raw);
      for (const n of needles) {
        if (src.includes(n)) hits.push(`${file} contient « ${n} »`);
      }
    }
    if (hits.length) {
      return { ok: false, detail: hits.slice(0, 6).join(' ; ') };
    }
    return { ok: true, detail: 'absent (OK)' };
  }

  if (check.kind === 'regex') {
    // Spécial FirstMissionPeek : pas de <Button
    if (check.why?.includes('Button') || check.pattern?.includes('FirstMissionPeek')) {
      const file = check.files[0];
      const raw = readRel(file);
      if (raw === null) return { ok: false, detail: `${file} manquant` };
      const body = extractFunction(stripComments(raw), 'FirstMissionPeek');
      if (!body) return { ok: false, detail: 'FirstMissionPeek introuvable' };
      if (/<\s*Button\b/.test(body)) {
        return { ok: false, detail: 'Button trouvé dans FirstMissionPeek (double CTA)' };
      }
      return { ok: true, detail: 'pas de Button dans FirstMissionPeek' };
    }
    const file = check.files[0];
    const raw = readRel(file);
    if (raw === null) return { ok: false, detail: `${file} manquant` };
    const re = new RegExp(check.pattern, 'm');
    return re.test(raw)
      ? { ok: true, detail: 'regex OK' }
      : { ok: false, detail: 'regex sans match' };
  }

  return { ok: false, detail: `kind inconnu : ${check.kind}` };
}

/**
 * @param {import('./lib/planche-element-registry.mjs').PlancheElement} el
 */
function evaluate(el) {
  const results = el.checks.map((c) => ({ check: c, ...runCheck(c) }));
  const allOk = results.every((r) => r.ok);
  const anyOk = results.some((r) => r.ok);

  /** @type {'wired'|'partial'|'unwired'|'intentional_absent'} */
  let wiring;
  if (el.usefulness === 'maquette_only' || el.usefulness === 'retire') {
    wiring = allOk ? 'intentional_absent' : 'wired'; // fail means still present
  } else if (el.usefulness === 'deferred_o1') {
    wiring = allOk ? 'intentional_absent' : 'partial';
  } else {
    wiring = allOk ? 'wired' : anyOk ? 'partial' : 'unwired';
  }

  /** @type {'PASS'|'FAIL'|'WARN'} */
  let verdict;
  if (el.usefulness === 'must_have' || el.usefulness === 'useful') {
    verdict = allOk ? 'PASS' : results.every((r) => !r.ok) ? 'FAIL' : 'WARN';
  } else if (el.usefulness === 'maquette_only' || el.usefulness === 'retire') {
    // absent = PASS ; still present = FAIL
    verdict = allOk ? 'PASS' : 'FAIL';
  } else {
    // deferred_o1 : absence attendue = PASS
    verdict = allOk ? 'PASS' : 'WARN';
  }

  return { el, results, wiring, verdict };
}

function usefulnessLabel(u) {
  return (
    {
      must_have: 'requis',
      useful: 'utile',
      maquette_only: 'maquette seule',
      deferred_o1: 'différé O1',
      retire: 'à retirer',
    }[u] ?? u
  );
}

function wiringLabel(w) {
  return (
    {
      wired: 'branché',
      partial: 'partiel',
      unwired: 'non branché',
      intentional_absent: 'absent OK',
    }[w] ?? w
  );
}

const elements = screenFilter
  ? PLANCHE_ELEMENTS.filter((e) => e.screen === screenFilter)
  : [...PLANCHE_ELEMENTS];

if (elements.length === 0) {
  console.error(`Aucun élément pour --screen ${screenFilter}`);
  process.exit(2);
}

const evaluated = elements.map(evaluate);
const pass = evaluated.filter((e) => e.verdict === 'PASS').length;
const warn = evaluated.filter((e) => e.verdict === 'WARN').length;
const fail = evaluated.filter((e) => e.verdict === 'FAIL').length;

const byScreen = new Map();
for (const row of evaluated) {
  const s = row.el.screen;
  if (!byScreen.has(s)) byScreen.set(s, []);
  byScreen.get(s).push(row);
}

let md = `# Rapport vérification éléments planche

Généré par \`node scripts/verify-planche-elements.mjs\` — **ne pas éditer à la main**.

| Total | PASS | WARN | FAIL |
|------:|-----:|-----:|-----:|
| ${evaluated.length} | ${pass} | ${warn} | ${fail} |

## Légende

| usefulness | Sens |
|---|---|
| requis / utile | Doit être **branché** (code + source réelle ou état vide honnête) |
| maquette seule | Placeholder planche — doit être **absent** du produit |
| différé O1 | Utile mais source manquante — **absent volontaire** OK |
| à retirer | Ancien / démo — doit avoir **disparu** |

| wiring | Sens |
|---|---|
| branché | Preuves \`checks\` toutes vertes |
| partiel | Certaines preuves manquent |
| non branché | Aucune preuve |
| absent OK | Absence voulue (maquette / O1 / retire) |

`;

for (const [screen, rows] of byScreen) {
  md += `\n## ${screen}\n\n`;
  md += `| Verdict | Id | Utile ? | Branché ? | Élément |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const row of rows) {
    const icon = row.verdict === 'PASS' ? '✅' : row.verdict === 'WARN' ? '⚠️' : '❌';
    md += `| ${icon} ${row.verdict} | \`${row.el.id}\` | ${usefulnessLabel(row.el.usefulness)} | ${wiringLabel(row.wiring)} | ${row.el.label} |\n`;
  }
  md += `\n`;
  for (const row of rows) {
    if (row.verdict === 'PASS' && !row.el.note) continue;
    md += `### \`${row.el.id}\`\n\n`;
    if (row.el.note) md += `> ${row.el.note}\n\n`;
    for (const r of row.results) {
      md += `- ${r.ok ? '✓' : '✗'} ${r.detail}${r.check.why ? ` _(${r.check.why})_` : ''}\n`;
    }
    md += `\n`;
  }
}

mkdirSync(dirname(REPORT_PATH), { recursive: true });
writeFileSync(REPORT_PATH, md, 'utf8');

console.log(`\n═══ verify:planches — ${evaluated.length} éléments ═══`);
console.log(`PASS ${pass} · WARN ${warn} · FAIL ${fail}`);
console.log(`Rapport : docs/design/vague-1/VERIFY_ELEMENTS_REPORT.md\n`);

for (const row of evaluated) {
  const icon = row.verdict === 'PASS' ? '✓' : row.verdict === 'WARN' ? '!' : '✗';
  console.log(
    `${icon} [${row.el.screen}] ${row.el.id} · ${usefulnessLabel(row.el.usefulness)} · ${wiringLabel(row.wiring)} · ${row.el.label}`,
  );
  if (row.verdict !== 'PASS') {
    for (const r of row.results.filter((x) => !x.ok)) {
      console.log(`    → ${r.detail}`);
    }
  }
}

if (fail > 0) {
  console.error(`\n${fail} élément(s) en échec — corriger avant de déclarer la planche fidèle.`);
  process.exit(1);
}

process.exit(0);
