/**
 * GRYD — CLÔTURE DE SAISON PAR DISCIPLINE (E12 « rangs SÉPARÉS », E14
 * « métriques JAMAIS sommées », règlement §13). Purs, aucune I/O.
 *
 * ═══ CE QUI EST VERROUILLÉ, ET POURQUOI CE MOMENT-LÀ COMPTE PLUS QUE LES AUTRES
 * `season_close` est le seul endroit du jeu où un classement devient
 * IRRÉVERSIBLE : `rank_cache` est gelé, les badges sont décernés, la notification
 * part. Une fuite d'un monde à l'autre y est définitive — contrairement à un
 * affichage faux, qui se corrige au rechargement suivant.
 *
 * Deux fautes, prouvées séparément :
 *
 *  1. LE DÉPARTAGE §13 MÉLANGEAIT LES MONDES (le scénario Ana / Ben). Le
 *     critère §13.3 « hexes défendus » lisait `hex_claims` sur `owner_user_id`
 *     seul : les défenses à VÉLO départageaient un rang de COURSE. Même faute,
 *     plus discrète, sur §13.1 (courses valides) et §13.2 (jours actifs).
 *  2. UN JOUEUR HYBRIDE COMPTAIT DOUBLE. `season_scores` a une ligne par
 *     (joueur, discipline) depuis 0070 : le même joueur entrait deux fois dans
 *     le MÊME classement, décalant le rang de tous ceux qui le suivaient.
 *
 * Ces cas ne sont PAS couverts par les tests de `computeFinalRanks` : cette
 * fonction était déjà juste, on lui donnait de mauvaises entrées. C'est le
 * RANGEMENT des faits qu'il faut tester.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  buildScoreInputs,
  computeFinalRanks,
  multiWorldUsers,
  type SeasonFacts,
  type SeasonScoreInput,
} from './logic.ts';

const SEASON_DAY = '2026-06-1';

/** Raccourci : n hexes tenus par `user` dans `activity`, tous `defended`. */
function defendedHexes(
  user: string,
  activity: 'run' | 'bike',
  count: number,
): SeasonFacts['hexes'][number][] {
  return Array.from({ length: count }, () => ({
    ownerUserId: user,
    claimType: 'defended',
    claimedAt: '2026-05-10T08:00:00.000Z',
    activity,
  }));
}

const byUser = (rows: readonly SeasonScoreInput[]): Map<string, SeasonScoreInput> =>
  new Map(rows.map((r) => [r.userId, r]));

// ─── 1. LE SCÉNARIO ANA / BEN, exécuté tel quel ──────────────────────────────

Deno.test('§13.3 — les défenses à VÉLO ne départagent PAS le classement de COURSE (Ana bat Ben)', () => {
  const facts: SeasonFacts = {
    scores: [
      { userId: 'ana', points: 4_200, activity: 'run' },
      { userId: 'ben', points: 4_200, activity: 'run' },
      { userId: 'ben', points: 900, activity: 'bike' },
    ],
    // Même volume et mêmes jours actifs en course : §13.1 et §13.2 ne
    // départagent pas — c'est §13.3 qui tranche, exactement comme dans le
    // scénario rapporté.
    runs: [
      ...Array.from({ length: 20 }, (_, i) => ({
        userId: 'ana',
        startedAt: `2026-06-${String(i + 1).padStart(2, '0')}T07:00:00.000Z`,
        activity: 'run' as const,
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        userId: 'ben',
        startedAt: `2026-06-${String(i + 1).padStart(2, '0')}T07:00:00.000Z`,
        activity: 'run' as const,
      })),
    ],
    hexes: [
      ...defendedHexes('ana', 'run', 12),
      ...defendedHexes('ben', 'run', 9),
      ...defendedHexes('ben', 'bike', 40), // le trésor de guerre… d'un AUTRE monde
    ],
  };

  const buckets = buildScoreInputs(facts);
  const runScores = byUser(buckets.get('run') ?? []);

  assertEquals(runScores.get('ana')!.defendedHexes, 12);
  assertEquals(
    runScores.get('ben')!.defendedHexes,
    9,
    'les 40 zones défendues à vélo n’entrent PAS dans le classement course (c’était 49)',
  );

  const ranked = computeFinalRanks(buckets.get('run')!);
  assertEquals(ranked[0]!.userId, 'ana', 'Ana gagne le classement COURSE, 12 défenses contre 9');
  assertEquals(ranked[0]!.rank, 1);
  assertEquals(ranked[1]!.userId, 'ben');
  assertEquals(ranked[1]!.rank, 2);
});

Deno.test('le monde VÉLO existe à côté, sans rien emprunter au monde course', () => {
  const facts: SeasonFacts = {
    scores: [
      { userId: 'ana', points: 4_200, activity: 'run' },
      { userId: 'ben', points: 900, activity: 'bike' },
    ],
    runs: [],
    hexes: [...defendedHexes('ben', 'bike', 40), ...defendedHexes('ana', 'run', 12)],
  };
  const buckets = buildScoreInputs(facts);
  assertEquals([...buckets.keys()].sort(), ['bike', 'run']);
  assertEquals(buckets.get('bike')!.length, 1);
  assertEquals(buckets.get('bike')![0]!.defendedHexes, 40, 'à vélo, ses 40 zones comptent bien');
  assertEquals(
    buckets.get('run')![0]!.userId,
    'ana',
    'Ben n’a pas de ligne course : il n’apparaît pas dans ce classement',
  );
});

