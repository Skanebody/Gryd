/**
 * GRYD — ce que les trois offres doivent tenir, prouvé.
 *
 * Quatre lignes gardées, dans l'ordre de gravité :
 *   1. RIEN DE DÉJÀ DONNÉ NE MONTE D'UN PALIER — la garantie anti-reprise ;
 *   2. on ne vend jamais ce qui n'existe pas — `built` gouverne l'affichage ;
 *   3. la défense et les faits du joueur restent gratuits, par constitution ;
 *   4. aucune règle de jeu ne lit un palier.
 *
 * La 1ʳᵉ est la plus importante et la moins évidente. Faire payer pour
 * RÉCUPÉRER ce qui était gratuit est la faute qui a le plus abîmé un
 * concurrent : ce n'est pas un gain pour le joueur, c'est une perte réparée. La
 * liste `TOUJOURS_GRATUIT` ci-dessous est un CLIQUET — on peut y ajouter, jamais
 * en retirer.
 */
import {
  GRYD_CAPABILITIES,
  GRYD_TIERS,
  type GrydTier,
} from '@klaim/shared/game-rules';
import {
  builtCapabilitiesAddedBy,
  hasCapability,
  isSellable,
  offerBoard,
  tierGrants,
  tierIsOfferable,
  tierRank,
} from './offer.ts';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFile(chemin: string): Promise<string>;
};

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const ICI = (import.meta as unknown as { readonly dirname: string }).dirname;
const cap = (key: string) => GRYD_CAPABILITIES.find((c) => c.key === key);

// ─── 1. LE CLIQUET : rien de déjà donné ne monte d'un palier ────────────────

/**
 * Ce qui est gratuit aujourd'hui et doit le rester. ON PEUT AJOUTER À CETTE
 * LISTE, JAMAIS EN RETIRER. Chaque entrée est soit un FAIT que le joueur a
 * produit lui-même, soit un élément de DÉFENSE — être prévenu plus tôt d'une
 * attaque serait un avantage compétitif acheté.
 */
const TOUJOURS_GRATUIT = [
  'own_activities',
  'own_territory',
  'defense_alerts',
  'local_leaderboard',
  'crew',
  'crew_trajectory',
  // Gratuit et ATTEIGNABLE aujourd'hui (`/route-planner`, aucune garde) :
  // le déplacer dans un palier payant serait une REPRISE, pas une offre.
  'route_planner',
  'share_basic',
] as const;

Deno.test('CLIQUET : tout ce qui est gratuit aujourd’hui l’est resté', () => {
  for (const key of TOUJOURS_GRATUIT) {
    const c = cap(key);
    assert(c !== undefined, `la capacité « ${key} » a DISPARU du catalogue`);
    assertEquals(
      c!.tier,
      'free',
      `« ${key} » a été déplacée en palier payant — c'est une REPRISE de ce qui est déjà donné`,
    );
    assertEquals(c!.freeForever, true, `« ${key} » doit être marquée gratuite POUR TOUJOURS`);
  }
});

Deno.test('une capacité gratuite POUR TOUJOURS n’est jamais vendable', () => {
  for (const c of GRYD_CAPABILITIES) {
    if (c.freeForever === true) {
      assertEquals(c.tier, 'free', `« ${c.key} » est freeForever mais rangée en ${c.tier}`);
      assertEquals(isSellable(c), false, `« ${c.key} » est vendable alors qu'elle est acquise`);
    }
  }
});

// ─── 2. On ne vend jamais ce qui n'existe pas ───────────────────────────────

Deno.test('une capacité non construite n’est ni vendable ni accessible', () => {
  for (const c of GRYD_CAPABILITIES) {
    if (!c.built) {
      assertEquals(isSellable(c), false, `« ${c.key} » vendable sans être construite`);
      // Même au palier le plus élevé : payer n'a jamais fait exister une
      // fonctionnalité.
      for (const tier of GRYD_TIERS) {
        assertEquals(
          hasCapability(tier, c.key),
          false,
          `« ${c.key} » accessible en ${tier} alors qu'elle n'existe pas`,
        );
      }
    }
  }
});

Deno.test('l’écran de vente ne montre QUE du construit', () => {
  const montrees = offerBoard().flatMap((col) => col.includes);
  for (const key of montrees) {
    assertEquals(cap(key)?.built, true, `« ${key} » est montrée sans être construite`);
  }
});

