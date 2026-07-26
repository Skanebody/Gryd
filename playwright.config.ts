/**
 * GRYD — configuration E2E (lot 0.5). Voir `e2e/README.md` pour ce que ces tests
 * prouvent et surtout ce qu'ils NE prouvent PAS (le bundle web n'est pas le produit
 * natif : carte, GPS et auth par fournisseur divergent par construction).
 *
 * Deux projets, deux serveurs, deux niveaux de preuve :
 *  · `web`    → apps/web, le site public RÉEL. Un test vert = le produit marche.
 *  · `mobile` → bundle Expo web, instrument de PREVIEW. Un test vert = l'écran
 *               monte, la copie est la bonne, le parcours enchaîne. Rien de plus.
 *
 * Volontairement HORS de `npm run gate` : ces tests démarrent des serveurs et
 * prennent des minutes, le gate doit rester une boucle courte.
 */
import { defineConfig, devices } from '@playwright/test';

/** Le viewport de référence de la spec §3.1 (iOS 390 × 844 pt). */
const IPHONE = { width: 390, height: 844 };

export default defineConfig({
  testDir: './e2e',
  // Un échec E2E doit être reproductible : pas de retry qui masque un flake.
  retries: 0,
  fullyParallel: false,
  reporter: [['list']],
  // Le bundle Expo web est lent à démarrer à froid (compilation Metro).
  timeout: 60_000,
  expect: { timeout: 10_000 },

  projects: [
    {
      name: 'web',
      testMatch: /web\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3100' },
    },
    {
      name: 'mobile',
      testMatch: /mobile\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: IPHONE,
        baseURL: 'http://127.0.0.1:8081',
        // ⚠️ SANS CECI, LE BUNDLE REND EN ANGLAIS. L'app détecte la langue du
        // navigateur et Playwright démarre en `en-US` : les assertions sur la copie
        // française échouaient toutes sur un « Skip » au lieu de « Passer ». On
        // épingle donc la locale du marché principal, qui est aussi celle dans
        // laquelle la spec écrit ses chaînes littérales (§E01 « COURS. PRENDS TA
        // VILLE. »). Tester une autre langue = un autre projet, explicitement.
        locale: 'fr-FR',
      },
      // Metro compile le bundle à la PREMIÈRE requête : la toute première
      // navigation peut dépasser une minute sur un cache froid.
      timeout: 180_000,
    },
  ],

  webServer: [
    {
      // Site public : on teste le BUILD, pas le mode dev — c'est le build qui est déployé.
      // `next` n'est pas hoisté à la racine (deux React cohabitent, cf. CLAUDE.md) :
      // on lance donc le binaire DEPUIS le workspace qui le porte.
      command: 'npm run build -w @klaim/web && npm exec -w @klaim/web -- next start -p 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command: 'npx expo start --web --port 8081',
      cwd: 'apps/mobile',
      url: 'http://127.0.0.1:8081',
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
