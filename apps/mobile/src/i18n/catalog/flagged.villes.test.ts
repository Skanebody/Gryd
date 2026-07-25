/**
 * GRYD — l'onglet « Villes » du classement est REMIS (décision fondateur,
 * 25/07/2026) alors qu'AUCUNE source inter-villes n'existe. Il ne survit donc
 * qu'à une condition : dire « pas encore ouvert » sans jamais peupler la
 * dimension. CLAUDE.md est catégorique là-dessus — « ne jamais fabriquer de
 * données européennes factices (villes/classements/rivaux) », et l'étiquette
 * « démonstration » ne couvre PAS l'interdit.
 *
 * Ce test verrouille la COPIE, pas le rendu : le jour où quelqu'un voudra
 * « illustrer » l'onglet avec Berlin ou un « Top 3 », le gate passe au rouge
 * avant la revue. Il garde aussi la chip courte — un libellé d'action tronqué
 * par « … » est un bug §A.9, et l'allemand est le cas limite.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import { C } from './flagged.ts';

/** Textes qui annoncent l'état « pas encore ouvert » (Villes ET Crew). */
const ANNONCES = [C.boardNoSourceTitle, C.boardNoSourceVille, C.boardNoSourceCrews];

/**
 * Un échantillon de villes qu'un futur « exemple » choisirait spontanément —
 * les deux villes de la Saison 0 comprises : même Paris n'a pas sa place dans
 * un classement qui n'existe pas.
 */
const VILLES_INTERDITES = [
  'Paris',
  'Lille',
  'Lyon',
  'Marseille',
  'Bordeaux',
  'Berlin',
  'Munich',
  'Madrid',
  'Barcelon',
  'Milan',
  'Rome',
  'Lisbon',
  'Lisboa',
  'London',
  'Londres',
  'Amsterdam',
];

Deno.test('« pas encore ouvert » : les 5 langues, jamais un texte vide', () => {
  for (const entry of ANNONCES) {
    for (const locale of LOCALES) {
      assertEquals(typeof entry[locale], 'string');
      assertEquals(entry[locale].trim().length > 0, true);
    }
  }
});

Deno.test('aucune ville nommée dans l’annonce — pas même « pour illustrer »', () => {
  for (const entry of ANNONCES) {
    for (const locale of LOCALES) {
      for (const ville of VILLES_INTERDITES) {
        assertEquals(
          entry[locale].toLowerCase().includes(ville.toLowerCase()),
          false,
          `${ville} apparaît dans l'annonce « pas encore ouvert » (${locale})`,
        );
      }
    }
  }
});

Deno.test('aucun chiffre dans l’annonce : ni rang, ni compte, ni échéance', () => {
  for (const entry of ANNONCES) {
    for (const locale of LOCALES) {
      assertEquals(
        /\d/.test(entry[locale]),
        false,
        `un nombre apparaît dans l'annonce « pas encore ouvert » (${locale})`,
      );
    }
  }
});

Deno.test('chip « Villes » : jamais plus longue que les chips déjà en place', () => {
  // Référence RELATIVE : le strip défile déjà avec ces libellés-là sans troncature.
  // Une chip qui n'allonge pas le pire cas n'aggrave donc rien (§A.9).
  const dejaEnPlace = [C.tabCrews, C.tabSpecialites];
  for (const locale of LOCALES) {
    const pire = Math.max(...dejaEnPlace.map((e) => e[locale].length));
    assertEquals(
      C.tabVille[locale].length <= pire,
      true,
      `« ${C.tabVille[locale]} » (${locale}) dépasse le plus long libellé déjà expédié`,
    );
  }
});
