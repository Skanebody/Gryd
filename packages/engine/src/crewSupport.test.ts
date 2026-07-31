/**
 * GRYD — ce que le soutien de crew doit tenir, prouvé (AMENDEMENT-48).
 *
 * Ces tests gardent des RÈGLES, pas des valeurs : ils dérivent tout de
 * `game-rules` (barème, paliers, taille de référence). Régler un curseur ne les
 * fait pas rougir ; franchir une ligne, si.
 *
 * Les quatre lignes gardées, dans l'ordre de gravité :
 *   1. un crew ne peut JAMAIS financer son propre palier ;
 *   2. le palier mesure l'ENGAGEMENT, jamais la taille du crew ;
 *   3. le soutien est DÉFINITIF — rien ne peut faire redescendre un crew ;
 *   4. le soutien n'ouvre QUE de l'expression — aucune règle de jeu ne le lit.
 *
 * La 4ᵉ est un garde-fou de SOURCE, sur le modèle des tripwires déjà en place
 * dans ce dépôt : c'est le seul qui attrape la régression qui compte vraiment,
 * parce qu'elle n'arriverait pas ici mais AILLEURS — le jour où quelqu'un
 * ferait dépendre un point, une défense ou un rang d'un palier payé.
 */
import {
  CREW_COSMETIC_SLOTS,
  CREW_SUPPORT_REFERENCE_MEMBERS,
  CREW_SUPPORT_TIER_MAX,
  CREW_SUPPORT_TIERS,
  CREW_SUPPORT_UNITS,
} from '@klaim/shared/game-rules';
import {
  crewCosmeticState,
  crewSupportRequirement,
  crewSupportTier,
  supportUnitsFor,
} from './crewSupport.ts';

/**
 * `Deno` déclaré LOCALEMENT — convention du paquet (cf. `leaderboard.test.ts`) :
 * le tsconfig de `@klaim/engine` ne connaît pas les globales Deno, et `include`
 * couvre tout `src`, tests compris. On déclare donc le strict nécessaire.
 */
declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFile(chemin: string): Promise<string>;
};

/** Assertions LOCALES — aucun import externe (même contrainte d'outillage que
 *  `leaderboard.test.ts` : ce fichier est recopié sous `_shared/engine/`). */
function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  // `Object.is` plutôt que `===` : il compare NaN à NaN sans piège, ce qui
  // compte ici — plusieurs tests éprouvent des entrées aberrantes.
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

/**
 * Répertoire de CE fichier. Les gardes de source lisent leurs voisins ; un
 * chemin relatif au CWD casserait selon l'endroit d'où le test est lancé, et
 * ce dépôt vit sous un chemin qui contient une espace (« KLAIM RUN ») —
 * `import.meta.url` obligerait à décoder du pourcent-encodage.
 */
const ICI = (import.meta as unknown as { readonly dirname: string }).dirname;

// ─── 1. Un crew ne finance JAMAIS son propre palier ──────────────────────────

Deno.test('un achat financé par le crew ne rapporte aucune unité', () => {
  assertEquals(
    supportUnitsFor('crewFunded'),
    0,
    'sinon un crew blanchit de l argent en palier en offrant des cosmétiques à ses membres',
  );
});

Deno.test('une origine inconnue ne rapporte rien (position par défaut)', () => {
  for (const inconnu of ['', 'sponsor', 'admin', 'CREWFUNDED', 'self ']) {
    assertEquals(supportUnitsFor(inconnu), 0, `origine « ${inconnu} »`);
  }
});

Deno.test('le gradient récompense l achat pour soi au-dessus du cadeau reçu', () => {
  // La RÈGLE est l'ordre, pas les nombres : payer soi-même > offrir > recevoir.
  assert(CREW_SUPPORT_UNITS.self >= CREW_SUPPORT_UNITS.gifted);
  assert(CREW_SUPPORT_UNITS.gifted > CREW_SUPPORT_UNITS.received);
  assert(CREW_SUPPORT_UNITS.received > CREW_SUPPORT_UNITS.crewFunded);
});

// ─── 2. Le palier mesure l'engagement, pas la taille ─────────────────────────

Deno.test('aucune remise sous la taille de référence', () => {
  const petit = crewSupportRequirement(1, 2);
  const reference = crewSupportRequirement(1, CREW_SUPPORT_REFERENCE_MEMBERS);
  assertEquals(petit, reference, 'un crew de 2 ne doit pas atteindre un palier pour presque rien');
});

Deno.test('un crew deux fois plus grand a besoin de deux fois plus de soutien', () => {
  const n = CREW_SUPPORT_REFERENCE_MEMBERS;
  for (let tier = 1; tier <= CREW_SUPPORT_TIER_MAX; tier++) {
    assertEquals(crewSupportRequirement(tier, 2 * n), 2 * crewSupportRequirement(tier, n));
  }
});

Deno.test('LA PROPRIÉTÉ : à engagement par tête égal, le palier ne dépend pas de la taille', () => {
  // Chaque membre s'équipe une fois. Le palier atteint doit être IDENTIQUE
  // quelle que soit la taille du crew — sinon le palier récompenserait le
  // recrutement, et non l'investissement (leçon Telegram).
  const parTete = CREW_SUPPORT_UNITS.self;
  const attendu = crewSupportTier(
    parTete * CREW_SUPPORT_REFERENCE_MEMBERS,
    CREW_SUPPORT_REFERENCE_MEMBERS,
  );
  for (const membres of [10, 15, 25, 50, 200]) {
    assertEquals(
      crewSupportTier(parTete * membres, membres),
      attendu,
      `crew de ${membres} membres, tous équipés`,
    );
  }
});

