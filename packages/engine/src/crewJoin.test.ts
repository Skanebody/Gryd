/**
 * GRYD — tests de engine/crewJoin.ts (pré-vol des RPC crew : create / join /
 * accès à la création).
 *
 * Ce que ces tests VERROUILLENT sont des RÈGLES DE JEU, pas des implémentations :
 * qui peut fonder, qui peut rejoindre, combien de temps un départ interdit le
 * suivant, et QUELS ACCÈS un fondateur peut choisir à la naissance de son crew.
 * Écrits en français parce qu'ils se relisent comme la règle.
 *
 * BORDS COUVERTS EXPRÈS :
 *  · le cooldown à EXACTEMENT N jours (la borne est ouverte : 0 jour restant) ;
 *  · une `lastLeftAt` invalide (jamais de cooldown fantôme) ;
 *  · un crew cible pile au plafond ;
 *  · `closed`, qui EXISTE dans CREW_RECRUITMENT_STATUSES mais n'est PAS
 *    proposable à la création — c'est exactement le piège que 0097 refuse ;
 *  · l'absence de choix (`null` / `undefined`), qui vaut « défaut du serveur ».
 *
 * MÊMES CONTRAINTES D'OUTILLAGE que contest.test.ts, pour les mêmes raisons :
 * aucun import externe, et le global `Deno` déclaré localement.
 */
import {
  crewCreateDecision,
  crewJoinDecision,
  isCrewRecruitmentAtCreation,
} from './crewJoin.ts';
import {
  CREW_MAX_MEMBERS,
  CREW_RECRUITMENT_AT_CREATION,
  CREW_RECRUITMENT_DEFAULT,
  CREW_RECRUITMENT_STATUSES,
  CREW_SWITCH_COOLDOWN_DAYS,
} from '@klaim/shared/game-rules';

// Voir le docblock : le runner Deno, typé localement.
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEgal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  attendu : ${e}\n  obtenu  : ${a}`);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-28T12:00:00.000Z');

// ═══ L'ACCÈS CHOISI À LA CRÉATION (E41, migration 0097) ══════════════════════

Deno.test('E41 — les trois accès de la création sont acceptés', () => {
  for (const statut of CREW_RECRUITMENT_AT_CREATION) {
    assert(isCrewRecruitmentAtCreation(statut), `${statut} devrait être proposable`);
  }
  assertEgal(CREW_RECRUITMENT_AT_CREATION.length, 3, 'la spéc E41 en demande trois');
});

Deno.test('E41 — « closed » existe, mais un crew ne naît PAS muré', () => {
  assert(
    (CREW_RECRUITMENT_STATUSES as readonly string[]).includes('closed'),
    'closed doit rester un statut valide du produit (crew_edit le pose)',
  );
  assert(
    !isCrewRecruitmentAtCreation('closed'),
    'closed ne doit PAS être proposable à la création',
  );
});

Deno.test('E41 — un statut inconnu est refusé, jamais replié en silence', () => {
  for (const faux of ['', 'ouvert', 'OPEN', 'on request', 'sur_invitation']) {
    assert(!isCrewRecruitmentAtCreation(faux), `« ${faux} » ne doit pas passer`);
  }
});

Deno.test('E41 — ne pas se prononcer est légitime : le serveur applique son défaut', () => {
  assert(isCrewRecruitmentAtCreation(null), 'null = pas de choix');
  assert(isCrewRecruitmentAtCreation(undefined), 'undefined = pas de choix');
  // Et ce défaut est bien l'un des trois choix, sinon l'écran ne pourrait pas
  // le présenter comme sélectionné au premier affichage.
  assert(
    (CREW_RECRUITMENT_AT_CREATION as readonly string[]).includes(CREW_RECRUITMENT_DEFAULT),
    'CREW_RECRUITMENT_DEFAULT doit faire partie des choix de création',
  );
});

// ═══ CRÉATION : appartenance et cooldown ════════════════════════════════════

Deno.test('création — sans crew et sans départ récent, on fonde', () => {
  assertEgal(
    crewCreateDecision({ now: NOW, activeCrewId: null, lastLeftAt: null }),
    { ok: true },
    'verdict',
  );
});

Deno.test('création — déjà dans un crew : on ne fonde pas un doublon', () => {
  assertEgal(
    crewCreateDecision({ now: NOW, activeCrewId: 'crew-1', lastLeftAt: null }),
    { ok: false, reason: 'already_in_crew' },
    'verdict',
  );
});

Deno.test('création — un départ récent bloque, avec le nombre de jours restants', () => {
  const parti = new Date(NOW.getTime() - 2 * MS_PER_DAY);
  assertEgal(
    crewCreateDecision({ now: NOW, activeCrewId: null, lastLeftAt: parti }),
    { ok: false, reason: 'cooldown', daysLeft: CREW_SWITCH_COOLDOWN_DAYS - 2 },
    'verdict',
  );
});

Deno.test('création — à EXACTEMENT N jours, le cooldown est fini (borne ouverte)', () => {
  const parti = new Date(NOW.getTime() - CREW_SWITCH_COOLDOWN_DAYS * MS_PER_DAY);
  assertEgal(
    crewCreateDecision({ now: NOW, activeCrewId: null, lastLeftAt: parti }),
    { ok: true },
    'verdict',
  );
});

Deno.test('création — une date invalide ne fabrique JAMAIS un cooldown fantôme', () => {
  assertEgal(
    crewCreateDecision({ now: NOW, activeCrewId: null, lastLeftAt: new Date('nawak') }),
    { ok: true },
    'verdict',
  );
});

// ═══ ADHÉSION ═══════════════════════════════════════════════════════════════

Deno.test('adhésion — rejoindre le crew dont on est déjà membre est un non-événement', () => {
  assertEgal(
    crewJoinDecision(
      { now: NOW, activeCrewId: 'crew-1', lastLeftAt: null, targetMemberCount: 3 },
      'crew-1',
    ),
    { ok: false, reason: 'already_member' },
    'verdict',
  );
});

Deno.test('adhésion — le cooldown passe AVANT le plafond (ordre du contrat RPC)', () => {
  const parti = new Date(NOW.getTime() - MS_PER_DAY);
  assertEgal(
    crewJoinDecision(
      { now: NOW, activeCrewId: null, lastLeftAt: parti, targetMemberCount: CREW_MAX_MEMBERS },
      'crew-2',
    ),
    { ok: false, reason: 'cooldown', daysLeft: CREW_SWITCH_COOLDOWN_DAYS - 1 },
    'verdict',
  );
});

Deno.test('adhésion — un crew PILE au plafond est plein ; une place en moins, on entre', () => {
  const base = { now: NOW, activeCrewId: null, lastLeftAt: null } as const;
  assertEgal(
    crewJoinDecision({ ...base, targetMemberCount: CREW_MAX_MEMBERS }, 'crew-2'),
    { ok: false, reason: 'full' },
    'au plafond',
  );
  assertEgal(
    crewJoinDecision({ ...base, targetMemberCount: CREW_MAX_MEMBERS - 1 }, 'crew-2'),
    { ok: true },
    'une place libre',
  );
});
