/**
 * Tests create_offensive/logic.ts — la partie PURE de l'écrivain d'offensives.
 * Purs : corps de requête et lignes construits en mémoire, aucun réseau.
 *
 * Ce que ces tests tiennent, et qu'aucune relecture ne tient durablement :
 *   • le théâtre est TOUJOURS une cellule H3 valide à la résolution de la
 *     colonne `offensives.center_h3` — un centre res 10 (le réflexe naturel
 *     dans ce repo, où H3_RESOLUTION = 10) est refusé, pas silencieusement
 *     accepté en théâtre minuscule ;
 *   • les BORNES de jeu restent au moteur : ce module ne refuse jamais un rayon
 *     « trop grand », il refuse un rayon qui n'est pas un nombre ;
 *   • l'idempotence survit au typage PostgREST (bigint et numeric arrivent en
 *     chaîne) — la comparaison naïve `===` échouerait sans bruit ;
 *   • l'arbitrage d'un doublon est déterministe et CONVERGENT : deux requêtes
 *     concurrentes désignent la même survivante, donc une seule se retire ;
 *   • aucun refus ne sort en 500, et l'Edge Function ne renvoie aucun message
 *     Postgres au client (règle du repo, déjà violée deux fois).
 */
import { assert, assertEquals, assertFalse, assertNotEquals } from 'jsr:@std/assert@^1';
import { getResolution, isValidCell, latLngToCell } from 'npm:h3-js@^4.1';
import {
  CREW_PERMISSIONS,
  H3_RESOLUTION,
  OFFENSIVE_DURATION_H,
  OFFENSIVE_MAX_ACTIVE_PER_CREW,
  OFFENSIVE_OBJECTIVE_HEXES_MAX,
  OFFENSIVE_RADIUS_KM_MAX,
} from '../_shared/game-rules.ts';
import { validateOffensiveDraft } from '../_shared/engine/offensive.ts';
import {
  asCrewRole,
  dbToH3,
  type ExistingOffensiveRow,
  findIdempotentTwin,
  h3ToDb,
  OFFENSIVE_CENTER_RESOLUTION,
  parseCreateOffensiveRequest,
  type ParsedOffensiveRequest,
  pickSurvivor,
  resolveDuplicate,
  sameOffensive,
  statusForReject,
  toOffensiveDraft,
} from './logic.ts';

const NOW = Date.parse('2026-07-23T10:00:00.000Z');
const HOUR = 3_600_000;
const CREW = '11111111-2222-3333-4444-555555555555';
const USER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OTHER_USER = 'ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee';
// Belleville, Paris — cellule au THÉÂTRE (res 7), pas au claim (res 10).
const CENTER = latLngToCell(48.8722, 2.3844, OFFENSIVE_CENTER_RESOLUTION);

function body(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    crewId: CREW,
    zoneLabel: 'Belleville',
    centerH3: CENTER,
    radiusKm: 2,
    objectiveHexes: 40,
    startsAt: new Date(NOW).toISOString(),
    endsAt: new Date(NOW + 24 * HOUR).toISOString(),
    ...over,
  };
}

function parseOk(over: Record<string, unknown> = {}): ParsedOffensiveRequest {
  const r = parseCreateOffensiveRequest(body(over), NOW);
  assert(r.ok, `attendu ok, reçu ${r.ok ? '' : r.error}`);
  return r.value;
}

function expectError(over: Record<string, unknown>, expected: string) {
  const r = parseCreateOffensiveRequest(body(over), NOW);
  assertFalse(r.ok);
  if (!r.ok) assertEquals(r.error, expected);
}

function row(over: Partial<ExistingOffensiveRow> = {}): ExistingOffensiveRow {
  return {
    id: 'off-1',
    crew_id: CREW,
    // PostgREST rend un bigint en CHAÎNE : c'est le cas réel, pas un cas limite.
    center_h3: h3ToDb(CENTER),
    radius_km: '2.0',
    objectif_hexes: 40,
    starts_at: new Date(NOW).toISOString(),
    ends_at: new Date(NOW + 24 * HOUR).toISOString(),
    created_by: USER,
    created_at: new Date(NOW).toISOString(),
    status: 'active',
    ...over,
  };
}

