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
 * ═══ 09/09/2026 — LA COMPOSITION EST DEVENUE LA NAVIGATION (ADR-012) ═══════
 *
 * Le cahier de septembre a changé la FORME des fichiers de route, pas seulement
 * leur contenu. `app/(tabs)/index.tsx` fait désormais UNE ligne :
 *
 *     export { default } from '../../src/features/refonte/MapHome';
 *
 * et la navigation vit dans les composants que cet écran COMPOSE — sa barre
 * basse (`src/features/nav/GrydNavBar.tsx`), ses feuilles, son moteur de sortie
 * d'onboarding (`src/features/onboarding/journey2026.ts:15`). Un audit qui ne
 * lit QUE le fichier de route lit alors une ligne d'`export` et conclut que
 * l'app n'a aucune porte : avant ce chantier, il rendait 2 routes atteignables
 * sur 80 et déclarait la confidentialité, l'aide et le formulaire de compte
 * injoignables — un faux ROUGE, aussi inutile qu'un faux vert.
 *
 * D'où deux ajouts, et un garde-fou :
 *
 *  · LES FICHIERS D'UNE ROUTE incluent le module qu'une ré-exportation PURE
 *    sert. Sans ça, l'écran ré-exporté est un TIERS pour l'audit : ses liens
 *    vers lui-même compteraient comme des portes ENTRANTES, et une route se
 *    déclarerait non-orpheline en se citant elle-même — la faute exacte que le
 *    retrait des commentaires corrigeait déjà pour la prose.
 *  · LES ARÊTES SORTANTES d'une route sont les liens de tout son ARBRE DE
 *    COMPOSITION : les imports RELATIFS suivis transitivement depuis ses
 *    fichiers, dans `apps/mobile/src` et `apps/mobile/app`. C'est la définition
 *    honnête de « ce que le joueur peut taper » : il ne tape pas dans un
 *    fichier de route, il tape dans un composant que cet écran a monté. Un
 *    bouton de `GrydNavBar` est une porte de la Carte au même titre qu'un
 *    `router.push` écrit dans `MapHome.tsx`.
 *  · GARDE-FOU CONTRE L'AUTO-ALIMENTATION (le défaut dénoncé plus bas, §
 *    ATTEIGNABILITÉ) : l'arbre d'une route S'ARRÊTE au fichier d'une AUTRE
 *    route. Sans cette frontière, il suffirait qu'un écran vivant importe quoi
 *    que ce soit d'un écran mort pour hériter de tous ses liens, et le graphe
 *    legacy se rouvrirait par la bande. On ne compte donc jamais les liens
 *    écrits d'un écran injoignable : on ne compte que ce que l'arbre d'une
 *    route ATTEIGNABLE contient.
 *
 * ⚠️ CE QUE CETTE MESURE NE PROUVE TOUJOURS PAS, ET IL FAUT LE DIRE. Elle lit
 * des liens ÉCRITS dans un arbre de composition, pas des liens ATTEINTS. Trois
 * limites subsistent, toutes connues :
 *   · un `router.push` dans une branche conditionnelle jamais prise (le cas
 *     `/connexion` du 03/08/2026) est compté comme une porte ;
 *   · un composant importé mais rendu sous condition (`{flag ? <X/> : null}`)
 *     donne ses liens à l'écran, que le joueur les voie ou non ;
 *   · une porte construite à l'exécution (chemin concaténé, `Href` calculé)
 *     reste invisible.
 * C'est donc un PLANCHER — il attrape l'écran sans aucune porte écrite — et
 * jamais une preuve qu'un parcours est praticable. Seul le rejeu en preview
 * prouve ça.
 *
 * Sortie : code 1 si un lien mort apparaît, ou si une route devient orpheline
 * sans figurer dans `KNOWN_ORPHANS` (où chaque entrée porte SA raison).
 *
 * Usage : `node scripts/audit-routes.mjs`
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = join(ROOT, 'apps/mobile/app');
const SRC_DIR = join(ROOT, 'apps/mobile/src');
const SCAN_DIRS = [APP_DIR, SRC_DIR];

