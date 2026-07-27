/**
 * GRYD — LES SIX CTA DE DÉFI DE LA PLANCHE E10, UN SEUL PAR MÉDIA.
 *
 * ─── CE QUE LA PLANCHE DEMANDE ──────────────────────────────────────────────
 * « CTA par événement : Prends-la-moi / Reprends-la / Viens l'attaquer /
 *   Rejoins le crew / Ferme la tienne / Rattrape-nous — UN SEUL par média. »
 *   (docs/design/vague-1/ANNOTATIONS-E10-E26.md:45-47)
 *
 * Avant ce lot, trois seulement existaient et trois templates n'avaient AUCUN
 * défi câblé (`boucle`, `crew`, `classement`). Trois emplacements de la grammaire
 * restaient donc vides sur des cartes qui, elles, PARTENT de l'app en PNG.
 *
 * ─── LES QUATRE CHOSES QUE CE FICHIER VERROUILLE ────────────────────────────
 *  1. CÂBLAGE — chaque template d'ÉVÉNEMENT porte EXACTEMENT UN défi, et c'est
 *     celui de son récit. Un catalogue juste servi au mauvais endroit produit le
 *     même mensonge qu'un catalogue faux (cf. exportedCardCopy.test.ts).
 *  2. ABSENCE VOULUE — `simple` et les éditions Club n'en portent AUCUN, et ce
 *     n'est pas un oubli : les six CTA désignent tous un territoire (« -la »,
 *     « la tienne », « -moi » au classement) qu'une sortie sans capture ne
 *     possède pas. Le test l'exige, donc personne ne « complètera » la grille
 *     par symétrie.
 *  3. LONGUEUR — aucune des 30 chaînes (6 entrées × 5 langues) ne déborde la
 *     capsule. La capsule est en `numberOfLines={1}` SANS `ellipsizeMode`, donc
 *     le défaut « tail » coupe : §A.9 (« aucun texte d'action coupé ») serait
 *     violé DANS L'IMAGE PUBLIÉE, que sa victime ne peut pas corriger.
 *  4. ANTI-DÉCOR — le modèle de largeur est confronté à la source qu'il modélise
 *     (ShareCard.tsx, app/partage.tsx). Le jour où la capsule change de fonte ou
 *     la preview de largeur, la borne tombe au lieu de mentir.
 *
 * ─── POURQUOI ON RELIT LA SOURCE POUR LE CÂBLAGE ────────────────────────────
 * `templates.tsx` est un module React Native (ShareMap, StyleSheet) : il n'est
 * pas importable en Deno. Son TEXTE, lui, se lit — même parti pris que
 * `exportedCardCopy.test.ts`, dans ce même dossier. Les CATALOGUES, eux, sont
 * purs : ils sont importés pour de vrai.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fontSizes, spacing } from '@klaim/shared';
import { LOCALES } from '../../i18n/types.ts';
import type { Entry } from '../../i18n/types.ts';
import { C } from '../../i18n/catalog/result.ts';
import { SHARE_COPY } from './copy.ts';

const TEMPLATES_SRC = Deno.readTextFileSync(new URL('./templates.tsx', import.meta.url));
const SHARECARD_SRC = Deno.readTextFileSync(
  new URL('../../ui/game/ShareCard.tsx', import.meta.url),
);
const PARTAGE_SRC = Deno.readTextFileSync(new URL('../../../app/partage.tsx', import.meta.url));

/* ════════════════════════════════════════════════════════════════════════════
 * 1. LE CÂBLAGE : QUEL DÉFI SUR QUEL TEMPLATE
 * ═══════════════════════════════════════════════════════════════════════════*/

/**
 * La correspondance ATTENDUE, établie sur le moteur (`styleForNarrative`,
 * narrative.ts:137-155) et non sur l'ordre de la phrase de la planche — cette
 * liste-là n'est pas parallèle à son propre ordre de priorité.
 *
 * `carte3d` partage le défi de `conquete` : ce n'est pas un récit de plus, c'est
 * la MÊME capture rendue en plein cadre (templates.tsx:478-502).
 */
const EXPECTED_CHALLENGE: Readonly<Record<string, string | null>> = {
  simple: null, // récit `effort` : rien n'a changé de main → aucun défi
  conquete: 'C.challengeTakeIt', // « PRENDS-LA-MOI »
  defense: 'C.challengeHoldTheLine', // « FRANCHIS-LA » — arbitrage, voir copy.ts
  boucle: 'SHARE_COPY.challengeCloseYours', // « FERME LA TIENNE »
  crew: 'SHARE_COPY.challengeJoinCrew', // « REJOINS LE CREW »
  classement: 'SHARE_COPY.challengeCatchMe', // « RATTRAPE-MOI »
  avantApres: 'SHARE_COPY.challengeRetake', // « REPRENDS-LA »
  carte3d: 'C.challengeTakeIt', // même événement que `conquete`
};

/** Les éditions Club sont des FORMES, pas des récits : jamais de défi. */
const CLUB_EXPECTED: Readonly<Record<string, string | null>> = {
  affiche: null,
  chrono: null,
};