// ─── 1. Théâtre ─────────────────────────────────────────────────────────────

Deno.test('le centre est une cellule H3 à la résolution de la colonne', () => {
  const p = parseOk();
  assert(isValidCell(p.centerH3));
  assertEquals(getResolution(p.centerH3), OFFENSIVE_CENTER_RESOLUTION);
});

Deno.test('un centre à la résolution des claims (res 10) est REFUSÉ', () => {
  // Le piège : H3_RESOLUTION = 10 est la résolution par défaut du repo. Une
  // cellule res 10 est parfaitement « valide » — juste 1000× trop petite pour
  // un théâtre. Rien d'autre que ce contrôle ne l'attraperait.
  assertNotEquals<number>(H3_RESOLUTION, OFFENSIVE_CENTER_RESOLUTION);
  expectError({ centerH3: latLngToCell(48.8722, 2.3844, H3_RESOLUTION) }, 'invalid_center');
});

Deno.test('un index H3 invalide est refusé sans exception', () => {
  expectError({ centerH3: 'pas-un-index' }, 'invalid_center');
  expectError({ centerH3: 42 }, 'invalid_center');
});

Deno.test('lat/lng est accepté et converti à la bonne résolution', () => {
  const p = parseOk({ centerH3: undefined, centerLat: 48.8722, centerLng: 2.3844 });
  assertEquals(p.centerH3, CENTER);
  assertEquals(getResolution(p.centerH3), OFFENSIVE_CENTER_RESOLUTION);
});

Deno.test('lat/lng hors bornes terrestres est refusé', () => {
  expectError({ centerH3: undefined, centerLat: 91, centerLng: 2 }, 'invalid_center');
  expectError({ centerH3: undefined, centerLat: 48, centerLng: 181 }, 'invalid_center');
  expectError({ centerH3: undefined, centerLat: Number.NaN, centerLng: 2 }, 'invalid_center');
});

Deno.test('aucun centre du tout : refus, jamais un centre inventé', () => {
  expectError({ centerH3: undefined }, 'invalid_center');
});

Deno.test('centerH3Db est le bigint EXACT de la cellule (aller-retour)', () => {
  const p = parseOk();
  assertEquals(dbToH3(p.centerH3Db), p.centerH3);
  assertEquals(h3ToDb(p.centerH3), p.centerH3Db);
});

// ─── 2. Forme du reste ──────────────────────────────────────────────────────

Deno.test('corps non-objet refusé (null, tableau, chaîne)', () => {
  for (const raw of [null, 'x', 42, [], undefined]) {
    const r = parseCreateOffensiveRequest(raw, NOW);
    assertFalse(r.ok);
    if (!r.ok) assertEquals(r.error, 'invalid_body');
  }
});

Deno.test('crewId doit être un UUID', () => {
  expectError({ crewId: 'crew-1' }, 'invalid_crew_id');
  expectError({ crewId: 42 }, 'invalid_crew_id');
});

Deno.test('zoneLabel non-chaîne refusé ; les espaces sont retirés', () => {
  expectError({ zoneLabel: 42 }, 'invalid_zone_label');
  assertEquals(parseOk({ zoneLabel: '  Belleville  ' }).zoneLabel, 'Belleville');
});

Deno.test('rayon et objectif : la FORME ici, les BORNES au moteur', () => {
  expectError({ radiusKm: '2' }, 'invalid_radius');
  expectError({ objectiveHexes: null }, 'invalid_objective');
  // Hors bornes mais bien typé → accepté ICI, refusé par le moteur ensuite.
  const p = parseOk({ radiusKm: OFFENSIVE_RADIUS_KM_MAX + 1 });
  assertEquals(p.radiusKm, OFFENSIVE_RADIUS_KM_MAX + 1);
  const v = validateOffensiveDraft(toOffensiveDraft(p), {
    nowMs: NOW,
    role: 'founder',
    openOffensives: 0,
  });
  assertFalse(v.ok);
  if (!v.ok) assertEquals(v.reason, 'radius_out_of_range');
});

