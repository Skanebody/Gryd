/**
 * GRYD — le résultat n'accuse jamais, et n'affirme rien qu'il ignore (lot M7).
 *
 * L'écran de résultat est le pic émotionnel du jeu (L7) et le seul endroit où
 * GRYD peut dire non. Deux fautes y coûteraient très cher :
 *   · annoncer « aucun territoire » sur une course qui n'a PAS ENCORE été
 *     envoyée — un refus que personne n'a prononcé ;
 *   · annoncer une aire qui SURESTIME le gain — un mensonge chiffré, donc celui
 *     que le joueur retient, annonce à son crew et met dans une carte de partage.
 */
import { resultAreaM2, resultView, showsLocalStats, type SendResult, type ServerVerdict } from './outcome';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const repondu = (v: ServerVerdict): SendResult => ({ kind: 'answered', verdict: v });
const PRISE: ServerVerdict = { status: 'valid', loopClosed: true, loopAreaM2: 42_000 };

// ─── Ce qui n'a pas encore de verdict n'en reçoit pas un ────────────────────

Deno.test('course EN FILE → `pending`, jamais « aucun territoire »', () => {
  // Hors ligne, personne n'a rien refusé. Afficher un refus serait inventer un
  // verdict — et décourager quelqu'un qui a peut-être tout gagné.
  assertEquals(resultView({ kind: 'queued' }).kind, 'pending');
});

Deno.test('même la mise en file échouée se DIT, elle ne se maquille pas', () => {
  assertEquals(resultView({ kind: 'lost' }).kind, 'lost');
});

// ─── La capture ─────────────────────────────────────────────────────────────

Deno.test('boucle fermée + aire écrite → le chiffre héros s’affiche', () => {
  const v = resultView(repondu(PRISE));
  assertEquals(v.kind, 'captured');
  assertEquals(resultAreaM2(v), 42_000);
});

Deno.test('la fermeture ASSISTÉE est nommée, pas confondue avec une fermeture', () => {
  // GRYD a refermé à la place du joueur : le produit doit savoir ce qu'il a
  // donné, et pouvoir le dire.
  const v = resultView(repondu({ ...PRISE, loopAssisted: true }));
  assert(v.kind === 'captured' && v.assisted, 'fermeture assistée effacée');
  const w = resultView(repondu(PRISE));
  assert(w.kind === 'captured' && !w.assisted, 'fermeture normale annoncée comme assistée');
});

Deno.test('INTÉRIEUR PARTIEL → on dit la prise, on N’INVENTE PAS le chiffre', () => {
  // L'aire de l'anneau surestime alors ce qui a été obtenu (plafond, zone
  // privée, cellule tenue par un rival). Un chiffre faux est le pire des
  // mensonges ici : c'est celui qui part dans une carte de partage.
  const v = resultView(repondu({ ...PRISE, interiorPartial: true }));
  assertEquals(v.kind, 'takenNoArea');
  assertEquals(resultAreaM2(v), null);
});

Deno.test('boucle fermée mais aucune aire écrite → prise annoncée sans chiffre', () => {
  // Le territoire n'a pas pu être écrit en base : annoncer une surface que la
  // carte ne montrera jamais ferait croire l'app cassée.
  assertEquals(resultView(repondu({ status: 'valid', loopClosed: true })).kind, 'takenNoArea');
  assertEquals(
    resultView(repondu({ status: 'valid', loopClosed: true, loopAreaM2: 0 })).kind,
    'takenNoArea',
  );
});

// ─── Le refus, sans reproche (L19) ──────────────────────────────────────────

Deno.test('boucle non fermée → LE MANQUE EN MÈTRES, pas « raté »', () => {
  const v = resultView(repondu({ status: 'valid', loopClosed: false, loopMissingM: 23 }));
  assertEquals(v.kind, 'missing');
  assert(v.kind === 'missing' && v.missingM === 23);
});

Deno.test('pas de boucle et aucun manque chiffrable → un fait, toujours pas un reproche', () => {
  assertEquals(resultView(repondu({ status: 'valid', loopClosed: false })).kind, 'noLoop');
  // `0` n'est pas un manque : « il ne manquait rien » et « on ne sait pas » ne
  // sont pas la même phrase (le serveur envoie `undefined` pour la seconde).
  assertEquals(
    resultView(repondu({ status: 'valid', loopClosed: false, loopMissingM: 0 })).kind,
    'noLoop',
  );
});

Deno.test('une course refusée nomme SON motif — un refus sans raison accuse', () => {
  const v = resultView(repondu({ status: 'rejected', rejectReason: 'too_short' }));
  assert(v.kind === 'refused' && v.reason === 'too_short');
  // Motif absent : on le dit « inconnu » plutôt que d'en choisir un au hasard.
  const w = resultView(repondu({ status: 'rejected' }));
  assert(w.kind === 'refused' && w.reason === 'unknown');
});

Deno.test('forme trop étroite : un fait de géométrie, dit comme tel', () => {
  const v = resultView(repondu({ status: 'valid', loopClosed: false, loopRejectedReason: 'narrow' }));
  assert(v.kind === 'refused' && v.reason === 'narrow');
});

// ─── Les invariants ─────────────────────────────────────────────────────────

const TOUTES: SendResult[] = [
  { kind: 'queued' },
  { kind: 'lost' },
  repondu(PRISE),
  repondu({ ...PRISE, loopAssisted: true }),
  repondu({ ...PRISE, interiorPartial: true }),
  repondu({ status: 'valid', loopClosed: true }),
  repondu({ status: 'valid', loopClosed: false, loopMissingM: 84 }),
  repondu({ status: 'valid', loopClosed: false }),
  repondu({ status: 'valid', loopClosed: false, loopRejectedReason: 'narrow' }),
  repondu({ status: 'rejected', rejectReason: 'pace_too_fast' }),
  repondu({ status: 'rejected' }),
  repondu({ status: 'partial' }),
  repondu({ status: 'flagged' }),
];

Deno.test('INVARIANT : aucun m² ne sort d’un état qui ne sait pas', () => {
  for (const s of TOUTES) {
    const vue = resultView(s);
    if (resultAreaM2(vue) === null) continue;
    assertEquals(vue.kind, 'captured', `chiffre affiché hors d'une capture : ${JSON.stringify(s)}`);
    assert(s.kind === 'answered' && s.verdict.interiorPartial !== true, 'aire annoncée alors qu’elle surestime');
  }
});

Deno.test('INVARIANT : les stats locales sont affichées dans TOUTES les issues (L19)', () => {
  // « Tes stats restent disponibles » n'est pas une consolation : c'est un fait
  // mesuré avant l'envoi, qui survit à un refus comme à l'absence de réseau.
  for (const s of TOUTES) {
    assert(showsLocalStats(resultView(s)), `stats perdues sur ${JSON.stringify(s)}`);
  }
});

Deno.test('INVARIANT : aucune issue ne reste sans réponse', () => {
  for (const s of TOUTES) {
    const k = resultView(s).kind;
    assert(typeof k === 'string' && k.length > 0, `issue muette : ${JSON.stringify(s)}`);
  }
});
