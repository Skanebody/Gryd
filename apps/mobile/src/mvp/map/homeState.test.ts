/**
 * GRYD — l'accueil ne peut pas affirmer ce qu'il ne sait pas (lot M3).
 *
 * Ces tests portent sur la faute la plus facile à commettre et la plus dure à
 * voir : rendre « pas de territoire » alors que la lecture est en cours, a
 * échoué, ou n'a jamais eu de serveur à joindre. À l'écran les trois cas se
 * ressemblent — une carte sans forme chartreuse — et c'est précisément pour ça
 * qu'aucune revue visuelle ne les distingue. Seul un test le peut.
 *
 * Le balayage EXHAUSTIF plus bas (144 combinaisons) n'est pas du zèle : chacune
 * de ces combinaisons arrivera chez un vrai joueur, et deux d'entre elles ne se
 * provoquent pas à la main (backend absent, permission définitivement bloquée).
 */
import {
  canCenterOnPlayer,
  canRetryRead,
  heroAreaM2,
  homeAction,
  homeStatus,
  type BackendReach,
  type HomeInput,
  type LocationAccess,
  type SessionState,
  type TerritoryRead,
} from './homeState';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const OK_VIDE: TerritoryRead = { kind: 'ok', ownedCount: 0, areaM2: 0 };
const OK_PLEIN: TerritoryRead = { kind: 'ok', ownedCount: 3, areaM2: 128_400 };

/** Cas nominal : tout va bien, le joueur possède. On en dérive les variantes. */
function jeu(patch: Partial<HomeInput> = {}): HomeInput {
  return { backend: 'configured', session: 'signedIn', read: OK_PLEIN, location: 'granted', ...patch };
}

// ─── Les six réponses, et leur ORDRE ────────────────────────────────────────

Deno.test('lu et non vide → `owned` ; lu et vide → `empty`', () => {
  assertEquals(homeStatus(jeu()), 'owned');
  assertEquals(homeStatus(jeu({ read: OK_VIDE })), 'empty');
});

Deno.test('lecture EN COURS → `loading`, JAMAIS `empty`', () => {
  // Le mensonge le plus courant des apps de jeu : afficher le vide en attendant.
  assertEquals(homeStatus(jeu({ read: { kind: 'loading' } })), 'loading');
});

Deno.test('lecture PAS ENCORE LANCÉE → `loading` elle aussi', () => {
  // N'avoir pas encore demandé n'autorise pas plus à conclure qu'attendre.
  assertEquals(homeStatus(jeu({ read: { kind: 'idle' } })), 'loading');
});

Deno.test('lecture ÉCHOUÉE → `failed`, et surtout pas `empty`', () => {
  assertEquals(homeStatus(jeu({ read: { kind: 'failed' } })), 'failed');
});

Deno.test('pas de compte → `signedOut` : « à moi » n’a pas encore de référent', () => {
  assertEquals(homeStatus(jeu({ session: 'signedOut', read: OK_VIDE })), 'signedOut');
});

Deno.test('session EN COURS DE RESTAURATION → `loading`, jamais `signedOut`', () => {
  // Le démarrage à froid lit la session depuis le stockage. Conclure « pas de
  // compte » pendant ce temps affiche une fausseté à tous les joueurs, à chaque
  // ouverture — brève, donc jamais attrapée par une revue visuelle.
  assertEquals(homeStatus(jeu({ session: 'restoring' })), 'loading');
  assertEquals(homeStatus(jeu({ session: 'restoring', read: OK_VIDE })), 'loading');
  assertEquals(homeStatus(jeu({ session: 'restoring', read: { kind: 'failed' } })), 'loading');
});

Deno.test('backend injoignable → `unavailable`, quoi qu’en dise la lecture', () => {
  // Une lecture « réussie » sans backend ne peut venir que d'un cache ou d'un
  // repli : on ne la croit pas. L'ordre des tests le garantit structurellement.
  assertEquals(homeStatus(jeu({ backend: 'absent' })), 'unavailable');
  assertEquals(homeStatus(jeu({ backend: 'absent', read: OK_VIDE })), 'unavailable');
  assertEquals(homeStatus(jeu({ backend: 'absent', read: { kind: 'failed' } })), 'unavailable');
});

