import { assertEquals } from 'jsr:@std/assert';
import { resolveCrewJoinCode2026 } from './joinInput2026.ts';
Deno.test('join accepts the exact code or official invitation link without manual extraction', () => {
  for (const value of ['ab12cd', ' AB12CD ', 'https://gryd.run/c/ab12cd', 'gryd://c/AB12CD']) assertEquals(resolveCrewJoinCode2026(value), 'AB12CD');
});
Deno.test('join does not convert unknown URLs, long tokens or malformed input into a code', () => {
  for (const value of ['https://evil.example/c/AB12CD', 'https://gryd.run.evil.example/c/AB12CD', 'AB12C', 'AB12CDX', 'https://gryd.run/i/ABCDEFGHIJKLMNOPQRSTUVWXYZ']) assertEquals(resolveCrewJoinCode2026(value), null);
});
