/**
 * GRYD — LE DÉFI D'ACCUEIL DEMANDAIT UN GESTE QUE LA MÉCANIQUE N'EXIGE PAS.
 *
 * C'est le cas le plus net de la vague, parce qu'il est FACTUELLEMENT
 * vérifiable : les paliers du défi 7 jours sont validés par
 * `welcome_challenge_facts` (migration 0052), qui lit `us.best_run_distance_m`,
 * `us.loop_runs`, `us.hexes_captured` et `us.first_shares` dans `user_stats` —
 * une table SANS colonne `activity`. `applyRunToStats`
 * (supabase/functions/_shared/engine/badges.ts) y écrit `bestRunDistanceM` pour
 * TOUTE sortie valide, quelle que soit la discipline.
 *
 * Autrement dit : un cycliste cochait « Cours 3 km d'une traite » EN ROULANT.
 * L'app lui donnait un ordre, puis le validait sans qu'il l'exécute. Ce n'est
 * pas un texte incomplet, c'est une consigne fausse — et la corriger en la
 * DÉDOUBLANT aurait été pire : les deux jumeaux auraient pointé le MÊME
 * compteur, donc promis deux paliers là où il n'y en a qu'un.
 *
 * Même cause pour `dailyZoneEffortLearning` : son compte vient de
 * `runsBeforeLearning` (features/route/suggestion.ts), alimenté par la RPC
 * `habits_inputs` (migration 0055) qui n'a pas non plus de colonne `activity`.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './daily.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

/**
 * LES JETONS SONT DU CODE, PAS DE LA COPIE — et ici ce n'est pas théorique :
 * `dailyZoneEffortLearning` interpole `{runs}`, un nom de variable lu par
 * `ui/game/DailyFocusBlock.tsx`. Sans ce retrait, le garde-fou signalerait une
 * phrase française parfaitement neutre à cause du mot anglais `runs` qui ne
 * s'affiche JAMAIS (il est remplacé par un nombre avant tout rendu). Renommer
 * la variable supposerait d'éditer l'écran : hors de ce catalogue.
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

function catalogueAffiche(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [cle, entree] of Object.entries(C as unknown as Record<string, Entry>)) {
    const table: Record<string, string> = {};
    for (const locale of LOCALES) table[locale] = texteAffiche(entree[locale]);
    out[cle] = table;
  }
  return out;
}

Deno.test('les 5 paliers d’accueil décrivent ce que la mécanique valide vraiment', () => {
  assertNeutreDansLes5(C.welcomeStepRun3k, 'welcomeStepRun3k');
  assertNeutreDansLes5(C.welcomeStepRun5k, 'welcomeStepRun5k');
  assertNeutreDansLes5(C.welcomeStepLoop, 'welcomeStepLoop');
  assertNeutreDansLes5(C.welcomeStepCapture, 'welcomeStepCapture');
  assertNeutreDansLes5(C.welcomeStepShare, 'welcomeStepShare');
});

Deno.test('les paliers gardent leur DISTANCE : neutraliser n’est pas effacer', () => {
  // Le remède était le VERBE, pas le seuil. Si « 3 km » disparaissait de la
  // copie, le joueur ne saurait plus ce qu'on lui propose — on aurait remplacé
  // un mensonge par un vide, ce que la doctrine interdit tout autant.
  for (const locale of LOCALES) {
    assert(C.welcomeStepRun3k[locale].includes('3 km'), `welcomeStepRun3k.${locale}`);
    assert(C.welcomeStepRun5k[locale].includes('5 km'), `welcomeStepRun5k.${locale}`);
  }
});

Deno.test('zone du jour : l’effort et la panne réseau parlent de SORTIES', () => {
  assertNeutreDansLes5(C.dailyZoneEffortLearning, 'dailyZoneEffortLearning');
  assertNeutreDansLes5(C.dailyZoneUnavailableDetail, 'dailyZoneUnavailableDetail');
});

/**
 * BALAYAGE — avec UNE exception, et ce n'est pas une dispense : c'est un FAUX
 * POSITIF du détecteur, mesuré par le test suivant.
 *
 * `dailyZoneFragile.de` dit « Dort laufen Zonen ab » — le verbe est *ablaufen*
 * (expirer), pas *laufen* (courir). Le français et l'anglais de la même entrée
 * le prouvent : « Des zones y arrivent à échéance » / « Zones there are
 * expiring ». Réécrire un allemand correct pour apaiser une regex serait
 * fabriquer un correctif ; l'ajout de « laufen … ab » aux faux amis de
 * `disciplineVocabulary.ts` est inscrit en openItem (fichier partagé).
 */
const FAUX_POSITIFS_DU_DETECTEUR: readonly string[] = ['dailyZoneFragile'];

Deno.test('BALAYAGE : hors faux positif mesuré, rien ne nomme une discipline', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(catalogueAffiche()),
    [...FAUX_POSITIFS_DU_DETECTEUR].sort(),
    'une entrée de daily.ts nomme une discipline alors que les paliers d’accueil sont GLOBAUX',
  );
});

Deno.test('FAUX POSITIF MESURÉ : « ablaufen » n’est pas « laufen »', () => {
  // Le mot allemand signalé, isolé : le détecteur le voit comme de la course.
  assertEquals(porteeDuTexte('Dort laufen Zonen ab'), 'course');
  // Et les autres langues de la MÊME entrée disent « expirer », pas « courir » —
  // c'est ce qui prouve que le signalement est faux, pas une opinion.
  assert(C.dailyZoneFragile.fr.includes('échéance'));
  assert(C.dailyZoneFragile.en.includes('expiring'));
});

Deno.test('MUTATION : les textes d’avant le correctif sont bien refusés', () => {
  const avant: readonly string[] = [
    'Cours 3 km d’une traite',
    'Run 3 km in one go',
    'Corre 3 km de una vez',
    'Lauf 5 km am Stück',
    'Corra 5 km de uma vez',
    'Partage une course',
    'Teile einen Lauf',
    'Encore 2 courses pour adapter la distance. Une distinction, aucun point.',
    'Elle revient dès que la connexion tient. Ta course, elle, compte quand même.',
  ];
  for (const texte of avant) {
    assertNotEquals(
      porteeDuTexte(texteAffiche(texte)),
      'neutre',
      `le garde-fou laisse passer « ${texte} » : il ne protège rien`,
    );
  }
});

Deno.test('AUCUN JUMEAU : un palier unique n’a pas deux copies', () => {
  for (const cle of Object.keys(C as unknown as Record<string, Entry>)) {
    assert(
      !cle.endsWith('Bike'),
      `${cle} est un jumeau de discipline : les paliers d’accueil lisent UN compteur`,
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
