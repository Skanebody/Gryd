/**
 * GRYD — /performance NE PEUT PLUS ORDONNER DE COURIR À QUELQU'UN QUI ROULE.
 *
 * Le 26/07/2026, `useStats(activity)` a commencé à borner sa lecture par
 * `.eq('activity', …)` : la page LIT par discipline, et l'affiche (commutateur
 * E14 dans la barre). Sa branche `bike` n'était pourtant atteinte que si la page
 * n'avait AUCUNE donnée. Conséquence : un cycliste qui a des sorties lisait tout
 * le corps en vocabulaire coureur — « courses / sem. » sous le chiffre héros,
 * « {n} de tes {total} courses », « Semaine sans course » (LU À VOIX HAUTE), et
 * surtout « Cours 2 fois pour tes premières tendances » / « Lauf 2 Mal », un
 * IMPÉRATIF servi par les TROIS blocs. Les états de lecture (pas connecté, sans
 * serveur, échec, chargement) fuyaient pareil, commutateur affiché.
 *
 * CE QUE CES TESTS VERROUILLENT, ET POURQUOI CHACUN EXISTE :
 *  1. EXHAUSTIVITÉ — `STATS_COPY` couvre toutes les disciplines d'`ACTIVITIES`.
 *  2. AUCUNE FUITE — pas un libellé du coureur ne survit dans le monde vélo
 *     (le copier-coller d'un jumeau compilerait sans broncher).
 *  3. VOCABULAIRE — aucun texte vélo ne nomme la course à pied, en 5 langues.
 *  4. PLACEHOLDERS — `{n}`, `{day}`, `{total}`, `{when}` identiques : un jumeau
 *     amputé de son `{total}` afficherait une phrase fausse.
 *  5. PARITÉ 5 LANGUES (le typage impose les clés, pas la chaîne NON VIDE).
 *  6. DÉFAUT — `statsCopy()` rend la version course (`DEFAULT_ACTIVITY`).
 *  7. BALAYAGE EXHAUSTIF — aucune entrée du catalogue ne nomme un monde hors
 *     d'une liste REVUE. Il rend vérifiable ce qui n'était qu'un pari, couvre la
 *     NEUTRALISATION allemande de `regularityStreak` (déjà neutre dans 4 langues
 *     sur 5 : un jumeau y aurait figé 4 doublons), et attrape la clé que
 *     quelqu'un ajoutera demain sans se poser la question.
 *  8. CÂBLAGE — l'écran, son corps et le palmarès lisent VRAIMENT la dérivation.
 *     Sans ce garde, dix jumeaux parfaits pourraient n'être rendus nulle part —
 *     c'est exactement l'état d'avant ce lot, et ce test échoue dessus.
 *
 * Le VOCABULAIRE n'est pas redéfini ici : il vient de `disciplineVocabulary.ts`,
 * le module pur que la revue finale a produit pour toute la vague. Une seconde
 * regex maison serait deux vérités à maintenir — la faute même qu'on corrige.
 *
 * PUR : aucun import React Native — Deno charge le catalogue tel quel.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY } from '@klaim/shared';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';
import { C, STATS_COPY, statsCopy, type StatsActivityCopy } from './performance.ts';

const FIELDS = [
  'signedOutTitle',
  'noBackendTitle',
  'failedTitle',
  'loading',
  'weekNoRun',
  'volumeNoRunMonth',
  'volumeNoRunSeason',
  'volumeBestDayRuns',
  'territoryImpactUnknown',
  'regularityUnit',
  'weekIdleA11y',
  'notEnoughData',
  'recordLongest',
  'recordsNoneYet',
] as const satisfies readonly (keyof StatsActivityCopy)[];

/** Les `{jetons}` d'une chaîne, triés — l'ordre d'écriture n'est pas un contrat. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}

Deno.test('exhaustif : chaque discipline du jeu a ses libellés de statistiques', () => {
  for (const activity of ACTIVITIES) {
    assert(STATS_COPY[activity], `discipline sans libellés : ${activity}`);
  }
  assertEquals(Object.keys(STATS_COPY).sort(), [...ACTIVITIES].sort());
});

Deno.test('aucune fuite : pas un libellé du coureur ne survit dans le monde vélo', () => {
  for (const field of FIELDS) {
    const run: Entry = STATS_COPY.run[field];
    const bike: Entry = STATS_COPY.bike[field];
    for (const locale of LOCALES) {
      assertNotEquals(
        bike[locale],
        run[locale],
        `${field}.${locale} : le texte vélo est celui de la course (copier-coller ?)`,
      );
    }
  }
});

Deno.test('vocabulaire : aucun texte vélo ne parle de course à pied, dans aucune langue', () => {
  for (const field of FIELDS) {
    const bike: Entry = STATS_COPY.bike[field];
    for (const locale of LOCALES) {
      const text = bike[locale];
      assertNotEquals(
        porteeDuTexte(text),
        'course',
        `${field}.${locale} nomme la course à pied dans le monde vélo : « ${text} »`,
      );
    }
  }
});

Deno.test('placeholders : un jumeau n’a pas le droit de perdre un {jeton}', () => {
  for (const field of FIELDS) {
    for (const locale of LOCALES) {
      assertEquals(
        placeholders(STATS_COPY.bike[field][locale]),
        placeholders(STATS_COPY.run[field][locale]),
        `${field}.${locale} : les jetons diffèrent entre les deux mondes`,
      );
    }
  }
});

Deno.test('parité 5 langues : aucune chaîne vide (ce que le typage ne voit pas)', () => {
  for (const activity of ACTIVITIES) {
    for (const field of FIELDS) {
      const entry: Entry = STATS_COPY[activity][field];
      for (const locale of LOCALES) {
        assert(entry[locale].trim().length > 0, `${activity}.${field}.${locale} est vide`);
      }
    }
  }
});

Deno.test('défaut : sans discipline, on obtient EXACTEMENT les textes d’avant le vélo', () => {
  assertEquals(statsCopy(), STATS_COPY[DEFAULT_ACTIVITY]);
  assertEquals(statsCopy('run'), STATS_COPY.run);
  assertEquals(statsCopy('bike'), STATS_COPY.bike);
  assertEquals(STATS_COPY[DEFAULT_ACTIVITY], STATS_COPY.run);
  // Le monde `run` REPREND les clés historiques, sans réécriture au passage.
  assertEquals(STATS_COPY.run.notEnoughData, C.notEnoughData);
  assertEquals(STATS_COPY.run.regularityUnit, C.regularityUnit);
  assertEquals(STATS_COPY.run.recordLongest, C.recordLongest);
});

/**
 * LES SEULES ENTRÉES DE CE CATALOGUE QUI ONT LE DROIT DE NOMMER UN MONDE.
 * Toute autre est servie aux DEUX lentilles. Liste REVUE entrée par entrée.
 */
const NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  // ── Les couples `run` / `…Bike` de STATS_COPY : chacun n'est servi qu'à SON
  //    monde, choisi par `statsCopy(activity)`.
  'failedTitle',
  'failedTitleBike',
  'loading',
  'loadingBike',
  'noBackendTitle',
  'noBackendTitleBike',
  'notEnoughData',
  'notEnoughDataBike',
  'recordLongest',
  'recordLongestBike',
  'recordsNoneYet',
  'recordsNoneYetBike',
  'regularityUnit',
  'regularityUnitBike',
  'signedOutTitle',
  'signedOutTitleBike',
  'territoryImpactUnknown',
  'territoryImpactUnknownBike',
  'volumeBestDayRuns',
  'volumeBestDayRunsBike',
  'volumeNoRunMonth',
  'volumeNoRunMonthBike',
  'volumeNoRunSeason',
  'volumeNoRunSeasonBike',
  'weekIdleA11y',
  'weekIdleA11yBike',
  'weekNoRun',
  'weekNoRunBike',
  // ── L'ÉTAT VIDE de chaque monde : déjà par discipline, CTA compris (celui de
  //    la course ouvre la Carte, celui du vélo lance une sortie DÉCLARÉE vélo —
  //    deux cibles différentes, donc deux branches, pas un Record).
  'emptyTitle',
  'emptyBody',
  'emptyCta',
  'bikeEmptyTitle',
  'bikeEmptyBody',
  'bikeEmptyRunSafe',
  'bikeEmptyCta',
  // ── Les deux segments du commutateur : leur rôle EST de nommer le monde.
  'activityRunA11y',
  'activityBikeA11y',
  // ── SANS AUCUNE SURFACE (vérifié) : leur unique consommateur est
  //    `features/performance/components.tsx`, dont les quatre composants
  //    exportés (WeekCard, ProgressionCard, RecordsCard, VerifyCard) n'ont
  //    ZÉRO importateur depuis le recalage E18. Les jumeler serait fabriquer un
  //    texte sans écran ; les neutraliser serait retoucher une phrase que
  //    personne ne lit. Le retrait du fichier mort et de ses clés est un
  //    nettoyage à part — inscrit en suspens, pas maquillé.
  'weekRuns', // components.tsx:77
  'progressionNeedsHistory', // components.tsx:214
  'verifyReliable', // components.tsx:303
  'verifyOnRuns', // aucun appelant du tout
];

