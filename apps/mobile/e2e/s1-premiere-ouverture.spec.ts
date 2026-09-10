/**
 * S1 — PREMIERE OUVERTURE. Stockage vide → l'app montre la decouverte, et son
 * unique action mene a la CARTE. Aucun compte n'est exige pour entrer.
 *
 * C'est la promesse du cahier de septembre (« l'exploration precede le
 * compte », G01-G29) : la seule facon de la verifier est de partir d'un
 * appareil qui ne sait rien, et de regarder ou l'app envoie.
 */
import { expect, test, FR, firstLaunch, seedStorage, mapLayersButton } from './fixtures/app';

test.describe('S1 — premiere ouverture', () => {
  test('stockage vide : la racine renvoie sur la decouverte', async ({ page, supabase }) => {
    await seedStorage(page, firstLaunch());
    await page.goto('/');

    await expect(page.getByText(FR.onboardingTitle)).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/onboarding/);

    // Une porte de compte n'est ni montree ni imposee a ce stade.
    await expect(page.getByText(FR.authMethodsTitle)).toHaveCount(0);
    await expect(page.getByText(FR.ageTitle)).toHaveCount(0);

    // Rien n'a ete demande au serveur pour afficher un ecran qui ne dit
    // que la promesse : aucune donnee de jeu n'est lue avant l'exploration.
    expect(supabase.calls.filter((call) => call.includes('/rest/v1/'))).toEqual([]);
  });

  test('le CTA sort de la decouverte et ouvre la carte, sans compte', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await seedStorage(page, firstLaunch());
    await page.goto('/onboarding');
    await expect(page.getByText(FR.onboardingTitle)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: FR.onboardingCta, exact: true }).click();

    // La carte, pas une porte de compte : on verifie l'URL ET un repere de
    // l'ecran carte (l'URL seule ne prouverait pas que l'ecran a monte).
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/, { timeout: 20_000 });
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FR.onboardingTitle)).toHaveCount(0);

    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('la decouverte est facultative et se rejoue : « Comment jouer » enchaine', async ({ page }) => {
    await seedStorage(page, firstLaunch());
    await page.goto('/onboarding');
    await expect(page.getByText(FR.onboardingTitle)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: FR.onboardingHowTo }).click();
    await expect(page.getByText(FR.onboardingLoopTitle)).toBeVisible();

    // Honnetete : la demonstration est ETIQUETEE comme un exemple, jamais
    // presentee comme un territoire que ce joueur possede.
    await expect(page.getByText(FR.onboardingExample)).toBeVisible();

    // La sortie reste ouverte a chaque planche : rien n'enferme.
    await expect(page.getByRole('button', { name: FR.onboardingCta, exact: true })).toBeVisible();
  });
});
