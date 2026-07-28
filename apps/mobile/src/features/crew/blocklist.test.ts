/**
 * GRYD — LE BLOCAGE AGIT, ET LE SIGNALEMENT EST À PORTÉE DE LIGNE (Guideline 1.2).
 *
 * Trois familles, et les trois comptent :
 *   1. les RÈGLES PURES de `blocklist.ts` — normalisation, éligibilité des
 *      actions, pré-remplissage ;
 *   2. une SIMULATION qui chiffre pourquoi on MASQUE au lieu de RETIRER : sur un
 *      classement, supprimer la ligne d'un joueur bloqué décale le rang de tous
 *      ceux qui le suivent. C'est le « avant/après » de l'arbitrage de rendu ;
 *   3. des GARDE-FOUS DE SOURCE, sur le modèle de
 *      `features/social/activityScoping.test.ts` : les DEUX surfaces qui
 *      affichent le pseudo d'un tiers doivent réellement consommer le prédicat
 *      et peindre l'affordance. Ces gardes ÉCHOUENT sur le code d'avant le
 *      correctif (roster et classement n'appelaient rien du tout) — c'est ce
 *      qui empêche le défaut de revenir en silence, et ce qui distingue « une
 *      fonction existe » de « une surface l'utilise ».
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  UNKNOWN_PSEUDO,
  blockTargetFor,
  blockedPseudoSet,
  canModeratePlayer,
  displayedPseudo,
  isNamedPlayer,
  isPseudoBlocked,
  memberReportInput,
  moderationActionsFor,
  normalizePseudo,
} from './blocklist.ts';

const EMPTY: ReadonlySet<string> = new Set();

// ─── 1. Règles pures ─────────────────────────────────────────────────────────

Deno.test('la comparaison ignore la casse et les espaces de bord', () => {
  // Le formulaire de Confidentialité accepte n'importe quelle saisie : sans
  // normalisation, « k.runner75 » ne bloquait pas « K.Runner75 » et le joueur
  // croyait avoir agi.
  const blocked = blockedPseudoSet(['  K.Runner75 ']);
  assert(isPseudoBlocked(blocked, 'k.runner75'));
  assert(isPseudoBlocked(blocked, 'K.RUNNER75'));
  assertEquals(normalizePseudo(' Ada '), 'ada');
});

Deno.test('un pseudo VIDE n’entre jamais dans l’index : sinon il masquerait tout', () => {
  const blocked = blockedPseudoSet(['', '   ', 'ada']);
  assertEquals(blocked.size, 1);
  assertEquals(isPseudoBlocked(blocked, ''), false);
});

Deno.test('le repli « — » ne désigne personne : ni signalable, ni bloquable', () => {
  // `real.ts` et `leagueBoard.ts` écrivent tous deux ce tiret quand la base n'a
  // pas rendu de pseudo. Le signaler viserait une ligne anonyme ; le bloquer
  // masquerait d'un coup toutes les lignes sans nom.
  assertEquals(isNamedPlayer(UNKNOWN_PSEUDO), false);
  assertEquals(memberReportInput(UNKNOWN_PSEUDO, 'spam'), null);
  assertEquals(blockTargetFor(UNKNOWN_PSEUDO), null);
  assertEquals(
    canModeratePlayer({ pseudo: UNKNOWN_PSEUDO, isMe: false, canReport: true, blocked: EMPTY }),
    false,
  );
});

Deno.test('MA ligne ne porte aucune action : on ne se signale ni ne se bloque soi-même', () => {
  assertEquals(
    moderationActionsFor({ pseudo: 'ada', isMe: true, canReport: true, blocked: EMPTY }),
    [],
  );
});

Deno.test('sans session, « Signaler » n’est PAS proposé — mais « Bloquer » reste', () => {
  // `reportContent` n'écrit dans `content_reports` que sous session : peindre
  // l'action hors session serait un bouton mort, et l'accusé de réception un
  // mensonge. Le blocage, lui, est un filtrage local : il agit toujours.
  assertEquals(
    moderationActionsFor({ pseudo: 'ada', isMe: false, canReport: false, blocked: EMPTY }),
    ['block'],
  );
  assertEquals(
    moderationActionsFor({ pseudo: 'ada', isMe: false, canReport: true, blocked: EMPTY }),
    ['report', 'block'],
  );
});

Deno.test('un joueur DÉJÀ bloqué se voit proposer « Débloquer », jamais « Bloquer » deux fois', () => {
  const blocked = blockedPseudoSet(['Ada']);
  assertEquals(
    moderationActionsFor({ pseudo: 'ada', isMe: false, canReport: true, blocked }),
    ['report', 'unblock'],
  );
});

Deno.test('le signalement est PRÉ-REMPLI avec la ligne : plus rien à retaper', () => {
  // C'était tout le défaut B4 : le pseudo par défaut est `runner_` + 12 hex,
  // affiché tronqué ailleurs, et il fallait le ressaisir à la main.
  const input = memberReportInput('  runner_9f2c1ab30d54  ', 'harcelement');
  assertEquals(input, {
    kind: 'member',
    targetId: 'runner_9f2c1ab30d54',
    author: 'runner_9f2c1ab30d54',
    reason: 'harcelement',
  });
});

Deno.test('le blocage garde la CASSE d’origine : la liste « Joueurs bloqués » reste lisible', () => {
  // La comparaison est insensible à la casse, mais la valeur STOCKÉE ne l'est
  // pas — sinon `unblockMember` ne retrouverait plus sa ligne et l'écran
  // afficherait un pseudo que le joueur ne reconnaîtrait pas.
  assertEquals(blockTargetFor('  K.Runner75 '), 'K.Runner75');
});

Deno.test('un joueur bloqué perd son NOM, pas sa ligne', () => {
  const blocked = blockedPseudoSet(['ada']);
  assertEquals(displayedPseudo(blocked, 'Ada', 'Joueur bloqué'), 'Joueur bloqué');
  assertEquals(displayedPseudo(blocked, 'Bob', 'Joueur bloqué'), 'Bob');
});

// ─── 2. Pourquoi MASQUER et non RETIRER (l'arbitrage de rendu, chiffré) ───────

interface BoardRow {
  name: string;
  points: number;
}

/** Rang dérivé de l'ORDRE serveur, exactement comme l'écran (index + 1). */
function ranked(rows: readonly BoardRow[]): { name: string; rank: number }[] {
  return rows.map((r, i) => ({ name: r.name, rank: i + 1 }));
}

