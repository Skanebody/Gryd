/**
 * GRYD — LE MONDE CREW NE PARLE PLUS AUX SEULS COUREURS.
 *
 * POURQUOI LA NEUTRALISATION, ET PAS DES JUMEAUX. L'écran Crew ne porte AUCUN
 * commutateur de discipline (`features/crew/RealCrewScreen.tsx`,
 * `CrewStarterPlan.tsx` : ni prop `activity`, ni lecture de la lentille
 * mémorisée), et ses sources ne sont pas disciplinées — `crew_overview`
 * (migrations 0044/0046) somme les hex du crew toutes disciplines confondues,
 * `crew_mission_inputs` (0049) aussi. Un jumeau « …Bike » n'aurait donc AUCUNE
 * surface pour être choisi, et il suggérerait deux territoires de crew là où le
 * moteur n'en calcule qu'un. Le remède est la neutralisation du vocabulaire.
 *
 * CE QUE CES TESTS VERROUILLENT :
 *  1. les 11 entrées VIVANTES qui nommaient la course à pied sont neutres dans
 *     les 5 langues (mutation à l'appui) ;
 *  2. les deux FAUX AMIS allemands vivants restent en place — « laufen ab »
 *     est l'expiration d'une zone, pas la course : les « corriger » aurait
 *     abîmé une phrase juste ;
 *  3. BALAYAGE EXHAUSTIF — aucune entrée du catalogue ne nomme un monde hors
 *     d'une liste REVUE, où chaque survivant porte sa raison.
 *
 * PUR : aucun import React Native — Deno charge le catalogue tel quel.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C, CREW_ROLE_E, CREW_SIGNAL_E } from './crew.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

const CATALOG = C as unknown as Record<string, Entry | undefined>;

function assertNeutreDansLes5(cle: string): void {
  const entry = CATALOG[cle];
  assert(entry !== undefined, `clé absente du catalogue : ${cle}`);
  for (const locale of LOCALES) {
    assert(entry[locale].trim().length > 0, `${cle}.${locale} est vide`);
    assertEquals(
      porteeDuTexte(entry[locale]),
      'neutre',
      `${cle}.${locale} nomme une discipline sur un écran qui n’en lit aucune : « ${entry[locale]} »`,
    );
  }
}

/**
 * Les entrées RÉELLEMENT rendues qui nommaient la course à pied. Chacune a été
 * suivie jusqu'à sa surface — une correction de texte que personne n'affiche
 * n'est pas une correction.
 */
const VIVANTES_NEUTRALISEES: readonly string[] = [
  'emptySubtitle', // RealCrewScreen.tsx:1301 — sous-titre de l'onglet sans crew
  'emptyBody', // RealCrewScreen.tsx:1305 — la promesse du crew
  'cmCapture', // RealCrewScreen.tsx:249 — mission « capturer »
  'cmCaptureGap', // RealCrewScreen.tsx:252 — l'écart qui la motive
  'cmNoneStable', // RealCrewScreen.tsx:255 — aucune mission, tout va bien
  'rlNoTerritory', // RealCrewScreen.tsx:1033 — crew sans un seul hex
  'rlCreated', // RealCrewScreen.tsx:421 — flash de fondation
  'stepInvite', // CrewStarterPlan.tsx:90 — étape 1 du plan de démarrage
  'sigGatherTonight', // CREW_SIGNAL_E → RealCrewScreen.tsx:728 + :940/944
  'sigGatherTomorrow',
  'sigGatherWeekend',
];

Deno.test('les entrées VIVANTES du monde Crew sont neutres dans les 5 langues', () => {
  for (const cle of VIVANTES_NEUTRALISEES) assertNeutreDansLes5(cle);
});

Deno.test('les trois signaux de rassemblement partent bien du catalogue neutralisé', () => {
  // Le chemin compte autant que le texte : `CREW_SIGNAL_E` est ce que la ligne
  // de chat rend. Si quelqu'un recâblait un signal sur une autre entrée, le
  // texte neutre resterait juste… et invisible.
  assertEquals(CREW_SIGNAL_E.gather_tonight, C.sigGatherTonight);
  assertEquals(CREW_SIGNAL_E.gather_tomorrow, C.sigGatherTomorrow);
  assertEquals(CREW_SIGNAL_E.gather_weekend, C.sigGatherWeekend);
});

Deno.test('MUTATION : remettre « coureurs » dans la promesse du crew la fait ressortir', () => {
  // La preuve que le filet attrape la régression qu'il est censé attraper : on
  // rejoue le défaut du 26/07 sur une COPIE, sans toucher au catalogue.
  const avant = { emptyBody: { ...C.emptyBody } };
  assertEquals(clesQuiNommentUneDiscipline(avant), []);
  const apres = {
    emptyBody: { ...C.emptyBody, fr: 'Un crew cumule le territoire de ses coureurs.' },
  };
  assertEquals(clesQuiNommentUneDiscipline(apres), ['emptyBody']);
});

