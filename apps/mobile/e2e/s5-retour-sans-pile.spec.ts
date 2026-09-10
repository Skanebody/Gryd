/**
 * S5 — RETOUR SANS PILE. `/email` ouvert DIRECTEMENT par son URL (lien profond,
 * ou `callback.tsx` qui REMPLACE vers lui) n'a rien derriere lui dans la pile de
 * navigation. Un `router.back()` nu ne ferait alors rien : le joueur cliquerait
 * une fleche qui ne bouge pas. C'est la definition meme du bouton mort.
 *
 * L'ecran retombe donc sur l'entree (`router.replace('/')`). Ce test verifie le
 * COMPORTEMENT, pas la presence : une fleche visible qui n'emmene nulle part
 * echouerait ici exactement comme une fleche absente.
 */
import { expect, test, FR, exploredOnce, seedStorage, mapLayersButton } from './fixtures/app';

test.describe('S5 — retour sans pile', () => {
  test('/email ouvert par URL : le retour ramene a la carte', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await seedStorage(page, exploredOnce());
    await page.goto('/email');
    await expect(page.getByText(FR.emailTitle)).toBeVisible({ timeout: 30_000 });

    const back = page.getByRole('button', { name: FR.emailBackA11y });
    await expect(back).toBeVisible();
    await back.click();

    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/, { timeout: 20_000 });
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 20_000 });

    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('/email atteint par la porte de compte : le retour rend la pile, pas la racine', async ({
    page,
  }) => {
    await seedStorage(page, exploredOnce());
    await page.goto('/sign-in');
    await expect(page.getByText(FR.authMethodsTitle)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: FR.authEmailDoor }).click();
    await page.getByRole('button', { name: FR.ageConfirmA11y, exact: true }).click();
    await expect(page.getByText(FR.emailTitle)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: FR.emailBackA11y }).click();

    // Ici la pile EXISTE : le retour rend l'ecran d'ou l'on vient, et surtout
    // pas la racine — l'affichage se derive de la capacite REELLE.
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 20_000 });
    await expect(page.getByText(FR.authMethodsTitle)).toBeVisible();
  });
});