const BOARD: readonly BoardRow[] = [
  { name: 'ALICE', points: 900 },
  { name: 'TROLL', points: 700 },
  { name: 'BOB', points: 500 },
  { name: 'MOI', points: 300 },
];

Deno.test('RETIRER la ligne d’un bloqué décale le rang de tous ceux qui suivent', () => {
  const blocked = blockedPseudoSet(['TROLL']);
  const retire = ranked(BOARD.filter((r) => !isPseudoBlocked(blocked, r.name)));
  // BOB est 3ᵉ au serveur ; il apparaîtrait 2ᵉ, et MOI 3ᵉ au lieu de 4ᵉ.
  assertEquals(retire.find((r) => r.name === 'BOB')?.rank, 2);
  assertEquals(retire.find((r) => r.name === 'MOI')?.rank, 3);
});

Deno.test('MASQUER garde les rangs du serveur, et l’identité disparaît quand même', () => {
  const blocked = blockedPseudoSet(['TROLL']);
  const masque = ranked(BOARD).map((r) => ({
    ...r,
    name: displayedPseudo(blocked, r.name, 'Joueur bloqué'),
  }));
  assertEquals(masque.find((r) => r.name === 'BOB')?.rank, 3);
  assertEquals(masque.find((r) => r.name === 'MOI')?.rank, 4);
  // Le pseudo du joueur bloqué n'apparaît NULLE PART dans le rendu.
  assertEquals(masque.some((r) => r.name === 'TROLL'), false);
  assertEquals(masque[1]?.name, 'Joueur bloqué');
});

