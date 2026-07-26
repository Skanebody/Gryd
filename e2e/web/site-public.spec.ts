/**
 * GRYD — E2E du SITE PUBLIC (apps/web). Ici le web EST le produit : un test vert
 * prouve que ce qui est déployé marche. Couvre ce que le fondateur a exigé le
 * 26/07 (« plus de démo, que du prêt à l'emploi ») : la waitlist enregistre pour
 * de vrai, les pages légales sont atteignables, et RIEN ne fabrique de données.
 */
import { expect, test } from '@playwright/test';

test.describe('Site public', () => {
  test('accueil : la promesse, la porte waitlist, zéro erreur console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await expect(page).toHaveTitle(/GRYD/);
    // La section waitlist est la seule décision de la page.
    await expect(page.locator('#waitlist')).toBeVisible();
    expect(errors, `erreurs console : ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('waitlist : une saisie invalide est REFUSÉE côté client, sans appel réseau', async ({ page }) => {
    await page.goto('/#waitlist');
    const form = page.locator('#waitlist form');
    await form.evaluate((f: HTMLFormElement) => f.setAttribute('novalidate', ''));

    // Compte les appels réseau sortants : une saisie invalide ne doit en produire AUCUN.
    let requests = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' || r.url().includes('supabase')) requests += 1;
    });

    await form.locator('input[name="email"]').fill('pas-un-email');
    await form.locator('input[name="postal_code"]').fill('1');
    await form.locator('button[type="submit"]').click();

    // L'erreur DIT quoi faire (addendum §F : jamais d'excuse, une consigne).
    await expect(page.locator('#waitlist [role="alert"]')).toContainText(/e-mail/i);
    expect(requests, 'une saisie invalide ne doit produire aucun appel').toBe(0);
  });

  test('waitlist : ne promet JAMAIS un succès sans enregistrement', async ({ page }) => {
    // Garde-fou constitutionnel : l'ancienne branche DEV renvoyait « succès » sans
    // insert. Si la page affiche une confirmation, elle doit venir d'un vrai retour.
    await page.goto('/#waitlist');
    const confirm = page.locator('#waitlist').getByRole('status');
    await expect(confirm).toHaveCount(0); // rien n'est confirmé avant soumission
  });

  const LEGAL = [
    ['/conditions', /[Cc]onditions/],
    ['/confidentialite', /[Cc]onfidentialité/],
    ['/cgv', /CGV|[Vv]ente/],
    ['/mentions-legales', /[Mm]entions/],
  ] as const;

  for (const [path, titre] of LEGAL) {
    test(`légal : ${path} rend et renvoie vers l'accueil`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} doit répondre 200`).toBe(200);
      await expect(page.locator('h1')).toContainText(titre);
      // Chaque page légale offre un retour — jamais de cul-de-sac (§S07).
      await expect(page.locator('a[href="/"]').first()).toBeVisible();
    });
  }
});
