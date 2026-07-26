/**
 * GRYD — LA SÉRIE EST GLOBALE : SON VOCABULAIRE NE PEUT PAS NOMMER UN SPORT.
 *
 * POURQUOI CE FICHIER EXISTE, dit une fois pour les quatre catalogues que ce
 * lot corrige : le vélo est une discipline RÉELLE depuis le 26/07/2026, mais la
 * série, elle, est restée UN SEUL COMPTEUR. C'est vérifié aux deux bouts —
 * `ACTIVITY_SCOPE.streak === 'global'` dans `packages/shared/src/game-rules.ts`,
 * et les deux lectures de `runs` qui la calculent (`features/social/streak.ts`
 * côté client, `loadStreakFacts` dans `supabase/functions/ingest_run/index.ts`
 * côté serveur) n'ont AUCUN `.eq('activity', …)`.
 *
 * Une sortie vélo prolonge donc la série. « Encore 1 course cette semaine pour
 * la prolonger » n'était pas une copie incomplète : c'était une phrase FAUSSE,
 * et `streakResultExtended` la disait sous un héros « BIKE » sur l'écran
 * Résultat (app/course-result.tsx), que cette vague a justement discipliné.
 *
 * LE REMÈDE EST LA NEUTRALISATION, ET SON CONTRAIRE EST TESTÉ ICI AUSSI : un
 * jumeau `…Bike` scinderait la copie d'un compteur unique — le joueur lirait
 * deux séries là où il n'en a qu'une, et aucun écran n'aurait de commutateur
 * pour choisir laquelle afficher. Le dernier test refuse ces jumeaux.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './streak.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

/**
 * Les jetons `{n}`, `{m}`, `{weeks}` sont des IDENTIFIANTS DE CODE : ils sont
 * remplacés par une valeur avant tout rendu et ne s'affichent JAMAIS. Les
 * laisser dans le texte examiné ferait juger le garde-fou sur du code — et un
 * jour, sur un `{runs}` parfaitement légitime (cf. `daily.test.ts`).
 */
function texteAffiche(brut: string): string {
  return brut.replace(/\{\w+\}/g, ' ');
}

function assertNeutreDansLes5(entry: Entry, cle: string): void {
  for (const locale of LOCALES) {
    assertEquals(
      porteeDuTexte(texteAffiche(entry[locale])),
      'neutre',
      `${cle}.${locale} nomme une discipline : « ${entry[locale]} »`,
    );
  }
}

/** Copie du catalogue vue comme le joueur la voit — jetons retirés. */
function catalogueAffiche(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [cle, entree] of Object.entries(C as unknown as Record<string, Entry>)) {
    const table: Record<string, string> = {};
    for (const locale of LOCALES) table[locale] = texteAffiche(entree[locale]);
    out[cle] = table;
  }
  return out;
}

Deno.test('les 7 entrées de la série ne nomment plus la course à pied', () => {
  assertNeutreDansLes5(C.streakAtRiskOne, 'streakAtRiskOne');
  assertNeutreDansLes5(C.streakAtRiskMany, 'streakAtRiskMany');
  assertNeutreDansLes5(C.streakBuildingOne, 'streakBuildingOne');
  assertNeutreDansLes5(C.streakBuildingMany, 'streakBuildingMany');
  assertNeutreDansLes5(C.streakFrozen, 'streakFrozen');
  assertNeutreDansLes5(C.streakRestartBody, 'streakRestartBody');
  assertNeutreDansLes5(C.streakResultExtended, 'streakResultExtended');
});

Deno.test('BALAYAGE : aucune entrée du catalogue ne nomme une discipline', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(catalogueAffiche()),
    [],
    'une entrée de streak.ts nomme une discipline alors que la série est un compteur GLOBAL',
  );
});

/**
 * MUTATION — la preuve que les tests ci-dessus ne sont pas vides. On repasse au
 * garde-fou les textes EXACTS d'avant le correctif : s'il ne les refusait pas,
 * le balayage serait un décor.
 */
Deno.test('MUTATION : les textes d’avant le correctif sont bien refusés', () => {
  const avant: readonly string[] = [
    'Encore 1 course cette semaine pour la prolonger.',
    '1 more run this week to keep it going.',
    '1 carrera más esta semana para continuarla.',
    'Noch 1 Lauf diese Woche, um sie fortzusetzen.',
    'Mais 1 corrida esta semana para continuar.',
    'Encore {n} courses cette semaine et ta série démarre.',
    'Elle démarre à ta prochaine course. Rien à rattraper.',
    'Semaine validée par cette course.',
    'This run secured your week.',
    'Dieser Lauf hat deine Woche gesichert.',
  ];
  for (const texte of avant) {
    assertNotEquals(
      porteeDuTexte(texteAffiche(texte)),
      'neutre',
      `le garde-fou laisse passer « ${texte} » : il ne protège rien`,
    );
  }
});

/**
 * CE QUE LE GARDE-FOU NE VOIT PAS, ET QUI A ÉTÉ CORRIGÉ À LA MAIN.
 *
 * `streakFrozen` fuyait dans les CINQ langues (« les semaines courues », « weeks
 * you actually ran », « gelaufene Wochen »…), mais `disciplineVocabulary.ts` ne
 * détectait que l'espagnol et le portugais : ses motifs couvrent les infinitifs
 * et les substantifs, pas les PARTICIPES ni les prétérits. Vérifié, pas supposé
 * — ce test MESURE l'angle mort au lieu de le laisser croire couvert.
 *
 * Conséquence pratique : sur ce catalogue, le balayage est une seconde barrière,
 * pas la première. La première reste la lecture. Le comblement des motifs est
 * inscrit en openItem (le fichier de détection est partagé, il n'appartient pas
 * à ce catalogue).
 */
Deno.test('ANGLE MORT MESURÉ : participes et prétérits échappent au détecteur', () => {
  const invisibles: readonly string[] = [
    'Le multiplicateur ne compte que les semaines courues.',
    'The multiplier only counts weeks you actually ran.',
  ];
  for (const texte of invisibles) {
    assertEquals(
      porteeDuTexte(texte),
      'neutre',
      `le détecteur voit désormais « ${texte} » : ce test décrit un angle mort périmé, retire-le`,
    );
  }
  // Et la preuve que le correctif ne dépendait PAS de cette détection :
  assert(!C.streakFrozen.fr.includes('courues'));
  assert(!C.streakFrozen.en.includes('ran'));
  assert(!C.streakFrozen.de.includes('gelaufene'));
});

Deno.test('AUCUN JUMEAU : une dimension globale n’a pas deux copies', () => {
  const catalogue = C as unknown as Record<string, Entry | undefined>;
  for (const cle of Object.keys(catalogue)) {
    assert(
      !cle.endsWith('Bike') && !cle.endsWith('Run'),
      `${cle} est un jumeau de discipline : la série est un compteur UNIQUE, ` +
        'deux copies feraient croire à deux séries',
    );
  }
});

Deno.test('parité 5 langues : aucune chaîne vide (ce que le typage ne voit pas)', () => {
  for (const [cle, entree] of Object.entries(C as unknown as Record<string, Entry>)) {
    for (const locale of LOCALES) {
      assert(entree[locale].trim().length > 0, `${cle}.${locale} est vide`);
    }
  }
});