// ─── 3. Garde-fous de SOURCE : les surfaces consomment vraiment le prédicat ───

/** Source d'un fichier, commentaires retirés (une mention en commentaire ne
 *  prouve pas qu'une surface filtre). */
async function sourceOf(relPath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relPath, import.meta.url));
  return raw
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * FENÊTRE d'un rendu précis, du marqueur d'ouverture au marqueur suivant.
 *
 * Le garde-fou doit porter sur CHAQUE surface, pas sur le fichier : ces écrans
 * rendent le pseudo à plusieurs endroits (podium ET liste), et un `includes`
 * global resterait vert alors qu'une des deux aurait cessé de filtrer. Vérifié :
 * en retirant `displayedPseudo` de la seule `BoardRow`, la version « fichier
 * entier » passait — celle-ci échoue.
 */
async function windowOf(relPath: string, start: string, end: string): Promise<string> {
  const src = await sourceOf(relPath);
  const from = src.indexOf(start);
  assert(from >= 0, `${relPath} : repère « ${start} » introuvable`);
  const to = src.indexOf(end, from + start.length);
  assert(to > from, `${relPath} : repère de fin « ${end} » introuvable`);
  return src.slice(from, to);
}

const ROSTER = './RealCrewScreen.tsx';
/**
 * ⚠ LE RENDU DE LIGNE A DÉMÉNAGÉ LE 28/07/2026 (E46). La liste plate de
 * `RealCrewScreen` est devenue les TROIS GROUPES de la spéc, dans
 * `CrewRosterGroups.tsx`. Les gardes ci-dessous suivent le code : ce qu'elles
 * protègent n'a pas changé d'un iota — un membre bloqué reste masqué ligne par
 * ligne, et l'affordance « … » reste dérivée de l'éligibilité RÉELLE. La
 * DÉRIVATION (`rosterRows`), elle, est restée dans l'écran, qui la partage avec
 * la rangée d'aperçu.
 */
const ROSTER_ROWS = './CrewRosterGroups.tsx';
const BOARD_SCREEN = '../../../app/(tabs)/classement.tsx';

Deno.test('le ROSTER de crew masque les membres bloqués, ligne par ligne', async () => {
  // 1. la dérivation : chaque membre est confronté à la liste des bloqués…
  const derivation = await windowOf(ROSTER, 'const rosterRows = useMemo(', 'const stripMembers');
  assert(
    derivation.includes('isPseudoBlocked(') && derivation.includes('blockedPlayerRow'),
    'le roster doit consommer le prédicat — sinon bloquer n’a AUCUN effet (B3)',
  );
  // 2. …et c'est bien le nom MASQUÉ qui est rendu, pas `m.pseudo`.
  const render = await windowOf(ROSTER_ROWS, 'members.map(', 'const styles =');
  assert(render.includes('{m.displayName}'), 'la ligne doit rendre le nom masqué');
  assert(
    !render.includes('{m.pseudo}'),
    'rendre `m.pseudo` remettrait le pseudo bloqué à l’écran',
  );
  // 3. la rangée d'aperçu consomme la MÊME liste (sinon retour par les initiales).
  const strip = await windowOf(ROSTER, '<CrewMembersStrip', '/>');
  assert(strip.includes('members={stripMembers}'), 'la rangée d’aperçu doit être masquée aussi');
  // 4. …et l'écran passe bien ces lignes-là au composant de groupes : sans ce
  // fil, `CrewRosterGroups` pourrait masquer parfaitement une liste que
  // personne ne lui donne.
  const wiring = await windowOf(ROSTER, '<CrewRosterGroups', '/>');
  assert(wiring.includes('rows={rosterRows}'), 'les groupes doivent lire les lignes MASQUÉES');
});