Deno.test('dates illisibles refusées', () => {
  expectError({ startsAt: 'demain' }, 'invalid_window');
  expectError({ endsAt: '' }, 'invalid_window');
  expectError({ startsAt: 1234567890 }, 'invalid_window');
});

Deno.test('sans startsAt, la fenêtre s’ouvre MAINTENANT (paramètre, pas horloge)', () => {
  const p = parseOk({ startsAt: undefined });
  assertEquals(p.startsAtMs, NOW);
});

Deno.test('sans endsAt, la durée est OFFENSIVE_DURATION_H — et c’est signalé', () => {
  const p = parseOk({ endsAt: undefined });
  assertEquals(p.endsAtMs - p.startsAtMs, OFFENSIVE_DURATION_H * HOUR);
  assert(p.usedDefaultDuration);
  assertFalse(parseOk().usedDefaultDuration);
});

// ─── 3. Rôle ────────────────────────────────────────────────────────────────

Deno.test('asCrewRole n’accorde rien à un rôle inconnu', () => {
  assertEquals(asCrewRole('founder'), 'founder');
  assertEquals(asCrewRole('rookie'), 'rookie');
  assertEquals(asCrewRole('admin'), null);
  assertEquals(asCrewRole(null), null);
  assertEquals(asCrewRole(undefined), null);
});

Deno.test('le gate de rôle appliqué est bien CREW_PERMISSIONS.launchOffensive', () => {
  const draft = toOffensiveDraft(parseOk());
  for (const role of ['rookie', 'runner', 'scout', 'strategist', 'captain'] as const) {
    const v = validateOffensiveDraft(draft, { nowMs: NOW, role, openOffensives: 0 });
    assertFalse(v.ok, `${role} ne doit PAS pouvoir lancer une offensive`);
    if (!v.ok) assertEquals(v.reason, 'forbidden_role');
  }
  for (const role of CREW_PERMISSIONS.launchOffensive) {
    assert(validateOffensiveDraft(draft, { nowMs: NOW, role, openOffensives: 0 }).ok);
  }
});

Deno.test('le plafond d’offensives ouvertes est celui de game-rules', () => {
  const draft = toOffensiveDraft(parseOk());
  const ctx = { nowMs: NOW, role: 'founder' as const };
  assert(
    validateOffensiveDraft(draft, {
      ...ctx,
      openOffensives: OFFENSIVE_MAX_ACTIVE_PER_CREW - 1,
    }).ok,
  );
  const v = validateOffensiveDraft(draft, {
    ...ctx,
    openOffensives: OFFENSIVE_MAX_ACTIVE_PER_CREW,
  });
  assertFalse(v.ok);
  if (!v.ok) assertEquals(v.reason, 'too_many_open');
});

// ─── 4. Idempotence ─────────────────────────────────────────────────────────

Deno.test('la clé naturelle survit au typage PostgREST (numeric rendu en chaîne)', () => {
  const p = parseOk();
  assert(sameOffensive(row(), p, USER));
  assert(sameOffensive(row({ radius_km: 2 }), p, USER));
});

Deno.test('un center_h3 lu en NOMBRE serait imprécis — d’où le cast ::text', () => {
  // Un index H3 res 7 dépasse 2^53 : passé par un `number` JSON, il revient
  // FAUX. La comparaison ne « rattrape » pas cette perte (elle ne peut pas :
  // l'information est détruite) — elle refuse, et c'est l'appelant qui doit
  // lire la colonne en texte. Ce test fige les deux moitiés de la parade.
  const exact = h3ToDb(CENTER);
  const lossy = Number(exact);
  assert(BigInt(exact) > BigInt(Number.MAX_SAFE_INTEGER));
  assertNotEquals(String(lossy), exact);
  assertFalse(sameOffensive(row({ center_h3: lossy }), parseOk(), USER));
});

