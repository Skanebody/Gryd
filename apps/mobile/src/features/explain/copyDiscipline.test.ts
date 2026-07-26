/**
 * GRYD — LE RÈGLEMENT DU JEU VAUT POUR LES DEUX DISCIPLINES, ET IL LE DIT.
 *
 * POURQUOI CES TESTS EXISTENT (26/07/2026). Le corpus de règles de
 * `/calcul-zones` et `/faq` était écrit ENTIÈREMENT au coureur — « une zone que
 * tu ne recours pas s'affaiblit », « cours ailleurs », « ta course compte en
 * stats » — alors que les règles énoncées (decay, cooldown, points,
 * protections, défense graduée, Verify) valent à l'IDENTIQUE pour le cycliste.
 * Quatre tours de nettoyage successifs ne l'ont pas vu : ces deux pages ne
 * portent AUCUNE lentille de discipline, donc rien à l'écran ne CONTREDISAIT le
 * texte — il fallait lire 37 clés dans 5 langues pour s'en apercevoir. C'est
 * exactement ce qu'un œil ne refait pas deux fois, et ce qu'un test refait à
 * chaque commit.
 *
 * TROIS VERROUS, ET ILS NE DISENT PAS LA MÊME CHOSE :
 *  1. LE VOCABULAIRE — aucune discipline nommée, dans aucune des 5 langues.
 *     C'est la règle « écran SANS lentille ⇒ neutralisation, pas de jumeau » :
 *     une clé `…Bike` ici serait un texte que personne ne saurait choisir.
 *     Le vocabulaire n'est PAS redéfini ici : il vient de la fonction pure
 *     partagée `i18n/catalog/disciplineVocabulary.ts` (faux amis « parcours »,
 *     « en cours », « läuft » compris). Deux listes de mots seraient deux
 *     vérités à maintenir, et l'une des deux finirait périmée.
 *  2. LA JUSTESSE — une règle neutralisée doit être VRAIE dans les deux mondes.
 *     Neutraliser une règle qui ne l'est pas fabriquerait un mensonge
 *     symétrique du premier : le cycliste lirait une borne qui n'est pas la
 *     sienne. Ce verrou lit `ACTIVITY_RULES` (game-rules.ts) et refuse que la
 *     copie CHIFFRE une borne qui diffère par discipline. Il n'a aucune liste à
 *     tenir à jour : il DÉRIVE les bornes divergentes de la table elle-même, et
 *     suivra donc l'arrivée d'une 3ᵉ discipline.
 *  3. LA COMPLÉTUDE — neutraliser ne doit pas VIDER. La réponse la plus
 *     consultée (« pourquoi ma boucle n'a pas créé de zone ? ») doit encore
 *     donner les seuils qu'elle a le droit de donner.
 *
 * PÉRIMÈTRE DU FICHIER. Il verrouille aussi le REGISTRE du catalogue
 * d'onboarding (§4) : ce n'est pas son voisinage naturel, mais `features/
 * explain/**` était le seul répertoire où ce chantier avait le droit de CRÉER
 * un fichier. Le test y est mieux qu'inexistant.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, ACTIVITY_RULES, activityRules, type Activity } from '@klaim/shared';
import { C as EXPLAIN } from '../../i18n/catalog/explain.ts';
import { C as SEASON } from '../../i18n/catalog/faq.ts';
import {
  clesQuiNommentUneDiscipline,
  porteeDuTexte,
} from '../../i18n/catalog/disciplineVocabulary.ts';
import { LOCALES, type Entry } from '../../i18n/types.ts';
import { EXPLAIN_SECTIONS, FAQ_ITEMS, POST_RUN_FAQ } from './content.ts';

/**
 * Les textes RENDUS (placeholders de règles déjà remplis par content.ts).
 * C'est cette forme-là que le joueur lit : c'est donc elle qu'on inspecte, le
 * catalogue seul ne montrant que des `{trous}`. Un placeholder peut réintroduire
 * un mot interdit par la porte de service — `fillEntry` colle des Entries
 * entières (« 14 jours », la phrase Verify…).
 */
const RENDERED: Record<string, Entry> = Object.fromEntries([
  ...EXPLAIN_SECTIONS.flatMap((s) => [
    [`${s.id}.title`, s.title],
    [`${s.id}.line`, s.line],
    [`${s.id}.example`, s.example],
  ]),
  ...FAQ_ITEMS.flatMap((i) => [
    [`${i.id}.q`, i.q],
    [`${i.id}.a`, i.a],
  ]),
  ...POST_RUN_FAQ.flatMap((i) => [
    [`post_${i.id}.q`, i.q],
    [`post_${i.id}.a`, i.a],
  ]),
] as [string, Entry][]);

