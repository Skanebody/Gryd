/**
 * GRYD — tests de `chooseDailyZone` (engine/dailyZone.ts, A-45 §3 action 3).
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. l'app ne ment jamais — aucune zone n'est désignée quand le réel n'en
 *     porte pas (pas de ville, aucun candidat, jour illisible, secteur au total
 *     inconnu) ;
 *  2. le tirage est DÉTERMINISTE et REPRODUCTIBLE : deux appels identiques, et
 *     un recalcul serveur, donnent la même zone — c'est ce qui permet de valider
 *     une capture sans persister le tirage ;
 *  3. le tirage est PARTAGÉ par ville et CHANGE d'un jour à l'autre (sinon la
 *     mécanique ne donne aucune raison quotidienne de revenir) ;
 *  4. les entrées dégradées (NaN, négatifs, ids vides) n'inventent jamais une
 *     éligibilité.
 */
import { assertEquals, assertNotEquals } from 'jsr:@std/assert@^1';
import {
  chooseDailyZone,
  dayKeyOf,
  fnv1a32,
  isDistinctionActive,
  type DailyZoneCandidate,
} from '../_shared/engine/dailyZone.ts';
import {
  DAILY_ZONE_DISTINCTION_H,
  DAILY_ZONE_MIN_FREE_HEXES,
} from '../_shared/game-rules.ts';

const CITY = 'paris';
const DAY = '2026-07-21';

/** Secteur inerte : ni libre, ni fragile — jamais candidat. */
function sector(p: Partial<DailyZoneCandidate> = {}): DailyZoneCandidate {
  return {
    sectorId: 'aaaaaaaa-0000-0000-0000-000000000001',
    sectorName: null,
    freeHexes: 0,
    fragileHexes: 0,
    ...p,
  };
}

/** Jeu de secteurs distincts, tous éligibles en NEUTRE. */
function freeSectors(n: number): DailyZoneCandidate[] {
  return Array.from({ length: n }, (_, i) =>
    sector({
      sectorId: `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`,
      sectorName: `Secteur ${i}`,
      freeHexes: DAILY_ZONE_MIN_FREE_HEXES,
    }),
  );
}

// ═══ 1. États honnêtes : quand il n'y a rien, on ne désigne rien ═════════════

Deno.test('aucune ville connue → none/no_city (jamais un rattachement inventé)', () => {
  const out = chooseDailyZone({ dayKey: DAY, cityId: null, candidates: freeSectors(3) });
  assertEquals(out, { kind: 'none', reason: 'no_city' });
});

Deno.test('ville en chaîne vide/espaces → none/no_city', () => {
  assertEquals(
    chooseDailyZone({ dayKey: DAY, cityId: '   ', candidates: freeSectors(3) }),
    { kind: 'none', reason: 'no_city' },
  );
});

Deno.test('aucun secteur → none/no_candidate', () => {
  assertEquals(
    chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates: [] }),
    { kind: 'none', reason: 'no_candidate' },
  );
});

Deno.test('secteurs tous pleins et stables → none/no_candidate (pas de zone du jour)', () => {
  const out = chooseDailyZone({
    dayKey: DAY,
    cityId: CITY,
    candidates: [sector(), sector({ sectorId: 'b', freeHexes: 0, fragileHexes: 0 })],
  });
  assertEquals(out, { kind: 'none', reason: 'no_candidate' });
});

Deno.test('jour illisible → none/bad_day_key (jamais une date « réparée »)', () => {
  for (const bad of ['', '2026-7-21', '21/07/2026', '2026-07-21T10:00:00Z', 'aujourdhui']) {
    assertEquals(
      chooseDailyZone({ dayKey: bad, cityId: CITY, candidates: freeSectors(3) }),
      { kind: 'none', reason: 'bad_day_key' },
      `dayKey rejeté : ${JSON.stringify(bad)}`,
    );
  }
});

// ═══ 2. Éligibilité : dérivée du réel, jamais offerte ════════════════════════

Deno.test('freeHexes null (total INCONNU) n’est pas éligible en neutre', () => {
  const out = chooseDailyZone({
    dayKey: DAY,
    cityId: CITY,
    candidates: [sector({ freeHexes: null, fragileHexes: 0 })],
  });
  assertEquals(out, { kind: 'none', reason: 'no_candidate' });
});

Deno.test('freeHexes null MAIS zone fragile réelle → éligible en fragile', () => {
  const out = chooseDailyZone({
    dayKey: DAY,
    cityId: CITY,
    candidates: [sector({ freeHexes: null, fragileHexes: 2, sectorName: 'Canal' })],
  });
  assertEquals(out.kind, 'zone');
  if (out.kind !== 'zone') throw new Error('unreachable');
  assertEquals(out.role, 'fragile');
  assertEquals(out.fragileHexes, 2);
  assertEquals(out.freeHexes, null);
  assertEquals(out.sectorName, 'Canal');
});

