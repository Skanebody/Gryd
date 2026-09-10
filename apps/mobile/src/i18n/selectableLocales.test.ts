/**
 * GRYD — LE SÉLECTEUR NE PROPOSE QUE CE QUE L'APP PARLE.
 *
 * ─── LE DÉFAUT MESURÉ (10/09/2026) ──────────────────────────────────────────
 * `/langue` offrait les CINQ `LOCALES`. Les catalogues les tiennent bien toutes
 * — une `Entry` est un `Record<Locale, string>` complet, ADR-009 — mais le
 * domaine « refonte » n'écrit PAS ses textes dans un catalogue : il appelle
 * `useRefonteCopy()`, qui rend `locale === 'en' ? en : fr`. Un compte réglé en
 * espagnol, en allemand ou en portugais lisait donc du FRANÇAIS sur des écrans
 * entiers, sans le moindre avertissement.
 *
 * Ce test tient les deux bouts, et il est VOLONTAIREMENT textuel : la chose à
 * protéger n'est pas une fonction, c'est un accord entre un écran, un store et
 * une dette. `store.ts` importe AsyncStorage et `expo-localization` — Deno ne
 * les charge pas ; lire la source est ici la seule preuve rejouable.
 *
 * Il ÉCHOUE si :
 *   · quelqu'un rouvre le sélecteur aux cinq langues sans avoir traduit
 *     `useRefonteCopy` (la promesse repasserait devant le code) ;
 *   · quelqu'un traduit `useRefonteCopy` sans rouvrir le sélecteur (la
 *     restriction survivrait à sa raison — même exigence que le registre des
 *     exceptions i18n).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from './types.ts';
import { C } from './catalog/reglages.ts';

const read = async (rel: string): Promise<string> =>
  await Deno.readTextFile(new URL(rel, import.meta.url));

Deno.test('ÉTAPE 0 : le domaine refonte ne connaît QUE deux langues', async () => {
  const primitives = await read('../features/refonte/ProfilePrimitives.tsx');
  const hook = primitives.slice(
    primitives.indexOf('export function useRefonteCopy()'),
    primitives.indexOf('export function ProfilePage'),
  );
  assert(hook.length > 0, 'useRefonteCopy est introuvable — ce test ne prouve plus rien');
  assert(
    hook.includes("locale === 'en' ? en : fr"),
    'useRefonteCopy ne fait plus le choix binaire fr/en : la restriction du sélecteur doit être revue AVEC lui',
  );
  for (const absente of ['es', 'de', 'pt']) {
    assert(
      !new RegExp(`\\b${absente}\\b`).test(hook),
      `useRefonteCopy mentionne « ${absente} » : s'il sait le rendre, rouvre le sélecteur`,
    );
  }
});

Deno.test('ÉTAPE 0 : la dette est MASSIVE, et chiffrée plutôt que devinée', async () => {
  // Le volume décide de la réponse : traduire ~600 chaînes inline n'est pas un
  // correctif de lot, restreindre la liste en est un. On mesure, on ne suppose
  // pas — et si un jour ce nombre tombe à zéro, ce test le dira.
  let inline = 0;
  for await (const entry of Deno.readDir(new URL('../features/refonte/', import.meta.url))) {
    if (!entry.isFile || !/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) continue;
    const src = await read(`../features/refonte/${entry.name}`);
    inline += (src.match(/\bcopy\(/g) ?? []).length;
  }
  assert(
    inline > 200,
    `le domaine refonte ne porte plus que ${inline} textes hors catalogue : la restriction de langues doit être rediscutée`,
  );
});

Deno.test('le sélecteur lit SELECTABLE_LOCALES, jamais la liste des catalogues', async () => {
  const screen = await read('../../app/langue.tsx');
  assert(screen.includes('SELECTABLE_LOCALES.map('), 'l’écran doit itérer la liste PROPOSÉE');
  assert(!/\bLOCALES\.map\(/.test(screen), 'itérer LOCALES rouvrirait les cinq langues');
  assert(screen.includes('C.langueOnlyTwo'), 'l’écran doit DIRE pourquoi la liste est courte');
});

Deno.test('SELECTABLE_LOCALES vaut exactement le français et l’anglais', async () => {
  const store = await read('./store.ts');
  assert(
    store.includes("export const SELECTABLE_LOCALES: readonly Locale[] = ['fr', 'en'];"),
    'la liste proposée a changé sans que ce test le sache',
  );
  // La restriction ne DÉCLASSE personne : les catalogues restent typés cinq
  // langues (ADR-009), et c'est ce qui rendra la réouverture possible.
  assertEquals([...LOCALES], ['fr', 'en', 'es', 'de', 'pt']);
});

Deno.test('une langue persistée hors liste n’est pas restaurée', async () => {
  const store = await read('./store.ts');
  assert(
    store.includes('if (isSelectableLocale(saved) && saved !== locale)'),
    'un choix « es » enregistré avant la restriction rouvrirait la langue à trous',
  );
  assert(
    store.includes('if (!isSelectableLocale(next) || next === locale) return;'),
    'setLocale doit refuser une langue hors liste, quel que soit l’appelant',
  );
  assert(
    store.includes('if (isSelectableLocale(code)) return code;'),
    'un téléphone en espagnol doit recevoir l’anglais, pas un espagnol à trous',
  );
});

Deno.test('la note du sélecteur existe dans les cinq langues, et nomme les trois absentes', () => {
  for (const locale of LOCALES) {
    assert(C.langueOnlyTwo[locale].trim().length > 0, `langueOnlyTwo.${locale} est vide`);
  }
  // Elle doit nommer ce qui manque : « seulement deux langues » sans dire
  // lesquelles manquent, ni pourquoi, serait une limite sans explication.
  assert(/espagnol/i.test(C.langueOnlyTwo.fr) && /portugais/i.test(C.langueOnlyTwo.fr));
  assert(/Spanish/i.test(C.langueOnlyTwo.en) && /Portuguese/i.test(C.langueOnlyTwo.en));
});

Deno.test('la ligne « Langue » des réglages ne liste plus les langues', async () => {
  // `langueDetail` disait « Français, English, Español… ». Elle a été SUPPRIMÉE
  // plutôt que corrigée : son dernier lecteur (`SETTINGS_GROUPS`) est parti le
  // même jour et `app/parametres.tsx` écrit sa ligne sans sous-titre. Vérifier
  // une phrase que personne n'affiche aurait été une preuve pour rien.
  const catalogue = await read('./catalog/reglages.ts');
  assert(!/^\s*langueDetail:/m.test(catalogue), 'langueDetail est revenue : si une ligne se remet à lister, elle ne liste que fr/en');
  const reglages = await read('../../app/parametres.tsx');
  const ligne = reglages.slice(reglages.indexOf("copy('Langue', 'Language')"));
  assert(ligne.length > 0, 'la ligne « Langue » a disparu des réglages — le sélecteur n’est plus atteignable');
  assert(
    !/Español|Deutsch|Português/.test(ligne.slice(0, 400)),
    'la ligne « Langue » promet une langue que le sélecteur ne propose pas',
  );
});
