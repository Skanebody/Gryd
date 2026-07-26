/**
 * GRYD — LA BOUTIQUE NE DIT PLUS « COURSE » À QUELQU'UN QUI ROULE.
 *
 * LE DÉFAUT (B4, revue finale du 26/07/2026). `useRunInProgress` expose
 * `activity: Activity | null` depuis cette vague — mais `app/arsenal.tsx` ne
 * lisait que le booléen `running` et rendait, à un cycliste au milieu de sa
 * sortie : « Course en cours. » / « on ne te vend rien pendant que tu cours ».
 * La donnée était là ; seul le câblage manquait. Ces tests verrouillent la
 * DÉRIVATION (pure), pas le JSX — c'est la seule moitié qui se teste, et c'est
 * elle qui décide des mots.
 *
 * TROIS ÉTATS, PAS DEUX : `null` ne veut pas dire « course à pied », il veut
 * dire « on ne sait pas » (buffer antérieur au champ, ou illisible). Y
 * substituer un défaut serait affirmer sans savoir, sur l'écran même qui a été
 * refait pour cesser d'affirmer (solde d'Éclats, état du Club).
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '@klaim/shared';
import { LOCALES } from '../types.ts';
import { SHOP_C, ARSENAL_I18N, shopPauseCopy } from './arsenal.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

const PORTEE_ATTENDUE = { run: 'course', bike: 'velo' } as const;

Deno.test('B4 — la pause boutique parle du monde de la sortie EN COURS', () => {
  for (const activity of ACTIVITIES) {
    const { title, body } = shopPauseCopy(activity);
    for (const locale of LOCALES) {
      assertEquals(
        porteeDuTexte(title[locale]),
        PORTEE_ATTENDUE[activity],
        `titre ${activity}/${locale} : « ${title[locale]} »`,
      );
      assertEquals(
        porteeDuTexte(body[locale]),
        PORTEE_ATTENDUE[activity],
        `corps ${activity}/${locale} : « ${body[locale]} »`,
      );
    }
  }
});

Deno.test('B4 — discipline INCONNUE : on ne devine pas, on reste neutre', () => {
  // Le seul cas où l'écran n'a pas le droit de nommer un monde. Si un jour ce
  // repli se met à dire « course » (ou « vélo »), il aura recommencé à deviner.
  const { title, body } = shopPauseCopy(null);
  for (const locale of LOCALES) {
    assertEquals(porteeDuTexte(title[locale]), 'neutre', `titre null/${locale}`);
    assertEquals(porteeDuTexte(body[locale]), 'neutre', `corps null/${locale}`);
  }
});

Deno.test('B4 — le repli neutre n’est pas une copie du jeu « à pied »', () => {
  // Le mode d'échec économique : brancher `null` sur `runBlock*` « en
  // attendant ». Le test le refuse — c'est exactement le défaut d'origine,
  // rejoué sur un état de plus.
  const inconnu = shopPauseCopy(null);
  const aPied = shopPauseCopy('run');
  for (const locale of LOCALES) {
    assert(inconnu.title[locale] !== aPied.title[locale], `titre null == run (${locale})`);
    assert(inconnu.body[locale] !== aPied.body[locale], `corps null == run (${locale})`);
  }
});

Deno.test('B4 — les trois jeux de textes sont distincts et complets', () => {
  const jeux = [shopPauseCopy('run'), shopPauseCopy('bike'), shopPauseCopy(null)];
  for (const locale of LOCALES) {
    const titres = new Set(jeux.map((j) => j.title[locale]));
    const corps = new Set(jeux.map((j) => j.body[locale]));
    assertEquals(titres.size, 3, `deux titres se confondent en ${locale}`);
    assertEquals(corps.size, 3, `deux corps se confondent en ${locale}`);
    for (const jeu of jeux) {
      assert(jeu.title[locale].trim().length > 0, `titre vide en ${locale}`);
      assert(jeu.body[locale].trim().length > 0, `corps vide en ${locale}`);
    }
  }
});

/**
 * BALAYAGE EXHAUSTIF — copie d'écran E17 (SHOP_C). La liste revue est courte :
 * seuls les jumeaux de la pause ont une lentille à porter.
 */
const SHOP_NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  'bikeBlockBody',
  'bikeBlockTitle',
  'runBlockBody',
  'runBlockTitle',
];

Deno.test('balayage : aucune entrée de la copie E17 ne nomme un monde hors liste revue', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(SHOP_C),
    [...SHOP_NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée de SHOP_C nomme une discipline sans figurer dans la liste revue',
  );
});

/**
 * BALAYAGE EXHAUSTIF — catalogue d'OBJETS (ARSENAL_I18N).
 *
 * Ce qui reste inscrit ici n'est PAS un oubli : ce sont des NOMS PROPRES
 * d'objets déjà expédiés (« Founder Runner », « Midnight Runner », « Template
 * Night Run »), identiques dans les 5 langues comme le veut l'en-tête du
 * catalogue. Les renommer changerait l'identité d'items possédés — un dommage
 * réel pour corriger un mot qui n'affirme rien sur le joueur. Les
 * DESCRIPTIONS, elles, ont été neutralisées le 26/07 : elles décrivaient le
 * jeu, et le jeu a deux disciplines.
 */
const ITEMS_NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  'founder_pack.contents.5', // « Titre « Founder Runner » » — nom de l'item ci-dessous
  'skin_trace_midnight.name', // « Midnight Runner »
  'template_night_run.name', // « Template Night Run »
  'title_founder_runner.name', // « Founder Runner »
];

Deno.test('balayage : aucune DESCRIPTION d’objet ne nomme un monde', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(ARSENAL_I18N),
    [...ITEMS_NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée du catalogue d’objets nomme une discipline sans figurer dans la liste revue',
  );
});

Deno.test('les entrées inscrites sont bien des NOMS, jamais des descriptions', () => {
  // Garde-fou de la liste elle-même : on peut tolérer un nom propre, jamais une
  // phrase qui explique le jeu. Si quelqu'un inscrit une `.description` ici
  // pour faire taire le balayage, ce test le refuse.
  for (const cle of ITEMS_NOMMENT_UN_MONDE_LEGITIMEMENT) {
    assert(
      !cle.endsWith('.description'),
      `${cle} : une description ne s’inscrit pas, elle se neutralise`,
    );
  }
});
