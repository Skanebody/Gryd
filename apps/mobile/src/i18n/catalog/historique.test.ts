/**
 * GRYD — /historique ET /territoire NE PEUVENT PLUS APPELER « COURSE » UNE
 * SORTIE À VÉLO.
 *
 * Le 26/07/2026, le vélo est devenu une discipline RÉELLE : `/historique` lit
 * `runs` bornée par `.eq('activity', …)` et AFFICHE la discipline (commutateur
 * E14). Sa copie, elle, était restée mono-monde — et sa branche `bike` était
 * imbriquée dans « lu ET zéro sortie », donc elle ne couvrait QUE l'état vide.
 * Un cycliste qui A des sorties lisait « TES COURSES », « {n} courses »,
 * « Filtrer tes courses » (à voix haute), « Aucune course dans ce filtre ».
 * `/territoire`, lui, se contredisait à quatre lignes d'écart : la page nomme
 * « À vélo » en tête, puis affirmait en pied que « seule une COURSE terminée
 * peut devenir une carte de partage ».
 *
 * CE QUE CES TESTS VERROUILLENT, ET POURQUOI CHACUN EXISTE :
 *  1. EXHAUSTIVITÉ — `HISTORY_COPY` couvre toutes les disciplines d'`ACTIVITIES`.
 *     Une 3ᵉ discipline ajoutée sans ses phrases tombe ici (et à la compilation).
 *  2. AUCUNE FUITE — pas un libellé du coureur ne survit dans le monde vélo.
 *     C'est le test qui attrape le copier-coller pressé : dupliquer l'entrée
 *     `run` sous le nom `…Bike` compilerait sans broncher.
 *  3. VOCABULAIRE — aucun texte vélo ne contient un mot de course à pied, dans
 *     aucune des cinq langues.
 *  4. PLACEHOLDERS — `{n}`, `{when}`, `{effort}` identiques entre les deux
 *     mondes : un jumeau qui perd son `{n}` afficherait une phrase amputée.
 *  5. PARITÉ 5 LANGUES sur les entrées ajoutées (le typage l'impose déjà, ce
 *     test attrape la chaîne VIDE, qui, elle, passe le typage).
 *  6. DÉFAUT — `historyCopy()` sans argument rend la version course
 *     (`DEFAULT_ACTIVITY`) : un appelant qui ignore la discipline ne voit rien
 *     changer.
 *  7. BALAYAGE EXHAUSTIF — AUCUNE entrée du catalogue ne nomme un monde sans
 *     figurer dans une liste REVUE. C'est le test qui remplace le jugement au
 *     cas par cas : une clé ajoutée demain sans jumeau tombe ici. Il couvre du
 *     même geste la NEUTRALISATION de `/course/[id]` — écran SANS lentille
 *     (aucune lecture d'une course par identifiant n'existe, O1), donc rien ne
 *     saurait y choisir entre deux jumeaux.
 *  8. CÂBLAGE — les écrans lisent VRAIMENT la dérivation. Sans ce garde, on
 *     pourrait livrer dix jumeaux parfaits que personne ne rend : c'est
 *     exactement l'état d'avant ce lot. Il échoue sur le code d'hier.
 *
 * Le VOCABULAIRE n'est pas redéfini ici : il vient de `disciplineVocabulary.ts`,
 * le module pur que la revue finale a produit pour toute la vague. Une seconde
 * regex maison serait exactement la faute que ce catalogue combat — deux
 * vérités à maintenir, qui divergeront en silence.
 *
 * PUR : aucun import React Native — Deno charge le catalogue tel quel.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY } from '@klaim/shared';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';
import {
  C,
  HISTORY_COPY,
  RUN_EFFORT_A11Y,
  TERRITORY_SHARE_NOTE,
  historyCopy,
  type HistoryActivityCopy,
} from './historique.ts';

const FIELDS = [
  'kicker',
  'subtitle',
  'a11yFilterGroup',
  'countOne',
  'countMany',
  'emptyFilter',
  'emptySignedOut',
  'a11ySignIn',
  'detailPendingNote',
  'a11yEffort',
] as const satisfies readonly (keyof HistoryActivityCopy)[];

/** Les `{jetons}` d'une chaîne, triés — l'ordre d'écriture n'est pas un contrat. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}

Deno.test('exhaustif : chaque discipline du jeu a ses libellés d’historique', () => {
  for (const activity of ACTIVITIES) {
    assert(HISTORY_COPY[activity], `discipline sans libellés : ${activity}`);
  }
  assertEquals(Object.keys(HISTORY_COPY).sort(), [...ACTIVITIES].sort());
  assertEquals(Object.keys(TERRITORY_SHARE_NOTE).sort(), [...ACTIVITIES].sort());
  assertEquals(Object.keys(RUN_EFFORT_A11Y).sort(), [...ACTIVITIES].sort());
});

Deno.test('aucune fuite : pas un libellé du coureur ne survit dans le monde vélo', () => {
  for (const field of FIELDS) {
    const run: Entry = HISTORY_COPY.run[field];
    const bike: Entry = HISTORY_COPY.bike[field];
    for (const locale of LOCALES) {
      assertNotEquals(
        bike[locale],
        run[locale],
        `${field}.${locale} : le texte vélo est celui de la course (copier-coller ?)`,
      );
    }
  }
  for (const locale of LOCALES) {
    assertNotEquals(
      TERRITORY_SHARE_NOTE.bike[locale],
      TERRITORY_SHARE_NOTE.run[locale],
      `territoryShareNote.${locale} : la note de /territoire n’a pas de version vélo`,
    );
  }
});

Deno.test('vocabulaire : aucun texte vélo ne parle de course à pied, dans aucune langue', () => {
  const bikeTexts: [string, Entry][] = [
    ...FIELDS.map((f) => [f, HISTORY_COPY.bike[f]] as [string, Entry]),
    ['territoryShareNote', TERRITORY_SHARE_NOTE.bike],
  ];
  for (const [name, entry] of bikeTexts) {
    for (const locale of LOCALES) {
      const text = entry[locale];
      assertNotEquals(
        porteeDuTexte(text),
        'course',
        `${name}.${locale} nomme la course à pied dans le monde vélo : « ${text} »`,
      );
    }
  }
});

Deno.test('placeholders : un jumeau n’a pas le droit de perdre un {jeton}', () => {
  for (const field of FIELDS) {
    for (const locale of LOCALES) {
      assertEquals(
        placeholders(HISTORY_COPY.bike[field][locale]),
        placeholders(HISTORY_COPY.run[field][locale]),
        `${field}.${locale} : les jetons diffèrent entre les deux mondes`,
      );
    }
  }
});

Deno.test('parité 5 langues : aucune chaîne vide (ce que le typage ne voit pas)', () => {
  for (const activity of ACTIVITIES) {
    for (const field of FIELDS) {
      const entry: Entry = HISTORY_COPY[activity][field];
      for (const locale of LOCALES) {
        assert(entry[locale].trim().length > 0, `${activity}.${field}.${locale} est vide`);
      }
    }
    for (const locale of LOCALES) {
      assert(
        TERRITORY_SHARE_NOTE[activity][locale].trim().length > 0,
        `territoryShareNote.${activity}.${locale} est vide`,
      );
    }
  }
});

Deno.test('défaut : sans discipline, on obtient EXACTEMENT les textes d’avant le vélo', () => {
  assertEquals(historyCopy(), HISTORY_COPY[DEFAULT_ACTIVITY]);
  assertEquals(historyCopy('run'), HISTORY_COPY.run);
  assertEquals(historyCopy('bike'), HISTORY_COPY.bike);
  // `DEFAULT_ACTIVITY` EST la course : une sortie sans discipline déclarée n'est
  // pas « inconnue », elle est de la course à pied (game-rules).
  assertEquals(HISTORY_COPY[DEFAULT_ACTIVITY], HISTORY_COPY.run);
  // Le monde `run` REPREND les clés historiques : aucune n'a été réécrite au
  // passage (ce serait une refonte silencieuse de la copie du coureur).
  assertEquals(HISTORY_COPY.run.kicker, C.historiqueKicker);
  assertEquals(HISTORY_COPY.run.countMany, C.countRunsMany);
  assertEquals(TERRITORY_SHARE_NOTE.run, C.territoryShareNote);
});

/**
 * LES SEULES ENTRÉES DE CE CATALOGUE QUI ONT LE DROIT DE NOMMER UN MONDE.
 * Toute autre est servie aux DEUX lentilles : y nommer un sport exclurait la
 * moitié des joueurs. Cette liste est REVUE, entrée par entrée — c'est elle qui
 * transforme « on a regardé » en « on peut le vérifier ».
 */
const NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  // ── Les couples `run` / `…Bike` de HISTORY_COPY : chacun n'est servi qu'à
  //    SON monde, choisi par `historyCopy(activity)`.
  'a11yFilterGroup',
  'a11yFilterGroupBike',
  'a11ySignIn',
  'a11ySignInBike',
  'countRunsMany',
  'countRunsManyBike',
  'countRunsOne',
  'countRunsOneBike',
  'detailPendingNote',
  'detailPendingNoteBike',
  'emptyFilter',
  'emptyFilterBike',
  'emptySignedOut',
  'emptySignedOutBike',
  'historiqueKicker',
  'historiqueKickerBike',
  'historiqueSubtitle',
  'historiqueSubtitleBike',
  // ── `/territoire` : la note de bas de page, servie par TERRITORY_SHARE_NOTE.
  'territoryShareNote',
  'territoryShareNoteBike',
  // ── VoiceOver d'une ligne de sortie. Le couple existe et la dérivation est
  //    prête (`RUN_EFFORT_A11Y`) ; le CÂBLAGE appartient à un autre périmètre
  //    (`features/history/RealRunCard.tsx:150`) et reste EN SUSPENS, inscrit
  //    plutôt que forcé.
  'a11yRunEffort',
  'a11yRunEffortBike',
  // ── L'ÉTAT VIDE de chaque monde : il porte déjà sa discipline, et son CTA
  //    lance une sortie DÉCLARÉE. Rien à jumeler, tout est déjà par monde.
  'emptyRealUser',
  'bikeEmptyTitle',
  'bikeEmptyBody',
  'bikeEmptyRunSafe',
  'bikeEmptyCta',
  // ── Les deux segments du commutateur : leur rôle EST de nommer le monde.
  'activityRunA11y',
  'activityBikeA11y',
];

