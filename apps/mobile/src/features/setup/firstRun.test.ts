/**
 * GRYD — ce que ces tests EMPÊCHENT sur la porte du premier usage.
 *
 * 1. Qu'un ÉCHEC DE LECTURE soit traité comme un profil absent — la faute qui
 *    enverrait un joueur déjà inscrit dans E08, où son propre @handle lui serait
 *    refusé (« déjà pris ») : un cul-de-sac fabriqué par une panne réseau.
 * 2. Qu'un joueur DÉJÀ configuré retraverse E08/E09/E10 (exigence explicite du
 *    parcours).
 * 3. Qu'on tranche pendant une lecture EN COURS (« un chargement n'affirme rien
 *    sur le joueur »).
 * 4. Que la garde se déclenche sans backend ou sans session — deux situations où
 *    aucune écriture serveur ne pourrait aboutir, donc où le parcours serait un
 *    piège.
 * 5. Qu'une relance de lecture parte en boucle sur une réponse déjà obtenue.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  PROFILE_READ_TIMEOUT_MS,
  SETUP_CHAIN,
  SETUP_ENTRY,
  SETUP_EXIT,
  classifyProfileRead,
  decideFirstRun,
  type MinimalProfileProbe,
  shouldStartRead,
} from './firstRun.ts';

/** Toutes les valeurs de la sonde — sert aux balayages exhaustifs. */
const ALL_PROBES: readonly MinimalProfileProbe[] = [
  'idle',
  'reading',
  'present',
  'absent',
  'unknown',
];

// ═══ 1. L'ÉCHEC DE LECTURE N'EST PAS UNE ABSENCE ═══════════════════════════

Deno.test('un échec de lecture n’envoie JAMAIS dans le parcours de configuration', () => {
  assertEquals(
    decideFirstRun({ configured: true, hasSession: true, profile: 'unknown' }),
    'app',
    'traiter `unknown` comme `absent` enverrait un joueur inscrit dans E08, où ' +
      'son propre @handle serait refusé comme « déjà pris »',
  );
});

Deno.test('`unknown` et `absent` sont deux verdicts DISTINCTS', () => {
  const unknown = decideFirstRun({ configured: true, hasSession: true, profile: 'unknown' });
  const absent = decideFirstRun({ configured: true, hasSession: true, profile: 'absent' });
  assert(unknown !== absent, 'les deux états ne doivent jamais se confondre');
});

Deno.test('une lecture qui échoue rend `unknown`, jamais `absent`', () => {
  assertEquals(classifyProfileRead({ failed: true, rowFound: false }), 'unknown');
  // Même si le transport a mis `rowFound: false` par défaut, un échec reste un
  // échec : la valeur de `rowFound` ne doit pas pouvoir produire un verdict.
  assertEquals(classifyProfileRead({ failed: true, rowFound: true }), 'unknown');
});

Deno.test('une lecture qui aboutit tranche, et seulement alors', () => {
  assertEquals(classifyProfileRead({ failed: false, rowFound: true }), 'present');
  assertEquals(classifyProfileRead({ failed: false, rowFound: false }), 'absent');
});

// ═══ 2. UN JOUEUR DÉJÀ CONFIGURÉ NE RETRAVERSE RIEN ════════════════════════

Deno.test('profil LU comme présent : le parcours n’est jamais rejoué', () => {
  assertEquals(decideFirstRun({ configured: true, hasSession: true, profile: 'present' }), 'app');
});

Deno.test('SEUL un `absent` LU ouvre le parcours', () => {
  const openers = ALL_PROBES.filter(
    (profile) => decideFirstRun({ configured: true, hasSession: true, profile }) === 'setup',
  );
  assertEquals(
    openers,
    ['absent'],
    'toute autre valeur qui ouvrirait E08 serait une supposition, pas une lecture',
  );
});

// ═══ 3. LA LECTURE EN COURS N'AFFIRME RIEN ═════════════════════════════════

Deno.test('lecture EN COURS : on attend, on ne tranche pas', () => {
  assertEquals(decideFirstRun({ configured: true, hasSession: true, profile: 'reading' }), 'wait');
});

Deno.test('« attendre » est le SEUL fait de la lecture en cours', () => {
  const waiting = ALL_PROBES.filter(
    (profile) => decideFirstRun({ configured: true, hasSession: true, profile }) === 'wait',
  );
  assertEquals(waiting, ['reading'], 'aucun autre état ne doit retenir le joueur devant un écran');
});

Deno.test('l’attente est BORNÉE — un plafond de patience existe et est plausible', () => {
  assert(Number.isFinite(PROFILE_READ_TIMEOUT_MS));
  assert(PROFILE_READ_TIMEOUT_MS > 0, 'un plafond nul rendrait toute lecture impossible');
  assert(
    PROFILE_READ_TIMEOUT_MS <= 30_000,
    'au-delà d’une demi-minute, l’écran E00 devient un spinner infini de fait',
  );
});

// ═══ 4. LA GARDE EST INERTE LÀ OÙ ELLE SERAIT UN PIÈGE ═════════════════════

Deno.test('sans backend (O1) : la garde ne redirige jamais', () => {
  for (const profile of ALL_PROBES) {
    assertEquals(
      decideFirstRun({ configured: false, hasSession: true, profile }),
      'app',
      `profil=${profile} : sans serveur, l’écriture de E08 ne peut pas aboutir — ` +
        'y envoyer le joueur serait un cul-de-sac',
    );
  }
});

Deno.test('sans session : la garde d’auth décide seule, celle-ci se tait', () => {
  for (const profile of ALL_PROBES) {
    assertEquals(decideFirstRun({ configured: true, hasSession: false, profile }), 'app');
  }
});

// ═══ 5. RELANCE DE LECTURE ═════════════════════════════════════════════════

Deno.test('on relit ce qui n’a pas de réponse, jamais ce qui en a une', () => {
  const base = { configured: true, hasSession: true, inFlight: false } as const;
  assertEquals(shouldStartRead({ ...base, profile: 'idle' }), true);
  assertEquals(shouldStartRead({ ...base, profile: 'unknown' }), true, 'une panne se retente');
  assertEquals(shouldStartRead({ ...base, profile: 'present' }), false);
  assertEquals(shouldStartRead({ ...base, profile: 'absent' }), false);
  assertEquals(shouldStartRead({ ...base, profile: 'reading' }), false);
});

Deno.test('une lecture déjà en vol n’est jamais doublée', () => {
  for (const profile of ALL_PROBES) {
    assertEquals(
      shouldStartRead({ configured: true, hasSession: true, inFlight: true, profile }),
      false,
    );
  }
});

Deno.test('aucune lecture sans backend ni sans session (rien à interroger)', () => {
  for (const profile of ALL_PROBES) {
    assertEquals(
      shouldStartRead({ configured: false, hasSession: true, inFlight: false, profile }),
      false,
    );
    assertEquals(
      shouldStartRead({ configured: true, hasSession: false, inFlight: false, profile }),
      false,
    );
  }
});

// ═══ 6. LE PARCOURS EST UNE CHAÎNE, PAS UNE COLLECTION ═════════════════════

Deno.test('la chaîne commence par l’écran vers lequel la garde envoie', () => {
  assertEquals(SETUP_ENTRY, SETUP_CHAIN[0]);
  assertEquals(SETUP_ENTRY, '/setup/profile');
});

Deno.test('la chaîne est celle de la spec : profil → activité → permissions → carte', () => {
  assertEquals(SETUP_CHAIN, ['/setup/profile', '/setup/activity', '/setup/permissions']);
  assertEquals(SETUP_EXIT, '/');
});