Deno.test('une demande DIFFÉRENTE n’est jamais fusionnée avec une existante', () => {
  const p = parseOk();
  assertFalse(sameOffensive(row({ radius_km: '2.5' }), p, USER));
  assertFalse(sameOffensive(row({ objectif_hexes: 41 }), p, USER));
  assertFalse(sameOffensive(row({ crew_id: OTHER_USER }), p, USER));
  assertFalse(sameOffensive(row({ created_by: OTHER_USER }), p, USER));
  assertFalse(sameOffensive(row({ created_by: null }), p, USER));
  assertFalse(
    sameOffensive(row({ ends_at: new Date(NOW + 24 * HOUR + 1).toISOString() }), p, USER),
    'une milliseconde d’écart = deux intentions différentes',
  );
  // Un autre théâtre (même quartier, cellule voisine) reste une autre offensive.
  const elsewhere = latLngToCell(48.85, 2.35, OFFENSIVE_CENTER_RESOLUTION);
  assert(elsewhere !== CENTER);
  assertFalse(sameOffensive(row({ center_h3: h3ToDb(elsewhere) }), p, USER));
});

Deno.test('un retry retombe sur la jumelle la PLUS ANCIENNE', () => {
  const p = parseOk();
  const twin = findIdempotentTwin(
    [
      row({ id: 'off-late', created_at: new Date(NOW + 500).toISOString() }),
      row({ id: 'off-early', created_at: new Date(NOW).toISOString() }),
      row({ id: 'off-other', objectif_hexes: 999 }),
    ],
    p,
    USER,
  );
  assertEquals(twin?.id, 'off-early');
});

Deno.test('sans jumelle, rien n’est renvoyé (aucun repli sur une offensive voisine)', () => {
  assertEquals(findIdempotentTwin([], parseOk(), USER), null);
  assertEquals(findIdempotentTwin([row({ radius_km: '9' })], parseOk(), USER), null);
});

Deno.test('l’arbitrage est déterministe : plus ancienne, id en départage', () => {
  const a = row({ id: 'off-a', created_at: new Date(NOW).toISOString() });
  const b = row({ id: 'off-b', created_at: new Date(NOW).toISOString() });
  assertEquals(pickSurvivor([a, b])?.id, 'off-a');
  assertEquals(pickSurvivor([b, a])?.id, 'off-a');
  assertEquals(pickSurvivor([])?.id, undefined);
});

Deno.test('course concurrente : les deux requêtes convergent, une seule se retire', () => {
  const p = parseOk();
  const mine = row({ id: 'off-mine', created_at: new Date(NOW + 10).toISOString() });
  const theirs = row({ id: 'off-theirs', created_at: new Date(NOW).toISOString() });
  const rows = [mine, theirs];

  const meResolving = resolveDuplicate('off-mine', rows, p, USER);
  assertEquals(meResolving, { keepId: 'off-theirs', discardId: 'off-mine' });

  const themResolving = resolveDuplicate('off-theirs', rows, p, USER);
  assertEquals(themResolving, { keepId: 'off-theirs', discardId: null });
});

Deno.test('sans doublon, rien n’est jamais retiré', () => {
  const p = parseOk();
  const mine = row({ id: 'off-mine' });
  assertEquals(resolveDuplicate('off-mine', [mine], p, USER).discardId, null);
  // Lecture en retard (notre ligne absente) : on ne supprime RIEN.
  assertEquals(resolveDuplicate('off-mine', [], p, USER), {
    keepId: 'off-mine',
    discardId: null,
  });
  // Une offensive DIFFÉRENTE du même crew n'est pas un doublon.
  assertEquals(
    resolveDuplicate('off-mine', [mine, row({ id: 'off-x', objectif_hexes: 12 })], p, USER)
      .discardId,
    null,
  );
});

// ─── 5. Refus nommés ────────────────────────────────────────────────────────