Deno.test('balayage : aucune entrée du catalogue Historique ne nomme un monde hors liste revue', () => {
  // Ce test attrape ce que quatre tours successifs avaient manqué : une clé
  // ajoutée demain qui dirait « course » sur une surface servie aux deux mondes.
  // Il verrouille aussi la NEUTRALISATION de `/course/[id]` (`runFallbackTitle`,
  // `runDetailPendingTitle`, `runDetailPendingBody`) : leur retour dans cette
  // liste signalerait qu'on a re-nommé un sport sur un écran qui, faute de
  // lecture par identifiant (O1), ne peut PAS savoir duquel il s'agit.
  assertEquals(
    clesQuiNommentUneDiscipline(C),
    [...NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée nomme une discipline sans figurer dans la liste revue (ou une entrée de la liste a été neutralisée sans être retirée)',
  );
});

// ─── CÂBLAGE : les écrans lisent la dérivation, pas la clé du coureur ────────

async function source(relPath: string): Promise<string> {
  // Commentaires retirés : ils CITENT volontairement les anciens libellés pour
  // expliquer le correctif — un garde qui les lirait serait menteur.
  return (await Deno.readTextFile(new URL(relPath, import.meta.url)))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('/historique rend la copie de SA lentille (et plus celle du coureur)', async () => {
  const src = await source('../../../app/historique.tsx');
  assert(src.includes('historyCopy(activity)'), '/historique ne dérive pas sa copie de la lentille');
  assert(
    src.includes('statsCopy(activity)'),
    '/historique garde des états de lecture mono-monde (chargement, échec, sans serveur)',
  );
  // Chaque entrée bannie ci-dessous ÉTAIT rendue avant ce lot : ce garde échoue
  // mot pour mot sur le code d'hier.
  const INTERDITS = [
    'C.historiqueKicker',
    'C.historiqueSubtitle',
    'C.a11yFilterGroup',
    'C.countRunsOne',
    'C.countRunsMany',
    'C.emptyFilter',
    't(C.emptySignedOut)',
    'C.a11ySignIn',
    'C.detailPendingNote',
    'PC.loading',
    'PC.failedTitle',
    'PC.noBackendTitle',
  ];
  for (const clef of INTERDITS) {
    assert(
      !src.includes(clef),
      `/historique rend « ${clef} » en dur : ce libellé nomme un sport, il doit venir de la dérivation`,
    );
  }
});

Deno.test('/territoire nomme la discipline JUSQU’À sa note de bas de page', async () => {
  const src = await source('../../../app/territoire.tsx');
  assert(
    src.includes('TERRITORY_SHARE_NOTE[shown]'),
    '/territoire sert sa note de partage sans le monde MONTRÉ — la page se contredit',
  );
  assert(
    !src.includes('t(C.territoryShareNote)'),
    '/territoire rend encore la note du coureur sous un en-tête qui peut dire « À vélo »',
  );
});
