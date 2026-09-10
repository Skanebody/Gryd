/**
 * GRYD — LA COUTURE DU GUIDE « Comment ça marche ».
 *
 * Même intention que `src/mvp/couture.test.ts` : ces règles lisent le SOURCE
 * des écrans, pas leurs modules purs. Un `helpFacts2026` irréprochable ne
 * protège personne si l'écran repeint « 800 m » à la main juste à côté, ou s'il
 * remet un texte noir sur le fond noir.
 *
 * ─── ÉTAPE 0 — CHAQUE RÈGLE CITE LE CODE QU'ELLE AURAIT REFUSÉ ──────────────
 * Les quatre défauts cités ci-dessous ont RÉELLEMENT été écrits dans ce dépôt,
 * et aucun n'a été attrapé par les tests existants. C'est la seule chose qui
 * distingue ce fichier d'un test qui passe parce qu'il ne demande rien.
 */
import { assert, assertEquals } from 'jsr:@std/assert';
import { CHALLENGE_RULES_2026, LEADERBOARD_RULES_2026, PROGRESSION_RULES_2026, TERRITORY_RULES_2026 } from '@klaim/shared';
import { helpChapters2026 } from './helpChapters2026.ts';

const APP = new URL('../../../app/', import.meta.url);
const HELP = new URL('./', import.meta.url);

function read(url: URL): string {
  return Deno.readTextFileSync(url);
}

/** Le code hors commentaires — citer un défaut en prose ne doit pas le recréer. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n');
}

/** Les fichiers du guide, hors tests (un test cite légitimement des valeurs). */
function helpSources(): { name: string; source: string }[] {
  const out: { name: string; source: string }[] = [];
  for (const entry of Deno.readDirSync(HELP)) {
    if (!entry.isFile || entry.name.endsWith('.test.ts')) continue;
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
    out.push({ name: entry.name, source: read(new URL(entry.name, HELP)) });
  }
  assert(out.length >= 5, `couture : ${out.length} fichier(s) de guide lu(s), le chemin est faux`);
  return out;
}

/**
 * Le contenu des chaînes d'un fichier, `${…}` remplacé par du vide. Les valeurs
 * interpolées sont précisément celles qui viennent des règles : ce sont les
 * SEULES qui ont le droit de porter un chiffre.
 */
function stringLiterals(source: string): string[] {
  const code = codeOnly(source);
  const out: string[] = [];
  let i = 0;
  while (i < code.length) {
    const quote = code[i];
    if (quote !== '\'' && quote !== '"' && quote !== '`') { i++; continue; }
    let j = i + 1;
    let value = '';
    let depth = 0;
    while (j < code.length) {
      const ch = code[j]!;
      if (ch === '\\') { j += 2; continue; }
      if (quote === '`' && ch === '$' && code[j + 1] === '{') { depth = 1; j += 2;
        while (j < code.length && depth > 0) { if (code[j] === '{') depth++; if (code[j] === '}') depth--; j++; }
        continue; }
      if (ch === quote) break;
      if (ch === '\n' && quote !== '`') break;
      value += ch;
      j++;
    }
    out.push(value);
    i = j + 1;
  }
  return out;
}

/**
 * ① UN CHIFFRE COLLÉ À UNE UNITÉ, DANS UNE CHAÎNE, EST UNE RÈGLE RECOPIÉE.
 *
 * ÉTAPE 0 : le cahier de septembre écrit « 800 m », « 25 m », « 30 minutes ».
 * Écrire l'une de ces phrases telle quelle dans le guide serait la façon la
 * plus naturelle de le rédiger — et la promesse survivrait au changement de
 * règle. Les valeurs interpolées (`${say(f.minLoopRun)}`) sont retirées avant
 * l'examen : elles viennent de `game-rules.ts`, donc elles ne peuvent pas
 * mentir.
 */
Deno.test('couture — aucun « nombre + unité » écrit à la main dans le guide', () => {
  const unit = /\d[\s  ]*(m²|km|min|jours?|semaines?|minutes?|heures?|points?|XP|%|m|s|h)\b/;
  for (const { name, source } of helpSources()) {
    const faulty = stringLiterals(source).filter((value) => unit.test(value));
    assertEquals(faulty, [], `${name} : règle de jeu recopiée dans une chaîne — ${faulty.join(' | ')}`);
  }
});

