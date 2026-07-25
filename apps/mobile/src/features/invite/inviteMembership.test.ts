/**
 * GRYD — verrouillage de l'écran d'invitation `/c/[code]` (25/07/2026).
 *
 * POURQUOI CE TEST EXISTE. `fetchMyCode` replie une PANNE et une ABSENCE DE CREW
 * sur la même valeur (`{ ok:false, reason:'no_crew' }`). L'écran distinguait donc
 * deux réalités opposées avec une seule information — et proposait « Rejoindre »
 * à quelqu'un qui en est peut-être déjà membre. La séparation repose entièrement
 * sur le croisement fait ici ; si elle casse, elle casse en SILENCE, et l'écran
 * que traverse tout nouveau recruté se remet à affirmer ce qu'il n'a pas lu.
 *
 * Le second enjeu est destructif : `join_crew_by_code` fait un SWITCH (clôture
 * l'adhésion active). Confondre « autre crew » et « pas de crew », c'est faire
 * quitter son crew à quelqu'un sans le lui avoir dit.
 *
 * Deno, zéro réseau, zéro horloge : la fonction est pure, tout entre par l'input.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { inviteMembership, type InviteMembershipInput } from './inviteMembership.ts';

const CODE = 'NIGHT1';

/** Adhésion LUE, sans crew, code pas encore revenu — le socle des variations. */
const base: InviteMembershipInput = {
  codeRead: null,
  membershipLoading: false,
  membershipFailed: false,
  hasCrew: false,
  invitedCode: CODE,
};

Deno.test("④ tant que rien n'est revenu, l'écran n'affirme rien", () => {
  assertEquals(inviteMembership(base), 'reading');
  // Même au tout premier rendu, quand `useRealCrew` n'a pas encore levé son
  // `loading` : lire son `crew: null` initial dirait « pas de crew » sans avoir
  // regardé. La lecture du code passe AVANT, et elle vaut `null`.
  assertEquals(inviteMembership({ ...base, membershipLoading: false }), 'reading');
});

Deno.test('④ code pas revenu ET adhésion en vol : toujours « je lis »', () => {
  assertEquals(inviteMembership({ ...base, membershipLoading: true }), 'reading');
});

Deno.test('(a) mon code EST celui de l’invitation → déjà membre de CE crew', () => {
  assertEquals(
    inviteMembership({ ...base, codeRead: { ok: true, code: CODE }, hasCrew: true }),
    'this-crew',
  );
});

Deno.test('(a) la comparaison ne se laisse pas piéger par la casse ni les espaces', () => {
  assertEquals(
    inviteMembership({ ...base, codeRead: { ok: true, code: ' night1 ' }, hasCrew: true }),
    'this-crew',
  );
});

Deno.test('(b′) un AUTRE code = un AUTRE crew : rejoindre ici l’en fait sortir', () => {
  assertEquals(
    inviteMembership({ ...base, codeRead: { ok: true, code: 'OTHER2' }, hasCrew: true }),
    'other-crew',
  );
});

Deno.test('un code LU tranche même si la lecture d’adhésion a échoué à côté', () => {
  // Savoir MON code suffit : la panne de l'autre lecture ne rend pas la réponse
  // douteuse, elle est simplement inutile ici.
  assertEquals(
    inviteMembership({
      ...base,
      codeRead: { ok: true, code: CODE },
      membershipFailed: true,
      hasCrew: false,
    }),
    'this-crew',
  );
});

Deno.test('② pas de code ET pas de crew, tout lu → vide honnête, on peut rejoindre', () => {
  assertEquals(inviteMembership({ ...base, codeRead: { ok: false } }), 'no-crew');
});

Deno.test('③ LA correction : avoir un crew sans obtenir son code est une PANNE', () => {
  // C'est exactement le cas que l'écran rendait comme « tu n'es pas dans ce
  // crew ». La contradiction est la seule preuve disponible — `fetchMyCode`
  // ayant effacé la vraie raison.
  assertEquals(
    inviteMembership({ ...base, codeRead: { ok: false }, hasCrew: true }),
    'unreadable',
  );
});

Deno.test('③ l’échec de la lecture d’adhésion se propage : on ne sait pas', () => {
  assertEquals(
    inviteMembership({ ...base, codeRead: { ok: false }, membershipFailed: true }),
    'unreadable',
  );
});

Deno.test('③ n’est jamais confondu avec ② : les deux entrées donnent deux sorties', () => {
  const failed = inviteMembership({ ...base, codeRead: { ok: false }, hasCrew: true });
  const empty = inviteMembership({ ...base, codeRead: { ok: false }, hasCrew: false });
  assertEquals(failed === empty, false);
});

Deno.test('aucun état n’est produit hors des cinq nommés', () => {
  const cases: InviteMembershipInput[] = [
    base,
    { ...base, membershipLoading: true },
    { ...base, membershipFailed: true },
    { ...base, codeRead: { ok: false } },
    { ...base, codeRead: { ok: false }, hasCrew: true },
    { ...base, codeRead: { ok: true, code: CODE } },
    { ...base, codeRead: { ok: true, code: 'ZZZ999' } },
  ];
  const allowed = ['reading', 'unreadable', 'this-crew', 'other-crew', 'no-crew'];
  for (const c of cases) {
    assertEquals(allowed.includes(inviteMembership(c)), true);
  }
});