/**
 * QUARANTAINE DÉCLARÉE — le groupe `(mvp)`, ligne MASTER (ADR-001).
 *
 * Ces sept écrans (`/position`, `/connexion`, `/carte`, `/prete`, `/course`,
 * `/resultat`, `/profil-mvp`) sont la reconstruction d'UI décidée par l'ADR-001
 * en août 2026. L'ADR-012 (09/09/2026) donne le rang 0 au cahier de septembre :
 * cette ligne est REMPLACÉE — mais rien n'est supprimé, et la réconciliation
 * reste à faire. Ils sont donc conservés, et tenus à l'écart du graphe.
 *
 * ⚠️ LA COLLISION `/profil` EST LEVÉE (10/09/2026). Elle était réelle : DEUX
 * fichiers servaient `/profil` — `app/(mvp)/profil.tsx` et
 * `app/(tabs)/profil.tsx` — et le gagnant dépendait de l'ordre de résolution
 * d'expo-router, pas d'une décision. Le groupe `(mvp)` étant la quarantaine,
 * c'est LUI qui a cédé le chemin : son fichier s'appelle désormais
 * `profil-mvp.tsx` et sert `/profil-mvp`. Ce script n'a donc plus à arbitrer
 * une double desserte ; le garde-fou de semis (une route servie AUSSI hors
 * quarantaine ne sème son arbre qu'avec le fichier du cahier) reste en place
 * parce qu'il protège contre la RÉAPPARITION du cas, et l'avertissement
 * « servie(s) AUSSI hors quarantaine » reste imprimé s'il se reproduit.
 * Une route servie UNIQUEMENT depuis la quarantaine garde ses propres arêtes :
 * on mesure encore ce qui se passe à l'intérieur du bloc.
 */
const QUARANTINE_DIRS = ['apps/mobile/app/(mvp)/'];

/**
 * ORPHELINES ASSUMÉES — chacune l'est pour une raison écrite, VÉRIFIÉE, avec sa
 * preuve. Ce ne sont pas des exemptions de confort : ce sont des écrans atteints
 * autrement qu'en tapant sur un lien, ou des trous connus et inscrits.
 */
