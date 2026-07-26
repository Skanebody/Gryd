/**
 * GRYD — BALAYAGE DU CATALOGUE NAV : plus une seule discipline nommée par
 * accident sur l'écran principal.
 *
 * Ce catalogue porte le CTA le plus important de l'app (le bouton GO) et la
 * note d'envoi en attente. Deux défauts y vivaient encore le 26/07/2026 :
 *   · B1 — les trois a11y d'action disaient « course » sous lentille vélo,
 *     collées au mot « sortie vélo » : la contradiction était PRONONCÉE ;
 *   · `pendingRunNote` annonçait « 1 course à synchroniser » pour un envoi dont
 *     la discipline n'est même pas lisible (`hasPendingUpload()` rend un
 *     booléen) — un jumeau y aurait été un second mensonge, mieux habillé.
 *
 * Le balayage final est le vrai filet : toute entrée FUTURE qui nommera un
 * monde devra soit être neutralisée, soit être inscrite ci-dessous AVEC SA
 * RAISON. C'est ce que quatre tours de nettoyage n'avaient pas.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './nav.ts';
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

Deno.test('l’envoi en attente ne devine plus la discipline de ce qu’il envoie', () => {
  // La tentation était de jumeler `pendingRunNote` sur la lentille de la Carte,
  // comme GO juste au-dessus. Ç'aurait été FAUX : l'envoi en attente est une
  // sortie DÉJÀ terminée, dont la discipline est celle du jour où elle a eu
  // lieu — pas celle du commutateur d'aujourd'hui. Neutre est la seule
  // formulation qui reste vraie dans les quatre combinaisons possibles.
  assertNeutreDansLes5(C.pendingRunNote, 'pendingRunNote');
});

Deno.test('les actions NEUTRES le restent — aucun jumeau fabriqué pour la forme', () => {
  // Refermer une boucle de crew et rejoindre une mission se disent à
  // l'identique dans les deux mondes. Leur inventer une variante « à vélo »
  // n'ajouterait aucune information et suggérerait deux mécaniques distinctes.
  assertNeutreDansLes5(C.a11yTerminer, 'a11yTerminer');
  assertNeutreDansLes5(C.a11yRejoindre, 'a11yRejoindre');
  assertNeutreDansLes5(C.zoneThis, 'zoneThis');
  assertNeutreDansLes5(C.zoneYours, 'zoneYours');
  assertNeutreDansLes5(C.crewMissionFallback, 'crewMissionFallback');
});

Deno.test('les JUMEAUX du bouton GO disent chacun leur monde, dans les 5 langues', () => {
  for (const locale of LOCALES) {
    // Le mot de discipline (« ce qui va être enregistré »).
    assertEquals(porteeDuTexte(C.goActivityRunA11y[locale]), 'course');
    assertEquals(porteeDuTexte(C.goActivityBikeA11y[locale]), 'velo');
    // Les trois actions qui PORTENT la lentille.
    assertEquals(porteeDuTexte(C.a11yRun[locale]), 'course', `a11yRun.${locale}`);
    assertEquals(porteeDuTexte(C.a11yRunBike[locale]), 'velo', `a11yRunBike.${locale}`);
    assertEquals(porteeDuTexte(C.a11yDefendre[locale]), 'course', `a11yDefendre.${locale}`);
    assertEquals(porteeDuTexte(C.a11yDefendreBike[locale]), 'velo', `a11yDefendreBike.${locale}`);
    assertEquals(porteeDuTexte(C.a11yConquerir[locale]), 'course', `a11yConquerir.${locale}`);
    assertEquals(
      porteeDuTexte(C.a11yConquerirBike[locale]),
      'velo',
      `a11yConquerirBike.${locale}`,
    );
  }
});

Deno.test('un jumeau ne recopie jamais son frère — sinon ce n’est pas un jumeau', () => {
  // Le mode d'échec le plus discret : coller le texte « à pied » dans l'entrée
  // Bike (copier-coller, traduction automatique, fusion mal résolue). Les
  // portées ci-dessus l'attraperaient en français ; ce test l'attrape partout.
  for (const locale of LOCALES) {
    assert(C.a11yRun[locale] !== C.a11yRunBike[locale], `a11yRun*.${locale} identiques`);
    assert(
      C.a11yDefendre[locale] !== C.a11yDefendreBike[locale],
      `a11yDefendre*.${locale} identiques`,
    );
    assert(
      C.a11yConquerir[locale] !== C.a11yConquerirBike[locale],
      `a11yConquerir*.${locale} identiques`,
    );
  }
});

Deno.test('les jumeaux gardent le placeholder {zone} dans les 5 langues', () => {
  // Un jumeau qui perd son `{zone}` ne plante pas : il annonce simplement une
  // zone sans nom, à voix haute, pour toujours.
  for (const locale of LOCALES) {
    for (const [cle, entry] of [
      ['a11yDefendreBike', C.a11yDefendreBike],
      ['a11yConquerirBike', C.a11yConquerirBike],
    ] as const) {
      assert(entry[locale].includes('{zone}'), `${cle}.${locale} a perdu {zone}`);
    }
  }
});

/**
 * BALAYAGE EXHAUSTIF — la liste REVUE des entrées qui ont le droit de nommer un
 * monde dans ce catalogue. Toute autre entrée qui en nommerait un échoue ici.
 */
const NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  // ── Les JUMEAUX du bouton GO (l'écran lit la lentille et la DÉCLARE) ───────
  'a11yConquerir',
  'a11yConquerirBike',
  'a11yDefendre',
  'a11yDefendreBike',
  'a11yRun',
  'a11yRunBike',
  'goActivityBikeA11y',
  'goActivityRunA11y',
  // ── « RUN », VERBE PRODUIT — et aujourd'hui NON RENDU ─────────────────────
  // `actionRun` est le libellé de l'action `run` de `ContextualAction.label`.
  // Aucune surface ne rend ce champ : le bouton affiche le mot « GO »
  // (AMENDEMENT-38, override fondateur) et l'icône vient de la discipline. Le
  // mot reste un invariant produit, identique dans les 5 langues.
  'actionRun',
  // ── Clé SANS AUCUN CONSOMMATEUR (vérifié par grep) ────────────────────────
  // `slideToStartA11y` décrivait le composant « glisser pour courir »,
  // SUPPRIMÉ le 25/07/2026. Neutraliser un texte que personne ne lit serait du
  // bruit ; le supprimer déborde de ce chantier. Inscrite.
  'slideToStartA11y',
];

Deno.test('balayage : aucune entrée du catalogue nav ne nomme un monde hors liste revue', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(C),
    [...NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée nomme une discipline sans figurer dans la liste revue (ou une entrée de la liste a été neutralisée sans être retirée)',
  );
});
