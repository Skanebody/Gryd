/**
 * GRYD — E17 : « aucun achat pendant une course », et son piège.
 *
 * Ce que ces tests protègent :
 *  1. une course RÉELLEMENT en cours ferme la boutique ;
 *  2. une course INTERROMPUE (buffer vieux de plusieurs heures, en attente de
 *     reprise) ne la ferme PAS — sinon un kill OS condamnerait la boutique
 *     jusqu'à la prochaine sortie, un écran bloqué par une donnée périmée ;
 *  3. un horodatage incohérent (horloge remise à l'heure, buffer corrompu) ne
 *     conclut RIEN : on ne bloque pas sur une durée négative ;
 *  4. la sonde ne retient que le fix le PLUS RÉCENT, quel que soit l'ordre des
 *     points (le buffer est trié par le moteur, pas par le stockage).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { RUN_AUTOSAVE_INTERVAL_S } from '@klaim/shared';
import {
  anyRunLive,
  isRunLive,
  probeFromStoredRun,
  RUN_LIVE_MAX_SILENCE_MS,
  RUN_LIVE_MISSED_AUTOSAVES,
} from './runGuard.ts';

const NOW = 1_800_000_000_000;

Deno.test('le seuil dérive de la cadence d’autosave réelle (aucun nombre au doigt mouillé)', () => {
  assertEquals(RUN_LIVE_MAX_SILENCE_MS, RUN_AUTOSAVE_INTERVAL_S * 1000 * RUN_LIVE_MISSED_AUTOSAVES);
  // Large devant un flush (~2 intervalles), court devant l'oubli d'une course.
  assert(RUN_LIVE_MAX_SILENCE_MS > RUN_AUTOSAVE_INTERVAL_S * 1000 * 2);
  assert(RUN_LIVE_MAX_SILENCE_MS < 10 * 60 * 1000);
});

Deno.test('aucun buffer → aucune course en cours', () => {
  assertEquals(isRunLive(null, NOW), false);
  assertEquals(anyRunLive([null, null], NOW), false);
});

Deno.test('un buffer écrit à l’instant = course EN COURS (boutique fermée)', () => {
  assertEquals(isRunLive({ startedAt: NOW - 600_000, lastFixTs: NOW - 2_000 }, NOW), true);
  // Pile sur le seuil : encore vivant (on ne coupe pas au millième près).
  assertEquals(
    isRunLive({ startedAt: NOW - 600_000, lastFixTs: NOW - RUN_LIVE_MAX_SILENCE_MS }, NOW),
    true,
  );
});

Deno.test('LE PIÈGE : une course interrompue depuis des heures NE ferme PAS la boutique', () => {
  const sixHours = 6 * 3_600_000;
  assertEquals(isRunLive({ startedAt: NOW - sixHours, lastFixTs: NOW - sixHours }, NOW), false);
  // Juste au-delà du seuil : déjà périmé.
  assertEquals(
    isRunLive({ startedAt: NOW - 600_000, lastFixTs: NOW - RUN_LIVE_MAX_SILENCE_MS - 1 }, NOW),
    false,
  );
});

Deno.test('sans aucun fix, on retombe sur le départ de la course (jamais sur une valeur inventée)', () => {
  assertEquals(isRunLive({ startedAt: NOW - 5_000, lastFixTs: null }, NOW), true);
  assertEquals(isRunLive({ startedAt: NOW - 3_600_000, lastFixTs: null }, NOW), false);
});

Deno.test('horodatage dans le futur ou illisible → on ne conclut RIEN (on ne bloque pas)', () => {
  assertEquals(isRunLive({ startedAt: NOW, lastFixTs: NOW + 60_000 }, NOW), false);
  assertEquals(isRunLive({ startedAt: Number.NaN, lastFixTs: null }, NOW), false);
});

Deno.test('la sonde retient le fix le PLUS RÉCENT, quel que soit l’ordre du buffer', () => {
  const probe = probeFromStoredRun({
    startedAt: NOW - 100_000,
    fixes: [{ ts: NOW - 90_000 }, { ts: NOW - 1_000 }, { ts: NOW - 50_000 }],
  });
  assertEquals(probe?.lastFixTs, NOW - 1_000);
  assertEquals(isRunLive(probe, NOW), true);
});

Deno.test('sonde : buffer absent ou départ illisible → aucune sonde', () => {
  assertEquals(probeFromStoredRun(null), null);
  assertEquals(probeFromStoredRun({ startedAt: Number.NaN, fixes: [] }), null);
  assertEquals(probeFromStoredRun({ startedAt: NOW, fixes: [] })?.lastFixTs, null);
});

Deno.test('deux buffers (reprise en attente) : un seul vivant suffit à fermer la boutique', () => {
  const stale = { startedAt: NOW - 7_200_000, lastFixTs: NOW - 7_200_000 };
  const live = { startedAt: NOW - 300_000, lastFixTs: NOW - 5_000 };
  assertEquals(anyRunLive([stale, live], NOW), true);
  assertEquals(anyRunLive([stale, null], NOW), false);
});