const KNOWN_ORPHANS = new Map([
  [
    '/profil-rival/[handle]',
    'E56 — atteint par lien profond / QR uniquement. La raison a CHANGÉ le ' +
      '27/07/2026 : ce n’est plus « O1 n’expose pas de rival consenti » (la ' +
      'lecture consentie existe et l’écran s’en sert), c’est qu’aucune surface ' +
      'de l’app ne DÉSIGNE encore un autre joueur. Le cahier de septembre a ' +
      'réécrit `/amis` autour de `/member` (app/amis.tsx:19) — le rival public ' +
      'n’y est toujours pas nommé.',
  ],
  // ⚠️ `/zones-rival/[handle]` et `/challenges/[id]` ONT ÉTÉ RETIRÉS D'ICI le
  // 09/09/2026. Leur raison disait « le lien est un gabarit `${…}` que ce
  // script ne sait pas reconnaître » — c'était vrai de l'AUDIT, pas du code.
  // L'extracteur lit désormais les gabarits (voir `linkPattern`), et les deux
  // portes apparaissent : `app/profil-rival/[handle].tsx:172` et
  // `app/challenges/index.tsx:108`. Les laisser ici aurait masqué leur
  // prochaine vraie régression.

  // ─── LA QUARANTAINE `(mvp)` (ADR-001 → ADR-012) ───────────────────────────
  [
    '/position',
    'quarantaine `(mvp)` — l’onboarding de la ligne MASTER. Sa porte était la ' +
      'garde d’entrée d’août (`app/(tabs)/_layout.tsx:156` en 9d1b9e7, ' +
      '`<Redirect href="/position">`) ; la garde de septembre envoie désormais ' +
      'sur `/onboarding` (app/(tabs)/_layout.tsx:26). Écran conservé, ' +
      'réconciliation à faire — il n’a PAS à être re-relié en l’état.',
  ],

  // ─── ROUTES DE COMPATIBILITÉ POSÉES PAR LE CAHIER (09/09/2026) ────────────
  // Codex a vidé ~41 écrans legacy en `<Redirect href="…" />` sous l'en-tête
  // « Compatibility route ». Une route de compatibilité est orpheline PAR
  // DÉFINITION : elle n'existe pas pour être liée, elle existe pour rattraper
  // un chemin écrit AVANT le cahier (lien profond, notification, capture
  // d'écran d'un testeur). Lui exiger une porte entrante serait exiger qu'on
  // écrive à neuf le lien qu'on vient justement de supprimer.
  ['/aujourdhui', 'route de compatibilité → /season (app/aujourdhui.tsx:3)'],
  ['/classement', 'route de compatibilité → /season (app/(tabs)/classement.tsx:3)'],
  ['/fin-saison', 'route de compatibilité → /season (app/fin-saison.tsx:3)'],
  [
    '/map/missions/[missionId]',
    'route de compatibilité → /(tabs) (app/map/missions/[missionId].tsx:3)',
  ],
  [
    '/settings-motivation',
    'route de compatibilité → /confidentialite (app/settings-motivation.tsx:3)',
  ],

  // ─── ATTEINTE PAR L'OS, PAS PAR UN LIEN ───────────────────────────────────
  [
    '/callback',
    'atterrissage du lien magique : `emailRedirectTo: \'gryd://callback\'` ' +
      '(src/lib/auth.ts:264) et `${window.location.origin}/callback` ' +
      '(src/lib/auth.web.ts:149). Aucun écran ne DOIT y mener — c’est le ' +
      'client mail qui rouvre l’app dessus. Elle figure aussi dans ' +
      '`ENTRY_ROUTES` : l’app peut s’y ouvrir.',
  ],

  // ─── ORPHELINES DE LA FUSION DU 09/09/2026 (ADR-012) ──────────────────────
  // Ces huit écrans avaient une porte AVANT la fusion. Le cahier a remplacé la
  // surface qui la portait ; l'écran, lui, est conservé (rien n'est supprimé).
  // Chaque entrée cite la porte PERDUE, au commit `9d1b9e7` (dernier état
  // pré-Codex) — c'est ce qui rend la perte auditable et réversible, et c'est
  // la seule forme sous laquelle une exemption est acceptable ici : elle nomme
  // ce qui a été coupé, pas « c'est normal ».
  // ⚠️ Ces huit lignes sont une DETTE, pas un acquis. Elles doivent disparaître
  // d'ici quand le cahier rebranchera l'écran — ou l'écran avec elles.
  ['/activite', 'porte perdue : le legacy `app/(tabs)/index.tsx:279` (9d1b9e7) — la Carte de septembre n’a pas de cloche'],
  ['/appel', 'porte perdue : `app/course-result.tsx:1350` (9d1b9e7) — course-result.tsx est devenu une ré-exportation de RunResult'],
  ['/challenges', 'porte perdue : `app/aujourdhui.tsx:256` (9d1b9e7) — /aujourdhui est devenu une route de compatibilité'],
  ['/course/analyse', 'porte perdue : `src/features/run/gps/RealCourseLive.tsx:713` (9d1b9e7) — la fin de course va droit à /course-result (RealCourseLive.tsx:41)'],
  ['/defi', 'porte perdue : `app/amis.tsx:415` (9d1b9e7) — /amis a été réécrit autour de /member'],
  ['/map/prepare', 'portes perdues : `app/map/missions/[missionId].tsx:82` et `app/zone-attaquee/[contestId].tsx:283` (9d1b9e7) — les deux sont devenues des routes de compatibilité'],
  ['/qr', 'portes perdues : `app/(tabs)/profil.tsx:289` et `app/amis.tsx:336` (9d1b9e7) — les deux fichiers ont été réécrits par le cahier'],
  ['/territoire', 'porte perdue : `app/(tabs)/profil.tsx:990` (9d1b9e7) — (tabs)/profil.tsx est devenu une ré-exportation de ProfileHomeScreen'],
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

const relOf = (file) => relative(ROOT, file).replace(/\\/g, '/');
const isQuarantined = (file) => QUARANTINE_DIRS.some((d) => relOf(file).startsWith(d));

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

const sourceCache = new Map();
function code(file) {
  let v = sourceCache.get(file);
  if (v === undefined) {
    v = stripComments(readFileSync(file, 'utf8'));
    sourceCache.set(file, v);
  }
  return v;
}

/**
 * Résolution d'un import RELATIF vers un fichier du dépôt, variantes de
 * plateforme comprises (`.web.tsx`, `.native.ts`…). Les variantes sont TOUTES
 * retenues : `app/(auth)/sign-in.tsx` et `sign-in.web.tsx` servent la même
 * route, et un lien écrit dans une seule des deux reste une porte réelle sur la
 * plateforme concernée.
 */
function resolveRelative(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const out = [];
  for (const variant of ['', '.web', '.native', '.ios', '.android']) {
    for (const ext of ['.tsx', '.ts']) {
      out.push(base + variant + ext);
      out.push(join(base, `index${variant}${ext}`));
    }
  }
  return out.filter((p) => existsSync(p) && statSync(p).isFile());
}

const IMPORT_RE = /(?:from|import|require\()\s*['"](\.[^'"]*)['"]/g;
const importCache = new Map();
function importsOf(file) {
  let v = importCache.get(file);
  if (v === undefined) {
    v = [];
    const src = code(file);
    IMPORT_RE.lastIndex = 0;
    let m;
    while ((m = IMPORT_RE.exec(src)) !== null) v.push(...resolveRelative(file, m[1]));
    importCache.set(file, v);
  }
  return v;
}

/**
 * RÉ-EXPORTATION PURE — le fichier de route ne fait que SERVIR un module.
 *
 * Deux formes existent dans le dépôt depuis le cahier :
 *   · `export { default } from '…'` / `export { X as default } from '…'` ;
 *   · `import { X } from '…'; export default X;` (app/crew-conversation.tsx).
 * Un fichier qui RÉELLEMENT compose (`sign-in.tsx`, qui passe une prop au
 * composant) n'en est pas une : il garde ses propres fichiers, et c'est l'arbre
 * de composition qui s'occupe de ses liens.
 */
function pureReexportTargets(file) {
  const src = code(file).trim();
  const direct = src.match(/export\s*\{[^}]*\bdefault\b[^}]*\}\s*from\s*['"](\.[^'"]+)['"]/);
  if (direct) return resolveRelative(file, direct[1]);
  const rest = src
    .replace(/import\s[^;]*;/g, ' ')
    .replace(/export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?/g, ' ')
    .trim();
  const m = rest.match(/^export\s+default\s+([A-Za-z_$][\w$]*)\s*;?$/);
  if (!m) return [];
  const named = src.match(
    new RegExp(`import\\s+(?:\\{[^}]*\\b${m[1]}\\b[^}]*\\}|${m[1]})\\s+from\\s*['"](\\.[^'"]+)['"]`),
  );
  return named ? resolveRelative(file, named[1]) : [];
}

const routes = new Map();
for (const file of walk(APP_DIR)) {
  if (!file.endsWith('.tsx')) continue;
  if (/(^|\/)_layout\.(web\.)?tsx$/.test(file)) continue;
  const r = routeOf(file);
  if (!routes.has(r)) routes.set(r, []);
  routes.get(r).push(file);
}
// … puis on y ajoute ce qu'une ré-exportation PURE sert, en chaîne.
for (const [, files] of routes) {
  const seen = new Set(files);
  const queue = [...files];
  while (queue.length > 0) {
    for (const target of pureReexportTargets(queue.shift())) {
      if (seen.has(target)) continue;
      seen.add(target);
      files.push(target);
      queue.push(target);
    }
  }
}
const routeFiles = new Set([...routes.values()].flat());

// ── références sortantes (code seulement, commentaires retirés) ─────────────
//
// DEUX extracteurs, tous deux ANCRÉS sur un `/` en tête. L'ancrage n'est pas un
// détail de perf : un scanner qui lit TOUTES les chaînes d'un fichier français
// se désynchronise sur la première apostrophe droite et avale le lien suivant.
const LINK_RE = /(['"])(\/[A-Za-z0-9_\-[\]()/.]*)\1/g;
const TEMPLATE_RE = /`(\/(?:\$\{[^`{}\n]*\}|[^`$\n])*)`/g;
/** Le jeton qui remplace un `${…}` : un segment décidé À L'EXÉCUTION. */
const DYN = '*';
const PATH_RE = /^[A-Za-z0-9_\-[\]()/.*]*$/;

/**
 * Chaîne brute → PATRON de chemin, ou `null` si ce n'en est pas un.
 *
 * Un gabarit `` `/zones-rival/${handle}` `` est une porte : c'est la forme
 * NORMALE d'un lien vers une route dynamique. Ne pas le lire, c'était déclarer
 * orphelin tout écran `[param]` du dépôt — et inscrire l'angle mort dans
 * `KNOWN_ORPHANS`, où il ressemblait à une décision produit.
 * La query et le fragment sont coupés : `/course-live?mode=conquete` vise
 * `/course-live`.
 */
function linkPattern(raw) {
  const p = raw.replace(/\$\{[^}]*\}/g, DYN).split('?')[0].split('#')[0];
  if (!p.startsWith('/') || !PATH_RE.test(p)) return null;
  return p;
}

function linksIn(file) {
  const text = code(file);
  const found = new Set();
  for (const re of [LINK_RE, TEMPLATE_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const p = linkPattern(m[m.length - 1]);
      if (p !== null) found.add(p);
    }
  }
  return found;
}

const refs = new Map();
for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const relFile = relOf(file);
  if (NOT_A_DOOR.has(relFile) || isTestFile(relFile)) continue;
  for (const link of linksIn(file)) {
    if (!refs.has(link)) refs.set(link, new Set());
    refs.get(link).add(file);
  }
}

