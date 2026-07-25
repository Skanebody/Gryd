/**
 * GRYD — E14 : TOUTE LECTURE CLIENT EST BORNÉE À UNE SEULE DISCIPLINE.
 *
 * La migration 0070 change la CARDINALITÉ de trois sources que le client lit :
 *   · `hex_claims`         PK (h3index)            → (h3index, activity)
 *   · `season_scores`      PK (season_id, user_id) → (…, …, activity)
 *   · `player_leaderboard` une ligne par joueur    → une par (joueur, discipline)
 *
 * Un joueur HYBRIDE (qui court ET roule) y occupe donc deux lignes. Trois
 * lectures client ne filtraient pas, et chacune produisait un chiffre faux —
 * rangs décalés, territoire doublé, « meilleur des deux mondes » affiché comme
 * « tes points ».
 *
 * CE QUE CE FICHIER PROUVE, ET COMMENT. Ces lectures passent par supabase-js et
 * ne sont pas atteignables sous Deno (ni base ni client réseau ici). La preuve
 * est donc en DEUX temps, tous deux exécutés :
 *   1. une SIMULATION des semantiques PostgREST sur un jeu de lignes hybride —
 *      elle MESURE le dégât exact d'un filtre manquant (c'est le « avant ») ;
 *   2. un GARDE-FOU DE SOURCE : les trois requêtes du code client doivent
 *      porter `.eq('activity', …)`. Ce garde échoue sur le code d'avant le
 *      correctif — c'est ce qui empêche le défaut de revenir en silence.
 *
 * La simulation ne remplace PAS un test d'intégration contre Postgres : elle
 * modélise le filtrage et le tri, pas le planificateur. Elle est là pour
 * chiffrer la faute, pas pour certifier le serveur (qui a ses propres tests).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { DEFAULT_ACTIVITY } from '@klaim/shared';

// ─── 1. Simulation : ce que coûtait exactement un `.eq('activity')` manquant ──

interface ScoreRow {
  user_id: string;
  pseudo: string;
  activity: 'run' | 'bike';
  points: number;
}

/** Saison réelle : 3 joueurs, dont UN hybride (il court ET il roule). */
const SEASON_ROWS: readonly ScoreRow[] = [
  { user_id: 'u-hybride', pseudo: 'HYBRIDE', activity: 'bike', points: 900 },
  { user_id: 'u-alice', pseudo: 'ALICE', activity: 'run', points: 700 },
  { user_id: 'u-hybride', pseudo: 'HYBRIDE', activity: 'run', points: 500 },
  { user_id: 'u-bob', pseudo: 'BOB', activity: 'run', points: 300 },
];

/** `order('points', desc)` puis rang dérivé de l'ordre (index+1), comme l'écran. */
function ranked(rows: readonly ScoreRow[]): { pseudo: string; rank: number; value: number }[] {
  return [...rows]
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ pseudo: r.pseudo, rank: i + 1, value: r.points }));
}

Deno.test('classement SANS filtre : le joueur hybride occupe DEUX places et décale les autres', () => {
  const melange = ranked(SEASON_ROWS);
  // HYBRIDE apparaît deux fois, avec deux totaux différents.
  assertEquals(melange.filter((r) => r.pseudo === 'HYBRIDE').length, 2);
  // Et BOB, 3ᵉ coureur de la saison, est affiché 4ᵉ.
  assertEquals(melange.find((r) => r.pseudo === 'BOB')?.rank, 4);
});

Deno.test('classement FILTRÉ : une ligne par joueur, rangs justes (E12 « rangs séparés »)', () => {
  const course = ranked(SEASON_ROWS.filter((r) => r.activity === 'run'));
  assertEquals(course.map((r) => r.pseudo), ['ALICE', 'HYBRIDE', 'BOB']);
  assertEquals(course.map((r) => r.rank), [1, 2, 3]);
  // Le monde vélo existe à part, et il est vrai : une seule ligne aujourd'hui.
  const velo = ranked(SEASON_ROWS.filter((r) => r.activity === 'bike'));
  assertEquals(velo.map((r) => r.pseudo), ['HYBRIDE']);
});

