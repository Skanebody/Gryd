/**
 * Test anti-drift des copies MOBILE du moteur GPS (AMENDEMENT-15 §2) générées
 * par scripts/sync-game-rules.mjs vers apps/mobile/src/features/run/gps/engine/
 * (Metro/tsconfig Expo ne résolvent ni `@klaim/shared/*` en subpath ni les
 * imports Deno `./x.ts` — la copie est GÉNÉRÉE, jamais éditée à la main).
 * ⚠ MIROIR EXACT de scripts/sync-game-rules.mjs  — toute modification là-bas
 *   doit être répliquée ici.
 */
import { assertEquals } from 'jsr:@std/assert@^1';

const MOBILE_ENGINE_TARGETS = [
  { files: ['gps.ts', 'validation.ts'], dir: 'apps/mobile/src/features/run/gps/engine/' },
  {
    files: ['crewMission.ts', 'crewSignals.ts'],
    dir: 'apps/mobile/src/features/crew/engine/',
  },
  {
    files: ['dailyZone.ts', 'welcomeChallenge.ts'],
    dir: 'apps/mobile/src/features/daily/engine/',
  },
  // Masquage privacy §12.1 : le pipeline a quitté l'app pour le moteur le
  // 28/07/2026, pour qu'`ingest_run` puisse l'exécuter AVANT d'écrire
  // `runs.polyline_masked`. Le mobile en consomme une copie générée.
  {
    files: ['tracePrivacy.ts', 'polygon.ts'],
    dir: 'apps/mobile/src/features/share/engine/',
  },
  // ⚠ ENTRÉE MANQUANTE jusqu'au 03/08/2026 : `territoryHistory.ts` était
  // synchronisé par le script sans être drift-testé ici. Une copie non testée
  // est exactement ce que ce fichier existe pour empêcher — elle pouvait
  // diverger de sa source sans qu'aucun gate ne rougisse.
  {
    files: ['territoryHistory.ts'],
    dir: 'apps/mobile/src/features/premium/analytics/engine/',
  },
  // Jauge de fermeture (lot M5) : la MÊME fonction calcule ce que l'écran
  // annonce pendant la course et ce que le serveur accorde après. Deux
  // implémentations divergeraient en silence — d'où la copie générée, et ce
  // test. `validation.ts` a deux destinations : les deux sont vérifiées.
  {
    files: ['closure.ts', 'gps.ts', 'validation.ts'],
    dir: 'apps/mobile/src/mvp/run/engine/',
  },
] as const;

const mobileHeader = (name: string): string =>
  `// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.\n` +
  `// Source : packages/engine/src/${name} (drift testé côté Deno).\n\n`;

const transformMobileLine = (line: string): string =>
  line
    .replace(/(['"])@klaim\/shared\/game-rules\1/g, '$1@klaim/shared$1')
    .replace(/(['"])@klaim\/shared\/types\1/g, '$1@klaim/shared$1')
    // Règle GÉNÉRIQUE pour tout import relatif entre fichiers engine (Deno veut
    // `.ts`, Metro n'en veut pas). Miroir exact de sync-game-rules.mjs.
    .replace(/(['"])(\.\/[A-Za-z0-9_-]+)\.ts\1/g, '$1$2$1');

const repoRoot = new URL('../../../', import.meta.url);
const engineSrcDir = new URL('packages/engine/src/', repoRoot);

for (const target of MOBILE_ENGINE_TARGETS) {
  const copyDir = new URL(target.dir, repoRoot);
  for (const file of target.files) {
    Deno.test(`drift : mobile ${target.dir}${file} = transformation de packages/engine/src/${file}`, async () => {
      const source = await Deno.readTextFile(new URL(file, engineSrcDir));
      const expected = mobileHeader(file) +
        source.split('\n').map(transformMobileLine).join('\n');
      const copy = await Deno.readTextFile(new URL(file, copyDir));
      assertEquals(
        copy,
        expected,
        `${target.dir}${file} a dérivé de packages/engine/src/${file} — ` +
          `lancer node scripts/sync-game-rules.mjs`,
      );
    });
  }
}