/**
 * ② LES VALEURS DES RÈGLES N'APPARAISSENT PAS DANS LA COPIE.
 *
 * La règle ① ne voit pas `const MIN_LOOP = 800;` posé à côté du texte. Celle-ci
 * lit les valeurs RÉELLES de `game-rules.ts` et refuse de les retrouver dans les
 * deux modules de copie. Seuils distinctifs seulement (≥ 15) : sous cette barre,
 * un `2` est un index de boucle avant d'être `teamCount`, et le filet
 * n'attraperait plus que du bruit.
 */
Deno.test('couture — aucune valeur de game-rules recopiée dans la copie du guide', () => {
  const values = new Set<number>();
  const collect = (source: unknown) => {
    if (typeof source === 'number') { if (Number.isInteger(source) && source >= 15) values.add(source); return; }
    if (Array.isArray(source)) { source.forEach(collect); return; }
    if (source && typeof source === 'object') { Object.values(source).forEach(collect); }
  };
  collect(TERRITORY_RULES_2026); collect(PROGRESSION_RULES_2026); collect(CHALLENGE_RULES_2026); collect(LEADERBOARD_RULES_2026);
  assert(values.size >= 10, `${values.size} seuil(s) collecté(s) : la lecture des règles a échoué`);
  for (const name of ['helpChapters2026.ts', 'helpFaq2026.ts']) {
    const code = codeOnly(read(new URL(name, HELP))).replace(/2026/g, ' ');
    for (const value of values) {
      assert(!new RegExp(`(?<![\\w.$])${value}(?![\\d_])`).test(code), `${name} : la valeur ${value} de game-rules est écrite en dur`);
    }
  }
});

/**
 * ③ LA TONALITÉ SOMBRE NE SE PEINT PAS AVEC LES JETONS DE LA TONALITÉ CLAIRE.
 *
 * ÉTAPE 0 — LE DÉFAUT SIGNALÉ PAR LE FONDATEUR, QUATRE OCCURRENCES RÉELLES :
 *   · `app/faq.tsx:32` (avant) — `questionText: { … color: c.ink … }` : #101010
 *     sur #0A0A0A, contraste 1,03:1. Les dix questions étaient invisibles.
 *   · `app/faq.tsx:32` (avant) — `item: { borderBottomColor: c.border }` :
 *     #DEDEDE, une barre presque blanche en travers d'une page noire.
 *   · `app/faq.tsx:27` (avant) — `<Icon … color={c.forest} />` : le chevron
 *     d'accordéon, #151515, invisible lui aussi.
 *   · `app/calcul-zones.tsx:16` (avant) — `<Path … fill={c.surfaceMuted} />` :
 *     #EBEBEB, une tache blanche à la place du schéma.
 * Ces quatre lignes échouent toutes ici. Une seule sortie existe : écrire
 * `sur chartreuse` sur la ligne, ce qui déclare que le texte n'est pas posé sur
 * le fond de page mais sur l'accent — le seul cas où `c.ink` est correct.
 */
Deno.test('couture — le guide n’emploie aucun jeton de tonalité claire sur son fond', () => {
  const light = /\bc\.(ink|forest|muted|border|canvas|surface|surfaceMuted|rival|water)\b/;
  const files: { name: string; source: string }[] = [
    ...helpSources(),
    { name: 'app/faq.tsx', source: read(new URL('faq.tsx', APP)) },
    { name: 'app/calcul-zones.tsx', source: read(new URL('calcul-zones.tsx', APP)) },
    { name: 'app/comment-ca-marche.tsx', source: read(new URL('comment-ca-marche.tsx', APP)) },
  ];
  for (const { name, source } of files) {
    for (const [index, line] of source.split('\n').entries()) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      if (!light.test(line) || line.includes('sur chartreuse')) continue;
      throw new Error(`${name}:${index + 1} — jeton de tonalité claire sur fond sombre : ${trimmed}`);
    }
  }
});

/**
 * ④ LES RÉGLAGES OUVRENT LE GUIDE, ET « Revoir la découverte » A DISPARU.
 *
 * ÉTAPE 0 : `app/parametres.tsx:46` (avant) portait « Revoir la découverte » →
 * `/onboarding?replay=1`. Retour du fondateur : « le bouton Revoir la
 * découverte est incompréhensible ». Le libellé ne nommait pas sa destination,
 * et rien ne l'empêchait de revenir.
 */
