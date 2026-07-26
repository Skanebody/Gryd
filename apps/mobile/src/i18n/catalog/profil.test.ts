/**
 * GRYD — LE PROFIL NE PEUT PLUS ANNONCER 12 QUAND L'HISTORIQUE EN MONTRE 8.
 *
 * Jusqu'au 26/07/2026 la preview d'historique rendait « Historique des
 * courses · {n} » avec n = `user_stats.runs_valid` :
 *   · le MOT mentait — `applyRunToStats` incrémente ce compteur pour toute
 *     sortie valide, vélo compris (`awardBadges` n'a aucun filtre d'activité) ;
 *   · le NOMBRE mentait — `user_stats` n'est pas disciplinée (migration 0070,
 *     « ce qui reste en suspens » §2) alors que la destination `/historique`
 *     lit `.eq('activity', …)`. Un tap suffisait à voir l'écart.
 *
 * CE QUE CES TESTS VERROUILLENT :
 *   1. le compteur ne revient pas (ni la clé, ni un `{n}` dans son libellé) ;
 *   2. les libellés du Profil qui parlent à TOUT LE MONDE restent neutres ;
 *   3. les JUMEAUX par discipline restent disciplinés — corriger le mensonge
 *      ne doit pas effacer la lentille durement gagnée (E14) ;
 *   4. AUCUNE autre entrée du catalogue ne nomme un monde sans l'avoir mérité,
 *      via un balayage exhaustif des 5 langues confronté à une liste REVUE.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './profil.ts';
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

Deno.test('le compteur qui sommait les deux mondes a DISPARU', () => {
  // `previewHistory` était la seule clé à porter ce nombre. Sa disparition est
  // le correctif lui-même : tant qu'elle n'existe pas, personne ne peut la
  // recâbler « juste pour afficher un chiffre ».
  assert(
    !('previewHistory' in C),
    'previewHistory est revenue : le Profil rendrait de nouveau un compte toutes disciplines sous une navigation disciplinée',
  );
});

Deno.test('la ligne d’historique ne porte AUCUN nombre', () => {
  // Le libellé de la ligne EST `linkHistory` (label et a11y). Un `{n}` ou un
  // chiffre en dur y ferait revenir l'écart 12 vs 8 par une autre porte : la
  // liste de destination est bornée à 200 et ignore le statut, aucun compteur
  // vie-entière ne peut donc coïncider avec elle.
  for (const locale of LOCALES) {
    const texte = C.linkHistory[locale];
    assert(!texte.includes('{'), `linkHistory.${locale} porte un placeholder : « ${texte} »`);
    assert(!/\d/.test(texte), `linkHistory.${locale} porte un chiffre : « ${texte} »`);
  }
});

Deno.test('les libellés qui parlent à tout le monde sont neutres dans les 5 langues', () => {
  // Chacun a été pris en flagrant délit le 26/07 : la ligne d'historique et son
  // a11y, l'a11y de l'activité récente (LUE À VOIX HAUTE juste après « à
  // vélo »), la promesse du premier badge (attribué dans les deux disciplines),
  // la PREMIÈRE MISSION (le vélo capture aussi), le repli d'activité de
  // discipline INCONNUE, et le placeholder de bio.
  assertNeutreDansLes5(C.linkHistory, 'linkHistory');
  assertNeutreDansLes5(C.a11yRecentActivity, 'a11yRecentActivity');
  assertNeutreDansLes5(C.badgesEmptyLine, 'badgesEmptyLine');
  assertNeutreDansLes5(C.territoryEmptyBody, 'territoryEmptyBody');
  assertNeutreDansLes5(C.previewActivityPlain, 'previewActivityPlain');
  assertNeutreDansLes5(C.bioPlaceholder, 'bioPlaceholder');
});

Deno.test('« coureur » n’est plus le mot pour un JOUEUR — nom, @handle et QR ensemble', () => {
  // DETTE 12 (26/07/2026). Ces trois entrées ne nommaient pas une SORTIE, elles
  // nommaient une PERSONNE : le repli d'identité d'un joueur sans nom de compte
  // (profileStore.ts:35), l'erreur de @handle déjà pris (profil-edit.tsx:317) et
  // la promesse de recherche sur l'écran Amis (amis.tsx:124). Elles se corrigent
  // D'UN SEUL TENANT parce que le @handle de repli est DÉRIVÉ du nom de repli —
  // `features/social/playerHandle.ts`, testé à part.
  assertNeutreDansLes5(C.defaultPlayerName, 'defaultPlayerName');
  assertNeutreDansLes5(C.handleTaken, 'handleTaken');
  assertNeutreDansLes5(C.qrHintReal, 'qrHintReal');
  // L'ancienne clé ne peut pas revenir en douce avec son mot.
  assert(!('defaultRunnerName' in C), 'defaultRunnerName est revenue');
});

Deno.test('le repli « discipline inconnue » diffère de son jumeau « à pied »', () => {
  // Ils étaient IDENTIQUES au mot près (« dernière course ») : le repli neutre
  // nommait donc le même monde que le jumeau discipliné, ce que la doc de
  // l'entrée interdisait deux lignes plus bas. Les garder distincts est la
  // seule preuve qu'on ne devine plus.
  for (const locale of LOCALES) {
    assert(
      C.previewActivityPlain[locale] !== C.previewActivityPlainRun[locale],
      `previewActivityPlain.${locale} a re-fusionné avec le jumeau « à pied »`,
    );
  }
});

Deno.test('les JUMEAUX restent disciplinés — la lentille E14 n’a pas été rabotée', () => {
  for (const locale of LOCALES) {
    assertEquals(porteeDuTexte(C.previewActivityPlainRun[locale]), 'course');
    assertEquals(porteeDuTexte(C.previewActivityPlainBike[locale]), 'velo');
    assertEquals(porteeDuTexte(C.metricsScopeRun[locale]), 'course');
    assertEquals(porteeDuTexte(C.metricsScopeBike[locale]), 'velo');
    assertEquals(porteeDuTexte(C.sectionTerritoryBike[locale]), 'velo');
    assertEquals(porteeDuTexte(C.sectionSignatureMapBike[locale]), 'velo');
  }
});

/**
 * BALAYAGE EXHAUSTIF — la liste REVUE des entrées qui ont le droit de nommer un
 * monde. Toute nouvelle entrée qui en nomme un échouera ici, et devra être soit
 * neutralisée, soit ajoutée à cette liste avec sa raison. C'est le filet que
 * quatre tours de nettoyage n'avaient pas.
 */
const NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  // ── Les JUMEAUX (l'écran lit la discipline et l'affiche) ──────────────────
  'metricsScopeBike',
  'metricsScopeRun',
  'previewActivityPlainBike',
  'previewActivityPlainRun',
  'scopeBike',
  'scopeRun',
  'sectionSignatureMapBike',
  'sectionSignatureMapRun',
  'sectionTerritoryBike',
  'sectionTerritoryRun',
  'worldScopeBike',
  'worldScopeRun',
  // ── Clés SANS AUCUN CONSOMMATEUR (vérifié par grep) ───────────────────────
  // Aucune surface ne les rend : les neutraliser serait retoucher un texte que
  // personne ne lit, et les supprimer déborde de ce chantier. Inscrites.
  'qrHint',
  'searchNoRunner',
  'soloCrewSub',
  'toastRunInvite',
];

Deno.test('balayage : aucune entrée du catalogue Profil ne nomme un monde hors liste revue', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(C),
    [...NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée nomme une discipline sans figurer dans la liste revue (ou une entrée de la liste a été neutralisée sans être retirée)',
  );
});
