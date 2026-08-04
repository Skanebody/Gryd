#!/usr/bin/env node
/**
 * GRYD — AUDIT DES ROUTES expo-router de `apps/mobile`.
 *
 * Il répond à deux questions qu'aucun typecheck ne pose :
 *
 *  1. ROUTE ORPHELINE — un écran existe sur le disque mais AUCUNE navigation ne
 *     peut y conduire. Le typecheck est vert, l'écran est mort.
 *  2. LIEN MORT — une navigation vise un chemin qu'aucun fichier ne sert. À
 *     l'exécution, le joueur tombe sur « Unmatched route » d'expo-router.
 *
 * ─── DEUX PIÈGES ÉVITÉS ICI, ET C'EST TOUT L'INTÉRÊT DU SCRIPT ─────────────
 *
 *  · `grep -E` (POSIX ERE) NE CONNAÎT PAS la classe `\s`. L'audit fait au shell
 *    dans ce dépôt rendait donc des faux orphelins en masse. Tout est fait ici
 *    en JS, où `\s` est une vraie classe (utiliser `[[:space:]]` si l'on tient
 *    absolument au shell).
 *  · UN CHEMIN CITÉ DANS UN COMMENTAIRE N'EST PAS UN LIEN. Sans retrait des
 *    commentaires, un écran se « référence » lui-même en prose et n'apparaît
 *    jamais orphelin — l'audit rend alors un rapport rassurant et faux. Les
 *    docblocks sont donc retirés avant extraction.
 *
 * Sortie : code 1 si un lien mort apparaît, ou si une route devient orpheline
 * sans figurer dans `KNOWN_ORPHANS` (où chaque entrée porte SA raison).
 *
 * Usage : `node scripts/audit-routes.mjs`
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = join(ROOT, 'apps/mobile/app');
const SCAN_DIRS = [join(ROOT, 'apps/mobile/app'), join(ROOT, 'apps/mobile/src')];

/**
 * ORPHELINES ASSUMÉES — chacune l'est pour une raison écrite dans SON fichier.
 * Ce ne sont pas des exemptions de confort : ce sont des écrans atteints
 * autrement qu'en tapant sur un lien, ou des trous connus et inscrits.
 */
