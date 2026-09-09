import { buildRunFilmScene2026, filmTraceAtFrame2026, RUN_FILM_2026, type RunFilmInput2026 } from './runFilmModel2026.ts';
declare const Deno: { test(name: string, fn: () => void): void };
function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
const trace = Array.from({ length: 150 }, (_, i) => ({ lat: 48.85 + Math.sin(i / 20) * .004, lng: 2.3 + i * .0002 }));
const input: RunFilmInput2026 = {
  facts: { sport: 'COURSE À PIED', distance: '5,6 km', duration: '34:12', gain: null },
  segments: [trace], privacy: { resolved: true, maskEndpoints: true, zones: [] }, format: 'story', theme: 'dark', locale: 'fr',
};
Deno.test('Film2026: owned seasonal animation keeps exact edition and protected source',()=>{
  const scene=buildRunFilmScene2026({...input,edition:{name:'Animation courte',collection:'Saison réelle',premium:true}});
  assert(scene.texts.some(t=>t.text==='Saison réelle / Animation courte'),'Exact selected object is encoded');
  assert(scene.traceWidth===11,'Artistic edition has its render');
  assert(scene.segments.length>0&&!JSON.stringify(scene).includes('lat'),'Privacy projection unchanged');
  assert((scene.frames-scene.revealEndFrame)/scene.fps>=3,'Final frame remains readable');
});
Deno.test('Film2026: exact formats and three seconds of readable final frame', () => {
  for (const [format, height] of [['story', 1920], ['portrait', 1350], ['square', 1080]] as const) {
    const scene = buildRunFilmScene2026({ ...input, format });
    assert(scene.width === 1080 && scene.height === height, 'Export dimensions must be exact');
    assert(scene.frames / scene.fps === 8, 'Film lasts eight seconds');
    assert((scene.frames - scene.revealEndFrame) / scene.fps >= 3, 'Final result stays visible');
    assert(JSON.stringify(filmTraceAtFrame2026(scene, 150)) === JSON.stringify(filmTraceAtFrame2026(scene, 239)), 'No new information during the final hold');
  }
});
Deno.test('Film2026: geographic and privacy metadata never enter the encoder scene', () => {
  const scene = buildRunFilmScene2026(input), serialized = JSON.stringify(scene);
  assert(!serialized.includes('lat') && !serialized.includes('lng') && !serialized.includes('zones'), 'No geographic fields');
  assert(scene.segments.length > 0, 'The protected portion remains drawable');
  assert(!scene.segments.flat().includes(trace[0]!.lat), 'Scene is projected pixels');
  assert(scene.texts.some(t => t.text === '5,6 km') && scene.texts.some(t => t.text === '34:12'), 'Real supplied facts are retained');
  assert(!scene.texts.some(t => t.text.includes('TERRAIN')), 'No invented gain');
});
Deno.test('Film2026: unresolved privacy and completely protected traces become a facts-only film', () => {
  for (const privacy of [{ resolved: false, maskEndpoints: false, zones: [] }, { resolved: true, maskEndpoints: false, zones: [{ center: trace[70]!, radiusM: 100000 }] }]) {
    const scene = buildRunFilmScene2026({ ...input, privacy });
    assert(scene.segments.length === 0, 'No trace can survive the protection');
    assert(scene.texts.some(t => t.text === 'Un moment dehors.'), 'Appropriate no-map composition');
    assert(scene.texts.some(t => t.text === '5,6 km'), 'Facts still exist without GPS');
  }
});
Deno.test('Film2026: recorder pauses remain independent paths at every stage of the animation', () => {
  const scene = buildRunFilmScene2026({ ...input, segments: [trace.slice(0, 50), trace.slice(80)], privacy: { ...input.privacy, maskEndpoints: false } });
  assert(scene.segments.length === 2, 'Two recorder segments');
  assert(filmTraceAtFrame2026(scene, 0).length === 0, 'No route before reveal');
  const final = filmTraceAtFrame2026(scene, RUN_FILM_2026.frames - 1);
  assert(final.length === 2, 'No connector line can join two segments');
  assert(final[0]![0] === scene.segments[0]![0] && final[1]![0] === scene.segments[1]![0], 'Every fragment has its own start');
});
Deno.test('Film2026: invalid fixes create breaks instead of an invented connector', () => {
  const scene = buildRunFilmScene2026({ ...input, segments: [[...trace.slice(0, 40), { lat: NaN, lng: 0 }, ...trace.slice(80)]], privacy: { ...input.privacy, maskEndpoints: false } });
  assert(scene.segments.length === 2, 'Invalid fix separates drawing paths');
  assert(scene.segments.flat().every(Number.isFinite), 'Encoder never gets NaN');
});
Deno.test('Film2026: absent GPS and optional speed keep correct facts without substituting a route', () => {
  const scene = buildRunFilmScene2026({ ...input, segments: [], facts: { sport: 'SORTIE VÉLO', distance: '18 km', duration: '48:00', gain: null, rate: '22,5 km/h' } });
  assert(scene.segments.length === 0, 'No made-up route');
  assert(scene.texts.some(t => t.text === '22,5 km/h'), 'Already formatted speed keeps its real unit');
  assert(scene.texts.some(t => t.text === 'SORTIE VÉLO'), 'Discipline retained');
});
Deno.test('Film2026: excessive trace or invalid text fails before calling a native encoder', () => {
  for (const value of [{ ...input, segments: [Array.from({ length: RUN_FILM_2026.maxPoints + 1 }, () => trace[0]!)] }, { ...input, facts: { ...input.facts, distance: 'bad\nvalue' } }]) {
    let failed = false; try { buildRunFilmScene2026(value); } catch { failed = true; }
    assert(failed, 'Invalid export must fail explicitly');
  }
});
