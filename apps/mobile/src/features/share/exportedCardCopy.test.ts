/**
 * GRYD — L'IMAGE QUI SORT DE L'APP NE PEUT PLUS APPELER « COURSE » UN VÉLO.
 *
 * ─── POURQUOI CE TEST N'EST PAS DANS LE CATALOGUE ───────────────────────────
 * `i18n/catalog/result.test.ts` prouve que les MOTS existent et ne fuient pas
 * d'un monde à l'autre. Il ne peut rien prouver du CÂBLAGE : le 26/07/2026, les
 * jumeaux vélo du Résultat étaient déjà écrits et corrects, et la carte de
 * partage imprimait quand même « COURSE ENREGISTRÉE » / « COURU POUR {crew} »
 * sous le tracé d'un cycliste — parce que `templates.tsx` lisait les entrées
 * `C.*` du coureur en dur. Un catalogue juste servi au mauvais endroit produit
 * exactement le même mensonge qu'un catalogue faux.
 *
 * On relit donc la SOURCE, comme `formatPreviewModel.test.ts` relit le
 * catalogue : `templates.tsx` est un module React Native (ShareMap, StyleSheet),
 * donc non importable en Deno — mais son texte, lui, se lit.
 *
 * CE QUE ÇA VERROUILLE :
 *  1. les trois entrées RÉSERVÉES AU COUREUR ne sont plus référencées en dur
 *     dans le fabricant de cartes — ni `C.heroRunLogged`, ni `C.heroForCrew*` ;
 *  2. l'aiguillage par discipline existe vraiment (`resultCopy` + `d.activity`),
 *     donc la règle 1 n'est pas satisfaite « par suppression du titre » ;
 *  3. la carte reçoit une discipline (`ShareDemoData.activity`) — sans ce champ,
 *     l'aiguillage n'aurait rien à lire ;
 *  4. les trois entrées coureur EXISTENT toujours dans le catalogue : sans ça,
 *     la règle 1 passerait au vert le jour où quelqu'un les renomme, et ce test
 *     deviendrait un décor.
 *
 * Ce que ce test NE prouve PAS, et qui reste au catalogue : que les jumeaux
 * disent la bonne chose dans les cinq langues (`result.test.ts`, « aucune fuite »
 * et « vocabulaire »).
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

/** Le fabricant de cartes, tel qu'il est expédié (pas une copie dans le test). */
const TEMPLATES_SRC = Deno.readTextFileSync(new URL('./templates.tsx', import.meta.url));
/** Le catalogue, pour prouver que les clés surveillées existent encore. */
const CATALOG_SRC = Deno.readTextFileSync(
  new URL('../../i18n/catalog/result.ts', import.meta.url),
);

/**
 * Les entrées du catalogue qui NOMMENT la course à pied et qui atterrissaient
 * dans le PNG exporté. Elles restent légitimes — c'est la version `run` — mais
 * un template ne doit jamais les servir directement : il doit passer par
 * `resultCopy(activity)`, qui rend la version de LA discipline de la sortie.
 */
const RUNNER_ONLY_KEYS = ['heroRunLogged', 'heroForCrewNamed', 'heroForCrewNoName'] as const;

/** Source débarrassée de ses commentaires : ils CITENT les clés fautives. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

Deno.test('sanity : on relit bien le fabricant de cartes, pas un fichier vide', () => {
  assert(TEMPLATES_SRC.includes('SHARE_TEMPLATES'), 'templates.tsx introuvable ou déplacé');
  assert(TEMPLATES_SRC.length > 4000, 'templates.tsx suspicieusement court');
});

Deno.test('la carte exportée ne sert JAMAIS en dur les mots du coureur', () => {
  const src = code(TEMPLATES_SRC);
  for (const key of RUNNER_ONLY_KEYS) {
    assert(
      !src.includes(`C.${key}`),
      `templates.tsx sert « C.${key} » en dur : un cycliste exporterait le titre du coureur. ` +
        `Passer par resultCopy(d.activity).`,
    );
  }
});

Deno.test('…parce qu’il aiguille par discipline, pas parce qu’il a perdu son titre', () => {
  const src = code(TEMPLATES_SRC);
  assert(src.includes('resultCopy('), 'templates.tsx n’aiguille plus par discipline');
  assert(src.includes('d.activity'), 'templates.tsx n’aiguille sur aucune discipline');
  // Les trois titres disciplinés sont bien SERVIS (sinon la carte n'a plus de
  // titre du tout, ce qui passerait la règle précédente sans rien corriger).
  for (const field of ['cardHeroLogged', 'cardHeroForCrewNamed', 'cardHeroForCrewNoName']) {
    assert(src.includes(field), `templates.tsx ne sert pas ${field}`);
  }
});

Deno.test('la carte PORTE une discipline (sans quoi l’aiguillage lit du vide)', () => {
  const src = code(TEMPLATES_SRC);
  assert(
    /interface ShareDemoData\s*\{[\s\S]*?\bactivity:\s*Activity;/.test(src),
    'ShareDemoData ne porte pas de discipline : la carte ne peut pas savoir ce qu’elle décrit',
  );
});

Deno.test('garde anti-décor : les clés surveillées existent encore au catalogue', () => {
  for (const key of RUNNER_ONLY_KEYS) {
    assert(
      CATALOG_SRC.includes(`  ${key}: {`),
      `${key} a disparu du catalogue : ce test ne surveille plus rien`,
    );
    assert(
      CATALOG_SRC.includes(`  ${key}Bike: {`),
      `${key} n’a pas de jumeau vélo : la carte n’a rien à servir à un cycliste`,
    );
  }
});
