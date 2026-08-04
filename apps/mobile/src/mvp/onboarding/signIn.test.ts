/**
 * GRYD — l'écran dont on ne ressort pas sans succès ne peut pas mentir.
 *
 * Un bouton mort sur la carte coûte un tap. Ici, il coûte le JOUEUR : c'est le
 * seul écran qu'on ne peut pas contourner. « Continuer avec Apple » peint sur un
 * Android envoie dans une impasse au moment exact où quelqu'un acceptait de
 * s'engager — et ces combinaisons ne se produisent pas toutes seules sur
 * l'appareil qu'on a sous la main.
 */
import { emailIsPrimary, hasAnyDoor, signInDoors, signInOutcome, type SignInCapability } from './signIn';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const TOUT: SignInCapability = { backend: true, appleAvailable: true, googleConfigured: true };
const cap = (p: Partial<SignInCapability> = {}): SignInCapability => ({ ...TOUT, ...p });

/** Les 8 combinaisons de capacité — aucune ne doit produire un bouton mort. */
function toutesLesCapacites(): SignInCapability[] {
  const out: SignInCapability[] = [];
  for (const backend of [true, false])
    for (const appleAvailable of [true, false])
      for (const googleConfigured of [true, false])
        out.push({ backend, appleAvailable, googleConfigured });
  return out;
}

// ─── L'invariant central ────────────────────────────────────────────────────

Deno.test('INVARIANT : aucune porte n’est peinte si elle ne peut pas aboutir', () => {
  for (const c of toutesLesCapacites()) {
    const d = signInDoors(c);
    if (d.apple) {
      assert(c.backend && c.appleAvailable, `Apple peint sans capacité : ${JSON.stringify(c)}`);
    }
    if (d.google) {
      assert(c.backend && c.googleConfigured, `Google peint sans client id : ${JSON.stringify(c)}`);
    }
    if (d.email) assert(c.backend, `e-mail peint sans backend : ${JSON.stringify(c)}`);
  }
});

Deno.test('Apple ne se DÉDUIT pas de l’OS — il se SONDE', () => {
  // `Platform.OS === 'ios'` dit sur quel système on tourne, pas que Sign in
  // with Apple est utilisable : entitlement absent, iOS ancien, simulateur sans
  // compte Apple. C'est la sonde qui décide.
  assertEquals(signInDoors(cap({ appleAvailable: false })).apple, false);
  assertEquals(signInDoors(cap({ appleAvailable: true })).apple, true);
});

// ─── Le plancher, et son absence ────────────────────────────────────────────

Deno.test('l’e-mail reste TOUJOURS ouvert dès qu’il y a un backend', () => {
  // Il ne dépend d'aucune plateforme ni d'aucune clé. C'est lui qui garantit
  // qu'un écran de connexion n'est jamais un mur.
  for (const c of toutesLesCapacites()) {
    if (!c.backend) continue;
    assert(signInDoors(c).email, `e-mail fermé alors qu'un backend existe : ${JSON.stringify(c)}`);
    assert(hasAnyDoor(signInDoors(c)), 'aucune porte malgré un backend');
  }
});

Deno.test('sans backend, AUCUNE porte — et l’écran devra le dire', () => {
  // Trois impasses valent moins que zéro option assumée. `hasAnyDoor` est ce
  // qui force l'écran à expliquer plutôt qu'à peindre des boutons inertes.
  const d = signInDoors(cap({ backend: false }));
  assertEquals(d.apple, false);
  assertEquals(d.google, false);
  assertEquals(d.email, false);
  assert(!hasAnyDoor(d), 'une porte subsiste sans backend');
});

// ─── Une annulation n'est pas un échec (L19) ────────────────────────────────

Deno.test('ANNULER ne montre AUCUN message d’erreur', () => {
  // Fermer la feuille Apple est banal et volontaire. Répondre « Connexion
  // impossible » impute une panne inexistante à quelqu'un qui a changé d'avis.
  assertEquals(signInOutcome({ ok: false, reason: 'cancelled' }), 'stay');
});

Deno.test('un vrai échec, lui, se NOMME', () => {
  assertEquals(signInOutcome({ ok: false, reason: 'auth_error' }), 'explain');
  assertEquals(signInOutcome({ ok: false, reason: 'no_identity_token' }), 'explain');
});

Deno.test('une réponse ABSENTE n’est pas un silence', () => {
  // Se taire laisserait quelqu'un devant un bouton qui n'a rien fait de visible.
  assertEquals(signInOutcome(null), 'explain');
  assertEquals(signInOutcome(undefined), 'explain');
});

Deno.test('un succès entre, et rien d’autre n’entre', () => {
  assertEquals(signInOutcome({ ok: true }), 'enter');
  for (const r of ['cancelled', 'auth_error', 'supabase_not_configured', 'apple_not_available']) {
    assert(signInOutcome({ ok: false, reason: r }) !== 'enter', `« ${r} » ouvre la porte`);
  }
});

// ─── La seule porte se peint comme une porte ────────────────────────────────

Deno.test('SEUL l’e-mail → il devient l’action PRIMAIRE', () => {
  // Constaté en preview : sur le web, ni Apple ni Google. L'e-mail restait un
  // lien gris — un écran de connexion sans bouton plein ressemble à une page
  // qui a raté son chargement, et le seul chemin praticable à une note de bas
  // de page.
  assert(emailIsPrimary(signInDoors(cap({ appleAvailable: false, googleConfigured: false }))));
});

Deno.test('accompagné, l’e-mail RESTE secondaire (L2)', () => {
  // Deux boutons pleins de même poids seraient l'autre faute.
  assert(!emailIsPrimary(signInDoors(cap({ appleAvailable: true, googleConfigured: false }))));
  assert(!emailIsPrimary(signInDoors(cap({ appleAvailable: false, googleConfigured: true }))));
  assert(!emailIsPrimary(signInDoors(TOUT)));
});

Deno.test('INVARIANT : il y a TOUJOURS une action primaire quand il y a une porte', () => {
  // C'est la propriété qui compte : aucun état praticable ne doit rendre un
  // écran sans bouton plein.
  for (const c of toutesLesCapacites()) {
    const d = signInDoors(c);
    if (!hasAnyDoor(d)) continue;
    assert(
      d.apple || d.google || emailIsPrimary(d),
      `aucune action primaire malgré une porte : ${JSON.stringify(c)}`,
    );
  }
});