Deno.test('balayage : aucune entrée du catalogue Statistiques ne nomme un monde hors liste revue', () => {
  // Ce test attrape ce que quatre tours successifs avaient manqué : une clé
  // ajoutée demain qui ordonnerait « Cours 2 fois » à un cycliste.
  assertEquals(
    clesQuiNommentUneDiscipline(C),
    [...NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée nomme une discipline sans figurer dans la liste revue (ou une entrée de la liste a été neutralisée sans être retirée)',
  );
});

// ─── CÂBLAGE : l'écran lit la dérivation, pas la clé du coureur ──────────────

async function source(relPath: string): Promise<string> {
  // Commentaires retirés : ils CITENT volontairement les anciens libellés pour
  // expliquer le correctif — un garde qui les lirait serait menteur.
  return (await Deno.readTextFile(new URL(relPath, import.meta.url)))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('/performance rend la copie de SA lentille, corps compris', async () => {
  const src = await source('../../../app/performance.tsx');
  assert(src.includes('statsCopy(activity)'), '/performance ne dérive pas sa copie de la lentille');
  assert(
    src.includes('activity={activity}'),
    'le corps (StatsBody) ou le palmarès ne reçoit pas la discipline lue',
  );
  // Chaque entrée bannie ÉTAIT rendue avant ce lot : le garde échoue mot pour
  // mot sur le code d'hier.
  const INTERDITS = [
    'C.signedOutTitle',
    'C.noBackendTitle',
    'C.failedTitle',
    't(C.loading)',
    'C.weekNoRun',
    'C.volumeNoRunMonth',
    'C.volumeNoRunSeason',
    'C.volumeBestDayRuns',
    'C.territoryImpactUnknown',
    'C.regularityUnit',
    'C.weekIdleA11y',
    'C.notEnoughData',
  ];
  for (const clef of INTERDITS) {
    assert(
      !src.includes(clef),
      `/performance rend « ${clef} » en dur : ce libellé nomme un sport, il doit venir de la dérivation`,
    );
  }
});

Deno.test('le PALMARÈS suit la discipline lue, sans défaut silencieux', async () => {
  const src = await source('../../features/performance/stats/RecordsSection.tsx');
  assert(
    src.includes('activity: Activity'),
    'RecordsSection n’exige pas la discipline : un défaut retomberait en silence sur la course',
  );
  assert(src.includes('statsCopy(activity)'), 'RecordsSection ne dérive pas ses libellés');
  for (const clef of ['C.recordLongest', 'C.recordsNoneYet']) {
    assert(
      !src.includes(clef),
      `le palmarès rend « ${clef} » en dur : « Plus longue course » sous des stats vélo`,
    );
  }
});
