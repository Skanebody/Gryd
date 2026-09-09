import { protectedShareSegments2026 } from './shareTrace2026.ts';
import { haversineM, SHARE_TRIM_M } from './sharePrivacy.ts';
declare const Deno: { test(name: string, fn: () => void): void };
function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
const line = (lng: number) => Array.from({ length: 40 }, (_, i) => ({ lat: 48.85, lng: lng + i * 0.0003 }));

Deno.test('2026 share privacy: unresolved preferences or zones withhold every route segment', () => {
  assert(protectedShareSegments2026([line(2.3)], { resolved: false, maskEndpoints: false, zones: [] }).length === 0, 'Unknown privacy must not expose a route');
});

Deno.test('2026 share privacy: recorder gaps never become connector lines', () => {
  const first = line(2.3), second = line(2.4);
  const output = protectedShareSegments2026([first, second], { resolved: true, maskEndpoints: false, zones: [] });
  assert(output.length === 2, 'Two genuine segments must stay separate');
  assert(output[0]!.every(point => first.includes(point)), 'First segment must not invent any point');
  assert(output[1]!.every(point => second.includes(point)), 'Second segment must not invent any point');
});

Deno.test('2026 share privacy: endpoint protection does not also trim pauses in the middle', () => {
  const first = line(2.3), second = line(2.4);
  const output = protectedShareSegments2026([first, second], { resolved: true, maskEndpoints: true, zones: [] });
  assert(output.length === 2, 'Both fragments have enough publishable trace');
  for (const point of output.flat()) {
    assert(haversineM(point, first[0]!) > SHARE_TRIM_M, 'Start remains protected');
    assert(haversineM(point, second[second.length - 1]!) > SHARE_TRIM_M, 'Finish remains protected');
  }
  assert(output[0]!.includes(first[first.length - 1]!), 'The first pause endpoint is not the activity finish');
  assert(output[1]!.includes(second[0]!), 'Resume is not a new activity start');
});

Deno.test('2026 share privacy: personal zones apply even when endpoint protection is disabled', () => {
  const segment = line(2.3);
  const center = segment[20]!;
  const output = protectedShareSegments2026([segment], { resolved: true, maskEndpoints: false, zones: [{ center, radiusM: 200 }] });
  for (const point of output.flat()) assert(haversineM(point, center) > 200, 'A protected zone must never be rendered');
});