/**
 * Le chemin référencé correspond-il à une route servie ?
 *
 * Deux normalisations, toutes deux exigées par le cahier :
 *  · les GROUPES sont retirés — `<Redirect href="/(tabs)/crew" />`
 *    (app/(tabs)/warroom.tsx:3) vise `/crew`, et `/(tabs)` vise `/`. Sans ça,
 *    ces liens n'étaient même pas lus : la parenthèse ne figurait pas dans le
 *    jeu de caractères, donc pas de lien, donc pas de lien mort non plus — un
 *    silence, pas un vert ;
 *  · un segment DYNAMIQUE (`${…}`) ne s'apparie qu'à un segment `[param]`, et
 *    jamais à un segment littéral. `` `/course/${id}` `` désigne `/course/[id]`,
 *    pas `/course/analyse` — l'inverse fabriquerait une porte pour tout écran
 *    voisin d'une route dynamique.
 */
function matchRoute(link) {
  const clean = link.replace(/\/\([^)]*\)/g, '').replace(/(.)\/$/, '$1') || '/';
  if (!clean.includes(DYN) && routes.has(clean)) return clean;
  const parts = clean.split('/');
  for (const r of routes.keys()) {
    const rp = r.split('/');
    if (rp.length !== parts.length) continue;
    const ok = rp.every((seg, i) =>
      parts[i] === DYN ? /^\[.+\]$/.test(seg) : seg === parts[i] || /^\[.+\]$/.test(seg),
    );
    if (ok) return r;
  }
  return null;
}

