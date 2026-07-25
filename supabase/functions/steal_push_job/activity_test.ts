/**
 * GRYD — « ON T'A PRIS TA ZONE », DANS QUEL MONDE (0070 §4, E14).
 * Purs : aucun réseau, aucune base.
 *
 * ═══ LE DÉFAUT, ET POURQUOI IL SURVIVAIT À LA MIGRATION ═════════════════════
 * 0070 a ajouté `activity` à `steal_push_queue` PUIS rouvert le `returns table`
 * de `claim_steal_push_batch` pour l'exposer — précisément parce qu'une colonne
 * que personne ne lit ne prévient de rien. Mais le drain, lui, jetait encore la
 * valeur : `StealQueueRow` n'avait pas de champ discipline, et le message
 * restait « ta zone », sans monde. Résultat : un coureur pouvait recevoir
 * « repasse dessus pour la récupérer » pour un hexagone qu'il TIENT TOUJOURS en
 * courant — l'app l'envoyait reprendre ce qu'il n'avait pas perdu.
 *
 * Ce fichier verrouille les trois conséquences, qui ne se déduisent pas l'une
 * de l'autre :
 *   1. le MONDE est nommé quand il est certain, et TU dans le cas contraire ;
 *   2. le MESSAGE le dit là où se trouve l'action (« repasse dessus ») ;
 *   3. le COMPTE distingue les mondes — perdre le même hexagone à pied ET à
 *      vélo, c'est perdre deux zones, pas une.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { aggregateStealEvents, type StealEvent } from '../_shared/push.ts';
import { type StealQueueRow, stealWorldByVictim, worldToName } from './logic.ts';

const NOW = new Date('2026-07-25T12:00:00.000Z');

function row(
  id: number,
  victim: string,
  activity: StealQueueRow['activity'],
  hexId = `8a1fb46622d7ff${id}`,
): StealQueueRow {
  return {
    id,
    victimUserId: victim,
    thiefUserId: `thief-${id}`,
    hexId,
    activity,
    stolenAt: NOW,
  };
}

// ─── 1. Quel monde nommer, et quand se taire ────────────────────────────────

Deno.test('toutes les pertes dans le même monde → ce monde est nommé', () => {
  const world = stealWorldByVictim([
    row(1, 'ana', 'bike'),
    row(2, 'ana', 'bike'),
    row(3, 'ben', 'run'),
  ]);
  assertEquals(world.get('ana'), 'bike');
  assertEquals(world.get('ben'), 'run');
});

Deno.test('pertes dans les DEUX mondes → aucun n’est nommé (une moitié de vérité ment sur l’autre)', () => {
  const world = stealWorldByVictim([
    row(1, 'ana', 'run'),
    row(2, 'ana', 'bike'),
    row(3, 'ana', 'run'),
  ]);
  assertEquals(
    world.get('ana'),
    null,
    'le lot peut mêler les mondes (la RPC réserve par VICTIME) : on se tait',
  );
});

Deno.test('discipline illisible → silence, jamais un repli sur la course', () => {
  // La contrainte `steal_push_queue_activity_check` rend le cas impossible en
  // base. S'il survenait, la conséquence doit être une ABSENCE d'affirmation.
  assertEquals(stealWorldByVictim([row(1, 'ana', null)]).get('ana'), null);
  assertEquals(
    stealWorldByVictim([row(1, 'ana', 'run'), row(2, 'ana', null)]).get('ana'),
    null,
    'une seule valeur illisible suffit à rendre le monde incertain',
  );
});

Deno.test('une victime absente du lot n’a pas de monde inventé', () => {
  assertEquals(stealWorldByVictim([row(1, 'ana', 'run')]).has('ben'), false);
});

// ─── 2. Le message : la discipline est portée par l’ACTION ──────────────────

/**
 * Miroir EXACT de la formulation d'`inboxRow` (index.ts). `index.ts` est un
 * `Deno.serve` : on ne peut pas l'importer sans démarrer un serveur — d'où la
 * garde de câblage en §3, qui vérifie que le vrai fichier dit bien la même
 * chose.
 */