// ─── L'INVARIANT CENTRAL, balayé sur TOUT l'espace d'entrée ─────────────────

const BACKENDS: readonly BackendReach[] = ['configured', 'absent'];
const SESSIONS: readonly SessionState[] = ['signedIn', 'signedOut', 'restoring'];
const LIEUX: readonly LocationAccess[] = ['granted', 'unknown', 'blocked'];
const LECTURES: readonly TerritoryRead[] = [
  { kind: 'idle' },
  { kind: 'loading' },
  { kind: 'failed' },
  OK_VIDE,
];

function toutesLesEntrees(): HomeInput[] {
  const out: HomeInput[] = [];
  for (const backend of BACKENDS)
    for (const session of SESSIONS)
      for (const location of LIEUX)
        for (const read of LECTURES)
          for (const interrupted of [false, true])
            out.push({ backend, session, location, read, interrupted });
  return out;
}

Deno.test('INVARIANT : `empty` exige une lecture RÉUSSIE et vide — sans exception', () => {
  for (const e of toutesLesEntrees()) {
    if (homeStatus(e) !== 'empty') continue;
    assert(e.backend === 'configured', `${JSON.stringify(e)} : vide affirmé sans backend`);
    assert(e.session === 'signedIn', `${JSON.stringify(e)} : vide affirmé sans compte connu`);
    assert(e.read.kind === 'ok', `${JSON.stringify(e)} : vide affirmé sans lecture aboutie`);
  }
  // …et le cas légitime existe bel et bien, sinon l'invariant serait vide de sens.
  assertEquals(homeStatus(jeu({ read: OK_VIDE })), 'empty');
});

Deno.test('INVARIANT : un chiffre héros ne sort JAMAIS d’un état qui ne sait pas', () => {
  for (const e of toutesLesEntrees()) {
    const m2 = heroAreaM2(e);
    if (m2 === null) continue;
    assertEquals(homeStatus(e), 'owned', `${JSON.stringify(e)} : chiffre hors de l'état possédé`);
  }
  assertEquals(heroAreaM2(jeu()), 128_400);
});

Deno.test('« 0 m² » ne s’affiche pas : l’état vide PARLE, il ne compte pas', () => {
  // La constitution interdit le « 0 » nu. `null` force l'écran à sortir la
  // phrase de L8 (« Ta ville est vierge. Ferme ta première boucle. ») au lieu
  // d'un compteur qui se lit comme un échec.
  assertEquals(heroAreaM2(jeu({ read: OK_VIDE })), null);
  assertEquals(heroAreaM2(jeu({ read: { kind: 'loading' } })), null);
  assertEquals(heroAreaM2(jeu({ read: { kind: 'failed' } })), null);
  assertEquals(heroAreaM2(jeu({ backend: 'absent' })), null);
});

// ─── L'action primaire : aucun bouton mort ──────────────────────────────────

Deno.test('position accordée → GO, MÊME pendant le chargement, MÊME après un échec', () => {
  // Courir ne dépend pas de savoir ce qu'on possède déjà. Faire attendre le
  // départ derrière un aller-retour réseau casserait L3 pour rien.
  assertEquals(homeAction(jeu()), 'go');
  assertEquals(homeAction(jeu({ read: { kind: 'loading' } })), 'go');
  assertEquals(homeAction(jeu({ read: { kind: 'failed' } })), 'go');
  assertEquals(homeAction(jeu({ read: OK_VIDE })), 'go');
});

Deno.test('permission pas encore accordée → on la demande, on n’envoie PAS aux réglages', () => {
  assertEquals(homeAction(jeu({ location: 'unknown' })), 'askLocation');
});

Deno.test('permission BLOQUÉE → les réglages, seule sortie réelle', () => {
  assertEquals(homeAction(jeu({ location: 'blocked' })), 'openSettings');
});

