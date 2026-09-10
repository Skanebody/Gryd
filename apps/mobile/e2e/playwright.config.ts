/**
 * GRYD — harnais E2E du PARCOURS CLIENT (onboarding → 1re utilisation →
 * creation de compte → reconnexion). Voir `e2e/README.md` pour ce qu'il prouve
 * et surtout ce qu'il ne prouve PAS.
 *
 * ─── POURQUOI UNE CONFIG A PART DE `playwright.config.ts` (racine) ──────────
 * La config racine porte deux projets qui demarrent chacun un VRAI serveur de
 * developpement : un build Next.js complet pour `apps/web` et un `expo start
 * --web` (compilation Metro a la premiere requete). Playwright demarre TOUS les
 * `webServer` d'une config, quel que soit le projet demande : y greffer ce
 * harnais aurait impose plusieurs minutes de build Next avant chaque execution.
 *
 * Ici le serveur est un serveur de FICHIERS sur un bundle DEJA exporte : il
 * demarre en quelques millisecondes, et le bundle teste est exactement celui
 * qu'`expo export` produit — pas un rendu de serveur de developpement.
 *
 * ─── POURQUOI LA CONFIG EST DANS `e2e/` ET PAS DANS `apps/mobile/` ──────────
 * Playwright charge le tsconfig le plus proche du fichier. Celui d'apps/mobile
 * etend `expo/tsconfig.base`, hoiste a la racine du monorepo : son resolveur ne
 * sait pas le suivre et refuse de demarrer. `e2e/tsconfig.json` coupe cette
 * chaine, a condition que la config vive du meme cote.
 *
 * Hors `npm run gate` : le gate doit rester une boucle courte, l'export web
 * prend des minutes.
 */
import { defineConfig, devices } from '@playwright/test';

/** Le viewport de reference de la spec §3.1 (iOS 390 × 844 pt). */
const IPHONE = { width: 390, height: 844 };

/** Port dedie : ne collisionne ni avec Expo (8081) ni avec la config racine (3100). */
const PORT = 4319;
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: '.',
  // Un echec E2E doit etre reproductible : pas de retry qui masque un flake.
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    ...devices['Desktop Chrome'],
    viewport: IPHONE,
    baseURL: ORIGIN,
    /**
     * ⚠️ SANS CECI, LE BUNDLE REND EN ANGLAIS. L'app derive sa langue de celle
     * du navigateur, et Playwright demarre en `en-US` : toutes les assertions
     * sur la copie francaise tomberaient sur « Explore the map » au lieu de
     * « Explorer la carte ». Tester une autre langue = un autre projet,
     * explicitement.
     */
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    /**
     * Un selecteur qui ne resout pas doit tomber VITE. Sans plafond, un clic sur
     * un element absent attend le timeout du TEST entier : une seule assertion
     * fausse transformait la suite en attente de plusieurs minutes.
     */
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [{ name: 'parcours', use: { ...devices['Desktop Chrome'], viewport: IPHONE } }],

  webServer: {
    // `cwd` par defaut = le dossier de cette config (`apps/mobile/e2e`).
    command: `node serve-dist.mjs ${PORT}`,
    url: `${ORIGIN}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
  },
});
