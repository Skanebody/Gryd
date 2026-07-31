/**
 * GRYD — le niveau de crew mesure l'ENGAGEMENT, pas la TAILLE (migration 0107).
 *
 * ─── LE DÉFAUT QUE CES TESTS EMPÊCHENT DE REVENIR ───────────────────────────
 * `CREW_XP_DAILY_CAP_PER_MEMBER` plafonne l'XP PAR MEMBRE. Un crew de 50 peut
 * donc produire dix fois l'XP d'un crew de 5 à engagement par tête IDENTIQUE, et
 * franchissait `CREW_XP_TABLE` dix fois plus vite : le niveau mesurait la taille.
 * Latent tant que le niveau n'ouvrait que des perks ; grave dès qu'un palier
 * cosmétique s'y accroche (A-48), parce que taille et argent se composent.
 *
 * Le test qui compte est `LA PROPRIÉTÉ` : à engagement par tête égal, le niveau
 * atteint est le MÊME à 10 comme à 500 membres. C'est la définition de « mesurer
 * l'engagement », et elle se vérifie sans connaître aucun nombre du barème.
 *
 * Ces tests dérivent tout de `game-rules` : régler un curseur ne les fait pas
 * rougir, casser la propriété si.
 */
import { CREW_LEVEL_MAX, CREW_REFERENCE_MEMBERS, CREW_XP_TABLE } from '@klaim/shared/game-rules';
import { crewLevelForXp, crewLevelRequirement, crewSizeFactor, crewXpTableFor } from './crew.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

// ─── LA PROPRIÉTÉ ────────────────────────────────────────────────────────────

Deno.test('LA PROPRIÉTÉ : à engagement par tête égal, le niveau ne dépend pas de la taille', () => {
  // Chaque membre apporte la même XP. Le niveau atteint doit être IDENTIQUE
  // quelle que soit la taille du crew — sinon recruter vaudrait mieux que courir.
  for (const xpParTete of [50, 100, 999, 3_000, 30_000, 500_000]) {
    const attendu = crewLevelForXp(
      xpParTete * CREW_REFERENCE_MEMBERS,
      CREW_REFERENCE_MEMBERS,
    );
    for (const membres of [10, 12, 25, 50, 137, 500]) {
      assertEquals(
        crewLevelForXp(xpParTete * membres, membres),
        attendu,
        `${xpParTete} XP par tête, crew de ${membres}`,
      );
    }
  }
});

Deno.test('LE DÉFAUT D AVANT : un gros crew ne franchit plus la table dix fois plus vite', () => {
  // Le scénario exact d'avant 0107 : à engagement par tête identique, le gros
  // crew produit dix fois l'XP (le plafond est PAR MEMBRE) et montait donc dix
  // fois plus vite. Les deux tailles sont prises AU-DESSUS de la référence :
  // en dessous, le plancher s'applique et c'est une autre règle (test suivant).
  const parTete = CREW_XP_TABLE[1]!;
  const n = CREW_REFERENCE_MEMBERS;
  assertEquals(
    crewLevelForXp(parTete * n * 10, n * 10),
    crewLevelForXp(parTete * n, n),
    'le gros crew ne doit pas être plus haut pour le même effort par tête',
  );
});

Deno.test('sous la référence, le petit crew n est pas AVANTAGÉ non plus', () => {
  // Le plancher ne donne aucune remise : un crew de 2 doit fournir le barème
  // PLEIN. À engagement par tête égal il monte donc plus LENTEMENT qu'un crew de
  // référence — et c'est voulu, sinon deux personnes atteindraient le sommet
  // pour presque rien et le niveau ne dirait plus rien.
  const parTete = CREW_XP_TABLE[1]!;
  const petit = crewLevelForXp(parTete * 2, 2);
  const reference = crewLevelForXp(parTete * CREW_REFERENCE_MEMBERS, CREW_REFERENCE_MEMBERS);
  assert(petit <= reference, 'un petit crew ne doit jamais monter plus vite par tête');
});

// ─── Le plancher : aucune remise aux petits crews ────────────────────────────

Deno.test('aucune remise sous la taille de référence', () => {
  for (const membres of [1, 2, 5, CREW_REFERENCE_MEMBERS]) {
    assertEquals(crewSizeFactor(membres), 1, `crew de ${membres}`);
  }
  assert(crewSizeFactor(CREW_REFERENCE_MEMBERS * 3) > 1);
});

