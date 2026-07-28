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
  RUN_DETAIL_COPY,
  RUN_EFFORT_A11Y,
  TERRITORY_SHARE_NOTE,
  historyCopy,
  runDetailCopy,
  type HistoryActivityCopy,
  type RunDetailActivityCopy,
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
  'a11yEffort',
] as const satisfies readonly (keyof HistoryActivityCopy)[];

/**
 * E68 « DÉTAIL HISTORIQUE » — les libellés qui NOMMENT la sortie ouverte. Ils
 * subissent EXACTEMENT les mêmes gardes que ceux de la liste : pas de
 * copier-coller entre les deux mondes, pas de vocabulaire coureur sous une
 * sortie vélo, pas de jeton perdu, pas de chaîne vide.
 *
 * ⚠️ `detailPendingNote` A DISPARU DE `FIELDS` ci-dessus, et ce n'est pas un
 * oubli : la note « ces lignes ne s'ouvrent pas » a été retirée du catalogue le
 * 28/07/2026 parce que les lignes S'OUVRENT (E68). La garder aurait été le
 * mensonge symétrique de celui qu'elle corrigeait.
 */
const DETAIL_FIELDS = [
  'kicker',
  'verdictFlagged',
  'verdictRejected',
] as const satisfies readonly (keyof RunDetailActivityCopy)[];

/**
 * LES ÉTATS D'AVANT LA LECTURE, qui doivent rester NEUTRES aux deux mondes.
 * Tant que `runs.activity` n'est pas lue, l'écran ne sait pas de quel sport on
 * lui parle : un libellé coureur y serait une supposition, un libellé vélo
 * aussi. Ils n'ont donc PAS de jumeau — et ce test échoue si l'un d'eux se met
 * à nommer une discipline.
 */
const DETAIL_NEUTRAL: readonly (keyof typeof C)[] = [
  'detailLoading',
  'detailSignedOutBody',
  'detailNoBackendTitle',
  'detailFailedTitle',
  'detailNotFoundTitle',
  'detailNotFoundBody',
];

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
  assertEquals(Object.keys(RUN_DETAIL_COPY).sort(), [...ACTIVITIES].sort());
});

Deno.test('E68 : le détail d’une sortie a ses libellés dans les deux mondes', () => {
  // Le détail lit `runs.activity` : la discipline y est un FAIT, pas une
  // préférence. Les quatre libellés qui la nomment doivent donc exister des DEUX
  // côtés, différer, garder leurs jetons et n'être vides dans aucune langue.
  for (const field of DETAIL_FIELDS) {
    const run: Entry = RUN_DETAIL_COPY.run[field];
    const bike: Entry = RUN_DETAIL_COPY.bike[field];
    for (const locale of LOCALES) {
      assertNotEquals(
        bike[locale],
        run[locale],
        `detail.${field}.${locale} : le texte vélo est celui de la course (copier-coller ?)`,
      );
      assertNotEquals(
        porteeDuTexte(bike[locale]),
        'course',
        `detail.${field}.${locale} nomme la course à pied dans le monde vélo : « ${bike[locale]} »`,
      );
      assertEquals(
        placeholders(bike[locale]),
        placeholders(run[locale]),
        `detail.${field}.${locale} : les jetons diffèrent entre les deux mondes`,
      );
      for (const activity of ACTIVITIES) {
        assert(
          RUN_DETAIL_COPY[activity][field][locale].trim().length > 0,
          `detail.${activity}.${field}.${locale} est vide`,
        );
      }
    }
  }
  // Le défaut est le monde d'avant le vélo — jamais une troisième discipline.
  assertEquals(runDetailCopy(), RUN_DETAIL_COPY[DEFAULT_ACTIVITY]);
  assertEquals(runDetailCopy(undefined), RUN_DETAIL_COPY[DEFAULT_ACTIVITY]);
});