Deno.test('FAUX AMIS ALLEMANDS : « laufen ab » est une expiration, pas une course', () => {
  // Ces deux phrases annoncent l'expiration de zones (`ablaufen`). Le détecteur
  // les signale parce que son filtre de faux amis ne connaît que « läuft » au
  // singulier — pas parce que le texte parle de course à pied. La preuve : une
  // fois le VERBE d'expiration remplacé par un synonyme, il ne reste plus rien
  // à signaler dans les cinq langues.
  for (const cle of ['cmDefendGapN', 'cmDefendGapSoonN']) {
    const entry = CATALOG[cle];
    assert(entry !== undefined, `clé absente : ${cle}`);
    assert(/laufen ab/i.test(entry.de), `${cle}.de ne porte plus le faux ami : « ${entry.de} »`);
    for (const locale of LOCALES) {
      assertEquals(
        porteeDuTexte(entry[locale].replace(/laufen ab/gi, 'enden')),
        'neutre',
        `${cle}.${locale} nomme VRAIMENT une discipline : « ${entry[locale]} »`,
      );
    }
  }
});

Deno.test('« Runner » reste un RANG, pas une traduction — les 5 langues sont identiques', () => {
  // `roleRunner` ne nomme pas une sortie : c'est un barreau de l'échelle de
  // rangs du crew (Rookie → Runner → Éclaireur → Stratège → Capitaine → …),
  // lié à la valeur `runner` de `CrewRole` (game-rules, migration 0010).
  //
  // ⚠️ VÉRIFIÉ, PAS SUPPOSÉ : l'échelle n'est PAS untraduite en bloc —
  // `roleScout` dit bien « Éclaireur » en français et « Batedor » en portugais.
  // Les deux SEULS rangs identiques dans les cinq langues sont « Runner » et
  // « Rookie » : c'est ce couple-là qui est du vocabulaire de jeu assumé. Le
  // renommer reste une décision produit (openItem), pas un correctif de copie ;
  // ce test empêche au moins qu'il soit traduit À MOITIÉ, ce qui casserait
  // l'échelle sans rien régler pour le cycliste.
  const rangs = [C.roleRunner, C.roleRookie];
  for (const rang of rangs) {
    for (const locale of LOCALES) {
      assertEquals(rang[locale], rang.fr, 'un rang du crew a été traduit dans une seule langue');
    }
  }
  assertEquals(CREW_ROLE_E.runner, C.roleRunner);
});

/**
 * BALAYAGE EXHAUSTIF — la liste REVUE des entrées qui nomment encore un monde.
 * Toute NOUVELLE entrée qui en nommerait un échoue ici. Aucune n'est un oubli :
 * chacune est soit un faux ami du détecteur, soit un invariant de rang, soit
 * une clé SANS AUCUN CONSOMMATEUR — vérifiée par grep sur `apps/mobile` le
 * 26/07/2026, aucune surface ne les rend. Même arbitrage que `profil.test.ts` :
 * retoucher un texte que personne ne lit n'est pas une correction, et les
 * supprimer déborde de ce chantier. Elles sont inscrites, pas oubliées.
 */
const NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  // ── Faux amis du détecteur (le texte est JUSTE) ───────────────────────────
  'cmDefendGapN', // de « Zonen laufen ab » = expirent
  'cmDefendGapSoonN', // idem
  // ── Invariant de rang (échelle du crew, valeur `runner` de CrewRole) ──────
  'roleRunner',
  // ── Clés SANS CONSOMMATEUR — copie morte du Crew de démonstration ─────────
  // Toute la mécanique « sortie de crew » (créer/publier/inviter/RSVP), la
  // « glue » d'encouragement et les stats de vitrine ne sont branchées nulle
  // part depuis la fin du mode démo (AMENDEMENT-47).
  'a11yOutingTime',
  'a11yOutingTitle',
  'a11yOutingZone',
  'actionInviteOuting',
  'bonusDetailChest',
  'contribBody',
  'createOuting',
  'createOutingA11y',
  'encourageSent',
  'glueEncourage',
  'glueLead',
  'inviteRunner',
  'outingCreated',
  'outingNote',
  'outingSheetSub',
  'outingsUpcoming',
  'publishOuting',
  'publishOutingA11y',
  'reqOuting',
  'reqOutingHint',
  'statRunsWeek',
  'streetsToHold', // en « before time runs out » — faux ami ET clé morte
  'yourOuting',
];

Deno.test('balayage : aucune entrée du catalogue Crew ne nomme un monde hors liste revue', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(C),
    [...NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée de crew.ts nomme une discipline alors qu’aucun de ses écrans n’en lit une (ou une entrée de la liste a été neutralisée sans être retirée)',
  );
});