const inbound = new Map();
for (const [link, files] of refs) {
  const r = matchRoute(link);
  if (!r) continue;
  const own = new Set(routes.get(r));
  const from = inbound.get(r) ?? new Set();
  for (const f of files) if (!own.has(f)) from.add(relOf(f));
  inbound.set(r, from);
}

const orphans = [...routes.keys()].filter((r) => (inbound.get(r)?.size ?? 0) === 0);

// ═══════════════════════════════════════════════════════════════════════════
// ATTEIGNABILITÉ RÉELLE — ajoutée le 03/08/2026, après un défaut passé au VERT
// ═══════════════════════════════════════════════════════════════════════════
//
// Ce qui précède mesure « existe-t-il un lien ÉCRIT vers cette route ». Ce n'est
// pas la même question que « un joueur peut-il y arriver », et l'écart s'est
// payé le jour de la bascule d'entrée : `app/(tabs)/_layout.tsx` renvoyait
// alors vers `/carte` par un `return` inconditionnel, donc AUCUN écran des
// onglets ne rendait plus — mais leurs liens croisés restaient écrits, et chacun
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
 * Cette liste n'est pas une supposition : chaque entrée a été relue dans le
 * fichier qui la produit, le 09/09/2026, après la fusion du cahier.
 *
 *  · `/` — `app/(tabs)/_layout.tsx` ne redirige QUE le visiteur qui n'a pas vu
 *    l'accueil (ligne 26) ; sinon il rend les onglets, dont `index`, qui est
 *    `src/features/refonte/MapHome` (app/(tabs)/index.tsx:1). La carte est donc
 *    l'écran d'ouverture par défaut — le contraire de l'état d'août, où `/`
 *    était condamné et où l'inscrire ici aurait rouvert tout le legacy.
 *  · `/onboarding` — la SEULE issue de garde de ce layout :
 *    `<Redirect href="/onboarding" />` (app/(tabs)/_layout.tsx:26), servi par
 *    `src/features/onboarding/Discovery2026Screen` (app/onboarding/index.tsx:1).
 *  · `/course` — `app/_layout.tsx:245` : `if (next === 'recover_run')
 *    router.push('/course')`. C'est une issue de garde au même titre qu'un
 *    `<Redirect>` : au lancement à FROID avec une course interrompue, l'app
 *    s'ouvre là. ⚠️ Et `/course` est un écran de la QUARANTAINE `(mvp)` — voir
 *    le constat imprimé plus bas : la reprise après crash est la dernière porte
 *    qui tienne la ligne MASTER en vie, alors que la Carte de septembre
 *    enregistre sur `/course-live` (MapHome.tsx:147).
 *  · `/c/[code]` — `app/_layout.tsx:344` : l'app LANCÉE par un QR d'invitation
 *    (`gryd://c/CODE`) s'ouvre dessus, depuis le layout racine, avant toute
 *    route (`getInitialURL`).
 *  · `/callback` — le lien magique rouvre l'app dessus
 *    (`emailRedirectTo: 'gryd://callback'`, src/lib/auth.ts:264).
 *
 * ⚠️ `app/index.tsx` N'EXISTE PAS, et ce n'est pas un oubli : `/` est déjà servi
 * par `app/(tabs)/index.tsx`, `(tabs)` étant un groupe sans segment d'URL. Le
 * créer ferait deux fichiers pour le même chemin (docblock de `app/_layout.tsx`).
 */
