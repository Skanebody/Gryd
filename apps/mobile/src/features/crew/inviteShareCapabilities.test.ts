/**
 * GRYD — E52 : « aucun bouton mort » (constitution §2), en fonction pure.
 *
 * Ce fichier n'existe pas pour couvrir des lignes : il existe parce que le
 * dépôt a déjà payé DEUX FOIS la même faute cette semaine — un bouton peint
 * d'abord, dont on découvre à l'appel qu'il ne peut pas marcher
 * (`CrewInviteQRScreen:130-135` et `qr.tsx:98-104` corrigent tous deux un
 * « copié » annoncé alors qu'une feuille de partage venait de s'ouvrir).
 *
 * Le test tient donc la règle DANS SON SENS STRICT : ce n'est pas « ne pas
 * peindre ce qui est cassé », c'est « ne peindre que ce qui est démontré ». La
 * différence tient dans un seul cas, et c'est le plus important du fichier :
 * une capacité NON SONDÉE (`undefined`) ne donne aucun bouton. Savoir qu'on ne
 * sait pas compte comme un non.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CREW_PERMISSIONS, type CrewRole } from '@klaim/shared';
import {
  INVITE_ACTION_ORDER,
  canIssueInvite,
  resolveInviteCapabilities,
  type InviteActionId,
  type InviteCapabilitiesInput,
} from './inviteShareCapabilities.ts';

/** Base « tout est possible » : chaque test n'en dévie que d'un cran. */
const FULL: InviteCapabilitiesInput = {
  platform: 'ios',
  hasShareable: true,
  clipboardAvailable: true,
  webShareAvailable: true,
  backendConfigured: true,
  myRole: 'founder',
  liveInviteCount: 2,
};

const ids = (input: InviteCapabilitiesInput): InviteActionId[] =>
  resolveInviteCapabilities(input).actions.map((a) => a.id);

const reasonFor = (input: InviteCapabilitiesInput, id: InviteActionId): string | undefined =>
  resolveInviteCapabilities(input).omitted.find((o) => o.id === id)?.reason;

Deno.test('aucun geste ne disparaît sans raison nommée', () => {
  for (const input of [FULL, { ...FULL, hasShareable: false }, { ...FULL, platform: 'web' as const }]) {
    const res = resolveInviteCapabilities(input);
    const all = [...res.actions.map((a) => a.id), ...res.omitted.map((o) => o.id)].sort();
    assertEquals(all, [...INVITE_ACTION_ORDER].sort());
  }
});

Deno.test('l’ordre est stable et vaut INVITE_ACTION_ORDER', () => {
  const painted = ids(FULL);
  const expected = INVITE_ACTION_ORDER.filter((id) => painted.includes(id));
  assertEquals(painted, [...expected]);
});

// ═══ RIEN À PARTAGER ════════════════════════════════════════════════════════

Deno.test('tant qu’il n’y a rien à partager, aucun geste de partage n’est peint', () => {
  const res = resolveInviteCapabilities({ ...FULL, hasShareable: false });
  assertEquals(res.actions.map((a) => a.id), ['create_link', 'revoke_link']);
  for (const id of ['qr', 'share', 'copy'] as const) {
    assertEquals(reasonFor({ ...FULL, hasShareable: false }, id), 'nothing_to_share');
  }
});

// ═══ LE CŒUR : « JE NE SAIS PAS » VAUT NON ══════════════════════════════════

Deno.test('une capacité NON SONDÉE ne donne aucun bouton', () => {
  const unprobed = { ...FULL, clipboardAvailable: undefined };
  assertEquals(ids(unprobed).includes('copy'), false);
  assertEquals(reasonFor(unprobed, 'copy'), 'capability_unknown');

  const web = { ...FULL, platform: 'web' as const, webShareAvailable: undefined };
  assertEquals(ids(web).includes('share'), false);
  assertEquals(reasonFor(web, 'share'), 'capability_unknown');
});

Deno.test('une capacité sondée ABSENTE se distingue d’une capacité non sondée', () => {
  assertEquals(reasonFor({ ...FULL, clipboardAvailable: false }, 'copy'), 'capability_absent');
  assertEquals(
    reasonFor({ ...FULL, platform: 'web', webShareAvailable: false }, 'share'),
    'capability_absent',
  );
});

// ═══ PLATEFORME ═════════════════════════════════════════════════════════════