Deno.test('GRYD Pro n’est PAS offrable tant que rien n’y est construit', () => {
  // État déclaré au 01/08/2026. Ce test suit le FAIT : le jour où une capacité
  // Pro passe à `built: true`, il s'inverse de lui-même au lieu de bloquer.
  const proConstruit = builtCapabilitiesAddedBy('pro').some(isSellable);
  assertEquals(
    tierIsOfferable('pro'),
    proConstruit,
    'l’offrabilité de Pro doit suivre ce qui y est réellement construit',
  );
  if (!proConstruit) {
    const col = offerBoard().find((c) => c.tier === 'pro');
    assertEquals(col?.adds.length, 0, 'Pro ne doit rien ajouter tant que rien n’y est construit');
    assertEquals(col?.offerable, false, 'Pro ne doit pas être peint');
  }
});

Deno.test('le gratuit est TOUJOURS offrable — c’est le produit, pas un moignon', () => {
  assertEquals(tierIsOfferable('free'), true);
  const col = offerBoard().find((c) => c.tier === 'free');
  assert((col?.includes.length ?? 0) >= TOUJOURS_GRATUIT.length, 'le gratuit doit être fourni');
});

// ─── 3. La hiérarchie est cumulative et lisible ─────────────────────────────

Deno.test('un palier supérieur contient toujours les précédents', () => {
  const board = offerBoard();
  for (let i = 1; i < board.length; i++) {
    for (const key of board[i - 1]!.includes) {
      assert(
        board[i]!.includes.includes(key),
        `${board[i]!.tier} ne contient pas « ${key} », pourtant offert en ${board[i - 1]!.tier}`,
      );
    }
  }
});

Deno.test('un palier inconnu n’ouvre RIEN (position par défaut)', () => {
  for (const inconnu of ['', 'gold', 'FREE', 'premium']) {
    assertEquals(tierRank(inconnu), -1, `« ${inconnu} » ne doit pas être un palier`);
    for (const c of GRYD_CAPABILITIES) {
      assertEquals(tierGrants(inconnu, c), false, `« ${inconnu} » ouvre « ${c.key} »`);
    }
  }
});

Deno.test('chaque capacité a une clé unique et un palier connu', () => {
  const vues = new Set<string>();
  for (const c of GRYD_CAPABILITIES) {
    assert(!vues.has(c.key), `clé dupliquée : « ${c.key} »`);
    vues.add(c.key);
    assert(tierRank(c.tier) >= 0, `« ${c.key} » a un palier inconnu : ${c.tier}`);
  }
});

// ─── 4. Le tripwire : aucune règle de jeu ne lit un palier ──────────────────

function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const MODULES_DE_REGLE = [
  'scoring.ts',
  'claims.ts',
  'contest.ts',
  'coverage.ts',
  'leaderboard.ts',
  'engine.ts',
  'zone.ts',
  'boundary.ts',
  'validation.ts',
  'anticheat.ts',
  'crew.ts',
] as const;

Deno.test('AUCUN module de règle ne connaît les paliers d’offre', () => {
  // C'est ICI que se joue l'anti-pay-to-win, et la violation n'arriverait pas
  // dans `offer.ts` — elle arriverait dans le module qui décide d'un point,
  // d'une défense ou d'un rang.
  return Promise.all(
    MODULES_DE_REGLE.map(async (nom) => {
      const code = sansCommentaires(await Deno.readTextFile(`${ICI}/${nom}`));
      for (const interdit of ['GRYD_TIERS', 'GRYD_CAPABILITIES', 'hasCapability', 'GrydTier']) {
        assert(
          !code.includes(interdit),
          `${nom} référence « ${interdit} » hors commentaire : une règle de jeu ne dépend JAMAIS d'un palier`,
        );
      }
    }),
  ).then(() => undefined);
});

Deno.test('aucune capacité ne nomme une grandeur de jeu', () => {
  // Le catalogue ne doit contenir que de la LECTURE et de l'OUTIL. Le jour où
  // quelqu'un y ajoute `shield`, `points` ou `capture`, ce test tombe avant la
  // revue de code.
  const interdits = ['shield', 'bouclier', 'points', 'capture', 'defense_boost', 'multiplier'];
  for (const c of GRYD_CAPABILITIES) {
    for (const mot of interdits) {
      assert(
        !c.key.includes(mot),
        `la capacité « ${c.key} » nomme « ${mot} » : une offre n'ouvre jamais une capacité de JEU`,
      );
    }
  }
});

Deno.test('la table ne porte aucun PRIX (le Store fait foi, spec E74)', () => {
  const interdits = ['price', 'prix', 'eur', 'usd', 'amount', 'cost'];
  for (const c of GRYD_CAPABILITIES) {
    for (const champ of Object.keys(c)) {
      const bas = champ.toLowerCase();
      assert(
        !interdits.some((i) => bas.includes(i)),
        `« ${c.key} » porte le champ « ${champ} » : un prix en dur diverge du montant réellement débité`,
      );
    }
  }
});