const ENTRY_ROUTES = ['/', '/onboarding', '/course', '/c/[code]', '/callback'];

/**
 * Ce qui DOIT rester atteignable, sous peine de refus App Store ou d'infraction.
 * Cette liste n'est pas une préférence : chaque entrée porte une obligation.
 *
 * ⚠️ `/connexion` (porte de compte de la ligne MASTER) A ÉTÉ REMPLACÉ ICI le
 * 09/09/2026 par `/sign-in`. Ce n'est pas un renommage : sous le cahier, la
 * porte de compte est `src/features/account/AuthEntry2026.tsx`, rendue par
 * `app/(auth)/sign-in.tsx:7` (et sa variante web `sign-in.web.tsx:4`). Exiger
 * `/connexion` aurait exigé qu'un écran du cahier mène à la quarantaine `(mvp)`
 * — soit l'inverse exact de l'ADR-012.
 */
const REQUIRED_REACHABLE = new Map([
  ['/confidentialite', 'politique de confidentialité + export RGPD + SUPPRESSION DE COMPTE (app/confidentialite.tsx:107)'],
  ['/code-conduite', 'CGU / règles de communauté'],
  ['/support', 'contact d’assistance — exigé par l’App Store'],
  ['/sign-in', 'la porte de compte du cahier (AuthEntry2026) : sans elle, aucun compte ne peut être créé'],
  ['/email', 'le formulaire de lien magique + la gate d’âge 16+ (RGPD) : l’obligation vit ICI'],
]);

/**
 * ARBRE DE COMPOSITION d'une route : ses fichiers, puis leurs imports relatifs,
 * transitivement, jusqu'à la frontière d'une AUTRE route (garde-fou).
 */
const treeCache = new Map();
function treeOf(route) {
  let seen = treeCache.get(route);
  if (seen !== undefined) return seen;
  const files = routes.get(route) ?? [];
  // Semis : la quarantaine ne prête ses liens qu'aux routes qu'elle SEULE sert.
  const clean = files.filter((f) => !isQuarantined(f));
  const seeds = clean.length > 0 ? clean : files;
  const own = new Set(files);
  seen = new Set(seeds);
  const queue = [...seeds];
  while (queue.length > 0) {
    for (const target of importsOf(queue.shift())) {
      if (seen.has(target)) continue;
      if (isTestFile(relOf(target)) || NOT_A_DOOR.has(relOf(target))) continue;
      if (routeFiles.has(target) && !own.has(target)) continue; // frontière
      if (!target.startsWith(SRC_DIR) && !target.startsWith(APP_DIR)) continue;
      seen.add(target);
      queue.push(target);
    }
  }
  treeCache.set(route, seen);
  return seen;
}

const outByRoute = new Map();
for (const r of routes.keys()) {
  const s = new Set();
  for (const f of treeOf(r)) for (const link of linksIn(f)) {
    const target = matchRoute(link);
    if (target) s.add(target);
  }
  outByRoute.set(r, s);
}