/** Source débarrassée de ses commentaires : ils CITENT les entrées surveillées. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Tranche de source entre deux ancres (la seconde exclue). */
function region(src: string, from: string, to: string): string {
  const a = src.indexOf(from);
  assert(a >= 0, `ancre introuvable dans templates.tsx : ${from}`);
  const b = src.indexOf(to, a + from.length);
  assert(b > a, `ancre de fin introuvable dans templates.tsx : ${to}`);
  return src.slice(a, b);
}

/**
 * Défis déclarés par template, lus sur la source. Un template = tout ce qui
 * sépare son `id: '…'` du `id:` suivant.
 *
 * On compte SÉPARÉMENT les clés `challenge:` (pour attraper un second défi, ou
 * un défi écrit en dur au lieu d'une entrée du catalogue) et les entrées
 * effectivement servies.
 */
function declaredChallenges(src: string): Map<string, { keys: number; entries: string[] }> {
  const clean = code(src);
  const marks: { id: string; at: number }[] = [];
  for (const m of clean.matchAll(/\bid:\s*'([A-Za-z0-9]+)'/g)) {
    marks.push({ id: m[1]!, at: m.index! });
  }
  const out = new Map<string, { keys: number; entries: string[] }>();
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1]!.at : clean.length;
    const body = clean.slice(mark.at, end);
    out.set(mark.id, {
      keys: [...body.matchAll(/\bchallenge:/g)].length,
      entries: [...body.matchAll(/\bchallenge:\s*t\(([A-Za-z_][\w.]*)\)/g)].map((m) => m[1]!),
    });
  });
  return out;
}

const FREE = declaredChallenges(
  region(TEMPLATES_SRC, 'export const SHARE_TEMPLATES', 'export const SHARE_TEMPLATES_BY_ID'),
);
const CLUB = declaredChallenges(
  region(TEMPLATES_SRC, 'export const CLUB_SHARE_TEMPLATES', 'export const CLUB_TEMPLATES_BY_ID'),
);

Deno.test('sanity : on relit bien les huit cartes + les deux éditions Club', () => {
  assertEquals([...FREE.keys()].sort(), Object.keys(EXPECTED_CHALLENGE).sort());
  assertEquals([...CLUB.keys()].sort(), Object.keys(CLUB_EXPECTED).sort());
});

Deno.test('chaque template d’ÉVÉNEMENT porte le défi de SON récit', () => {
  for (const [id, expected] of Object.entries(EXPECTED_CHALLENGE)) {
    if (expected === null) continue;
    const found = FREE.get(id)!;
    assertEquals(
      found.entries,
      [expected],
      `template « ${id} » : défi attendu ${expected}, trouvé [${found.entries.join(', ')}]`,
    );
  }
});

Deno.test('UN SEUL défi par média — jamais deux capsules sur la même carte', () => {
  for (const [id, found] of [...FREE, ...CLUB]) {
    const expected = EXPECTED_CHALLENGE[id] ?? CLUB_EXPECTED[id] ?? null;
    assertEquals(
      found.keys,
      expected === null ? 0 : 1,
      `template « ${id} » : ${found.keys} clé(s) challenge (attendu ${expected === null ? 0 : 1})`,
    );
    // Une clé présente doit servir une ENTRÉE du catalogue, jamais une chaîne
    // écrite en dur (qui ne serait traduite dans aucune des cinq langues).
    assertEquals(
      found.entries.length,
      found.keys,
      `template « ${id} » : un défi n’est pas servi par le catalogue (chaîne en dur ?)`,
    );
  }
});

Deno.test('« Carte » et les éditions Club n’en portent AUCUN — et c’est la règle', () => {
  // Elles ne racontent PAS un événement territorial : `simple` est le récit
  // `effort` (narrative.ts:126), les deux Club sont des formes choisies par le
  // joueur. Les six CTA désignent tous un territoire — un défi ici serait une
  // capsule sans référent, exportée en PNG.
  assertEquals(FREE.get('simple')!.keys, 0, '« Carte » a reçu un défi sans avoir rien pris');
  for (const id of Object.keys(CLUB_EXPECTED)) {
    assertEquals(CLUB.get(id)!.keys, 0, `l’édition Club « ${id} » a reçu un défi`);
  }
});

/* ════════════════════════════════════════════════════════════════════════════
 * 2. LES SIX ENTRÉES : PARITÉ, DISTINCTION, LONGUEUR
 * ═══════════════════════════════════════════════════════════════════════════*/

/** Les six défis de la planche, servis par les deux catalogues concernés. */
const CHALLENGES: Readonly<Record<string, Entry>> = {
  'C.challengeTakeIt': C.challengeTakeIt,
  'C.challengeHoldTheLine': C.challengeHoldTheLine,
  'SHARE_COPY.challengeRetake': SHARE_COPY.challengeRetake,
  'SHARE_COPY.challengeCloseYours': SHARE_COPY.challengeCloseYours,
  'SHARE_COPY.challengeJoinCrew': SHARE_COPY.challengeJoinCrew,
  'SHARE_COPY.challengeCatchMe': SHARE_COPY.challengeCatchMe,
};

