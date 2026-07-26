/**
 * GRYD — RÉGLAGES, AIDE ET CODE DE CONDUITE PARLENT AUX DEUX DISCIPLINES.
 *
 * Aucun des écrans servis par `catalog/reglages.ts` ne porte le commutateur
 * E14 : Paramètres et ses sous-pages, Confidentialité, Aide et Code de conduite
 * ne LISENT jamais de discipline — ils gouvernent les deux. Le remède n'est
 * donc PAS un jumeau (il n'y aurait aucune surface pour le choisir), c'est la
 * neutralisation. Ces tests la verrouillent.
 *
 * Le cas qui a motivé le chantier : « Pourquoi ma course n'a pas compté ? » est
 * PRÉCISÉMENT l'écran qu'ouvre un cycliste dont la sortie vient d'être refusée.
 * Il y cherchait pourquoi, et l'app lui parlait d'autre chose.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './reglages.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

function assertNeutreDansLes5(entry: Entry, cle: string): void {
  for (const locale of LOCALES) {
    assertEquals(
      porteeDuTexte(entry[locale]),
      'neutre',
      `${cle}.${locale} nomme une discipline : « ${entry[locale]} »`,
    );
  }
}

Deno.test('AIDE : l’écran de recours ne parle plus au seul coureur', () => {
  assertNeutreDansLes5(C.supportSubtitle, 'supportSubtitle');
  assertNeutreDansLes5(C.secMaSortie, 'secMaSortie');
  assertNeutreDansLes5(C.whyNotCountedTitle, 'whyNotCountedTitle');
  assertNeutreDansLes5(C.whyNotCountedBody, 'whyNotCountedBody');
  assertNeutreDansLes5(C.runStatusTitle, 'runStatusTitle');
  assertNeutreDansLes5(C.notCountedBody, 'notCountedBody');
  assertNeutreDansLes5(C.segmentExcludedBody, 'segmentExcludedBody');
  assertNeutreDansLes5(C.supportNoChannelBody, 'supportNoChannelBody');
  assertNeutreDansLes5(C.supportFootnote, 'supportFootnote');
});

Deno.test('RÉGLAGES : la sous-page et sa section couvrent toute sortie', () => {
  assertNeutreDansLes5(C.rowActivite, 'rowActivite');
  assertNeutreDansLes5(C.rowActiviteDetail, 'rowActiviteDetail');
  assertNeutreDansLes5(C.secPendantSortie, 'secPendantSortie');
  assertNeutreDansLes5(C.rowAideDetail, 'rowAideDetail');
  assertNeutreDansLes5(C.pushQuietNote, 'pushQuietNote');
});

Deno.test('DONNÉES : export, confidentialité et suppression parlent de « sorties »', () => {
  // Ce sont des engagements RGPD : ils décrivent ce qui est copié et ce qui est
  // effacé. Un cycliste doit y lire SES données, pas celles d'un coureur.
  assertNeutreDansLes5(C.exportDataDetail, 'exportDataDetail');
  assertNeutreDansLes5(C.exportNote, 'exportNote');
  assertNeutreDansLes5(C.dataExportBody, 'dataExportBody');
  assertNeutreDansLes5(C.privSubtitle, 'privSubtitle');
  assertNeutreDansLes5(C.deleteConfirmBody, 'deleteConfirmBody');
  assertNeutreDansLes5(C.deletionRestoredBody, 'deletionRestoredBody');
});

Deno.test('CONDUITE : les règles couvrent tout le monde, la sécurité NOMME les deux', () => {
  assertNeutreDansLes5(C.conduiteSubtitle, 'conduiteSubtitle');
  assertNeutreDansLes5(C.respectTitle, 'respectTitle');
  assertNeutreDansLes5(C.respectBody, 'respectBody');
  // `securiteBody` est le seul texte de ce catalogue qui a le DROIT de nommer
  // une discipline — parce qu'il les nomme TOUTES LES DEUX. Une consigne de
  // sécurité (code de la route) doit atteindre explicitement le cycliste, qui
  // partage la chaussée : le neutre y serait plus faible que le concret.
  for (const locale of LOCALES) {
    assertEquals(
      porteeDuTexte(C.securiteBody[locale]),
      'les-deux',
      `securiteBody.${locale} n’adresse plus les deux disciplines : « ${C.securiteBody[locale]} »`,
    );
  }
});

Deno.test('les anciennes clés disciplinées ne peuvent pas revenir en douce', () => {
  const anciennes = ['rowCourse', 'rowCourseDetail', 'secPendantCourse', 'secMaCourse'];
  for (const cle of anciennes) {
    assert(!(cle in C), `${cle} est revenue : le vocabulaire « course » revient avec elle`);
  }
});

/**
 * BALAYAGE EXHAUSTIF, 5 langues. Une SEULE entrée a le droit de nommer la
 * course à pied dans ce catalogue, et ce n'est pas une description de
 * fonctionnalité : c'est la baseline de marque (AMENDEMENT-42, CLAUDE.md).
 * La réécrire serait changer le produit, pas corriger un mensonge.
 *
 * `securiteBody` n'y figure pas : il nomme les DEUX mondes, donc n'exclut
 * personne — le balayage ne le signale pas.
 */
const NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = ['tagline'];

Deno.test('balayage : hors baseline de marque, rien ne nomme une discipline', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(C),
    [...NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée de reglages.ts nomme une discipline alors qu’aucun de ses écrans n’en lit une',
  );
});