const WORLD_LABEL = { run: 'en course à pied', bike: 'à vélo' } as const;
const body = (hexCount: number, world: 'run' | 'bike' | null): string => {
  const inWorld = world ? ` ${WORLD_LABEL[world]}` : '';
  return hexCount === 1
    ? `1 zone reprise${inWorld}. Repasse dessus pour la récupérer.`
    : `${hexCount} zones reprises${inWorld}. Repasse dessus pour les récupérer.`;
};

Deno.test('le message NOMME le monde quand il est certain', () => {
  assertEquals(body(1, 'bike'), '1 zone reprise à vélo. Repasse dessus pour la récupérer.');
  assertEquals(
    body(4, 'run'),
    '4 zones reprises en course à pied. Repasse dessus pour les récupérer.',
  );
});

Deno.test('monde incertain → la phrase reste celle d’avant, sans trou ni « undefined »', () => {
  assertEquals(body(1, null), '1 zone reprise. Repasse dessus pour la récupérer.');
  assertEquals(body(7, null), '7 zones reprises. Repasse dessus pour les récupérer.');
});

// ─── 3. Le COMPTE : (hexagone, monde) est l’unité de perte ──────────────────

Deno.test('le même hexagone perdu dans les DEUX mondes compte pour DEUX zones', () => {
  // Sans la clé qualifiée par le monde, `aggregateStealEvents` dédoublonnait
  // sur `hexId` seul et annonçait « 1 zone reprise » pour deux territoires
  // réellement perdus — un chiffre faux, dans les deux sens : trop bas pour le
  // joueur, et sous le seuil de push (STEAL_PUSH_MIN_HEXES) plus souvent.
  const HEX = '8a1fb46622d7fff';
  const scoped = (hex: string, activity: string): StealEvent => ({
    victimUserId: 'ana',
    thiefUserId: 'rival',
    hexId: `${hex}@${activity}`,
    sectorId: 'sector-1',
    sectorName: 'Belleville',
    at: NOW,
  });
  const [target] = aggregateStealEvents([scoped(HEX, 'run'), scoped(HEX, 'bike')]);
  assertEquals(target!.hexCount, 2, 'deux mondes, deux zones à reprendre');

  // Non-vacuité : la même agrégation SANS la qualification n'en voit qu'une.
  const naive: StealEvent = { ...scoped(HEX, 'run'), hexId: HEX };
  assertEquals(aggregateStealEvents([naive, { ...naive }])[0]!.hexCount, 1);
});

Deno.test('un hexagone volé DEUX FOIS dans le même monde reste UNE perte', () => {
  const HEX = '8a1fb46622d7fff';
  const e = (thief: string): StealEvent => ({
    victimUserId: 'ana',
    thiefUserId: thief,
    hexId: `${HEX}@run`,
    sectorId: 'sector-1',
    sectorName: 'Belleville',
    at: NOW,
  });
  assertEquals(aggregateStealEvents([e('r1'), e('r2')])[0]!.hexCount, 1);
});

// ─── 4. LE CÂBLAGE — la colonne n’est plus en écriture seule ────────────────

Deno.test('index.ts LIT bien `activity` de la RPC et le passe jusqu’au message', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assert(
    source.includes('isActivity(r.activity)'),
    'le mapping de la RPC doit lire la discipline (elle était jetée)',
  );
  assert(
    source.includes('stealWorldByVictim(fresh)') && source.includes('stealWorldByVictim(stale)'),
    'les deux agrégats (frais / périmé) doivent chacun nommer LEUR monde',
  );
  assert(
    source.includes('worldScopedHexKey(r.hexId, r.activity)'),
    'le compte de zones doit distinguer les mondes',
  );
  // Et la formulation du vrai fichier est bien celle testée ci-dessus.
  assert(source.includes('1 zone reprise${inWorld}. Repasse dessus pour la récupérer.'));
  assert(source.includes("run: 'en course à pied'") && source.includes("bike: 'à vélo'"));
});