// ─── 2. §13.1 / §13.2 — le volume et les jours actifs sont eux aussi mondés ──

Deno.test('§13.1 et §13.2 — une sortie VÉLO ne compte ni comme course valide ni comme jour actif de course', () => {
  const facts: SeasonFacts = {
    scores: [
      { userId: 'cyd', points: 1_000, activity: 'run' },
      { userId: 'dara', points: 1_000, activity: 'run' },
    ],
    runs: [
      { userId: 'cyd', startedAt: `${SEASON_DAY}0T07:00:00.000Z`, activity: 'run' },
      { userId: 'cyd', startedAt: `${SEASON_DAY}1T07:00:00.000Z`, activity: 'run' },
      // Dara a couru une seule fois, mais roulé trois fois : ces trois sorties
      // ne doivent lui donner NI volume NI jours actifs en course.
      { userId: 'dara', startedAt: `${SEASON_DAY}0T07:00:00.000Z`, activity: 'run' },
      { userId: 'dara', startedAt: `${SEASON_DAY}1T07:00:00.000Z`, activity: 'bike' },
      { userId: 'dara', startedAt: `${SEASON_DAY}2T07:00:00.000Z`, activity: 'bike' },
      { userId: 'dara', startedAt: `${SEASON_DAY}3T07:00:00.000Z`, activity: 'bike' },
    ],
    hexes: [],
  };
  const runScores = byUser(buildScoreInputs(facts).get('run') ?? []);
  assertEquals(runScores.get('cyd')!.validRuns, 2);
  assertEquals(runScores.get('cyd')!.activeDays, 2);
  assertEquals(runScores.get('dara')!.validRuns, 1, '3 sorties vélo ≠ 3 courses valides');
  assertEquals(runScores.get('dara')!.activeDays, 1, '3 jours à vélo ≠ 3 jours actifs de course');

  const ranked = computeFinalRanks(buildScoreInputs(facts).get('run')!);
  assertEquals(ranked[0]!.userId, 'cyd', '§13.1 tranche sur le volume de COURSE');
});

Deno.test('§13.5 — la 1re capture retenue est celle du MONDE classé', () => {
  const facts: SeasonFacts = {
    scores: [{ userId: 'eli', points: 500, activity: 'run' }],
    runs: [],
    hexes: [
      { // capture vélo TRÈS ancienne : elle ne doit pas rajeunir le rang course
        ownerUserId: 'eli',
        claimType: 'claimed',
        claimedAt: '2026-01-02T06:00:00.000Z',
        activity: 'bike',
      },
      {
        ownerUserId: 'eli',
        claimType: 'claimed',
        claimedAt: '2026-05-20T06:00:00.000Z',
        activity: 'run',
      },
    ],
  };
  const run = buildScoreInputs(facts).get('run')![0]!;
  assertEquals(run.firstCaptureAt?.toISOString(), '2026-05-20T06:00:00.000Z');
});

// ─── 3. Un joueur hybride ne compte plus DOUBLE dans un même classement ─────

Deno.test('un joueur hybride a DEUX résultats indépendants, jamais deux lignes dans le même classement', () => {
  const facts: SeasonFacts = {
    scores: [
      { userId: 'flo', points: 3_000, activity: 'run' },
      { userId: 'flo', points: 2_500, activity: 'bike' },
      { userId: 'gus', points: 2_800, activity: 'run' },
    ],
    runs: [],
    hexes: [],
  };
  const buckets = buildScoreInputs(facts);
  const runRanked = computeFinalRanks(buckets.get('run')!);

  assertEquals(runRanked.length, 2, 'deux joueurs classés en course, pas trois lignes');
  assertEquals(runRanked.map((r) => r.userId), ['flo', 'gus']);
  assertEquals(
    runRanked[1]!.rank,
    2,
    'Gus est 2e — la ligne VÉLO de Flo ne le repousse plus au rang 3',
  );
  // Et surtout : jamais de somme. 3 000 + 2 500 = 5 500 n'existe nulle part.
  assert(
    runRanked.every((r) => r.points !== 5_500),
    'les points de deux mondes ne s’additionnent jamais (E14)',
  );
  assertEquals(computeFinalRanks(buckets.get('bike')!)[0]!.points, 2_500);
});

// ─── 4. Ce que le rangement refuse de fabriquer ──────────────────────────────

Deno.test('un monde que personne n’a joué n’a pas de classement vide fabriqué', () => {
  const buckets = buildScoreInputs({
    scores: [{ userId: 'hana', points: 10, activity: 'run' }],
    runs: [],
    hexes: [],
  });
  assertEquals([...buckets.keys()], ['run']);
  assertEquals(buckets.has('bike'), false, 'aucune saison de vélo n’est inventée');
});