Deno.test('anti-décor : les six entrées existent, et ce sont celles que le code sert', () => {
  const servies = new Set(
    Object.values(EXPECTED_CHALLENGE).filter((v): v is string => v !== null),
  );
  assertEquals(servies.size, 6, 'le code ne sert plus six défis distincts');
  for (const ref of servies) {
    assert(CHALLENGES[ref] !== undefined, `${ref} : servi par templates.tsx, absent du test`);
  }
});

Deno.test('parité 5 langues : aucune chaîne vide (ce que le typage ne voit pas)', () => {
  for (const [ref, entry] of Object.entries(CHALLENGES)) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${ref}.${locale} est vide`);
    }
  }
});

Deno.test('la capsule est une LIGNE : aucun défi ne porte de retour à la ligne', () => {
  for (const [ref, entry] of Object.entries(CHALLENGES)) {
    for (const locale of LOCALES) {
      assert(!entry[locale].includes('\n'), `${ref}.${locale} contient un \\n — la capsule est mono-ligne`);
    }
  }
});

Deno.test('six événements, six défis DISTINCTS dans chaque langue', () => {
  for (const locale of LOCALES) {
    const textes = Object.values(CHALLENGES).map((e) => e[locale]);
    assertEquals(
      new Set(textes).size,
      textes.length,
      `${locale} : deux événements lancent le même défi — « ${textes.join(' / ')} »`,
    );
  }
});

// ─── LE MODÈLE DE LARGEUR (mesuré sur la source, pas estimé) ────────────────
// Preview la PLUS ÉTROITE = format story (la preview EST le média exporté).
const PREVIEW_STORY_WIDTH = 232; // app/partage.tsx — PREVIEW_WIDTH.story
const PILL_BORDER = 1.5; // ShareCard.tsx — styles.challengePill.borderWidth
const LETTER_SPACING = 2; // ShareCard.tsx — styles.challengeText.letterSpacing
/** Chasse moyenne d'une capitale grasse — la constante que ShareCard emploie déjà. */
const CAP_ADVANCE_EM = 0.64; // ShareCard.tsx — HeroTitleLines

/** Largeur utile de la capsule, en points. */
const USABLE_PT = PREVIEW_STORY_WIDTH - 2 * spacing.cardPadding - 2 * PILL_BORDER;

/** Largeur rendue d'un défi, en points (modèle conservateur : espaces comptés pleins). */
function pillTextWidth(text: string): number {
  return [...text].length * (fontSizes.md * CAP_ADVANCE_EM + LETTER_SPACING);
}

Deno.test('§A.9 : aucun défi ne déborde la capsule, dans aucune des cinq langues', () => {
  for (const [ref, entry] of Object.entries(CHALLENGES)) {
    for (const locale of LOCALES) {
      const w = pillTextWidth(entry[locale]);
      assert(
        w <= USABLE_PT,
        `${ref}.${locale} « ${entry[locale]} » : ${w.toFixed(1)} pt pour ${USABLE_PT} pt utiles ` +
          `→ coupé par numberOfLines={1} dans le PNG exporté`,
      );
    }
  }
});

Deno.test('anti-décor : le modèle de largeur colle encore à ce que la capsule rend', () => {
  // Sans ces gardes, la borne resterait verte en décrivant une capsule qui
  // n'existe plus (autre fonte, autre largeur de preview, capsule qui déborde).
  assert(
    /story:\s*232,/.test(PARTAGE_SRC),
    'la preview story ne fait plus 232 pt : la borne de longueur décrit une autre carte',
  );
  assert(
    /challengePill:\s*\{[^}]*alignSelf:\s*'stretch'/.test(SHARECARD_SRC),
    'la capsule n’est plus pleine largeur : le calcul de largeur utile ne tient plus',
  );
  assert(
    /challengePill:\s*\{[^}]*borderWidth:\s*1\.5/.test(SHARECARD_SRC),
    'la bordure de la capsule a changé : la largeur utile a changé avec elle',
  );
  assert(
    /challengeText:\s*\{\s*fontSize:\s*fontSizes\.md,[^}]*letterSpacing:\s*2\s*\}/.test(
      SHARECARD_SRC,
    ),
    'la typo de la capsule a changé : le modèle de chasse ne la décrit plus',
  );
  assert(
    SHARECARD_SRC.includes('0.64 * longest'),
    'la chasse 0,64 em a disparu de ShareCard : ce test invente désormais sa constante',
  );
  // La capsule COUPE (numberOfLines=1 sans ellipsizeMode) : c'est ce qui rend la
  // borne obligatoire plutôt que cosmétique.
  assert(
    /challengeText[^\n]*\]\}\s*numberOfLines=\{1\}/.test(SHARECARD_SRC.replace(/\s+/g, ' ')),
    'la capsule n’est plus mono-ligne : vérifier si la borne de longueur a encore un sens',
  );
});