Deno.test('sur natif, la feuille de partage est fournie par l’OS — rien à sonder', () => {
  for (const platform of ['ios', 'android'] as const) {
    const res = resolveInviteCapabilities({
      ...FULL,
      platform,
      webShareAvailable: undefined,
    });
    const share = res.actions.find((a) => a.id === 'share');
    assertEquals(share?.certainty, 'os_provided');
  }
});

Deno.test('sur le web, la feuille de partage doit être PROUVÉE', () => {
  const res = resolveInviteCapabilities({ ...FULL, platform: 'web' });
  assertEquals(res.actions.find((a) => a.id === 'share')?.certainty, 'probed');
});

Deno.test('le QR est LOCAL : il ne dépend ni du réseau ni d’une permission', () => {
  const offline = {
    ...FULL,
    platform: 'android' as const,
    backendConfigured: false,
    clipboardAvailable: false,
    webShareAvailable: false,
  };
  assertEquals(
    resolveInviteCapabilities(offline).actions.find((a) => a.id === 'qr')?.certainty,
    'local',
  );
});

// ═══ SERVEUR ET RÔLE ════════════════════════════════════════════════════════

Deno.test('sans backend, aucune action serveur n’apparaît', () => {
  const res = resolveInviteCapabilities({ ...FULL, backendConfigured: false });
  assertEquals(res.actions.map((a) => a.id), ['qr', 'share', 'copy']);
  assertEquals(reasonFor({ ...FULL, backendConfigured: false }, 'create_link'), 'no_backend');
  assertEquals(reasonFor({ ...FULL, backendConfigured: false }, 'revoke_link'), 'no_backend');
});

Deno.test('un rôle NON LU n’autorise pas — on ne devine pas une permission', () => {
  for (const role of [undefined, null]) {
    assertEquals(reasonFor({ ...FULL, myRole: role }, 'create_link'), 'role_unknown');
  }
});

Deno.test('LA MATRICE DÉCIDE : CREW_PERMISSIONS.invite, pas une liste recopiée', () => {
  const allowed = CREW_PERMISSIONS.invite as readonly CrewRole[];
  // Ce que la matrice autorise doit être peint…
  for (const role of allowed) {
    assertEquals(canIssueInvite(role), true, `${role} doit pouvoir inviter`);
    assertEquals(ids({ ...FULL, myRole: role }).includes('create_link'), true);
  }
  // …et TOUT le reste refusé, avec la raison exacte.
  const others: CrewRole[] = ['rookie', 'runner', 'scout', 'strategist', 'captain'];
  for (const role of others) {
    if (allowed.includes(role)) continue;
    assertEquals(canIssueInvite(role), false, `${role} ne doit pas pouvoir inviter`);
    assertEquals(reasonFor({ ...FULL, myRole: role }, 'create_link'), 'role_forbidden');
  }
});

// ═══ RÉVOCATION ═════════════════════════════════════════════════════════════

Deno.test('« Révoquer » exige quelque chose à fermer', () => {
  assertEquals(reasonFor({ ...FULL, liveInviteCount: 0 }, 'revoke_link'), 'nothing_to_revoke');
  assertEquals(
    reasonFor({ ...FULL, liveInviteCount: undefined }, 'revoke_link'),
    'capability_unknown',
  );
  assertEquals(ids({ ...FULL, liveInviteCount: 1 }).includes('revoke_link'), true);
});

Deno.test('la révocation hérite des prérequis d’accès de la création', () => {
  assertEquals(reasonFor({ ...FULL, myRole: 'rookie' }, 'revoke_link'), 'role_forbidden');
  assertEquals(reasonFor({ ...FULL, myRole: null }, 'revoke_link'), 'role_unknown');
});

// ═══ LE CAS RÉEL DU JOUR ════════════════════════════════════════════════════

Deno.test('preview web sans presse-papier ni Web Share : QR seul, et c’est honnête', () => {
  const res = resolveInviteCapabilities({
    platform: 'web',
    hasShareable: true,
    clipboardAvailable: false,
    webShareAvailable: false,
    backendConfigured: false,
    myRole: null,
  });
  assertEquals(res.actions.map((a) => a.id), ['qr']);
  // Chaque absence porte une raison que l'écran peut prononcer — un geste qui
  // disparaît en silence est aussi opaque qu'un bouton qui échoue.
  assertEquals(res.omitted.length, INVITE_ACTION_ORDER.length - 1);
  assertEquals(res.omitted.every((o) => typeof o.reason === 'string'), true);
});