const KNOWN_ORPHANS = new Map([
  [
    '/profil-rival/[handle]',
    'E56 — atteint par lien profond / QR uniquement. La raison a CHANGÉ le ' +
      '27/07/2026 : ce n’est plus « O1 n’expose pas de rival consenti » (la ' +
      'lecture consentie existe et l’écran s’en sert), c’est qu’aucune surface ' +
      'de l’app ne DÉSIGNE encore un autre joueur — il n’y a ni annuaire, ni ' +
      'flux, ni classement peuplé d’où partir. La porte viendra du premier ' +
      'écran qui nommera quelqu’un (docblock de l’écran).',
  ],
  [
    '/zones-rival/[handle]',
    'E15 — la carte d’E56. Elle EST désormais liée : le CTA « Voir ses zones » ' +
      'de /profil-rival/[handle] y mène (et n’est peint que s’il y a des ' +
      'contours à ouvrir). Le lien est un gabarit `/zones-rival/${handle}`, que ' +
      'ce script ne sait pas reconnaître comme une porte — l’orpheline est donc ' +
      'un angle mort de l’audit, pas un écran mort. Sa VRAIE porte d’entrée ' +
      'reste celle d’E56, ci-dessus.',
  ],
  ['/aujourdhui', "sans porte stable dans l'app — trou PRÉEXISTANT, inscrit dans son docblock"],
  // ─── UI MVP en construction (ADR-001, Phase 1) ────────────────────────────
  // Ces écrans sont orphelins PAR CONSTRUCTION, et c'est la garantie qu'ils ne
  // nuisent pas : tant que les huit du MVP ne sont pas passés sous `ux-gate`,
  // aucune porte ne doit y mener, sinon un joueur tomberait sur un parcours à
  // moitié fini. La bascule sera UN changement de route d'entrée — et ces deux
  // lignes devront alors DISPARAÎTRE d'ici, sans quoi l'audit cesserait de
  // surveiller les vraies orphelines du groupe.
  // ⚠️ `/bienvenue` et `/position` ONT ÉTÉ RETIRÉS D'ICI le 03/08/2026 : la
  // bascule de la porte d'entrée leur a donné une vraie porte
  // (`app/(tabs)/_layout.tsx` y redirige quiconque n'a pas de session). C'est
  // précisément ce que leur ancienne entrée annonçait devoir arriver — les
  // laisser aurait fait de l'audit un tampon plutôt qu'une surveillance.
  [
    '/course-live',
    'Live Run LEGACY — devenu orphelin PAR LA BASCULE du 03/08/2026, et c’est ' +
      'le signe que la bascule a marché : la reprise après crash mène désormais ' +
      'à `/course` (MVP). Les deux lisent le MÊME buffer (`lib/runStore`), donc ' +
      'une course interrompue avant la bascule se reprend quand même. Cet écran ' +
      'meurt avec l’UI legacy — il n’a pas à être re-relié.',
  ],
  // ─── RÉVÉLÉES LE 27/07/2026 PAR L'EXCLUSION DES TESTS (voir isTestFile) ────
  // Elles n'étaient pas atteignables hier non plus : leur SEUL référent était
  // un fichier `.test.ts`. Le script comptait donc un test comme une porte, et
  // affichait vert deux écrans morts. Les deux docblocks disaient déjà la
  // vérité — c'est l'audit qui ne la lisait pas.
  // ⚠️ `/course/[id]` A ÉTÉ RETIRÉ DE CETTE LISTE le 28/07/2026. Sa raison
  // (« aucune lecture d'une course PAR IDENTIFIANT n'existe (O1) : ni requête ni
  // RPC ») décrivait le CODE, pas le DROIT : la policy `runs_select_own` ouvrait
  // déjà la lecture. La requête est écrite (`features/history/detailRead.ts`),
  // E68 la rend, et CHAQUE ligne de `/historique` y mène (`RealRunCard`, forme
  // objet `{ pathname: '/course/[id]' }` — reconnue comme une porte par ce
  // script). L'écran n'est donc plus orphelin, et le laisser exempté aurait
  // masqué sa prochaine vraie régression.
  [
    '/challenges/[id]',
    'à DEUX portes d’un écran qui n’en a aucune (/aujourdhui, orpheline ' +
      'ci-dessus) : la liste /challenges n’est elle-même atteinte de nulle part ' +
      '(docblock de l’écran).',
  ],
]);

/** Ces chaînes ressemblent à des chemins mais n'en sont pas (préfixes, fixtures). */
const NOT_A_LINK = new Set([
  '/c/',
  '/course/',
  '/crew/quelquechose',
  // Préfixes de rédaction analytique (`lib/screenName.ts`) : ils servent à
  // NORMALISER un pathname, ils ne naviguent nulle part.
  '/parametres/',
  '/challenges/',
  '/map/missions/',
]);

/**
 * FICHIERS QUI NE SONT PAS DES PORTES (27/07/2026).
 *
 * `lib/screenName.ts` est la table de RÉDACTION analytique : elle contient, par
 * construction, le patron littéral de CHAQUE route dynamique (`/c/[code]`,
 * `/zones-rival/[handle]`…). Ces chaînes ne naviguent nulle part — elles servent
 * à EFFACER un segment avant PostHog. Comptées comme des liens, elles donnaient
 * une porte imaginaire à toute route dynamique : `/zones-rival/[handle]` a été
 * déclaré « a trouvé une porte » à la seconde même où on le rédigeait, alors
 * qu'aucun `router.push` du dépôt n'y mène. Un audit d'atteignabilité qui
 * s'auto-satisfait de sa propre table de rédaction ne mesure plus rien.
 */
const NOT_A_DOOR = new Set(['apps/mobile/src/lib/screenName.ts']);

/** Un TEST n'est pas une porte : personne n'y tape. Un écran dont le seul
 *  « lien » vient d'un fichier `.test.ts` est un écran mort, et doit le dire. */