Deno.test('« tes points de saison » : sans filtre, c’est le MEILLEUR des deux mondes', () => {
  const mine = SEASON_ROWS.filter((r) => r.user_id === 'u-hybride');
  // `order('points', desc).limit(1).maybeSingle()` — la lecture d'avant.
  const sansFiltre = [...mine].sort((a, b) => b.points - a.points)[0]!;
  assertEquals(sansFiltre.points, 900); // ses points de VÉLO…
  assertEquals(sansFiltre.activity, 'bike'); // …servis sous le libellé « saison ».
  // Avec le filtre, il lit ses points de COURSE, et l'écran sait le dire.
  const avecFiltre = [...mine.filter((r) => r.activity === 'run')]
    .sort((a, b) => b.points - a.points)[0]!;
  assertEquals(avecFiltre.points, 500);
  assert(sansFiltre.points !== avecFiltre.points, 'le mélange change le chiffre affiché');
});

Deno.test('territoire : une cellule tenue dans les deux mondes est comptée DEUX fois', () => {
  // Ce que `hex_claims` rend pour UN hexagone tenu à pied ET à vélo.
  const claims = [
    { h3index: '8a1fb466200ffff', activity: 'run' as const },
    { h3index: '8a1fb466200ffff', activity: 'bike' as const },
  ];
  const cellulesSansFiltre = claims.length;
  const cellulesFiltrees = claims.filter((c) => c.activity === DEFAULT_ACTIVITY).length;
  assertEquals(cellulesSansFiltre, 2); // aire et compte doublés, mission fausse
  assertEquals(cellulesFiltrees, 1); // une cellule, une échéance, un monde
});

// ─── 2. Garde-fou de source : les trois requêtes portent la discipline ───────

/**
 * Fenêtre de la requête : du `.from('table')` au `;` qui clôt la chaîne. Les
 * commentaires sont retirés d'abord — un `;` dans une explication en français
 * couperait la chaîne au mauvais endroit et rendrait le garde-fou menteur.
 */
async function queryChain(relPath: string, table: string): Promise<string> {
  const url = new URL(relPath, import.meta.url);
  const raw = await Deno.readTextFile(url);
  const src = raw.replace(/^\s*\/\/.*$/gm, '');
  const from = src.indexOf(`.from('${table}')`);
  assert(from >= 0, `${relPath} : aucune lecture de ${table} trouvée`);
  const end = src.indexOf(';', from);
  assert(end > from, `${relPath} : chaîne de requête ${table} non terminée`);
  return src.slice(from, end);
}

Deno.test('leagueBoard lit player_leaderboard AVEC la discipline', async () => {
  const chain = await queryChain('./leagueBoard.ts', 'player_leaderboard');
  assert(
    chain.includes(".eq('activity'"),
    'la lecture du classement doit être bornée à UNE discipline (E12/E14)',
  );
});

Deno.test('economy lit season_scores AVEC la discipline', async () => {
  const chain = await queryChain('./economy.ts', 'season_scores');
  assert(
    chain.includes(".eq('activity'"),
    'les points de saison doivent appartenir à UN monde nommé, jamais au meilleur des deux',
  );
});

Deno.test('la mission lit hex_claims AVEC la discipline', async () => {
  const chain = await queryChain('../mission/useRealMissionCore.ts', 'hex_claims');
  assert(
    chain.includes(".eq('activity'"),
    'le territoire doit être compté dans UN monde (PK composite depuis 0070)',
  );
});

Deno.test('specialty_leaderboard N’EST PAS filtré, et le fichier le DIT', async () => {
  // Contre-épreuve : `user_stats` est mono-pot (migration 0070, « en suspens »
  // §2). Y ajouter un filtre ferait échouer la lecture ; le taire laisserait
  // croire à une séparation qui n'existe pas. La seule option honnête est de
  // l'écrire — ce test vérifie que l'aveu est bien là.
  const src = await Deno.readTextFile(new URL('./leagueBoard.ts', import.meta.url));
  const chain = await queryChain('./leagueBoard.ts', 'specialty_leaderboard');
  assertEquals(chain.includes(".eq('activity'"), false);
  assert(
    src.includes('PAS DE FILTRE DE DISCIPLINE ICI'),
    'un classement non discipliné doit être documenté comme tel, pas laissé ambigu',
  );
});