Deno.test('aucun refus n’est un 500 (une règle n’est pas une panne)', () => {
  const reasons = [
    'not_member',
    'forbidden_role',
    'too_many_open',
    'label_length',
    'radius_out_of_range',
    'objective_out_of_range',
    'duration_out_of_range',
    'window_invalid',
    'starts_too_far_ahead',
  ] as const;
  for (const r of reasons) {
    const s = statusForReject(r);
    assert(s >= 400 && s < 500, `${r} → ${s}`);
  }
  assertEquals(statusForReject('not_member'), 403);
  assertEquals(statusForReject('forbidden_role'), 403);
  assertEquals(statusForReject('too_many_open'), 409);
  assertEquals(statusForReject('window_invalid'), 400);
});

// ─── 6. Gardes de source (ce qu'une relecture ne tient pas) ──────────────────

const INDEX_SRC = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
const LOGIC_SRC = await Deno.readTextFile(new URL('./logic.ts', import.meta.url));

/**
 * Source sans commentaires : ces gardes jugent ce que le CODE fait, pas ce que
 * la doc en dit. Sans ça, une note « aucune lecture d'abonnement » suffirait à
 * faire échouer la garde anti pay-to-win — l'inverse du but recherché.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const INDEX_CODE = stripComments(INDEX_SRC);
const LOGIC_CODE = stripComments(LOGIC_SRC);

Deno.test('ANTI PAY-TO-WIN : aucune lecture d’un statut payant', () => {
  for (const [name, src] of [['index.ts', INDEX_CODE], ['logic.ts', LOGIC_CODE]] as const) {
    for (const forbidden of ['subscription', 'entitlement', 'revenuecat', 'is_premium']) {
      assertFalse(
        src.toLowerCase().includes(forbidden),
        `${name} ne doit jamais lire « ${forbidden} » : lancer une offensive ne s’achète pas`,
      );
    }
  }
});

Deno.test('aucun message Postgres ne part vers le client', () => {
  // Tout `.message` doit rester dans un log serveur ou un throw interne (capté
  // par le catch, qui ne rend que « creation_failed »). Jamais dans une réponse.
  const leaks = INDEX_SRC.split('\n').filter((l) =>
    l.includes('.message') && !l.includes('console.error') && !l.includes('throw new Error')
  );
  assertEquals(leaks, [], 'ces lignes exposent un message d’erreur SQL');
});

Deno.test('aucune constante de jeu réécrite en dur dans la fonction', () => {
  // Le plafond et les rôles autorisés sont IMPORTÉS, jamais recopiés.
  assert(INDEX_CODE.includes('OFFENSIVE_MAX_ACTIVE_PER_CREW'));
  assert(INDEX_CODE.includes('CREW_PERMISSIONS.launchOffensive'));
  assertFalse(INDEX_CODE.includes("'co_captain'"), 'rôle recopié en dur');
  assertFalse(
    INDEX_CODE.includes(`p_max_open: ${OFFENSIVE_MAX_ACTIVE_PER_CREW}`),
    'plafond recopié en dur',
  );
  assertFalse(
    LOGIC_CODE.includes(`${OFFENSIVE_OBJECTIVE_HEXES_MAX}`),
    'borne d’objectif recopiée hors game-rules',
  );
});

Deno.test('l’identité vient du JWT, jamais du corps de la requête', () => {
  assert(INDEX_CODE.includes('supabase.auth.getUser(jwt)'));
  assert(INDEX_CODE.includes('p_user_id: userId'));
  assertFalse(INDEX_CODE.includes('b.userId'), 'un userId du corps serait usurpable');
});

Deno.test('le bigint du théâtre est lu en TEXTE (précision > 2^53)', () => {
  // La parade contre la perte de précision vit dans la requête, pas dans un
  // commentaire : si ce cast saute, l'idempotence casse sans rien afficher.
  assert(INDEX_CODE.includes('center_h3::text'), 'center_h3 doit être lu en texte');
});

Deno.test('seules les offensives OUVERTES et l’adhésion ACTIVE sont lues', () => {
  assert(INDEX_CODE.includes(".neq('status', 'done')"), 'une offensive clôturée n’est plus ouverte');
  assert(INDEX_CODE.includes(".is('left_at', null)"), 'un ancien membre n’a plus de droits');
});
