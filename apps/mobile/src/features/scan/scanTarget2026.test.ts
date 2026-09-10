/**
 * GRYD — CE QUE LE SCANNER A LE DROIT D'OUVRIR (LOT Q4, 11/09/2026).
 *
 * Un scanner est une ENTRÉE HOSTILE : le contenu vient d'un carton imprimé par
 * quelqu'un d'autre. Chaque test ci-dessous décrit un contenu qui existe
 * vraiment dans le monde (un vélo en libre-service, un code wifi, un lien
 * raccourci) et exige que l'app refuse de le prendre pour une invitation.
 *
 * ÉTAPE 0 — LE DÉFAUT QUI SERAIT ARRIVÉ SANS CE FICHIER : réutiliser
 * `parseInviteInput` (la saisie MANUELLE) pour le scanner. Elle accepte une
 * chaîne nue de 6 caractères, donc « P4RK1N » lu sur un ticket serait devenu
 * `gryd://c/P4RK1N`, et l'app aurait affirmé « voici une invitation de crew »
 * en montrant un code que personne n'a émis. Le test « une chaîne nue n'est
 * jamais un code de crew » est exactement ce garde-fou.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseScannedCode2026, PROFILE_SCAN_PATH } from './scanTarget2026.ts';

// ═══════════════════════════════════════════════════════════════════════════
// ① UN CODE DE CREW
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('scan : `gryd://c/<CODE>` est une invitation de crew, et porte sa route', () => {
  const t = parseScannedCode2026('gryd://c/AB12CD');
  assertEquals(t.kind, 'crew-code');
  assert(t.kind === 'crew-code');
  assertEquals(t.value, 'AB12CD');
  assertEquals(t.path, '/c/AB12CD');
});

Deno.test('scan : le code est remis en MAJUSCULES, comme l’écran d’atterrissage', () => {
  const t = parseScannedCode2026('gryd://c/ab12cd');
  assert(t.kind === 'crew-code');
  // `normalizeInviteCode` fait la même chose côté /c/[code] : deux QR imprimés
  // à deux semaines d'écart, l'un en minuscules, mènent au MÊME crew.
  assertEquals(t.value, 'AB12CD');
});

Deno.test('scan : le lien https d’un hôte connu vaut le deep link', () => {
  for (const url of ['https://gryd.run/c/AB12CD', 'https://gryd.app/c/AB12CD']) {
    const t = parseScannedCode2026(url);
    assertEquals(t.kind, 'crew-code', url);
  }
});

Deno.test('scan : un autre domaine n’est pas GRYD, même avec le bon chemin', () => {
  assertEquals(parseScannedCode2026('https://grydxrun/c/AB12CD').kind, 'unknown');
  assertEquals(parseScannedCode2026('https://evil.example/c/AB12CD').kind, 'unknown');
});

// ═══════════════════════════════════════════════════════════════════════════
// ② UN JETON D'INVITATION (0090) — RECONNU, PAS ENCORE CONSOMMABLE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('scan : un jeton d’invitation est RECONNU, et distinct de « inconnu »', () => {
  // 26 caractères de l'alphabet base32 Crockford (ni I, ni L, ni O, ni U).
  const t = parseScannedCode2026('gryd://i/ABCDEFGHJKMNPQRSTVWXYZ2345');
  assertEquals(t.kind, 'crew-token');
});

Deno.test('scan : un jeton n’est JAMAIS traité comme un code de crew', () => {
  const t = parseScannedCode2026('gryd://i/ABCDEFGHJKMNPQRSTVWXYZ2345');
  // Si ce verdict retombait sur `crew-code`, l'app enverrait 26 caractères à
  // `join_crew_by_code`, qui répondrait `bad_code` sur un jeton parfaitement
  // valide : « ce code est inconnu » à propos d'un lien que le crew vient
  // d'émettre.
  assert(t.kind !== 'crew-code');
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ UN PROFIL
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('scan : `gryd://u/<handle>` mène au profil, en minuscules', () => {
  const t = parseScannedCode2026('gryd://u/Lea_2026');
  assert(t.kind === 'profile');
  assertEquals(t.value, 'lea_2026');
  assertEquals(t.path, '/profil-rival/lea_2026');
});

Deno.test('scan : le lien https de profil vaut le deep link', () => {
  const t = parseScannedCode2026('https://gryd.run/u/lea');
  assert(t.kind === 'profile');
  assertEquals(t.path, '/profil-rival/lea');
});

Deno.test('scan : un @ dans l’URL ne fabrique pas un second handle', () => {
  const t = parseScannedCode2026('gryd://u/@lea');
  assert(t.kind === 'profile');
  assertEquals(t.value, 'lea');
});

Deno.test('scan : un handle trop court n’est le handle de personne', () => {
  // HANDLE_REGEX impose 3 caractères. Router sur « /profil-rival/a » afficherait
  // « profil introuvable » là où la vérité est « ce code n'est pas lisible ».
  assertEquals(parseScannedCode2026('gryd://u/a').kind, 'unknown');
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ TOUT LE RESTE — ET C'EST LA MAJORITÉ DU MONDE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('scan : une chaîne nue n’est JAMAIS un code de crew', () => {
  // Le défaut de l'étape 0, mot pour mot.
  assertEquals(parseScannedCode2026('P4RK1N').kind, 'unknown');
  assertEquals(parseScannedCode2026('AB12CD').kind, 'unknown');
});

Deno.test('scan : les QR du monde réel ne deviennent pas des invitations', () => {
  const dehors = [
    'WIFI:S=Livebox-1234;T=WPA;P=motdepasse;;',
    'https://www.velo-libre.example/bike/AB12CD',
    'BEGIN:VCARD\nFN:Lea\nEND:VCARD',
    'tel:+33600000000',
    'gryd://run/42',
    'gryd://c/',
    'https://gryd.run/blog',
    '',
    '   ',
  ];
  for (const contenu of dehors) {
    assertEquals(parseScannedCode2026(contenu).kind, 'unknown', contenu);
  }
});

Deno.test('scan : ni null ni undefined ne produisent une navigation', () => {
  assertEquals(parseScannedCode2026(null).kind, 'unknown');
  assertEquals(parseScannedCode2026(undefined).kind, 'unknown');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ LE MIROIR : LE SEGMENT DE PROFIL EST CELUI QU'ON ÉMET
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('scan : `PROFILE_SCAN_PATH` est bien celui que `profileLink.ts` écrit', () => {
  // `profileLink.ts` importe le store i18n, donc il ne s'importe pas ici. On lit
  // sa SOURCE : sans ce test, changer `/u/` d'un seul côté rendrait tous les QR
  // de profil illisibles, sans qu'aucun typecheck ne bronche.
  const source = Deno.readTextFileSync(
    new URL('../social/profileLink.ts', import.meta.url),
  );
  assert(
    source.includes(`export const PROFILE_LINK_PATH = '${PROFILE_SCAN_PATH}'`),
    'le segment de profil a divergé entre le générateur de liens et le scanner',
  );
});

Deno.test('scan : la route de profil visée EXISTE sur le disque', () => {
  // Une route inventée passerait tous les tests ci-dessus et rendrait
  // « Unmatched route » à l'exécution. On vérifie le fichier.
  const t = parseScannedCode2026('gryd://u/lea');
  assert(t.kind === 'profile');
  const fichier = new URL('../../../app/profil-rival/[handle].tsx', import.meta.url);
  assert(Deno.statSync(fichier).isFile, 'app/profil-rival/[handle].tsx est introuvable');
  assert(t.path.startsWith('/profil-rival/'));
});

Deno.test('scan : la route d’atterrissage d’une invitation EXISTE sur le disque', () => {
  const t = parseScannedCode2026('gryd://c/AB12CD');
  assert(t.kind === 'crew-code');
  const fichier = new URL('../../../app/c/[code].tsx', import.meta.url);
  assert(Deno.statSync(fichier).isFile, 'app/c/[code].tsx est introuvable');
  assert(t.path.startsWith('/c/'));
});