const isTestFile = (rel) => /\.test\.tsx?$/.test(rel);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Fichier → route servie (groupes retirés, `index` replié, variantes fusionnées). */
function routeOf(file) {
  const rel = relative(APP_DIR, file)
    .replace(/\\/g, '/')
    .replace(/\.(web|native|ios|android)\.tsx$/, '')
    .replace(/\.tsx$/, '');
  const segs = rel.split('/').filter((s) => !/^\(.+\)$/.test(s));
  if (segs[segs.length - 1] === 'index') segs.pop();
  return '/' + segs.join('/');
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const routes = new Map();
for (const file of walk(APP_DIR)) {
  if (!file.endsWith('.tsx')) continue;
  if (/(^|\/)_layout\.(web\.)?tsx$/.test(file)) continue;
  const r = routeOf(file);
  if (!routes.has(r)) routes.set(r, []);
  routes.get(r).push(relative(ROOT, file));
}

// ── références sortantes (code seulement, commentaires retirés) ─────────────
const LINK_RE = /['"`](\/[A-Za-z0-9_\-[\]/.]*)['"`]/g;
const refs = new Map();
for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const relFile = relative(ROOT, file).replace(/\\/g, '/');
  if (NOT_A_DOOR.has(relFile) || isTestFile(relFile)) continue;
  const text = stripComments(readFileSync(file, 'utf8'));
  LINK_RE.lastIndex = 0;
  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (!refs.has(m[1])) refs.set(m[1], new Set());
    refs.get(m[1]).add(relative(ROOT, file));
  }
}

/** Le chemin référencé correspond-il à une route servie ? (segments dynamiques inclus) */
function matchRoute(link) {
  const clean = link.split('?')[0].replace(/(.)\/$/, '$1');
  if (routes.has(clean)) return clean;
  const parts = clean.split('/');
  for (const r of routes.keys()) {
    const rp = r.split('/');
    if (rp.length !== parts.length) continue;
    if (rp.every((seg, i) => seg === parts[i] || /^\[.+\]$/.test(seg))) return r;
  }
  return null;
}

const inbound = new Map();
for (const [link, files] of refs) {
  const r = matchRoute(link);
  if (!r) continue;
  const own = new Set(routes.get(r));
  const from = inbound.get(r) ?? new Set();
  for (const f of files) if (!own.has(f)) from.add(f);
  inbound.set(r, from);
}

const orphans = [...routes.keys()].filter((r) => (inbound.get(r)?.size ?? 0) === 0);

// ═══════════════════════════════════════════════════════════════════════════
// ATTEIGNABILITÉ RÉELLE — ajoutée le 03/08/2026, après un défaut passé au VERT
// ═══════════════════════════════════════════════════════════════════════════
//
// Ce qui précède mesure « existe-t-il un lien ÉCRIT vers cette route ». Ce n'est
// pas la même question que « un joueur peut-il y arriver », et l'écart s'est
// payé le jour de la bascule d'entrée : `app/(tabs)/_layout.tsx` renvoie
// désormais vers `/carte` par un `return` inconditionnel, donc AUCUN écran des
// onglets ne rend plus — mais leurs liens croisés restaient écrits, et chacun
// donnait une porte à l'autre. Le graphe legacy s'auto-alimentait.
//
// Résultat : la suppression de compte, l'export RGPD, la confidentialité et
// l'aide sont devenues injoignables — un REFUS App Store garanti (5.1.1(v)) —
// et cet audit est resté vert. Il ne mesurait plus rien de ce qui comptait.
//
// D'où un second passage, en PARTANT DES PORTES.

/**
 * Les routes sur lesquelles l'app peut RÉELLEMENT s'ouvrir.
 *
 * Ce sont les trois issues de la garde d'entrée (`app/(tabs)/_layout.tsx`) :
 * l'onboarding si le drapeau n'est pas posé, la connexion s'il l'est, la carte
 * si une session existe.
 *
 * ⚠️ `/` N'EN FAIT PAS PARTIE, et c'est tout le sujet : la garde y redirige
 * AVANT que `(tabs)/index.tsx` ne rende. L'inscrire ici rouvrirait tout l'arbre
 * legacy par la porte même qu'on vient de condamner, et cet audit recommencerait
 * à s'auto-satisfaire.
 */
const ENTRY_ROUTES = ['/bienvenue', '/connexion', '/carte'];

/**
 * Ce qui DOIT rester atteignable, sous peine de refus App Store ou d'infraction.
 * Cette liste n'est pas une préférence : chaque entrée porte une obligation.
 */