Deno.test('une course INTERROMPUE prime sur le départ d’une nouvelle', () => {
  // C'est la seule chose à l'écran qui puisse encore être perdue.
  assertEquals(homeAction(jeu({ interrupted: true })), 'resume');
});

Deno.test('…et elle prime AUSSI sur un backend injoignable', () => {
  // Constaté en preview : sans cet ordre, l'accueil ANNONÇAIT la course
  // retrouvée sans offrir aucun moyen de l'ouvrir. Dire qu'une chose existe
  // sans permettre d'y accéder est pire que se taire.
  assertEquals(homeAction(jeu({ interrupted: true, backend: 'absent' })), 'resume');
});

Deno.test('…et elle prime AUSSI sur la demande de permission', () => {
  // Rouvrir une course qui attend ne demande pas d'enregistrer de nouveaux
  // points : on peut la clore telle quelle. La cacher derrière « Autoriser »
  // la ferait disparaître pour quiconque a refusé — la garantie tomberait.
  assertEquals(homeAction(jeu({ interrupted: true, location: 'unknown' })), 'resume');
  assertEquals(homeAction(jeu({ interrupted: true, location: 'blocked' })), 'resume');
});

Deno.test('INVARIANT : GO n’est jamais peint sans position ET sans backend', () => {
  // Un GO sans position ne produit aucune trace ; un GO sans backend produit
  // une course que rien ne pourra jamais transformer en territoire. Les deux
  // « marchent » et ne tiennent pas la promesse : bouton mort.
  for (const e of toutesLesEntrees()) {
    if (homeAction(e) !== 'go') continue;
    assertEquals(e.location, 'granted', `${JSON.stringify(e)} : GO sans position`);
    assertEquals(e.backend, 'configured', `${JSON.stringify(e)} : GO sans backend`);
    assertEquals(e.interrupted, false, `${JSON.stringify(e)} : GO alors qu'une course attend`);
  }
});

Deno.test('INVARIANT : « Ouvrir les réglages » n’apparaît que si l’OS a fermé la porte', () => {
  for (const e of toutesLesEntrees()) {
    if (homeAction(e) !== 'openSettings') continue;
    assertEquals(e.location, 'blocked', `${JSON.stringify(e)} : réglages proposés pour rien`);
  }
});

Deno.test('backend absent → AUCUNE action primaire, plutôt qu’une action qui ment', () => {
  // L2 pose un plafond (« une seule »), pas un plancher. Un écran honnête sans
  // action possible vaut mieux qu'un bouton qui promet ce qu'il ne tiendra pas.
  for (const location of LIEUX) {
    assertEquals(homeAction(jeu({ backend: 'absent', location })), 'none');
  }
  // …sauf s'il y a une course à sauver — le seul cas qui passe devant.
  assertEquals(homeAction(jeu({ backend: 'absent', interrupted: true })), 'resume');
});

// ─── Réessayer reste secondaire ─────────────────────────────────────────────

Deno.test('« réessayer » n’existe QUE sur un échec de lecture, et ne déloge pas GO', () => {
  assert(canRetryRead(jeu({ read: { kind: 'failed' } })), 'échec sans possibilité de réessai');
  assertEquals(homeAction(jeu({ read: { kind: 'failed' } })), 'go');
  for (const e of toutesLesEntrees()) {
    if (canRetryRead(e)) assertEquals(homeStatus(e), 'failed', JSON.stringify(e));
  }
});

// ─── « Où suis-je ? » (L1) ──────────────────────────────────────────────────

Deno.test('sans autorisation, la carte ne prétend PAS savoir où l’on est', () => {
  // Un point au centre par défaut serait une position inventée.
  assert(canCenterOnPlayer(jeu()), 'position accordée mais recentrage refusé');
  assert(!canCenterOnPlayer(jeu({ location: 'unknown' })), 'position inventée sans autorisation');
  assert(!canCenterOnPlayer(jeu({ location: 'blocked' })), 'position inventée malgré un blocage');
});
