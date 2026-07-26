/**
 * GRYD — LES BADGES SONT GLOBAUX : /badges ne peut pas ne parler qu'au coureur.
 *
 * PREUVE SERVEUR, lue avant d'écrire une ligne de ce fichier :
 *  · `awardBadges` (supabase/functions/ingest_run/index.ts) est appelé sur les
 *    DEUX chemins d'ingestion — course sociale et course territoriale — et ne
 *    reçoit JAMAIS de discipline ;
 *  · `applyRunToStats` (supabase/functions/_shared/engine/badges.ts) incrémente
 *    `runsValid`, `totalDistanceM` et `bestRunDistanceM` pour toute sortie de
 *    statut `valid`/`partial`, sans regarder l'activité ;
 *  · la table `user_stats` n'a pas de colonne `activity`.
 *
 * Une PREMIÈRE SORTIE VÉLO ouvre donc bien un badge. Le châssis affirmait
 * l'inverse (« ta première course en ouvre un ») et invitait à « continuer à
 * courir » pour découvrir un badge secret qu'une sortie vélo débloque aussi.
 *
 * REMÈDE : neutralisation. Pas de jumeau `…Bike` — il inventerait deux
 * collections là où le joueur n'en a qu'une, et /badges n'a aucun commutateur
 * de discipline pour choisir laquelle montrer.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './badges.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

/** Jetons `{date}`, `{reward}`, `{name}` : du CODE, jamais affiché tel quel. */
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

Deno.test('collection vide : la première SORTIE ouvre un badge, pas la première course', () => {
  assertNeutreDansLes5(C.emptyLine, 'emptyLine');
});

Deno.test('badge secret : la condition ne s’adresse plus au seul coureur', () => {
  assertNeutreDansLes5(C.secretRequirement, 'secretRequirement');
});

Deno.test('BALAYAGE : aucune entrée du châssis ne nomme une discipline', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(catalogueAffiche()),
    [],
    'une entrée de badges.ts nomme une discipline alors que les badges sont GLOBAUX',
  );
});

/**
 * MUTATION — sans ce test, le balayage pourrait être vert par accident. On
 * repasse au garde-fou les textes EXACTS d'avant le correctif.
 */
Deno.test('MUTATION : les textes d’avant le correctif sont bien refusés', () => {
  const avant: readonly string[] = [
    'Aucun badge encore — ta première course en ouvre un.',
    'No badge yet — your first run opens one.',
    'Ninguna insignia aún: tu primera carrera abre una.',
    'Noch kein Abzeichen – dein erster Lauf öffnet eines.',
    'Nenhuma insígnia ainda — sua primeira corrida abre uma.',
    'Condition secrète — continue à courir pour la découvrir.',
    'Secret condition — keep running to find it.',
    'Geheime Bedingung – lauf weiter, um sie zu entdecken.',
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
 * ANGLE MORT MESURÉ. `secretRequirement` fuyait dans les CINQ langues, mais le
 * détecteur ne voyait que fr/en/de : les GÉRONDIFS espagnol et portugais
 * (« corriendo », « correndo ») ne sont pas dans ses motifs. Corrigé à la
 * lecture, pas à la regex. Le comblement est un openItem — `disciplineVocabulary.ts`
 * est partagé entre catalogues, il n'appartient pas à celui-ci.
 */
Deno.test('ANGLE MORT MESURÉ : les gérondifs es/pt échappent au détecteur', () => {
  for (const texte of ['sigue corriendo para descubrirla', 'continue correndo para descobrir']) {
    assertEquals(
      porteeDuTexte(texte),
      'neutre',
      `le détecteur voit désormais « ${texte} » : cet angle mort est périmé, retire ce test`,
    );
  }
  assert(!C.secretRequirement.es.includes('corriendo'));
  assert(!C.secretRequirement.pt.includes('correndo'));
});

Deno.test('AUCUN JUMEAU : une collection unique n’a pas deux copies', () => {
  for (const cle of Object.keys(C as unknown as Record<string, Entry>)) {
    assert(
      !cle.endsWith('Bike') && !cle.endsWith('Run'),
      `${cle} est un jumeau de discipline : /badges affiche UNE collection`,
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