// ─── 5. FAUT-IL nommer le monde ? (≠ peut-on) ───────────────────────────────
//
// `stealWorldByVictim` répond à « PEUT-ON » : non si les pertes mêlent deux
// mondes. `worldToName` répond à « FAUT-IL » : non si le joueur n'en pratique
// qu'un. Les deux questions sont indépendantes, et seule la seconde a été
// oubliée — au 25/07/2026 le jeu compte 100 % de coureurs et ZÉRO ligne `bike`,
// donc « 2 zones reprises EN COURSE À PIED » qualifiait pour tout le monde une
// distinction que le produit n'offre pas encore (§A : 1 écran = 1 idée).

const worlds = (...a: ('run' | 'bike')[]) => new Set(a);

Deno.test('joueur MONO-monde → on ne nomme pas la discipline (100 % des joueurs aujourd’hui)', () => {
  assertEquals(worldToName('run', worlds('run')), null);
  assertEquals(worldToName('bike', worlds('bike')), null);
  assertEquals(
    body(2, worldToName('run', worlds('run'))),
    '2 zones reprises. Repasse dessus pour les récupérer.',
    'la phrase reste exacte : il n’a qu’un classement, « 2 zones reprises » ne cache rien',
  );
});

Deno.test('joueur HYBRIDE → la discipline est nommée, dans les DEUX sens', () => {
  assertEquals(worldToName('run', worlds('run', 'bike')), 'run');
  assertEquals(worldToName('bike', worlds('run', 'bike')), 'bike');
  assertEquals(
    body(2, worldToName('bike', worlds('run', 'bike'))),
    '2 zones reprises à vélo. Repasse dessus pour les récupérer.',
  );
});

Deno.test('la course à pied n’a AUCUN privilège : le critère est « des lignes ailleurs »', () => {
  // Un cycliste pur est aussi mono-monde qu'un coureur pur — même silence.
  assertEquals(worldToName('bike', worlds('bike')), null);
  // Et un joueur dont on ne lit QUE l'autre monde reste nommé : il en a deux.
  assertEquals(worldToName('run', worlds('bike')), 'run');
});

Deno.test('pertes dans les deux mondes → toujours muet, même pour un hybride', () => {
  // `stealWorldByVictim` a déjà rendu `null` : `worldToName` ne le rattrape pas.
  assertEquals(worldToName(null, worlds('run', 'bike')), null);
});

Deno.test('disciplines du joueur illisibles (lecture vide) → silence, jamais un monde inventé', () => {
  assertEquals(worldToName('run', worlds()), null, 'dans le doute, on n’ajoute pas de bruit');
});

// ─── 6. LE CÂBLAGE — une seule décision pour l’inbox ET le push ─────────────

Deno.test('index.ts décide le monde UNE fois, et le donne à l’inbox comme au push', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assert(
    source.includes('worldToName(lostInWorld[scope].get(userId) ?? null'),
    'le monde nommé doit passer par worldToName, pas par stealWorldByVictim seul',
  );
  assert(
    // Le SITE D'APPEL, pas la définition : une fonction déclarée mais jamais
    // appelée laisserait `playerWorlds` vide, donc TOUS les joueurs muets — un
    // silence qui ressemble au correctif sans en être un.
    source.includes('await loadPlayerWorlds(\n      [...new Set(rows.map((r) => r.victimUserId))],\n    )'),
    'les disciplines réellement pratiquées doivent être LUES (toutes les victimes, périmées comprises)',
  );
  assert(
    source.includes("from('season_scores')") && source.includes("select('user_id, activity')"),
    'la lecture doit porter sur une table bornée par construction (PK season_id,user_id,activity)',
  );
  // Le push reçoit EXACTEMENT la map de l'inbox : c'est l'écart qu'on referme.
  assert(
    source.includes('lastStealPushByUser,\n      now,\n      freshWorld,\n    )'),
    'planStealPushes doit recevoir le MÊME monde que inboxRow (freshWorld)',
  );
  assert(
    source.includes('inboxRow(t, now, freshWorld.get(t.userId) ?? null)') &&
      source.includes('inboxRow(t, now, staleWorld.get(t.userId) ?? null)'),
    'les deux agrégats gardent chacun LEUR monde',
  );
  // Non-vacuité : la forme fautive (nommer sans condition) a disparu.
  assertEquals(
    source.includes('const freshWorld = stealWorldByVictim(fresh);'),
    false,
    'nommer le monde dès qu’il est certain, sans regarder si le joueur en a deux',
  );
});