Deno.test('libre ET fragile → étiqueté neutral (on n’envoie pas la ville sur le territoire de quelqu’un)', () => {
  const out = chooseDailyZone({
    dayKey: DAY,
    cityId: CITY,
    candidates: [sector({ freeHexes: 4, fragileHexes: 9 })],
  });
  assertEquals(out.kind, 'zone');
  if (out.kind !== 'zone') throw new Error('unreachable');
  assertEquals(out.role, 'neutral');
});

Deno.test('le seuil DAILY_ZONE_MIN_FREE_HEXES fait foi (juste en dessous = inéligible)', () => {
  const below = DAILY_ZONE_MIN_FREE_HEXES - 1;
  assertEquals(
    chooseDailyZone({
      dayKey: DAY,
      cityId: CITY,
      candidates: [sector({ freeHexes: below, fragileHexes: 0 })],
    }),
    { kind: 'none', reason: 'no_candidate' },
  );
  assertEquals(
    chooseDailyZone({
      dayKey: DAY,
      cityId: CITY,
      candidates: [sector({ freeHexes: DAILY_ZONE_MIN_FREE_HEXES, fragileHexes: 0 })],
    }).kind,
    'zone',
  );
});

Deno.test('entrées aberrantes (NaN, négatif, Infinity) ne créent aucune éligibilité', () => {
  const junk = [
    sector({ sectorId: 'x1', freeHexes: Number.NaN, fragileHexes: Number.NaN }),
    sector({ sectorId: 'x2', freeHexes: -5, fragileHexes: -3 }),
    sector({ sectorId: 'x3', freeHexes: Number.POSITIVE_INFINITY, fragileHexes: 0 }),
  ];
  assertEquals(
    chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates: junk }),
    { kind: 'none', reason: 'no_candidate' },
  );
});

Deno.test('un secteur sans identité réelle est écarté (aucune capture enregistrable dessus)', () => {
  const out = chooseDailyZone({
    dayKey: DAY,
    cityId: CITY,
    candidates: [sector({ sectorId: '  ', freeHexes: 10 })],
  });
  assertEquals(out, { kind: 'none', reason: 'no_candidate' });
});

// ═══ 3. Déterminisme et reproductibilité serveur ════════════════════════════

Deno.test('même entrée ⇒ même zone (100 appels, aucun aléa)', () => {
  const candidates = freeSectors(12);
  const first = chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates });
  for (let i = 0; i < 100; i++) {
    assertEquals(chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates }), first);
  }
});

Deno.test('l’ordre de la requête SQL ne change PAS la zone tirée', () => {
  const candidates = freeSectors(9);
  const ref = chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates });
  const shuffled = [...candidates].reverse();
  assertEquals(chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates: shuffled }), ref);
});

Deno.test('deux joueurs de la même ville voient la MÊME zone (tirage partagé)', () => {
  // Même ville, même jour, même état réel lu en base : le tirage ne dépend
  // d'aucune donnée propre au joueur — c'est ce qui le rend vérifiable entre amis.
  const candidates = freeSectors(7);
  const joueurA = chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates });
  const joueurB = chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates });
  assertEquals(joueurA, joueurB);
});

Deno.test('deux villes distinctes le même jour ne tirent pas le même index', () => {
  const candidates = freeSectors(16);
  const a = chooseDailyZone({ dayKey: DAY, cityId: 'paris', candidates });
  const b = chooseDailyZone({ dayKey: DAY, cityId: 'lille', candidates });
  assertNotEquals(a, b);
});

Deno.test('la zone CHANGE au fil des jours (une vraie raison quotidienne de revenir)', () => {
  const candidates = freeSectors(10);
  const seen = new Set<string>();
  for (let d = 1; d <= 28; d++) {
    const key = `2026-07-${String(d).padStart(2, '0')}`;
    const out = chooseDailyZone({ dayKey: key, cityId: CITY, candidates });
    if (out.kind === 'zone') seen.add(out.sectorId);
  }
  // Sur 28 jours et 10 secteurs, un tirage qui n'en visite qu'un ou deux serait
  // un tirage cassé (ex. modulo dégénéré) : on exige une vraie dispersion.
  assertEquals(seen.size >= 5, true, `secteurs distincts vus sur 28 jours : ${seen.size}`);
});

Deno.test('candidat unique : il est toujours tiré (pas de « none » masqué)', () => {
  const only = freeSectors(1);
  for (let d = 1; d <= 10; d++) {
    const out = chooseDailyZone({
      dayKey: `2026-07-${String(d).padStart(2, '0')}`,
      cityId: CITY,
      candidates: only,
    });
    assertEquals(out.kind, 'zone');
    if (out.kind !== 'zone') throw new Error('unreachable');
    assertEquals(out.sectorId, only[0]?.sectorId);
  }
});