/** BFS depuis les portes d'entrée — et le CHEMIN qui y mène, pour pouvoir le lire. */
const cameFrom = new Map();
const reachable = new Set();
const file = [...ENTRY_ROUTES];
for (const e of ENTRY_ROUTES) cameFrom.set(e, null);
while (file.length > 0) {
  const r = file.shift();
  if (reachable.has(r) || !routes.has(r)) continue;
  reachable.add(r);
  for (const next of outByRoute.get(r) ?? []) {
    if (!cameFrom.has(next)) cameFrom.set(next, r);
    if (!reachable.has(next)) file.push(next);
  }
}
function pathTo(route) {
  const out = [];
  let cur = route;
  while (cur !== undefined && cur !== null) {
    out.unshift(cur);
    cur = cameFrom.get(cur) ?? null;
  }
  return out.join(' → ');
}

// ── ÉCHAPPABILITÉ : peut-on REPARTIR ? ─────────────────────────────────────
//
// L'atteignabilité mesure l'aller. Le 03/08, `/connexion` a montré qu'il manque
// le retour : dans son état NORMAL, l'écran n'avait qu'un seul contrôle
// (« Continuer par e-mail ») et aucune sortie — alors qu'on y arrive par
// `replace`, donc sans pile, sans geste retour et sans en-tête.
//
// ⚠️ CIBLE RECALÉE LE 09/09/2026, ET POURQUOI. Ce contrôle demandait à chaque
// écran `(mvp)` un chemin écrit vers `/carte`. Il ne mesure plus rien de vrai :
// `/carte` n'est plus la carte de l'app (c'est `/`, ADR-012), le groupe `(mvp)`
// est en quarantaine, et le SEUL « cul-de-sac » qu'il produisait était
// `/profil` — un artefact de la collision de fichiers, pas une impasse pour un
// joueur. Le laisser aurait donné un ROUGE permanent qui ne dit rien, ce qui
// est la façon la plus sûre d'apprendre à ignorer un audit.
//
// La cible est donc la carte du cahier : tout écran ATTEIGNABLE doit offrir un
// chemin écrit de retour vers `/`. C'est la même exigence, sur la ligne qui
// vit. Elle reste un PLANCHER : elle lit des liens ÉCRITS, pas ATTEINTS —
// `/connexion` contenait déjà `'/carte'`, mais dans une branche conditionnelle
// (« aucune porte disponible ») invisible pour l'état que tout le monde
// rencontre, et ce contrôle serait resté VERT. Seul le rejeu en preview l'a
// trouvé.
const RETOUR_CIBLE = '/';
function sortVers(depart, cible) {
  const vus = new Set([depart]);
  const q = [...(outByRoute.get(depart) ?? [])];
  while (q.length > 0) {
    const r = q.shift();
    if (r === cible) return true;
    if (vus.has(r) || !routes.has(r)) continue;
    vus.add(r);
    for (const n of outByRoute.get(r) ?? []) q.push(n);
  }
  return false;
}
const culsDeSac = [...reachable].filter((r) => r !== RETOUR_CIBLE && !sortVers(r, RETOUR_CIBLE));