Deno.test('E68 : les états d’AVANT la lecture ne nomment aucune discipline', () => {
  // C'est le défaut que ce lot a failli introduire : servir « Lecture de ta
  // course… » avant d'avoir lu `runs.activity`, c'est-à-dire supposer le sport
  // de quelqu'un pendant les quatre secondes où on ne sait rien de lui.
  for (const clef of DETAIL_NEUTRAL) {
    const entry = C[clef] as Entry;
    for (const locale of LOCALES) {
      assertEquals(
        porteeDuTexte(entry[locale]),
        'neutre',
        `${String(clef)}.${locale} nomme une discipline avant que la sortie soit lue : « ${entry[locale]} »`,
      );
    }
  }
  // Et l'écran ne les remplace pas en douce par la copie mono-monde d'un autre
  // catalogue : `statsCopy` (indexée par lentille) n'a rien à faire ici.
  // (garde de câblage : voir le test « la ligne d’historique OUVRE le détail »)
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
  // ── E68 « DÉTAIL HISTORIQUE » (28/07/2026). Servis par `RUN_DETAIL_COPY`,
  //    indexé sur `runs.activity` — la discipline de la sortie OUVERTE, lue en
  //    base. Ce n'est plus une préférence d'affichage qu'il faudrait deviner :
  //    c'est un fait, donc l'écran a le droit de le nommer.
  //    ⚠ `detailLoading` n'y est PAS : la lecture n'a pas encore abouti quand il
  //    s'affiche, donc il reste NEUTRE (cf. `DETAIL_NEUTRAL` en haut de fichier).
  'detailKicker',
  'detailKickerBike',
  'detailVerdictFlagged',
  'detailVerdictFlaggedBike',
  'detailVerdictRejected',
  'detailVerdictRejectedBike',
];

Deno.test('balayage : aucune entrée du catalogue Historique ne nomme un monde hors liste revue', () => {
  // Ce test attrape ce que quatre tours successifs avaient manqué : une clé
  // ajoutée demain qui dirait « course » sur une surface servie aux deux mondes.
  // Il verrouille aussi la NEUTRALITÉ des libellés de `/course/[id]` qui ne
  // sont PAS servis par `RUN_DETAIL_COPY` (`runFallbackTitle`, `detailTitle`,
  // les noms de compteurs de zones, les notes de tracé et de partage) : leur
  // apparition dans cette liste signalerait qu'on a nommé un sport là où
  // l'écran sert les deux mondes avec un seul texte.
  // (Les QUATRE qui nomment légitimement la sortie ouverte sont, eux, listés
  // ci-dessus : depuis le 28/07/2026 l'écran LIT `runs.activity`, il ne devine
  // plus rien.)
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

Deno.test('E68 : la ligne d’historique OUVRE le détail, et l’aveu inverse a disparu', async () => {
  // Deux moitiés d'un même correctif, et aucune ne vaut sans l'autre :
  //  · la ligne mène quelque part (sinon le chevron serait un bouton mort) ;
  //  · l'aveu « ces lignes ne s'ouvrent pas » n'est plus servi (sinon l'écran
  //    déclarerait mort un chemin qui répond — le mensonge symétrique).
  const ligne = await source('../../features/history/RealRunCard.tsx');
  assert(
    ligne.includes("pathname: '/course/[id]'"),
    'RealRunCard n’ouvre pas E68 en FORME OBJET : sans le patron littéral, l’audit de routes compte /course/[id] orphelin',
  );
  const liste = await source('../../../app/historique.tsx');
  assert(
    !liste.includes('detailPendingNote'),
    '/historique sert encore « ces lignes ne s’ouvrent pas » alors qu’elles s’ouvrent',
  );
  // Et l'écran de détail LIT vraiment une sortie, au lieu d'annoncer qu'il ne
  // sait pas le faire (l'état d'avant ce lot).
  const detail = await source('../../../app/course/[id].tsx');
  assert(
    detail.includes('useRunDetail('),
    'E68 ne lit aucune sortie : l’écran est redevenu une page d’état',
  );
  // Les états d'avant la lecture ne doivent PAS emprunter la copie indexée par
  // LENTILLE de /performance : elle nomme un sport, et E68 n'en connaît aucun
  // tant qu'il n'a pas lu la ligne.
  assert(
    !detail.includes('statsCopy'),
    'E68 sert la copie mono-monde de /performance dans ses états de lecture : il suppose une discipline qu’il n’a pas lue',
  );
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
