/**
 * GRYD — E46/E47 : la table de vérité du POUVOIR SUR AUTRUI, côté écran.
 *
 * Ces tests ne prouvent AUCUNE sécurité — c'est 0093 et son test PGlite qui la
 * portent, et eux seuls. Ce qu'ils prouvent, c'est que l'écran ne PEINT jamais
 * un geste que le serveur refuserait (constitution §2, « aucun bouton mort »),
 * et qu'il n'en CACHE aucun que le serveur accepterait — un fondateur qui ne
 * trouve pas « transférer » cherchera un réglage inexistant.
 *
 * ⚠ LE VRAI RISQUE N'EST PAS L'ERREUR, C'EST LA DÉRIVE. Les mêmes bornes vivent
 * en PL/pgSQL (0093) et en TypeScript (memberRoles.ts). Un jour, l'une bougera
 * sans l'autre. Le dernier bloc de ce fichier lit donc `0093_crew_member_roles.sql`
 * SUR DISQUE et vérifie que ses listes de rôles sont exactement celles de
 * game-rules — un plafond de co_captain déplacé d'un cran dans le SQL casse ici.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CO_CAPTAIN_KICKABLE_ROLES,
  CO_CAPTAIN_PROMOTE_MAX_ROLE,
  CREW_ROLES,
  CREW_ROLE_GROUPS,
  CREW_ROLE_GROUP_ORDER,
  type CrewRole,
} from '../../../../../packages/shared/src/game-rules.ts';
import {
  assignableRolesFor,
  groupOf,
  groupRoster,
  isCrewRole,
  leaveVerdict,
  nextRoleDown,
  nextRoleUp,
  roleActionsFor,
  roleHas,
  roleRank,
} from './memberRoles.ts';

// ─── 1. Lecture des rôles ────────────────────────────────────────────────────

Deno.test('roleRank : miroir de CREW_ROLES, et l’inconnu passe SOUS tout le monde', () => {
  CREW_ROLES.forEach((r, i) => assertEquals(roleRank(r), i, `rang de ${r}`));
  assertEquals(roleRank('archiduc'), -1, 'un rôle inconnu ne doit jamais dominer');
  assertEquals(isCrewRole('archiduc'), false);
  assertEquals(isCrewRole('founder'), true);
});

Deno.test('groupOf : les 7 rôles tombent dans les 3 groupes E46, sans exception', () => {
  for (const r of CREW_ROLES) {
    const g = groupOf(r);
    assert(g !== null, `${r} n'appartient à aucun groupe`);
    assert(
      (CREW_ROLE_GROUPS[g] as readonly string[]).includes(r),
      `${r} rangé dans le mauvais groupe`,
    );
  }
  assertEquals(groupOf('archiduc'), null, 'un rôle inconnu n’invente pas un groupe');
});

Deno.test('roleHas : un rôle inconnu n’a AUCUN droit (jamais l’inverse)', () => {
  assertEquals(roleHas('archiduc', 'kick'), false);
  assertEquals(roleHas('archiduc', 'chat'), false);
  assertEquals(roleHas('founder', 'transferFoundership'), true);
  assertEquals(roleHas('co_captain', 'transferFoundership'), false);
});

// ─── 2. E46 — le roster en trois groupes ─────────────────────────────────────

Deno.test('groupRoster : trois groupes TOUJOURS rendus, même vides', () => {
  const groups = groupRoster([{ userId: 'a', role: 'founder' }]);
  assertEquals(groups.length, CREW_ROLE_GROUP_ORDER.length);
  assertEquals(groups.map((g) => g.group), [...CREW_ROLE_GROUP_ORDER], 'ordre de la spéc');
  assertEquals(groups[0]!.members.length, 1, 'le chef');
  // Un crew neuf n'a AUCUN officier. Masquer le groupe ferait paraître la
  // hiérarchie cassée ; le rendre vide est un fait, et l'écran le dit.
  assertEquals(groups[1]!.members.length, 0, 'officiers vides, mais présents');
  assertEquals(groups[2]!.members.length, 0);
});

Deno.test('groupRoster : l’ordre reçu est PRÉSERVÉ dans chaque groupe', () => {
  // Le roster arrive trié par ancienneté (real.ts). L'écran ne doit pas sauter
  // sous le doigt quand crew_overview enrichit les rôles.
  const groups = groupRoster([
    { userId: 'vieux', role: 'runner' },
    { userId: 'chef', role: 'founder' },
    { userId: 'recent', role: 'rookie' },
    { userId: 'officier', role: 'captain' },
  ]);
  assertEquals(groups[0]!.members.map((m) => m.userId), ['chef']);
  assertEquals(groups[1]!.members.map((m) => m.userId), ['officier']);
  assertEquals(groups[2]!.members.map((m) => m.userId), ['vieux', 'recent']);
});

Deno.test('groupRoster : un rôle inconnu du serveur atterrit en « membres », sans droit', () => {
  // La DB reste souveraine sur la valeur : une ligne au rôle inattendu doit
  // traverser l'écran sans le casser ET sans se voir attribuer de pouvoir.
  const groups = groupRoster([{ userId: 'x', role: 'archiduc' }]);
  assertEquals(groups[2]!.members.map((m) => m.userId), ['x']);
  assertEquals(roleActionsFor({ actorRole: 'archiduc', targetRole: 'rookie', isMe: false }), []);
});

Deno.test('groupRoster : aucune ligne n’est perdue ni dupliquée', () => {
  const roster = CREW_ROLES.map((role, i) => ({ userId: `u${i}`, role }));
  const flat = groupRoster(roster).flatMap((g) => g.members.map((m) => m.userId));
  assertEquals(flat.length, roster.length, 'compte conservé');
  assertEquals(new Set(flat).size, roster.length, 'aucun doublon');
});

// ─── 3. E47 — les actions de rôle ────────────────────────────────────────────

Deno.test('MA PROPRE LIGNE n’ouvre AUCUNE action de rôle (anti auto-promotion)', () => {
  for (const role of CREW_ROLES) {
    assertEquals(
      roleActionsFor({ actorRole: role, targetRole: role, isMe: true }),
      [],
      `${role} sur lui-même`,
    );
  }
});

Deno.test('un membre simple ne peut RIEN sur personne', () => {
  for (const actor of ['rookie', 'runner', 'scout', 'strategist', 'captain'] as CrewRole[]) {
    for (const target of CREW_ROLES) {
      assertEquals(
        roleActionsFor({ actorRole: actor, targetRole: target, isMe: false }),
        [],
        `${actor} → ${target}`,
      );
    }
  }
});

Deno.test('LE FONDATEUR EST INTOUCHABLE — aucune action ne se peint sur sa ligne', () => {
  for (const actor of CREW_ROLES) {
    assertEquals(
      roleActionsFor({ actorRole: actor, targetRole: 'founder', isMe: false }),
      [],
      `${actor} → founder`,
    );
  }
});

Deno.test('le founder : promouvoir, rétrograder, exclure, transférer', () => {
  const a = roleActionsFor({ actorRole: 'founder', targetRole: 'runner', isMe: false });
  assertEquals(a.sort(), ['demote', 'promote', 'remove', 'transfer_lead']);
  // Sur un rookie, il n'y a rien EN DESSOUS : « rétrograder » disparaît, sans
  // quoi la feuille ouvrirait une liste vide.
  const b = roleActionsFor({ actorRole: 'founder', targetRole: 'rookie', isMe: false });
  assertEquals(b.includes('demote'), false, 'rien sous le rookie');
  assertEquals(b.includes('promote'), true);
  // Sur un co_captain, il n'y a rien AU-DESSUS (founder ne s'attribue pas).
  const c = roleActionsFor({ actorRole: 'founder', targetRole: 'co_captain', isMe: false });
  assertEquals(c.includes('promote'), false, 'founder ne s’attribue pas par promotion');
  assertEquals(c.includes('demote'), true);
});

Deno.test('un co_captain ne touche pas son PAIR, et ne transfère jamais', () => {
  const pair = roleActionsFor({ actorRole: 'co_captain', targetRole: 'co_captain', isMe: false });
  assertEquals(pair, [], 'même rang = aucune action');
  const sur = roleActionsFor({ actorRole: 'co_captain', targetRole: 'rookie', isMe: false });
  assertEquals(sur.includes('transfer_lead'), false, 'le transfert est au founder seul');
});

Deno.test(
  `co_captain : périmètre d’exclusion = CO_CAPTAIN_KICKABLE_ROLES (${CO_CAPTAIN_KICKABLE_ROLES.join(', ')})`,
  () => {
    for (const target of CREW_ROLES) {
      const actions = roleActionsFor({ actorRole: 'co_captain', targetRole: target, isMe: false });
      const attendu =
        (CO_CAPTAIN_KICKABLE_ROLES as readonly string[]).includes(target) &&
        roleRank(target) < roleRank('co_captain');
      assertEquals(actions.includes('remove'), attendu, `co_captain exclut-il un ${target} ?`);
    }
  },
);

Deno.test(`co_captain : plafond d’attribution = CO_CAPTAIN_PROMOTE_MAX_ROLE (${CO_CAPTAIN_PROMOTE_MAX_ROLE})`, () => {
  const assignables = assignableRolesFor('co_captain', 'rookie');
  for (const r of assignables) {
    assert(
      roleRank(r) <= roleRank(CO_CAPTAIN_PROMOTE_MAX_ROLE),
      `${r} dépasse le plafond du co_captain`,
    );
  }
  // Le cran AU-DESSUS du plafond, dérivé de game-rules, jamais écrit ici.
  const above = CREW_ROLES[CREW_ROLES.indexOf(CO_CAPTAIN_PROMOTE_MAX_ROLE) + 1]!;
  assertEquals(assignables.includes(above), false, `${above} ne doit pas être attribuable`);
  // Et il ne touche pas une CIBLE au-dessus de son plafond (un captain).
  assertEquals(assignableRolesFor('co_captain', above), [], `cible ${above} hors périmètre`);
});

Deno.test('`founder` n’est JAMAIS attribuable — par personne, sur personne', () => {
  for (const actor of CREW_ROLES) {
    for (const target of CREW_ROLES) {
      assertEquals(
        assignableRolesFor(actor, target).includes('founder'),
        false,
        `${actor} attribuant founder à un ${target}`,
      );
    }
  }
});

Deno.test('nextRoleUp / nextRoleDown : UN cran, jamais un sélecteur à sept entrées', () => {
  assertEquals(nextRoleUp('founder', 'rookie'), 'runner', '+1 cran');
  assertEquals(nextRoleDown('founder', 'rookie'), null, 'rien sous le rookie');
  assertEquals(nextRoleDown('founder', 'co_captain'), 'captain', '-1 cran');
  assertEquals(nextRoleUp('founder', 'co_captain'), null, 'rien au-dessus (hors transfert)');
  assertEquals(
    nextRoleUp('co_captain', CO_CAPTAIN_PROMOTE_MAX_ROLE),
    null,
    'le co_captain bute sur son plafond',
  );
});

Deno.test('cohérence : une action peinte a toujours un rôle à proposer derrière', () => {
  // C'est la définition même d'un bouton mort : « promouvoir » qui ouvre une
  // liste vide. On la cherche exhaustivement sur les 49 couples.
  for (const actor of CREW_ROLES) {
    for (const target of CREW_ROLES) {
      const actions = roleActionsFor({ actorRole: actor, targetRole: target, isMe: false });
      if (actions.includes('promote')) {
        assert(nextRoleUp(actor, target) !== null, `${actor}→${target} : promouvoir sans cible`);
      }
      if (actions.includes('demote')) {
        assert(nextRoleDown(actor, target) !== null, `${actor}→${target} : rétrograder sans cible`);
      }
    }
  }
});

// ─── 4. Le départ ────────────────────────────────────────────────────────────

Deno.test('LE DERNIER CHEF NE PART PAS SANS TRANSMETTRE (miroir de leave_crew, 0093)', () => {
  assertEquals(leaveVerdict('founder', 4), 'must_transfer_lead', 'il reste 3 personnes derrière');
  assertEquals(leaveVerdict('founder', 2), 'must_transfer_lead', 'il en reste une');
  // Seul au monde : il n'abandonne personne, le serveur l'autorise.
  assertEquals(leaveVerdict('founder', 1), 'can_leave');
  assertEquals(leaveVerdict('founder', 0), 'can_leave', 'effectif inconnu/0 : pas de blocage');
  for (const r of CREW_ROLES.filter((r) => r !== 'founder')) {
    assertEquals(leaveVerdict(r, 10), 'can_leave', `${r} part quand il veut`);
  }
});

// ─── 5. GARDE-FOU DE DÉRIVE : le SQL de 0093, relu sur disque ────────────────

Deno.test('0093 et game-rules ne dérivent pas : les listes de rôles du SQL sont les bonnes', async () => {
  const sql = await Deno.readTextFile(
    new URL('../../../../../supabase/migrations/0093_crew_member_roles.sql', import.meta.url),
  );

  // a) `crew_role_rank` énumère CREW_ROLES dans l'ORDRE — un ordre différent
  // inverserait toute la hiérarchie sans qu'aucun test SQL ne s'en aperçoive.
  const rank = sql.match(/array\[([^\]]+)\]/);
  assert(rank !== null, 'tableau de rôles introuvable dans crew_role_rank');
  const ordre = rank[1]!.split(',').map((s) => s.trim().replace(/'/g, ''));
  assertEquals(ordre, [...CREW_ROLES], 'crew_role_rank a dérivé de CREW_ROLES');

  // b) le rôle attribuable par `crew_set_member_role` = CREW_ROLES moins founder.
  const attribuables = sql.match(/v_new_role not in \(([^)]+)\)/);
  assert(attribuables !== null, 'liste des rôles attribuables introuvable');
  assertEquals(
    attribuables[1]!.split(',').map((s) => s.trim().replace(/'/g, '')).sort(),
    CREW_ROLES.filter((r) => r !== 'founder').slice().sort(),
    'le SQL n’attribue pas exactement CREW_ROLES privé de founder',
  );

  // c) le périmètre d'exclusion du co_captain.
  const kick = sql.match(/and v_target_role not in \(([^)]+)\)/);
  assert(kick !== null, 'périmètre d’exclusion du co_captain introuvable');
  assertEquals(
    kick[1]!.split(',').map((s) => s.trim().replace(/'/g, '')).sort(),
    [...CO_CAPTAIN_KICKABLE_ROLES].sort(),
    'CO_CAPTAIN_KICKABLE_ROLES a dérivé entre le SQL et game-rules',
  );

  // d) le plafond de promotion du co_captain.
  assert(
    sql.includes(`public.crew_role_rank('${CO_CAPTAIN_PROMOTE_MAX_ROLE}')`),
    `le SQL ne plafonne pas le co_captain à ${CO_CAPTAIN_PROMOTE_MAX_ROLE}`,
  );
});