const unreachable = [...routes.keys()].filter((r) => !reachable.has(r));
const requiredLost = [...REQUIRED_REACHABLE.keys()].filter(
  (r) => !routes.has(r) || !reachable.has(r),
);
const dead = [];
for (const [link, files] of refs) {
  if (NOT_A_LINK.has(link) || link === '/') continue;
  if (/\.(png|jpe?g|svg|json|tsx?|jsx?|mjs|sql|md|webp|ttf|otf)$/.test(link)) continue;
  if (matchRoute(link)) continue;
  dead.push({ link, files: [...files].map(relOf) });
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
console.log(`  (portes : ${ENTRY_ROUTES.join(' · ')})`);
if (unreachable.length > 0) {
  // INFORMATIF, pas bloquant : depuis la bascule (ADR-001, mode hybride), tout
  // l'arbre legacy est légitimement injoignable — c'est le but. Le CHIFFRE est
  // affiché pour qu'il ne dérive pas en silence : s'il augmente d'un coup, c'est
  // qu'une branche vivante vient d'être coupée.
  console.log(`  (dont ${unreachable.length} injoignables — legacy en quarantaine, ADR-001/ADR-012)`);
  if (process.env.GRYD_AUDIT_VERBOSE === '1') for (const r of unreachable) console.log(`      · ${r}`);
}

// ── LA QUARANTAINE `(mvp)`, DITE À VOIX HAUTE ──────────────────────────────
const mvpRoutes = [...routes.keys()].filter((r) =>
  (routes.get(r) ?? []).some((f) => isQuarantined(f)),
);
const mvpJoignables = mvpRoutes.filter((r) => reachable.has(r));
console.log(`\nQUARANTAINE (mvp) — ligne MASTER (ADR-001), remplacée par le cahier (ADR-012),`);
console.log(`  conservée, réconciliation à faire. ${mvpRoutes.length} routes : ${mvpRoutes.join(' · ')}`);
const doubleServies = mvpRoutes.filter((r) => (routes.get(r) ?? []).some((f) => !isQuarantined(f)));
if (doubleServies.length > 0) {
  console.log(
    `  ⚠ servie(s) AUSSI hors quarantaine : ${doubleServies.join(' · ')} — conflit de routes` +
      ` expo-router. Le script liste les deux fichiers mais ne sème l'arbre qu'avec celui du cahier.`,
  );
}
if (mvpJoignables.length > 0) {
  console.log(
    `  ⚠ la quarantaine n'est PAS étanche : ${mvpJoignables.join(' · ')} restent atteignables.` +
      `\n    Porte : app/_layout.tsx:245 rouvre '/course' à la reprise après crash, alors que la` +
      `\n    Carte du cahier enregistre sur '/course-live' (MapHome.tsx:147). Deux écrans de course.`,
  );
}

console.log(`\nOBLIGATIONS APP STORE (5.1.1(v) et RGPD) — verdict route par route :`);
for (const [r, why] of REQUIRED_REACHABLE) {
  if (!routes.has(r)) console.log(`  ⚠ ${r} — AUCUN FICHIER NE LA SERT · ${why}`);
  else if (!reachable.has(r)) console.log(`  ⚠ ${r} — PERDUE · ${why}`);
  else console.log(`  ✓ ${r} — ${pathTo(r)}`);
}

console.log(
  `\nRETOUR ÉCRIT VERS ${RETOUR_CIBLE} : ${reachable.size - 1 - culsDeSac.length} / ${reachable.size - 1} écrans atteignables`,
);
if (culsDeSac.length > 0) {
  console.log('\nCULS-DE-SAC :');
  for (const r of culsDeSac) console.log(`  ⚠ ${r} — aucun chemin écrit vers ${RETOUR_CIBLE}`);
}

const newOrphans = orphans.filter((r) => !KNOWN_ORPHANS.has(r));
const stale = [...KNOWN_ORPHANS.keys()].filter((r) => !orphans.includes(r));
if (stale.length > 0) {
  console.log(`\nÀ NETTOYER : ces orphelines ont trouvé une porte — ${stale.join(', ')}`);
}
if (requiredLost.length > 0) {
  console.error(
    '\nÉCHEC : un écran EXIGÉ n’est plus atteignable depuis les portes d’entrée.\n' +
      'Ce n’est pas une orpheline : le lien existe peut-être encore, mais aucun\n' +
      'joueur ne peut y arriver. C’est exactement le défaut que la bascule du\n' +
      '03/08/2026 a produit, et que cet audit ne savait pas voir.',
  );
  process.exit(1);
}
if (culsDeSac.length > 0) {
  console.error(
    `\nÉCHEC : un écran atteignable n’offre AUCUN chemin écrit vers ${RETOUR_CIBLE}.\n` +
      'Un écran dont on ne ressort qu’en tuant l’app n’est pas un écran discret :\n' +
      'c’est une impasse. Voir `/connexion` le 03/08/2026.',
  );
  process.exit(1);
}
if (newOrphans.length > 0 || dead.length > 0 || stale.length > 0) {
  console.error(
    '\nÉCHEC : route orpheline non documentée, lien vers une route inexistante,\n' +
      'ou exemption devenue fausse (une orpheline qui a retrouvé une porte doit\n' +
      'sortir de KNOWN_ORPHANS, sinon l’audit cesse de la surveiller).',
  );
  process.exit(1);
}
console.log('\nOK — aucune route orpheline nouvelle, aucun lien mort, aucune exemption périmée.');
