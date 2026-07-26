/**
 * GRYD — /MES-PARCOURS : L'ÉCRAN DE TRANSPARENCE DÉCRIVAIT FAUSSEMENT CE QU'IL LIT.
 *
 * Cet écran a un seul objet : dire honnêtement ce que GRYD a déduit, à partir
 * de quoi, et ce qui se passe quand on coupe l'apprentissage. Il disait
 * « Déduit de {n} courses » et « Apprendre de mes courses ».
 *
 * Or l'échantillon vient de la RPC `habits_inputs` (supabase/migrations/
 * 0055_*.sql), qui n'a AUCUNE colonne `activity` : les sorties vélo y entrent
 * exactement comme les courses à pied. Le seul écran dont la mission est de ne
 * pas mentir sur ses entrées se trompait donc sur ses entrées.
 *
 * NEUTRALISATION, PAS DE JUMEAU — et ici la raison est mécanique, pas
 * seulement éditoriale : un couple `habits…Run` / `habits…Bike` promettrait
 * deux apprentissages SÉPARÉS que la RPC ne sait pas produire. On aurait
 * remplacé un mensonge de vocabulaire par un mensonge de fonctionnalité. La
 * séparation réelle est un chantier SQL, inscrit en suspens dans
 * `packages/shared/src/game-rules.ts`.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './parcours.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

/** Jetons `{n}`, `{km}` : des IDENTIFIANTS DE CODE, jamais affichés tels quels. */
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

function catalogueAffiche(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [cle, entree] of Object.entries(C as unknown as Record<string, Entry>)) {
    const table: Record<string, string> = {};
    for (const locale of LOCALES) table[locale] = texteAffiche(entree[locale]);
    out[cle] = table;
  }
  return out;
}

Deno.test('le bloc de transparence nomme la bonne source : des SORTIES', () => {
  assertNeutreDansLes5(C.habitsUnknown, 'habitsUnknown');
  assertNeutreDansLes5(C.habitsOff, 'habitsOff');
  assertNeutreDansLes5(C.habitsRuns, 'habitsRuns');
});

Deno.test('l’apprentissage et son effacement couvrent les deux disciplines', () => {
  assertNeutreDansLes5(C.learnTitle, 'learnTitle');
  assertNeutreDansLes5(C.learnHint, 'learnHint');
  assertNeutreDansLes5(C.learnOffHint, 'learnOffHint');
  assertNeutreDansLes5(C.forgetConfirmBody, 'forgetConfirmBody');
});

Deno.test('le sous-titre de l’écran : les 3 langues qui fuyaient sont recalées', () => {
  assertNeutreDansLes5(C.subtitle, 'subtitle');
  // fr et es disaient DÉJÀ « sortie » / « salida » avant ce lot : on ne les a
  // pas réécrits. Une fuite dans trois langues sur cinq se corrige dans ces
  // trois langues — pas en refaisant les cinq pour la symétrie.
  assert(C.subtitle.fr.includes('sortie'));
  assert(C.subtitle.es.includes('salida'));
});

Deno.test('BALAYAGE : aucune entrée de l’écran ne nomme une discipline', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(catalogueAffiche()),
    [],
    'une entrée de parcours.ts nomme une discipline alors que `habits_inputs` n’en distingue aucune',
  );
});

Deno.test('MUTATION : les textes d’avant le correctif sont bien refusés', () => {
  const avant: readonly string[] = [
    'Déduit de {n} courses.',
    'Based on {n} runs.',
    'Deducido de {n} carreras.',
    'Aus {n} Läufen abgeleitet.',
    'Deduzido de {n} corridas.',
    'Apprendre de mes courses',
    'Learn from my runs',
    'Apprentissage désactivé. GRYD n’utilise pas tes courses.',
    'Pas encore assez de courses pour en déduire quoi que ce soit. GRYD ne devine rien.',
    'What GRYD suggests for your next run. A suggested route never grants points or territory — it only suggests.',
    'GRYD repartira de zéro pour tes prochaines propositions. Tes courses, elles, ne sont pas touchées.',
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
 * `{n}` reste `{n}` : le renommer casserait `app/mes-parcours.tsx`, qui n'est
 * pas de ce périmètre. Ce test fixe le contrat pour que la copie et l'écran ne
 * divergent pas silencieusement.
 */
Deno.test('le contrat d’interpolation avec l’écran est inchangé', () => {
  for (const locale of LOCALES) {
    assert(C.habitsRuns[locale].includes('{n}'), `habitsRuns.${locale} a perdu son jeton {n}`);
  }
});

Deno.test('AUCUN JUMEAU : un apprentissage unique n’a pas deux copies', () => {
  for (const cle of Object.keys(C as unknown as Record<string, Entry>)) {
    assert(
      !cle.endsWith('Bike') && !cle.endsWith('Run'),
      `${cle} est un jumeau de discipline : `
        + '`habits_inputs` ne sait produire qu’UN échantillon d’habitudes',
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
