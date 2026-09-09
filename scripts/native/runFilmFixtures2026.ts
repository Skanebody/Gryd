/** Synthetic verification fixtures only. Never imported by the application or used as user data. */
import { buildRunFilmScene2026 } from '../../apps/mobile/src/features/share/film/runFilmModel2026.ts';
const folder = Deno.args[0];
if (!folder) throw new Error('Provide a fixture output directory');
const route = Array.from({ length: 150 }, (_, i) => ({ lat: 48.85 + Math.sin(i / 20) * .004, lng: 2.3 + i * .0002 }));
for (const format of ['story', 'portrait', 'square'] as const) {
  Deno.writeTextFileSync(`${folder}/film-${format}.json`, JSON.stringify(buildRunFilmScene2026({
    facts: { sport: 'FIXTURE / TEST ENCODEUR', distance: '5,6 km', duration: '34:12', gain: null },
    segments: [route.slice(0, 65), route.slice(75)], privacy: { resolved: true, maskEndpoints: true, zones: [] },
    format, theme: format === 'portrait' ? 'light' : 'dark', locale: 'fr',
  })));
}
