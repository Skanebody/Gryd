/**
 * GRYD — LE TABLEAU DE SUIVI : « non partagé » n'est NI un zéro NI un tiret.
 *
 * ─── LE SEUL DÉFAUT QUE CE FICHIER EXISTE POUR ATTRAPER ─────────────────────
 * `crew_member_board_2026` rend, pour chaque mesure, soit une valeur, soit le
 * littéral `'not_shared'`. Un client qui écrirait `row.distance28dKm ?? 0`
 * afficherait « 0 km » à un capitaine, c'est-à-dire « cette personne n'a pas
 * couru » — alors que le serveur a dit « je ne te le montre pas ». C'est le
 * mensonge que L8 interdit, et le plus facile à commettre ici : deux caractères.
 *
 * Ces tests fixent donc les TROIS cas et refusent qu'on les confonde :
 *   `42` (lu) · `'not_shared'` (masqué) · `null` sur `lastRunAt` SEULEMENT
 *   (« n'a jamais couru », qui est un fait).
 *
 * ─── ÉTAPE 0 ────────────────────────────────────────────────────────────────
 * Avant 0189, AUCUNE mesure par membre n'existait : `crew_overview` rendait un
 * roster et des rôles. Le trou ④ de la spec. Il n'y avait donc aucun endroit où
 * commettre ce défaut, et aucun test pour l'empêcher quand il deviendrait
 * possible. C'est ce que ce fichier ferme.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CREW_MEASURE_NOT_SHARED } from '@klaim/shared';
import {
  boardAlerts,
  enforcementImpact,
  isShared,
  openWarnings,
  parseBoard,
  parseBoardRow,
  parseDecisions,
  parseStanding,
  refusalOf2026,
} from './crewBoard2026.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

const T0 = Date.parse('2026-09-10T18:47:00.793+00:00');
const jours = (n: number) => new Date(T0 - n * 86_400_000).toISOString();

/** Copié du §6.3 : Dee est ouverte, Sam a fermé son profil. */
const REPONSE: unknown = {
  ok: true,
  sort: 'last_run',
  filter: null,
  generatedAt: '2026-09-10T18:47:00.793+00:00',
  rulesActive: { max_inactivity_days: 14, auto_remove_after_days: 7 },
  rows: [
    {
      userId: '44444444-4444-4444-4444-444444444444',
      pseudo: 'Dee',
      role: 'runner',
      duty: 'member',
      joinedAt: jours(100),
      seniorityDays: 100,
      lastRunAt: jours(1),
      runs7d: 2,
      runs28d: 2,
      distance7dKm: 22,
      distance28dKm: 22,
      loops28d: 1,
      challengeDays: 0,
      outingsJoined28d: 0,
      outingsCreated28d: 0,
      warnings: [],
      standing: 'compliant',
      removalAt: null,
    },
    {
      userId: '55555555-5555-5555-5555-555555555555',
      pseudo: 'Sam',
      role: 'runner',
      duty: 'member',
      joinedAt: jours(80),
      seniorityDays: 80,
      lastRunAt: jours(30),
      runs7d: 'not_shared',
      runs28d: 'not_shared',
      distance7dKm: 'not_shared',
      distance28dKm: 'not_shared',
      loops28d: 'not_shared',
      challengeDays: 'not_shared',
      outingsJoined28d: 'not_shared',
      outingsCreated28d: 'not_shared',
      warnings: [],
      standing: 'compliant',
      removalAt: null,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ① LES TROIS CAS D'UNE MESURE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('mesure : `not_shared` traverse le parseur SANS devenir un nombre', () => {
  const board = parseBoard(REPONSE)!;
  const [dee, sam] = board.rows;
  assertEquals(isShared(dee!.distance28dKm), true);
  assertEquals(dee!.distance28dKm, 22);
  assertEquals(isShared(sam!.distance28dKm), false);
  assertEquals(sam!.distance28dKm, CREW_MEASURE_NOT_SHARED);
});

Deno.test('mesure : une valeur ILLISIBLE devient masquée, jamais zéro', () => {
  // « Je n'ai pas su lire » est plus proche de « je ne sais pas » que de
  // « rien ». Un zéro affirmerait quelque chose sur la personne.
  const row = parseBoardRow({
    userId: 'u',
    pseudo: 'X',
    distance28dKm: 'bizarre',
    runs7d: null,
  })!;
  assertEquals(row.distance28dKm, CREW_MEASURE_NOT_SHARED);
  assertEquals(row.runs7d, CREW_MEASURE_NOT_SHARED);
});

Deno.test('dernière sortie : les TROIS valeurs restent distinguables', () => {
  // `null` sur `lastRunAt` est le SEUL null porteur de sens du tableau : il dit
  // « cette personne n'a jamais couru », ce qui est un fait, pas un masquage.
  const jamais = parseBoardRow({ userId: 'u', pseudo: 'X', lastRunAt: null })!;
  assertEquals(jamais.lastRunAt, null);
  const masque = parseBoardRow({ userId: 'u', pseudo: 'X', lastRunAt: 'not_shared' })!;
  assertEquals(masque.lastRunAt, CREW_MEASURE_NOT_SHARED);
  const lu = parseBoardRow({ userId: 'u', pseudo: 'X', lastRunAt: jours(3) })!;
  assertEquals(typeof lu.lastRunAt, 'number');
});

Deno.test('ligne : sans identité, aucune ligne — on ne juge pas un anonyme', () => {
  assertEquals(parseBoardRow({ pseudo: 'X' }), null);
  assertEquals(parseBoardRow({ userId: 'u' }), null);
});

Deno.test('ligne : un `standing` inconnu vaut `rule_off`, jamais `warned`', () => {
  // `rule_off` ne reproche RIEN. `warned` accuserait quelqu'un sur la foi d'un
  // mot que le client n'a pas su lire.
  const row = parseBoardRow({ userId: 'u', pseudo: 'X', standing: 'quoi' })!;
  assertEquals(row.standing, 'rule_off');
});

Deno.test('avertissement : `issuedBy` ne rend JAMAIS un pseudo', () => {
  // Le journal nomme le décideur ; le tableau ne le fait pas. Tout ce qui n'est
  // pas explicitement `officer` est traité comme le serveur.
  const row = parseBoardRow({
    userId: 'u',
    pseudo: 'X',
    warnings: [
      { id: 'w1', kind: 'inactivity', issuedAt: jours(2), issuedBy: 'server' },
      { id: 'w2', kind: 'manual', issuedAt: jours(1), issuedBy: 'Ada' },
      { id: 'w3', kind: 'inventé', issuedAt: jours(1) },
    ],
  })!;
  assertEquals(row.warnings.length, 2, 'une nature inconnue est écartée');
  assertEquals(row.warnings[0]!.issuedBy, 'server');
  assertEquals(row.warnings[1]!.issuedBy, 'server', 'un pseudo n’est pas « officier »');
});

// ═══════════════════════════════════════════════════════════════════════════
// ② LES RÈGLES ACTIVES ET LES ALERTES
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('règles actives : seuls les seuils STRICTEMENT positifs comptent', () => {
  const board = parseBoard({
    ...(REPONSE as Record<string, unknown>),
    rulesActive: { max_inactivity_days: 14, min_weekly_outings: 0, inventée: 5 },
  })!;
  assertEquals(Object.keys(board.rulesActive), ['max_inactivity_days']);
});

Deno.test('alertes : elles comptent des LIGNES LUES, jamais une estimation', () => {
  const board = parseBoard({
    ...(REPONSE as Record<string, unknown>),
    rows: [
      { userId: 'a', pseudo: 'A', standing: 'at_risk' },
      { userId: 'b', pseudo: 'B', standing: 'warned' },
      { userId: 'c', pseudo: 'C', standing: 'compliant' },
      { userId: 'd', pseudo: 'D', standing: 'rule_off' },
    ],
  })!;
  assertEquals(boardAlerts(board), { atRisk: 1, warned: 1 });
});

Deno.test('tri et filtre inconnus retombent sur le défaut du serveur', () => {
  const board = parseBoard({
    ...(REPONSE as Record<string, unknown>),
    sort: 'par_couleur',
    filter: 'les_grands',
  })!;
  assertEquals(board.sort, 'last_run');
  assertEquals(board.filter, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ LA CONSÉQUENCE AVANT L'ARMEMENT (§4.1 B)
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('conséquence : les lignes MASQUÉES sont comptées à part, jamais avec', () => {
  /*
   * Dire « 1 membre sur 2 » quand on n'a pu regarder qu'une seule ligne serait
   * un chiffre faux présenté comme un fait. `unknown` existe pour que le
   * capitaine sache sur quoi porte le nombre qu'il lit.
   */
  const board = parseBoard(REPONSE)!;
  const impact = enforcementImpact(board.rows, 'max_inactivity_days', 14, T0)!;
  // Sam n'est PAS masquée sur cette mesure : `max_inactivity_days` est active,
  // donc elle déverrouille `lastRunAt` — et Sam n'est pas sortie depuis 30
  // jours. Dee, elle, a couru hier.
  assertEquals(impact.wouldWarn, 1, 'Sam dépasse les 14 jours, Dee a couru hier');
  assertEquals(impact.unknown, 0, 'la règle lit la dernière sortie de tout le monde');

  // La distance, elle, n'est déverrouillée par AUCUNE règle : `runs7d` de Sam
  // reste masquée, donc le compte « sorties par semaine » ne peut rien en dire.
  const hebdo = enforcementImpact(board.rows, 'min_weekly_outings', 3, T0)!;
  assertEquals(hebdo.wouldWarn, 1, 'Dee a 2 sorties, il en faudrait 3');
  assertEquals(hebdo.unknown, 1, 'Sam n’est ni conforme ni en faute : on ne sait pas');
});

Deno.test('conséquence : « jamais couru » est le cas d’inactivité le plus net', () => {
  const board = parseBoard({
    ...(REPONSE as Record<string, unknown>),
    rows: [{ userId: 'a', pseudo: 'A', lastRunAt: null }],
  })!;
  const impact = enforcementImpact(board.rows, 'max_inactivity_days', 7, T0)!;
  assertEquals(impact.wouldWarn, 1);
  assertEquals(impact.unknown, 0);
});

Deno.test('conséquence : le RETRAIT automatique ne se simule PAS', () => {
  /*
   * Il ne mesure rien par lui-même : il compte des jours APRÈS un avertissement
   * qui n'existe pas encore. Le simuler annoncerait des retraits imaginaires à
   * un capitaine qui n'a encore rien armé.
   */
  const board = parseBoard(REPONSE)!;
  assertEquals(enforcementImpact(board.rows, 'auto_remove_after_days', 7, T0), null);
});

Deno.test('conséquence : une règle ÉTEINTE n’a aucune conséquence à montrer', () => {
  const board = parseBoard(REPONSE)!;
  assertEquals(enforcementImpact(board.rows, 'max_inactivity_days', 0, T0), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ MA SITUATION
// ═══════════════════════════════════════════════════════════════════════════

const STANDING: unknown = {
  ok: true,
  crewId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  role: 'runner',
  duty: 'member',
  rules: { max_inactivity_days: 14, auto_remove_after_days: 7 },
  my: {
    lastRunAt: jours(30),
    runs7d: 0,
    runs28d: 0,
    distance28dKm: 0,
    loops28d: 0,
    challengeDays: 0,
  },
  warnings: [
    { id: 'w1', kind: 'inactivity', issuedAt: jours(2), issuedBy: 'server', resolvedAt: null },
    { id: 'w2', kind: 'manual', issuedAt: jours(9), issuedBy: 'officer', resolvedAt: jours(8) },
  ],
  atRisk: true,
  removalAt: jours(-5),
};

Deno.test('ma situation : MES mesures n’ont AUCUN masque', () => {
  // Aucune vie privée ne s'oppose à soi-même : ici, `0` veut vraiment dire zéro.
  const s = parseStanding(STANDING)!;
  assertEquals(s.my.runs7d, 0);
  assertEquals(s.my.distance28dKm, 0);
  assertEquals(typeof s.my.lastRunAtMs, 'number');
});

Deno.test('ma situation : seuls les avertissements NON LEVÉS appellent une suite', () => {
  const s = parseStanding(STANDING)!;
  assertEquals(s.warnings.length, 2, 'levé n’est pas effacé : la trace reste');
  assertEquals(openWarnings(s).length, 1);
  assertEquals(openWarnings(s)[0]!.id, 'w1');
});

Deno.test('ma situation : `atRisk` vient du SERVEUR, jamais dérivé de `removalAt`', () => {
  /*
   * Un client en avance sur une règle désarmée dirait « tu vas être retiré » à
   * quelqu'un qui ne risque rien. Le serveur seul sait si le retrait est armé.
   */
  const s = parseStanding({ ...(STANDING as Record<string, unknown>), atRisk: false })!;
  assertEquals(s.atRisk, false);
  assert(s.removalAtMs !== null, 'la date peut exister sans que le risque existe');
});

Deno.test('ma situation : un crew SANS règle rend un objet `rules` vide', () => {
  const s = parseStanding({ ...(STANDING as Record<string, unknown>), rules: {} })!;
  assertEquals(Object.keys(s.rules).length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ LE JOURNAL
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('journal : `automatic` distingue le job d’un officier', () => {
  const entries = parseDecisions({
    ok: true,
    entries: [
      { at: jours(1), kind: 'removal', actor: 'Ada', automatic: false, target: 'Gil', reason: 'inactivity' },
      { at: jours(2), kind: 'removal', actor: null, automatic: true, target: 'Bo', reason: 'inactivity' },
    ],
  })!;
  assertEquals(entries.length, 2);
  assertEquals(entries[0]!.actor, 'Ada');
  assertEquals(entries[1]!.actor, null);
  assertEquals(entries[1]!.automatic, true);
});

Deno.test('journal : une nature INCONNUE est écartée, jamais rangée ailleurs', () => {
  // Ranger une dissolution sous « départ » raconterait une autre histoire à
  // qui relit le journal six mois plus tard.
  const entries = parseDecisions({
    ok: true,
    entries: [
      { at: jours(1), kind: 'purge', actor: 'Ada' },
      { at: jours(2), kind: 'joined', actor: 'Bo' },
    ],
  })!;
  assertEquals(entries.length, 1);
  assertEquals(entries[0]!.kind, 'joined');
});

Deno.test('journal : une liste VIDE est une réponse, un refus rend null', () => {
  assertEquals(parseDecisions({ ok: true, entries: [] })!.length, 0);
  assertEquals(parseDecisions({ ok: false, reason: 'forbidden' }), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑥ LE VOCABULAIRE DE REFUS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('refus : un succès rend null, un mot inconnu rend `unknown`', () => {
  assertEquals(refusalOf2026({ ok: true }), null);
  assertEquals(refusalOf2026({ ok: false, reason: 'forbidden' }), 'forbidden');
  assertEquals(refusalOf2026({ ok: false, reason: 'active_challenge' }), 'active_challenge');
  // On ne devine JAMAIS : un motif futur ne se traduit pas au hasard.
  assertEquals(refusalOf2026({ ok: false, reason: 'nouveau_motif' }), 'unknown');
  assertEquals(refusalOf2026(null), 'unknown');
});
