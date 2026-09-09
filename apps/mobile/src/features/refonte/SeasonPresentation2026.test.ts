import { assertEquals } from 'jsr:@std/assert@^1';
import { formatCivilDay2026, readableTimeZone2026, seasonTimelineWindow2026 } from './SeasonPresentation2026.ts';
const entries = Array.from({ length: 12 }, (_, i) => ({ id: `t${i + 1}`, threshold: i + 1 }));

Deno.test('progression : « À suivre » commence par le PROCHAIN jalon, jamais par celui d’après', () => {
  // Le défaut : `slice(nextIndex + 1, nextIndex + 4)` sautait exactement l'étape
  // que l'écran mettait en avant — et le point « prochain » de la frise ne
  // pouvait donc jamais s'allumer.
  const window = seasonTimelineWindow2026(entries, 3, false);
  assertEquals(window.next?.threshold, 4);
  assertEquals(window.timeline.map(item => item.threshold), [4, 5, 6]);
  assertEquals(window.timeline[0]?.id, window.next?.id);
});
Deno.test('progression : sans mesure, tout franchi, et « tout voir » restent trois cas', () => {
  assertEquals(seasonTimelineWindow2026(entries, undefined, false).timeline.map(i => i.threshold), [1, 2, 3]);
  assertEquals(seasonTimelineWindow2026(entries, 12, false).next, null);
  assertEquals(seasonTimelineWindow2026(entries, 12, false).timeline.map(i => i.threshold), [10, 11, 12]);
  assertEquals(seasonTimelineWindow2026(entries, 3, true).timeline.length, 12);
  assertEquals(seasonTimelineWindow2026([], 3, false).timeline, []);
});
Deno.test('saison : une journée civile devient une date lisible, jamais un AAAA-MM-JJ brut', () => {
  assertEquals(formatCivilDay2026('2026-09-11', 'fr'), '11 septembre 2026');
  // L'ordre des composants appartient à la locale, pas à nous : on vérifie le
  // FAIT (le bon jour, le bon mois, la bonne année), pas une mise en forme.
  const english = formatCivilDay2026('2026-01-01', 'en');
  assertEquals(english.includes('January') && english.includes('1') && english.includes('2026'), true);
  // Une journée civile ne glisse pas d'un jour selon le fuseau de l'appareil.
  assertEquals(formatCivilDay2026('2026-01-01', 'fr'), '1 janvier 2026');
  // Aucune fabrication : une valeur illisible est rendue telle quelle.
  for (const raw of ['', 'demain', '2026-13-40', '2026-9-1']) assertEquals(formatCivilDay2026(raw, 'fr'), raw);
});
Deno.test('saison : un identifiant IANA devient un lieu lisible, sans perdre sa région', () => {
  assertEquals(readableTimeZone2026('Europe/Paris'), 'Paris · Europe');
  assertEquals(readableTimeZone2026('America/New_York'), 'New York · America');
  assertEquals(readableTimeZone2026('America/Argentina/Buenos_Aires'), 'Buenos Aires · America / Argentina');
  assertEquals(readableTimeZone2026('UTC'), 'UTC');
  assertEquals(readableTimeZone2026(''), '');
});