// ─── §1 · Aucune discipline nommée, dans aucune langue ───────────────────────

Deno.test('balayage : AUCUNE clé du règlement ne nomme une discipline', () => {
  // Zéro exception, contrairement à `reglages.ts` (qui garde sa baseline de
  // marque) : ce corpus ne contient que des RÈGLES, et aucune règle du moteur
  // ne s'applique à une seule discipline.
  assertEquals(
    clesQuiNommentUneDiscipline(EXPLAIN as never),
    [],
    'une règle de catalog/explain.ts nomme une discipline alors que ses deux écrans n’en lisent aucune',
  );
  assertEquals(
    clesQuiNommentUneDiscipline(SEASON as never),
    [],
    'une règle de saison nomme une discipline alors que la FAQ n’en lit aucune',
  );
});

Deno.test('les textes RENDUS (valeurs injectées) ne nomment aucune discipline non plus', () => {
  for (const [key, entry] of Object.entries(RENDERED)) {
    for (const locale of LOCALES) {
      assertEquals(
        porteeDuTexte(entry[locale]),
        'neutre',
        `${key}.${locale} nomme une discipline : « ${entry[locale]} »`,
      );
    }
  }
});

// ─── §2 · Ce que la copie CHIFFRE doit valoir dans les deux mondes ───────────

/** Champs numériques en mètres d'`ActivityRuleSet` (les seuls que la copie sait
 *  formater : « 80 m », « 1 km »). Dérivé de la table, pas recopié. */
function metersFields(): readonly string[] {
  return Object.keys(ACTIVITY_RULES.run).filter((k) => k.endsWith('M'));
}

/** Même formatage que `labels.ts` — sinon le test chercherait une autre chaîne
 *  que celle qui s'affiche. */
function metersLabel(m: number): string {
  if (m >= 1000 && m % 1000 === 0) return `${m / 1000} km`;
  if (m >= 1000) return `${String(m / 1000).replace('.', ',')} km`;
  return `${m} m`;
}

/**
 * Le libellé « 2 km » apparaît-il comme une VALEUR, et pas au milieu d'une
 * autre ? Sans cette précaution, « 4,2 km » (un scénario d'exemple) déclencherait
 * l'alarme pour « 2 km » : le test crierait au mensonge sur une phrase juste, et
 * le prochain agent désactiverait le test plutôt que la phrase.
 */