Deno.test('la sortie rappelle dayKey et cityId (le serveur peut re-vérifier le tirage)', () => {
  const out = chooseDailyZone({ dayKey: DAY, cityId: CITY, candidates: freeSectors(4) });
  assertEquals(out.kind, 'zone');
  if (out.kind !== 'zone') throw new Error('unreachable');
  assertEquals(out.dayKey, DAY);
  assertEquals(out.cityId, CITY);
});

// ═══ 4. fnv1a32 — stabilité de l'algorithme de tirage ═══════════════════════

Deno.test('fnv1a32 : vecteurs de référence de la spec FNV-1a 32 bits', () => {
  // Vecteurs publics — ils gèlent l'implémentation : si un jour l'arithmétique
  // 32 bits dérive, TOUTES les zones du jour changeraient silencieusement.
  assertEquals(fnv1a32(''), 0x811c9dc5);
  assertEquals(fnv1a32('a'), 0xe40c292c);
  assertEquals(fnv1a32('foobar'), 0xbf9cf968);
});

Deno.test('fnv1a32 reste dans les 32 bits non signés', () => {
  for (const s of ['', 'paris', '2026-07-21:paris', 'é'.repeat(200)]) {
    const h = fnv1a32(s);
    assertEquals(Number.isInteger(h) && h >= 0 && h <= 0xffffffff, true, s.slice(0, 12));
  }
});

// ═══ 5. dayKeyOf — le jour VÉCU, pas le jour UTC ════════════════════════════

Deno.test('dayKeyOf : minuit UTC, sans décalage', () => {
  assertEquals(dayKeyOf(Date.UTC(2026, 6, 21, 0, 0, 0), 0), '2026-07-21');
});

Deno.test('dayKeyOf : 23 h à Paris (UTC+2) reste le jour du coureur', () => {
  // 21 juillet 23 h à Paris = 21 juillet 21 h UTC → toujours le 21, pas le 22.
  assertEquals(dayKeyOf(Date.UTC(2026, 6, 21, 21, 0, 0), 120), '2026-07-21');
  // 22 juillet 00 h 30 à Paris = 21 juillet 22 h 30 UTC → bien le 22.
  assertEquals(dayKeyOf(Date.UTC(2026, 6, 21, 22, 30, 0), 120), '2026-07-22');
});

Deno.test('dayKeyOf : offset négatif (fuseaux à l’ouest)', () => {
  assertEquals(dayKeyOf(Date.UTC(2026, 6, 21, 2, 0, 0), -300), '2026-07-20');
});

Deno.test('dayKeyOf : entrée illisible → null (jamais un jour deviné)', () => {
  assertEquals(dayKeyOf(Number.NaN, 0), null);
  assertEquals(dayKeyOf(Date.now(), Number.NaN), null);
});

Deno.test('dayKeyOf produit toujours un dayKey ACCEPTÉ par chooseDailyZone', () => {
  const candidates = freeSectors(3);
  for (const off of [-720, -300, 0, 120, 330, 840]) {
    const key = dayKeyOf(Date.UTC(2026, 0, 1, 12, 0, 0), off);
    assertEquals(typeof key, 'string');
    assertEquals(
      chooseDailyZone({ dayKey: key ?? '', cityId: CITY, candidates }).kind,
      'zone',
      `offset ${off}`,
    );
  }
});

// ═══ 6. Distinction cosmétique : temporaire, et elle ne retire jamais rien ══

Deno.test('la distinction est active pendant DAILY_ZONE_DISTINCTION_H puis s’éteint', () => {
  const t0 = Date.UTC(2026, 6, 21, 8, 0, 0);
  const H = 3_600_000;
  assertEquals(isDistinctionActive(t0, t0, DAILY_ZONE_DISTINCTION_H), true);
  assertEquals(
    isDistinctionActive(t0, t0 + (DAILY_ZONE_DISTINCTION_H - 1) * H, DAILY_ZONE_DISTINCTION_H),
    true,
  );
  assertEquals(
    isDistinctionActive(t0, t0 + DAILY_ZONE_DISTINCTION_H * H, DAILY_ZONE_DISTINCTION_H),
    false,
  );
});

Deno.test('aucune distinction sans capture réelle, et rien d’actif avant l’attribution', () => {
  const t0 = Date.UTC(2026, 6, 21, 8, 0, 0);
  assertEquals(isDistinctionActive(null, t0, DAILY_ZONE_DISTINCTION_H), false);
  assertEquals(isDistinctionActive(t0, t0 - 1, DAILY_ZONE_DISTINCTION_H), false);
  assertEquals(isDistinctionActive(Number.NaN, t0, DAILY_ZONE_DISTINCTION_H), false);
  assertEquals(isDistinctionActive(t0, t0, 0), false);
});