Deno.test('une date de capture illisible est ignorée, pas repliée sur une valeur inventée', () => {
  const run = buildScoreInputs({
    scores: [{ userId: 'ines', points: 10, activity: 'run' }],
    runs: [],
    hexes: [
      { ownerUserId: 'ines', claimType: 'claimed', claimedAt: 'pas-une-date', activity: 'run' },
    ],
  }).get('run')![0]!;
  assertEquals(run.firstCaptureAt, null, '§13.5 : sans date fiable, « jamais capturé » — pas 1970');
});

// ─── 5. NE NOMMER LE MONDE QU'À QUI EN A DEUX ───────────────────────────────
//
// Nommer la discipline lève une ambiguïté RÉELLE quand le joueur a deux
// classements. Pour qui n'en a qu'un — au 25/07/2026, 100 % des joueurs, zéro
// ligne `bike` en base — « Classement final EN COURSE À PIED : n°3 » qualifie
// une distinction que le produit n'offre pas : du bruit imposé à tous pour
// zéro cas d'usage (§A, 1 écran = 1 idée). Et « n°3 » tout court n'est pas une
// demi-vérité : c'est exact, il n'y a qu'un classement.

/** Miroir EXACT de la formulation d'`index.ts` (un `Deno.serve` non importable). */
const DISCIPLINE_LABEL = { run: 'en course à pied', bike: 'à vélo' } as const;
const seasonBody = (
  activity: 'run' | 'bike',
  rank: number,
  named: boolean,
): string => `Classement final${named ? ` ${DISCIPLINE_LABEL[activity]}` : ''} : n°${rank}`;

Deno.test('un joueur MONO-monde ne reçoit aucun libellé de discipline', () => {
  const buckets = buildScoreInputs({
    scores: [
      { userId: 'ana', points: 4_200, activity: 'run' },
      { userId: 'ben', points: 3_100, activity: 'run' },
    ],
    runs: [],
    hexes: [],
  });
  const hybrids = multiWorldUsers(buckets);
  assertEquals(hybrids.size, 0, 'personne n’a deux classements : personne n’a besoin qu’on précise');
  assertEquals(seasonBody('run', 1, hybrids.has('ana')), 'Classement final : n°1');
});

Deno.test('un joueur HYBRIDE reçoit la discipline dans CHACUNE de ses deux notifications', () => {
  const buckets = buildScoreInputs({
    scores: [
      { userId: 'flo', points: 3_000, activity: 'run' },
      { userId: 'flo', points: 2_500, activity: 'bike' },
      { userId: 'gus', points: 2_800, activity: 'run' }, // mono-monde, même saison
    ],
    runs: [],
    hexes: [],
  });
  const hybrids = multiWorldUsers(buckets);
  assertEquals([...hybrids], ['flo']);
  assertEquals(
    seasonBody('run', 1, hybrids.has('flo')),
    'Classement final en course à pied : n°1',
  );
  assertEquals(seasonBody('bike', 1, hybrids.has('flo')), 'Classement final à vélo : n°1');
  // Gus est dans la MÊME saison, mais lui n'a qu'un monde : rien ne change pour lui.
  assertEquals(seasonBody('run', 2, hybrids.has('gus')), 'Classement final : n°2');
});

Deno.test('multiWorldUsers ne fabrique pas d’hybride à partir d’un seul monde', () => {
  // Même joueur, deux fois dans le MÊME seau (ne devrait pas arriver, mais une
  // garde qui compte les lignes au lieu des mondes se tromperait ici).
  const dup = new Map<'run' | 'bike', { userId: string; points: number; validRuns: number; activeDays: number; defendedHexes: number; firstCaptureAt: Date | null }[]>([
    ['run', [
      { userId: 'ana', points: 10, validRuns: 0, activeDays: 0, defendedHexes: 0, firstCaptureAt: null },
      { userId: 'ana', points: 20, validRuns: 0, activeDays: 0, defendedHexes: 0, firstCaptureAt: null },
    ]],
  ]);
  assertEquals(multiWorldUsers(dup).size, 0);
});

Deno.test('index.ts NOMME le monde à travers multiWorldUsers, jamais inconditionnellement', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assert(
    source.includes('const twoWorlds = multiWorldUsers(byActivity);'),
    'le partage hybride/mono-monde doit être dérivé du classement lui-même',
  );
  assert(
    source.includes('twoWorlds.has(r.userId) ? ` ${DISCIPLINE_LABEL[activity]}` : \'\''),
    'le libellé est CONDITIONNEL — c’est tout le correctif',
  );
  assert(
    source.includes('`Classement final${world} : n°${r.rank}`'),
    'la phrase de base ne porte plus de discipline en dur',
  );
  // Non-vacuité : la forme fautive a bien disparu.
  assertEquals(
    source.includes('Classement final ${DISCIPLINE_LABEL[activity]}'),
    false,
    'nommer le monde à 100 % des joueurs pour 0 % de cas d’usage',
  );
});