const REQUIRED_REACHABLE = new Map([
  ['/confidentialite', 'politique de confidentialité + export RGPD (portabilité)'],
  ['/code-conduite', 'CGU / règles de communauté'],
  ['/support', 'contact d’assistance — exigé par l’App Store'],
  ['/sign-in', 'la connexion : sans elle, aucun compte ne peut être créé'],
]);

// fichier → routes qu'il désigne, puis route → routes (le graphe de navigation).
const outByFile = new Map();
for (const [link, files] of refs) {
  const r = matchRoute(link);
  if (!r) continue;
  for (const f of files) {
    if (!outByFile.has(f)) outByFile.set(f, new Set());
    outByFile.get(f).add(r);
  }
}
const outByRoute = new Map();
for (const [r, files] of routes) {
  const s = new Set();
  for (const f of files) for (const x of outByFile.get(f) ?? []) s.add(x);
  outByRoute.set(r, s);
}

const reachable = new Set();
const file = [...ENTRY_ROUTES];
while (file.length > 0) {
  const r = file.shift();
  if (reachable.has(r) || !routes.has(r)) continue;
  reachable.add(r);
  for (const next of outByRoute.get(r) ?? []) if (!reachable.has(next)) file.push(next);
}

const unreachable = [...routes.keys()].filter((r) => !reachable.has(r));
const requiredLost = [...REQUIRED_REACHABLE.keys()].filter(
  (r) => routes.has(r) && !reachable.has(r),
);
const dead = [];
for (const [link, files] of refs) {
  if (NOT_A_LINK.has(link) || link === '/') continue;
  if (/\.(png|jpe?g|svg|json|tsx?|jsx?|mjs|sql|md|webp|ttf|otf)$/.test(link)) continue;
  if (matchRoute(link)) continue;
  dead.push({ link, files: [...files] });
}

console.log(`Routes servies : ${routes.size}`);
console.log(`\nORPHELINES (${orphans.length})`);
for (const r of orphans) {
  const why = KNOWN_ORPHANS.get(r);
  console.log(`  ${why ? 'assumée ' : '⚠ NOUVELLE '}${r}${why ? ` — ${why}` : ''}`);
}
console.log(`\nLIENS SANS ROUTE (${dead.length})`);
for (const d of dead) console.log(`  ⚠ ${d.link} — dans ${d.files.slice(0, 3).join(', ')}`);

console.log(`\nATTEIGNABLES depuis les portes d'entrée : ${reachable.size} / ${routes.size}`);
if (unreachable.length > 0) {
  // INFORMATIF, pas bloquant : depuis la bascule (ADR-001, mode hybride), tout
  // l'arbre legacy est légitimement injoignable — c'est le but. Le CHIFFRE est
  // affiché pour qu'il ne dérive pas en silence : s'il augmente d'un coup, c'est
  // qu'une branche vivante vient d'être coupée.
  console.log(`  (dont ${unreachable.length} injoignables — legacy en quarantaine, ADR-001)`);
  if (process.env.GRYD_AUDIT_VERBOSE === '1') for (const r of unreachable) console.log(`      · ${r}`);
}
if (requiredLost.length > 0) {
  console.log('\nOBLIGATIONS PERDUES :');
  for (const r of requiredLost) console.log(`  ⚠ ${r} — ${REQUIRED_REACHABLE.get(r)}`);
}

const newOrphans = orphans.filter((r) => !KNOWN_ORPHANS.has(r));
const stale = [...KNOWN_ORPHANS.keys()].filter((r) => !orphans.includes(r));
if (stale.length > 0) {
  console.log(`\nÀ NETTOYER : ces orphelines ont trouvé une porte — ${stale.join(', ')}`);
}
if (requiredLost.length > 0) {
  console.log(
    '\nÉCHEC : un écran EXIGÉ n’est plus atteignable depuis les portes d’entrée.\n' +
      'Ce n’est pas une orpheline : le lien existe peut-être encore, mais aucun\n' +
      'joueur ne peut y arriver. C’est exactement le défaut que la bascule du\n' +
      '03/08/2026 a produit, et que cet audit ne savait pas voir.',
  );
  process.exit(1);
}
if (newOrphans.length > 0 || dead.length > 0) {
  console.error('\nÉCHEC : route orpheline non documentée, ou lien vers une route inexistante.');
  process.exit(1);
}
console.log('\nOK — aucune route orpheline nouvelle, aucun lien mort.');