Deno.test('le CLASSEMENT masque le pseudo bloqué dans la LISTE **et** sur le PODIUM', async () => {
  const podium = await windowOf(BOARD_SCREEN, 'function Podium(', 'function BoardRow(');
  assert(
    podium.includes('displayedPseudo(') && podium.includes('blockedPlayerRow'),
    'le podium affiche des pseudos : il doit masquer les bloqués (B3)',
  );
  assert(!podium.includes('{row.name}'), 'le podium ne doit plus rendre le pseudo brut');
  const row = await windowOf(BOARD_SCREEN, 'function BoardRow(', 'function BoardEmpty(');
  assert(
    row.includes('displayedPseudo(') && row.includes('blockedPlayerRow'),
    'la ligne de classement doit masquer les bloqués (B3)',
  );
  assert(!row.includes('{row.name}'), 'la ligne ne doit plus rendre le pseudo brut');
});

Deno.test('les DEUX surfaces portent l’affordance de signalement, sur la LIGNE (B4)', async () => {
  const windows: readonly (readonly [string, string, string])[] = [
    [ROSTER_ROWS, 'members.map(', 'const styles ='],
    [BOARD_SCREEN, 'function BoardRow(', 'function BoardEmpty('],
    [BOARD_SCREEN, 'function Podium(', 'function BoardRow('],
  ];
  for (const [path, start, end] of windows) {
    const w = await windowOf(path, start, end);
    assert(
      w.includes('canModeratePlayer('),
      `${path} (${start}) : l’action « … » doit être dérivée de l’éligibilité réelle`,
    );
    assert(
      w.includes('<PlayerActionsButton'),
      `${path} (${start}) : la ligne d’un joueur doit porter l’affordance « … » (1.2)`,
    );
  }
  // La feuille est montée UNE fois par écran (jamais une par ligne).
  for (const path of [ROSTER, BOARD_SCREEN]) {
    const src = await sourceOf(path);
    assertEquals(
      src.split('<PlayerModerationSheet').length - 1,
      1,
      `${path} : la feuille { Signaler · Bloquer } est montée une seule fois par l’écran`,
    );
  }
});

Deno.test('la feuille appelle les fonctions DÉJÀ branchées, sans rien réimplémenter', async () => {
  const src = await sourceOf('./PlayerModerationSheet.tsx');
  // `reportContent` écrit dans `content_reports`, `blockMember` dans
  // `user_blocks` (moderation.ts). Une feuille qui ne ferait que du local
  // serait une deuxième promesse creuse.
  assert(src.includes('reportContent(input)'), 'le signalement doit partir par reportContent');
  assert(src.includes('blockMember(target)'), 'le blocage doit passer par blockMember');
  assert(src.includes('unblockMember(target)'), 'le déblocage doit passer par unblockMember');
  // La charge utile vient de la LIGNE (fonction pure), jamais d'un champ saisi.
  assert(src.includes('memberReportInput('), 'le signalement doit être pré-rempli');
  assert(
    !src.includes('TextInput'),
    'aucune saisie de pseudo dans la feuille : elle est pré-remplie par construction',
  );
});

Deno.test('aucune lecture NON ABONNÉE du store : `isBlocked` ne revient pas', async () => {
  // Le piège d'origine : `isBlocked()` lisait le snapshot du module sans
  // abonner l'appelant. Un écran qui l'aurait appelé au rendu n'aurait pas été
  // re-rendu au blocage suivant — la ligne serait restée visible. Les surfaces
  // passent par `useModeration` (via `useBlockedPseudos`), jamais par là.
  const src = await sourceOf('./moderation.ts');
  assertEquals(src.includes('export function isBlocked'), false);
  assert(src.includes('export function useModeration'), 'le hook abonné reste la porte d’entrée');
});

Deno.test('l’affordance « … » n’est JAMAIS chartreuse (§A4 : un seul CTA par écran)', async () => {
  const src = await Deno.readTextFile(new URL('./PlayerModerationSheet.tsx', import.meta.url));
  // Le glyphe de la ligne est gris ; la feuille n'emploie que des boutons ghost.
  assert(src.includes('moreGlyph: { color: colors.gris'), 'le « … » de la ligne reste gris');
  assertEquals(src.includes("variant=\"primary\""), false);
});
