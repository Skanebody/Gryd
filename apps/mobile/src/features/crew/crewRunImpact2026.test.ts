/**
 * GRYD — « CE QUE TA SORTIE A APPORTÉ AU CREW » NE S'INVENTE PAS (LOT K).
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ══════════════════════════════════════════
 * Avant 0182, aucune lecture ne reliait une sortie à un crew : l'écran de
 * résultat proposait « Partager avec mon crew » et se taisait sur tout le
 * reste. Le premier test rejoue la forme d'un serveur qui ne connaît pas encore
 * cette fonction (une réponse vide) et exige que rien ne soit affirmé.
 *
 * ═══ CE QU'IL VERROUILLE ═══════════════════════════════════════════════════
 *  · un REFUS (`{ok:false}`) ne devient jamais « tu n'as pas de crew » ;
 *  · aucune SURFACE de crew n'existe dans le contrat (0126) ;
 *  · une contribution à un défi est nommée avec son secteur, et jamais avec un
 *    secteur inventé quand le serveur ne le retrouve pas ;
 *  · la phrase affichée n'est jamais un ordre de courir (§14.2).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { crewRunImpactLine2026, parseCrewRunImpact2026 } from './crewRunImpact2026.ts';

const READY = {
  ok: true,
  crew: { id: 'c1', name: 'Les Quais', color: 3 },
  capturePublished: true,
  sharedWithCrew: false,
  challenge: null,
};

// ═══ ÉTAPE 0 ════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — un serveur qui ne connaît pas cette lecture n’affirme rien', () => {
  // Avant 0182 : la RPC n'existe pas, le câblage rend `null`/une erreur.
  assertEquals(parseCrewRunImpact2026(null), null);
  assertEquals(parseCrewRunImpact2026(undefined), null);
  assertEquals(parseCrewRunImpact2026({}), null);
});

// ═══ LES REFUS NE SONT PAS DES RÉPONSES SUR L'APPARTENANCE ═════════════════

Deno.test('un REFUS ne devient jamais « tu n’as pas de crew »', () => {
  for (const reason of ['signed_out', 'not_authorized', 'not_found']) {
    assertEquals(parseCrewRunImpact2026({ ok: false, reason }), null, reason);
  }
});

Deno.test('« pas de crew » est une RÉPONSE explicite du serveur, et elle se lit', () => {
  assertEquals(parseCrewRunImpact2026({ ok: true, crew: null }), { kind: 'none' });
});

Deno.test('un booléen ABSENT fait tomber la lecture, il ne se replie pas sur false', () => {
  const { capturePublished: _drop, ...withoutPublished } = READY;
  assertEquals(parseCrewRunImpact2026(withoutPublished), null);
  const { sharedWithCrew: _drop2, ...withoutShared } = READY;
  assertEquals(parseCrewRunImpact2026(withoutShared), null);
});

// ═══ CE QUE LE CONTRAT PORTE, ET CE QU'IL NE PORTERA JAMAIS ════════════════

Deno.test('aucune surface, aucun rang : un crew ne possède pas de terrain (0126)', () => {
  const state = parseCrewRunImpact2026(READY);
  assert(state?.kind === 'ready');
  assertEquals(
    Object.keys(state.facts).sort(),
    ['capturePublished', 'challenge', 'crewEmblem', 'crewId', 'crewName', 'sharedWithCrew'],
  );
});

Deno.test('un emblème hors bornes ou absent devient null, jamais 0', () => {
  const noColor = parseCrewRunImpact2026({ ...READY, crew: { id: 'c1', name: 'Les Quais' } });
  assert(noColor?.kind === 'ready');
  assertEquals(noColor.facts.crewEmblem, null);
  const badColor = parseCrewRunImpact2026({ ...READY, crew: { id: 'c1', name: 'Les Quais', color: 'bleu' } });
  assert(badColor?.kind === 'ready');
  assertEquals(badColor.facts.crewEmblem, null);
});

Deno.test('une contribution à un défi porte son secteur, ou se tait dessus', () => {
  const withSector = parseCrewRunImpact2026({
    ...READY,
    challenge: { challengeId: 'k1', title: 'Quais contre Coteaux', sectorTitle: 'Ile Lacroix' },
  });
  assert(withSector?.kind === 'ready');
  assertEquals(withSector.facts.challenge?.sectorTitle, 'Ile Lacroix');

  const withoutSector = parseCrewRunImpact2026({
    ...READY,
    challenge: { challengeId: 'k1', title: 'Quais contre Coteaux', sectorTitle: null },
  });
  assert(withoutSector?.kind === 'ready');
  assertEquals(withoutSector.facts.challenge?.sectorTitle, null);
});

Deno.test('un défi sans titre fait tomber la lecture — pas de ligne muette', () => {
  assertEquals(
    parseCrewRunImpact2026({ ...READY, challenge: { challengeId: 'k1' } }),
    null,
  );
});

// ═══ LA PHRASE ══════════════════════════════════════════════════════════════

Deno.test('la phrase nomme le défi et le secteur quand ils existent', () => {
  const line = crewRunImpactLine2026(
    {
      crewId: 'c1', crewName: 'Les Quais', crewEmblem: 3,
      capturePublished: true, sharedWithCrew: true,
      challenge: { challengeId: 'k1', title: 'Quais contre Coteaux', sectorTitle: 'Ile Lacroix' },
    },
    true,
  );
  assert(line.includes('Quais contre Coteaux'));
  assert(line.includes('Ile Lacroix'));
});

Deno.test('sans défi, la phrase parle de PERSONNES et jamais de km² de crew', () => {
  const line = crewRunImpactLine2026(
    { crewId: 'c1', crewName: 'Les Quais', crewEmblem: null, capturePublished: true, sharedWithCrew: false, challenge: null },
    true,
  );
  assert(line.includes('membres de Les Quais'));
  assertEquals(/km²|km2|surface/i.test(line), false);
});

Deno.test('sans capture publiée, la phrase dit le fait sans donner d’ordre', () => {
  const line = crewRunImpactLine2026(
    { crewId: 'c1', crewName: 'Les Quais', crewEmblem: null, capturePublished: false, sharedWithCrew: false, challenge: null },
    true,
  );
  assert(line.includes('Les Quais'));
  /*
   * §14.2 : « ne jamais transformer la notification en ordre de courir ». On
   * cherche l'IMPÉRATIF, c'est-à-dire un verbe d'action en TÊTE de phrase, et
   * non le mot « partages » au milieu d'un constat (« tant que tu ne la
   * partages pas » décrit un état, il n'ordonne rien). Une regex qui brûlerait
   * le mot entier interdirait à l'app d'expliquer sa propre mécanique.
   */
  const imperatif = /(^|[.!?]\s+)(Cours|Coure[zs]|Partage[zs]?|Va|Sors|Rejoins|Il faut)\b/;
  assertEquals(imperatif.test(line), false, line);
  assertEquals(line.includes('!'), false, line);
});

Deno.test('les trois phrases existent aussi en anglais, sans tiret long en français', () => {
  const facts = { crewId: 'c1', crewName: 'Les Quais', crewEmblem: null, capturePublished: true, sharedWithCrew: false, challenge: null };
  assert(crewRunImpactLine2026(facts, false).includes('Les Quais'));
  assertEquals(/[—–]/.test(crewRunImpactLine2026(facts, true)), false);
  assertEquals(
    /[—–]/.test(crewRunImpactLine2026({ ...facts, capturePublished: false }, true)),
    false,
  );
});