Deno.test('couture — Réglages ouvre le guide et ne propose plus « Revoir la découverte »', () => {
  const settings = codeOnly(read(new URL('parametres.tsx', APP)));
  assert(!settings.includes('Revoir la découverte'), 'parametres.tsx propose encore « Revoir la découverte »');
  assert(!settings.includes('Replay the introduction'), 'parametres.tsx propose encore « Replay the introduction » en anglais');
  assert(settings.includes('Comment ça marche'), 'parametres.tsx n’ouvre plus « Comment ça marche »');
  assert(settings.includes("router.push('/comment-ca-marche')"), 'l’entrée « Comment ça marche » ne mène pas au guide');
  assert(settings.includes("router.push('/comment-ca-marche?chapitre=faq')"), 'l’entrée « Questions fréquentes » n’ouvre pas le chapitre FAQ');
  assert(!settings.includes("router.push('/calcul-zones')"), 'Réglages court-circuite encore le guide vers /calcul-zones');
});

/**
 * ⑤ LA ROUTE SERT LE GUIDE, ET LE GUIDE PORTE SES HUIT CHAPITRES.
 *
 * `app/comment-ca-marche.tsx` est une RÉ-EXPORTATION PURE, comme
 * `app/(tabs)/index.tsx` : le contenu vit dans `src/features/help`. On lit donc
 * la route ET ce qu'elle sert — exactement ce que fait `scripts/audit-routes.mjs`
 * pour décider qu'une route n'est pas orpheline (« LES FICHIERS D'UNE ROUTE
 * incluent le module qu'une ré-exportation PURE sert »). Vérifier le seul
 * fichier de route reviendrait à lire une ligne d'`export` et à conclure que
 * l'écran est vide.
 */
Deno.test('couture — /comment-ca-marche sert le guide et ses huit chapitres', () => {
  const route = read(new URL('comment-ca-marche.tsx', APP));
  const served = 'src/features/help/HelpGuide2026';
  assert(codeOnly(route).includes(served), `la route ne sert pas ${served}`);
  const guide = codeOnly(read(new URL('HelpGuide2026.tsx', HELP)));
  const content = codeOnly(read(new URL('helpChapters2026.ts', HELP)));
  const pair = `${route}\n${guide}\n${content}`;
  for (const chapter of helpChapters2026(true)) {
    assert(pair.includes(chapter.id), `chapitre « ${chapter.id} » absent de la route et de son guide`);
    assert(content.includes(chapter.title), `titre français « ${chapter.title} » absent du contenu servi`);
  }
  // Ce que le fondateur a demandé de DÉPLACER dans le guide, et qui doit donc
  // y être RÉELLEMENT monté — pas seulement cité.
  assert(guide.includes('DiscoveryLoop2026'), 'le guide ne monte pas l’exemple interactif de boucle');
  assert(guide.includes('SeasonStatus'), 'le chapitre saison n’affiche pas la saison RÉELLE du serveur');
  assert(guide.includes('HelpDiagram2026'), 'le guide n’affiche aucun schéma');
});

/**
 * ⑥ `/faq` RESTE VIVANTE, ET MÈNE AU CHAPITRE.
 *
 * ÉTAPE 0 : supprimer `app/faq.tsx` aurait rendu « Unmatched route » à tout
 * lien profond écrit avant ce chantier — la définition même d'une route morte.
 */
Deno.test('couture — /faq redirige vers le chapitre Questions du guide', () => {
  const faq = codeOnly(read(new URL('faq.tsx', APP)));
  assert(faq.includes('Redirect'), 'app/faq.tsx ne redirige plus');
  // La destination est écrite en deux morceaux — `LINK_RE` de
  // `scripts/audit-routes.mjs` n'admet ni « ? » ni « = » dans un chemin, et un
  // href d'un seul tenant rendait cette route cul-de-sac (mesuré le 10/09/2026).
  assert(faq.includes("'/comment-ca-marche'"), 'app/faq.tsx ne nomme plus le guide');
  assert(faq.includes('chapitre=faq'), 'app/faq.tsx ne vise pas le chapitre Questions');
});