Deno.test('un palier hors table est inatteignable, jamais « déjà atteint »', () => {
  for (const tier of [-1, CREW_SUPPORT_TIER_MAX + 1, 1.5, NaN]) {
    assertEquals(crewSupportRequirement(tier, 10), Number.POSITIVE_INFINITY, `palier ${tier}`);
  }
});

// ─── 3. Le soutien est DÉFINITIF ─────────────────────────────────────────────

Deno.test('le palier ne redescend jamais quand le soutien augmente', () => {
  let precedent = 0;
  for (let units = 0; units <= CREW_SUPPORT_TIERS[CREW_SUPPORT_TIER_MAX]! * 2; units += 1) {
    const tier = crewSupportTier(units, CREW_SUPPORT_REFERENCE_MEMBERS);
    assert(tier >= precedent, `redescente à ${units} unités`);
    precedent = tier;
  }
  assertEquals(precedent, CREW_SUPPORT_TIER_MAX);
});

Deno.test('aucune horloge n entre dans le calcul du palier', async () => {
  // Un boost qui expire (modèle Telegram) fabriquerait de la rétention par
  // otage : « si je pars, le crew perd sa tête ». Refusé, A-48 §3.3. La preuve
  // la plus simple qu'aucune expiration ne peut se glisser ici : le module
  // n'a aucune notion de temps.
  const src = await Deno.readTextFile(`${ICI}/crewSupport.ts`);
  const corps = src.slice(src.indexOf('*/') + 2); // hors docblock d'en-tête
  for (const horloge of ['Date.now', 'nowMs', 'expires', 'expiresAt', 'ttl']) {
    assert(!corps.includes(horloge), `le soutien ne doit connaître aucune horloge (${horloge})`);
  }
});

Deno.test('valeurs aberrantes : jamais de palier offert, jamais de NaN', () => {
  for (const units of [NaN, -1, -Infinity]) {
    assertEquals(crewSupportTier(units, 10), 0, `unités ${units}`);
  }
  // Une taille absurde ne doit pas rendre le palier gratuit par division.
  for (const membres of [0, -5, NaN]) {
    assertEquals(crewSupportRequirement(1, membres), CREW_SUPPORT_TIERS[1]!, `membres ${membres}`);
  }
});

// ─── 4. Les DEUX portes : la course ouvre, l'argent habille ──────────────────

Deno.test('payer sans courir n ouvre RIEN', () => {
  const riche = crewCosmeticState({
    supportUnits: 10_000,
    memberCount: CREW_SUPPORT_REFERENCE_MEMBERS,
    crewLevel: 0,
  });
  assertEquals(riche.supportTier, CREW_SUPPORT_TIER_MAX, 'le palier de soutien est bien au max');
  assertEquals(
    riche.slots.filter((s) => s.unlocked).length,
    0,
    'et pourtant aucun emplacement : l argent n achète jamais un palier de course',
  );
  for (const slot of riche.slots) assertEquals(slot.blockedBy, 'course');
});

Deno.test('courir sans payer ouvre le DROIT, jamais la variante distinctive', () => {
  const sportif = crewCosmeticState({ supportUnits: 0, memberCount: 10, crewLevel: 99 });
  assertEquals(sportif.supportTier, 0);
  for (const slot of sportif.slots) {
    assertEquals(slot.unlocked, false);
    assertEquals(slot.blockedBy, 'soutien', `${slot.key} : c est le soutien qui manque, pas le terrain`);
  }
});

Deno.test('blockedBy nomme l axe manquant — un écran honnête en dépend', () => {
  const rien = crewCosmeticState({ supportUnits: 0, memberCount: 10, crewLevel: 0 });
  assert(rien.slots.every((s) => s.blockedBy === 'les_deux'));

  const tout = crewCosmeticState({ supportUnits: 10_000, memberCount: 10, crewLevel: 99 });
  assert(tout.slots.every((s) => s.unlocked && s.blockedBy === null));
});

Deno.test('tous les emplacements sont rendus, y compris verrouillés', () => {
  // La trajectoire du crew est le vrai produit, et elle est gratuite : un écran
  // qui ne montrerait que l'acquis la cacherait.
  const state = crewCosmeticState({ supportUnits: 0, memberCount: 1, crewLevel: 1 });
  assertEquals(state.slots.length, CREW_COSMETIC_SLOTS.length);
});

// ─── 5. Le tripwire : aucune règle de jeu ne lit le soutien ──────────────────

/**
 * Les modules qui DÉCIDENT quelque chose au joueur. Si l'un d'eux se met à
 * connaître le soutien, l'anti-pay-to-win est tombé — et ça n'arriverait pas
 * dans `crewSupport.ts`, ça arriverait ici.
 */
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

Deno.test('AUCUN module de règle ne connaît le soutien de crew', async () => {
  for (const nom of MODULES_DE_REGLE) {
    const src = await Deno.readTextFile(`${ICI}/${nom}`);
    for (const interdit of ['CREW_SUPPORT_', 'CREW_COSMETIC_', 'crewSupport', 'supportTier']) {
      assert(
        !src.includes(interdit),
        `${nom} référence « ${interdit} » : une règle de jeu ne doit JAMAIS dépendre d un palier payé`,
      );
    }
  }
});

Deno.test('un emplacement cosmétique ne porte aucune grandeur de jeu', () => {
  // La table est DATA : le jour où quelqu'un y ajoute `bonus`, `points` ou
  // `shield`, ce test tombe avant la revue.
  const champsAutorises = new Set(['key', 'crewLevel', 'supportTier']);
  for (const slot of CREW_COSMETIC_SLOTS) {
    for (const champ of Object.keys(slot)) {
      assert(
        champsAutorises.has(champ),
        `l emplacement « ${slot.key} » porte le champ « ${champ} » — un emplacement n ouvre que de l expression`,
      );
    }
  }
});
