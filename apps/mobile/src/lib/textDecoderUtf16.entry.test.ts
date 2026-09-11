/**
 * GRYD — LE WRAPPER TextDecoder utf-16le PRÉCÈDE TOUT MODULE DE ROUTE.
 *
 * ─── LE BUG QUE CE TEST AURAIT ATTRAPÉ ───────────────────────────────────────
 * Du 11/09/2026 après-midi (commit e9b7d70, barre de navigation unique) au
 * 11/09 soir, CINQ builds iOS ont été installés sur l'iPhone du fondateur, et
 * tous mouraient avant le premier écran : « RangeError: Unknown encoding:
 * utf-16le ». Le wrapper `textDecoderUtf16` existait et était importé en 2ᵉ
 * position de `app/_layout.tsx`, mais expo-router charge `(tabs)/_layout.tsx`
 * AVANT `_layout.tsx` (ordre des chemins, `getLayoutNode` → `loadRoute()`), et
 * ce layout atteint h3-js depuis la barre unique. Aucun test ne regardait
 * l'ORDRE d'exécution ; le typecheck et 3 400 tests étaient verts.
 *
 * Le remède : `index.js` importe le wrapper avant `expo-router/entry`, et
 * `package.json` désigne `index.js` comme entrée. Ce test fige les deux, et
 * l'ordre `expo` → wrapper → entrée (dans l'ordre inverse, `Expo.fx` → `winter`
 * réinstallerait le TextDecoder d'origine par-dessus le wrapper).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const read = (rel: string) => Deno.readTextFile(new URL(rel, import.meta.url));

Deno.test("package.json : l'entrée de l'app est index.js, pas expo-router/entry", async () => {
  const pkg = JSON.parse(await read('../../package.json')) as { main?: string };
  assertEquals(pkg.main, 'index.js');
});

Deno.test('index.js : expo, puis le wrapper utf-16le, puis expo-router/entry, dans cet ordre', async () => {
  const src = await read('../../index.js');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const imports = [...code.matchAll(/^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm)].map((m) => m[1]);
  assertEquals(imports, ['expo', './src/lib/textDecoderUtf16', 'expo-router/entry']);
  assert(!/^\s*(export|import\s+[{*\w])/m.test(code), "index.js n'importe rien d'autre : il ne fait que fixer l'ordre");
});

Deno.test("app/_layout.tsx garde son import du wrapper (inoffensif, et il documente l'histoire)", async () => {
  const layout = await read('../../app/_layout.tsx');
  assert(layout.includes("import '../src/lib/textDecoderUtf16';"));
});
