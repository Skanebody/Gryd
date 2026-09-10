/**
 * GRYD — serveur statique du bundle web exporte (`apps/mobile/dist`).
 *
 * POURQUOI UN SERVEUR A NOUS, ET PAS `npx serve` : le bundle est exporte en
 * `output: "single"` (app.json), c'est-a-dire une SPA. Toute URL profonde
 * (`/email`, `/sign-in`, `/onboarding`) doit donc rendre le MEME `index.html`
 * et laisser expo-router router sur le pathname. Un serveur statique naif
 * repondrait 404 sur ces chemins et les scenarios S2/S5 ne pourraient pas
 * exister. `npx serve -s` le ferait, mais au prix d'un telechargement npm a
 * chaque execution — ici, zero dependance.
 *
 * Il ne sert QUE `dist/`, en lecture seule, sur 127.0.0.1.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const PORT = Number(process.argv[2] ?? 4319);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(
    "[e2e] `apps/mobile/dist/index.html` est absent : le bundle web n'a pas ete exporte.\n" +
      '      Lance `node apps/mobile/e2e/build-dist.mjs` (ou `npm run test:e2e:parcours`, qui le fait).',
  );
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  // `normalize` + prefixe verifie : aucun `..` ne peut sortir de `dist/`.
  const candidate = resolve(join(DIST, normalize(decodeURIComponent(url.pathname))));
  const inside = candidate === DIST || candidate.startsWith(DIST + '/');
  const isFile = inside && existsSync(candidate) && statSync(candidate).isFile();
  const file = isFile ? candidate : join(DIST, 'index.html');
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // Un test doit voir le bundle qu'il vient d'exporter, jamais un cache.
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e] dist servi sur http://127.0.0.1:${PORT}`);
});