Deno.test('une taille illisible exige le barème PLEIN, jamais un niveau offert', () => {
  for (const membres of [0, -5, NaN, Number.POSITIVE_INFINITY]) {
    assertEquals(crewSizeFactor(membres), 1, `taille ${membres}`);
  }
});

// ─── Cohérence moteur ↔ SQL ─────────────────────────────────────────────────

Deno.test('crewXpTableFor est EXACTEMENT le barème que crewLevelRequirement applique', () => {
  // La RPC `add_crew_xp` compare l'XP à `crewXpTableFor(...)`. Si les deux
  // divergeaient d'une unité, le niveau AFFICHÉ (moteur) et le niveau ÉCRIT
  // (serveur) ne seraient pas le même, et l'app mentirait sur l'état du crew.
  for (const membres of [1, 10, 33, 200]) {
    const table = crewXpTableFor(membres);
    assertEquals(table.length, CREW_XP_TABLE.length, `longueur, crew de ${membres}`);
    for (let level = 1; level <= CREW_LEVEL_MAX; level++) {
      assertEquals(
        table[level - 1],
        crewLevelRequirement(level, membres),
        `L${level}, crew de ${membres}`,
      );
    }
  }
});

Deno.test('le barème normalisé reste ENTIER et croissant', () => {
  for (const membres of [1, 7, 10, 41, 300]) {
    const table = crewXpTableFor(membres);
    for (let i = 0; i < table.length; i++) {
      assert(Number.isInteger(table[i]!), `L${i + 1} non entier (crew de ${membres})`);
      if (i > 0) {
        assert(table[i]! >= table[i - 1]!, `L${i + 1} sous L${i} (crew de ${membres})`);
      }
    }
  }
});

Deno.test('l arrondi ne rend JAMAIS un niveau moins cher', () => {
  // `ceil`, jamais `round` ni `floor` : arrondir vers le bas offrirait un
  // niveau à un crew qui ne l'a pas mérité.
  for (const membres of [3, 13, 27, 99]) {
    const facteur = crewSizeFactor(membres);
    for (let level = 1; level <= CREW_LEVEL_MAX; level++) {
      assert(
        crewLevelRequirement(level, membres) >= CREW_XP_TABLE[level - 1]! * facteur,
        `L${level} arrondi vers le bas (crew de ${membres})`,
      );
    }
  }
});

// ─── Bornes ──────────────────────────────────────────────────────────────────

Deno.test('un niveau hors table est inatteignable, jamais « déjà atteint »', () => {
  for (const level of [0, -1, CREW_LEVEL_MAX + 1, 2.5, NaN]) {
    assertEquals(
      crewLevelRequirement(level, CREW_REFERENCE_MEMBERS),
      Number.POSITIVE_INFINITY,
      `niveau ${level}`,
    );
  }
});

Deno.test('plancher et plafond du niveau tiennent quelle que soit la taille', () => {
  for (const membres of [1, 10, 400]) {
    assertEquals(crewLevelForXp(0, membres), 1, `0 XP, crew de ${membres}`);
    assertEquals(crewLevelForXp(-100, membres), 1, `XP négative, crew de ${membres}`);
    assertEquals(
      crewLevelForXp(Number.MAX_SAFE_INTEGER, membres),
      CREW_LEVEL_MAX,
      `XP énorme, crew de ${membres}`,
    );
  }
});

// ─── Ce que le moteur NE garantit PAS, et qui doit rester vrai ───────────────

Deno.test('grandir peut faire BAISSER le niveau MÉRITÉ — c est la RPC qui plancherise', () => {
  // Cette fonction rend le niveau mérité par l'état COURANT : elle n'a aucune
  // mémoire. Un crew qui recrute voit son multiplicateur monter, donc sa valeur
  // peut descendre. C'est `add_crew_xp` (0107) qui garantit qu'un niveau acquis
  // n'est jamais repris (`greatest(ancien, nouveau)`).
  //
  // Ce test EXISTE pour que la propriété reste consciente : si un jour quelqu'un
  // « corrige » ce comportement dans le moteur en y ajoutant une mémoire, il
  // devra passer ici et lire pourquoi le plancher vit côté écriture.
  const xp = CREW_XP_TABLE[3]!; // de quoi tenir L4 dans un crew de référence
  const avant = crewLevelForXp(xp, CREW_REFERENCE_MEMBERS);
  const apres = crewLevelForXp(xp, CREW_REFERENCE_MEMBERS * 10);
  assert(apres <= avant, 'le niveau mérité ne remonte pas quand le crew grandit');
  assert(avant > 1, 'le scénario doit partir d un niveau réellement acquis');
});