function numberOccurs(text: string, label: string): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,  ])${escaped}\\b`).test(text);
}

/** Bornes en mètres qui DIFFÈRENT d'une discipline à l'autre, avec toutes leurs
 *  valeurs formatées telles qu'elles s'écriraient dans une phrase. */
function divergentMeterLabels(): { field: string; labels: string[] }[] {
  const out: { field: string; labels: string[] }[] = [];
  for (const field of metersFields()) {
    const values = ACTIVITIES.map(
      (a: Activity) => (activityRules(a) as unknown as Record<string, number>)[field]!,
    );
    if (!values.every((v) => v === values[0])) {
      out.push({ field, labels: values.map(metersLabel) });
    }
  }
  return out;
}

Deno.test('la table des disciplines EXISTE et sépare bien deux jeux de bornes', () => {
  // Garde-fou du garde-fou : si `ACTIVITY_RULES` perdait sa dimension, le test
  // suivant passerait en ne vérifiant plus rien.
  assert(ACTIVITIES.length >= 2, 'moins de deux disciplines : le reste ne prouve rien');
  assert(
    divergentMeterLabels().length > 0,
    'aucune borne en mètres ne diffère par discipline — vérifier ACTIVITY_RULES',
  );
});

Deno.test('la copie ne CHIFFRE jamais une borne qui diffère par discipline', () => {
  // Le cas réel qui a motivé ce test : `q3A` affichait RUN_MIN_DISTANCE_M
  // (« 1 km ») à un lecteur qui pouvait être cycliste — son plancher à lui vaut
  // le double. La page dit désormais que la borne dépend de la discipline.
  const divergent = divergentMeterLabels();
  for (const [key, entry] of Object.entries(RENDERED)) {
    for (const locale of LOCALES) {
      const text = entry[locale];
      for (const { field, labels } of divergent) {
        for (const label of labels) {
          assert(
            !numberOccurs(text, label),
            `${key}.${locale} chiffre « ${label} », une borne PAR DISCIPLINE (${field}) — « ${text} »`,
          );
        }
      }
    }
  }
});

Deno.test('les bornes que la copie chiffre ENCORE sont identiques dans les deux mondes', () => {
  // L'autre moitié de la vérité : ces quatre valeurs sont affichées en clair
  // (`q3A`, `q4A`, schémas). Le jour où l'une d'elles gagne une variante vélo,
  // ce test tombe — et la copie devra cesser de la chiffrer, exactement comme
  // l'a fait la distance minimale.
  // `minDurationS` a QUITTÉ cette liste le 27/07/2026 : la spec §8.2 sépare les
  // deux mondes (5 min à pied, 6 min à vélo). Ce test est tombé exactement comme
  // son commentaire l'annonçait, et la copie a cessé de chiffrer la durée.
  const shared = [
    'loopCloseToleranceM',
    'loopMinWidthM',
    'loopMinGpsTrust',
  ] as const;
  for (const field of shared) {
    const values = ACTIVITIES.map(
      (a: Activity) => (activityRules(a) as unknown as Record<string, number>)[field],
    );
    for (const v of values) {
      assertEquals(
        v,
        values[0],
        `${field} n'est plus identique dans les deux disciplines : la copie qui l'affiche ment`,
      );
    }
  }
});

// ─── §3 · La réponse « pourquoi ma boucle n'a pas créé de zone » reste utile ──

Deno.test('q3A garde ses seuils chiffrables ET renvoie à la discipline pour la distance', () => {
  const q3 = FAQ_ITEMS.find((i) => i.id === 'q3');
  assert(q3, 'q3 a disparu de la FAQ');
  for (const locale of LOCALES) {
    const text = q3.a[locale];
    assert(!text.includes('{'), `q3A.${locale} garde un placeholder non résolu — « ${text} »`);
    assert(text.includes('80 m'), `q3A.${locale} n'annonce plus la tolérance de fermeture`);
    // La durée n'est PLUS chiffrée (elle diffère par discipline) : la ligne doit
    // renvoyer à la discipline, comme le fait déjà la distance.
    assert(
      !/\b\d+\s*min\b/.test(text),
      `q3A.${locale} CHIFFRE une durée alors qu'elle diffère par discipline — « ${text} »`,
    );
    assertEquals(
      text.split('\n').length,
      5,
      `q3A.${locale} ne liste plus 5 raisons de refus (une par ligne, §A)`,
    );
  }
});

// ─── §4 · Un catalogue, UN registre (portugais « você », français tutoiement) ─

Deno.test('le catalogue d’onboarding tient le registre qu’il déclare', () => {
  // L'en-tête de `i18n/catalog/onboarding.ts` déclare « você » en pt et le
  // tutoiement en fr. La carte 1 employait le tutoiement EUROPÉEN en portugais
  // (« A TUA CIDADE. », « o teu território ») et le VOUVOIEMENT en français
  // (« votre territoire »), à deux lignes d'écrans qui disaient l'inverse
  // (« Você sai », « Suas zonas », « CONQUIERS TA VILLE. »). Deux registres
  // dans un catalogue, c'est le suivant qui tranche au hasard.
  const onboarding = Deno.readTextFileSync(
    new URL('../../i18n/catalog/onboarding.ts', import.meta.url),
  );
  const textsOf = (locale: string) =>
    [...onboarding.matchAll(new RegExp(`^\\s{4}${locale}: '(.*)',?$`, 'gm'))].map((m) => m[1]!);
  const ptLines = textsOf('pt');
  const frLines = textsOf('fr');
  assert(ptLines.length > 20, 'le balayage pt n’a rien trouvé — le format du catalogue a changé');
  assert(frLines.length > 20, 'le balayage fr n’a rien trouvé — le format du catalogue a changé');

  const PT_EUROPEAN = ['teu', 'tua', 'teus', 'tuas', 'contigo', 'tens', 'podes', 'queres'];
  for (const text of ptLines) {
    for (const word of PT_EUROPEAN) {
      assert(
        !new RegExp(`\\b${word}\\b`, 'i').test(text),
        `pt mélange les registres (« ${word} ») alors que le catalogue déclare « você » — « ${text} »`,
      );
    }
  }
  const FR_VOUVOIEMENT = ['votre', 'vos', 'vous'];
  for (const text of frLines) {
    for (const word of FR_VOUVOIEMENT) {
      assert(
        !new RegExp(`\\b${word}\\b`, 'i').test(text),
        `fr vouvoie alors que le catalogue déclare le tutoiement (« ${word} ») — « ${text} »`,
      );
    }
  }
});
