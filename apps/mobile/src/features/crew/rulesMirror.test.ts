/**
 * GRYD — le MIROIR mobile du barème de crew ne doit pas dériver du moteur.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `features/crew/rules.ts` réimplémente volontairement les lookups de
 * `packages/engine/src/crew.ts` (le tsconfig Expo ne résout pas les subpath
 * exports, et importer `@klaim/engine` tirerait `h3-js` dans le bundle). Deux
 * implémentations d'une même règle, c'est deux occasions de diverger.
 *
 * Le risque est devenu CONCRET le 01/08/2026 : le barème de niveau est passé
 * NORMALISÉ par la taille du crew (migration 0107), des deux côtés à la fois. Un
 * miroir resté sur le barème brut afficherait un niveau que le serveur n'a
 * jamais écrit — et l'écart GRANDIRAIT avec la taille du crew, donc précisément
 * là où on le remarquerait le plus tard.
 *
 * On ne peut pas importer le moteur ici. On vérifie donc les PROPRIÉTÉS que les
 * deux doivent partager, recalculées depuis `game-rules` — la seule source
 * commune aux deux côtés.
 */
import {
  CREW_LEVEL_MAX,
  CREW_REFERENCE_MEMBERS,
  CREW_XP_TABLE,
} from '@klaim/shared';
import { crewLevelForXp, crewLevelProgress, crewXpForLevel } from './rules';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

Deno.test('miroir : à la taille de référence, le barème brut fait foi', () => {
  for (let level = 1; level <= CREW_LEVEL_MAX; level++) {
    assertEquals(
      crewXpForLevel(level, CREW_REFERENCE_MEMBERS),
      CREW_XP_TABLE[level - 1],
      `L${level} au barème de référence`,
    );
  }
});

Deno.test('miroir : LA PROPRIÉTÉ — le niveau ne dépend pas de la taille du crew', () => {
  for (const xpParTete of [100, 3_000, 30_000]) {
    const attendu = crewLevelForXp(xpParTete * CREW_REFERENCE_MEMBERS, CREW_REFERENCE_MEMBERS);
    for (const membres of [10, 25, 50, 300]) {
      assertEquals(
        crewLevelForXp(xpParTete * membres, membres),
        attendu,
        `${xpParTete} XP par tête, crew de ${membres}`,
      );
    }
  }
});

Deno.test('miroir : aucune remise sous la taille de référence', () => {
  for (const membres of [1, 2, 5, CREW_REFERENCE_MEMBERS]) {
    assertEquals(
      crewXpForLevel(2, membres),
      CREW_XP_TABLE[1],
      `crew de ${membres} : barème PLEIN, jamais de remise`,
    );
  }
});

Deno.test('miroir : le barème normalisé reste entier et l arrondi ne brade rien', () => {
  for (const membres of [3, 13, 41, 250]) {
    const facteur = Math.max(1, membres / CREW_REFERENCE_MEMBERS);
    for (let level = 1; level <= CREW_LEVEL_MAX; level++) {
      const requis = crewXpForLevel(level, membres);
      assert(Number.isInteger(requis), `L${level} non entier (crew de ${membres})`);
      assert(
        requis >= CREW_XP_TABLE[level - 1]! * facteur,
        `L${level} arrondi vers le bas (crew de ${membres})`,
      );
    }
  }
});

Deno.test('miroir : la jauge se remplit sur le barème NORMALISÉ, pas le brut', () => {
  // Une jauge calculée sur la table brute se remplirait plus vite que le niveau
  // n'arrive : elle promettrait une marche qui ne tombe pas.
  const membres = CREW_REFERENCE_MEMBERS * 4;
  const plancher = crewXpForLevel(2, membres);
  const plafond = crewXpForLevel(3, membres);
  assertEquals(crewLevelProgress(plancher, 2, membres), 0, 'au plancher du palier');
  assertEquals(crewLevelProgress(plafond, 2, membres), 1, 'au plafond du palier');
  assert(
    crewLevelProgress(CREW_XP_TABLE[2]!, 2, membres) < 1,
    'la borne BRUTE de L3 ne doit pas remplir la jauge d un grand crew',
  );
});

Deno.test('miroir : plancher et plafond du niveau tiennent quelle que soit la taille', () => {
  for (const membres of [1, 10, 400]) {
    assertEquals(crewLevelForXp(0, membres), 1, `0 XP, crew de ${membres}`);
    assertEquals(crewLevelForXp(-1, membres), 1, `XP négative, crew de ${membres}`);
    assertEquals(
      crewLevelForXp(Number.MAX_SAFE_INTEGER, membres),
      CREW_LEVEL_MAX,
      `XP énorme, crew de ${membres}`,
    );
  }
});
