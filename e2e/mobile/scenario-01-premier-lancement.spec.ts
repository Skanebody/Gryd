/**
 * GRYD — Scénario §25.1 « Premier lancement » : installation → onboarding → auth.
 *
 * ⚠️ CE QUE CE TEST PROUVE, ET SEULEMENT ÇA (cf. `e2e/README.md`) : sur le bundle
 * WEB — instrument de preview, PAS le produit natif — les écrans d'onboarding
 * MONTENT, portent la bonne copie, et le parcours ENCHAÎNE. Il ne prouve rien sur
 * le GPS (`expo-location`), la carte MapLibre native, ni l'auth Apple/Google, qui
 * divergent par construction (AMENDEMENT-47).
 *
 * Il couvre néanmoins la classe de régression la plus fréquente de ce dépôt :
 * un écran qui ne monte plus, ou une copie fausse (« CONQUIERS » au lieu de
 * « COURS », « GRYD Verify examine » pour une revue inexistante…).
 */
import { expect, test, type Page } from '@playwright/test';

/** Repart d'un premier lancement : aucun drapeau d'onboarding, aucune session. */
async function premierLancement(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* navigation privée : rien à nettoyer */
    }
  });
  await page.goto('/onboarding');
}

test.describe('§25.1 — Premier lancement', () => {
  test('E01 promesse : la copie EXACTE de la spec, une seule action', async ({ page }) => {
    await premierLancement(page);

    // §E01 — titre et sous-titre littéraux de la spec (le piège historique du repo :
    // « CONQUIERS TA VILLE » avait remplacé « COURS. PRENDS TA VILLE. »).
    await expect(page.getByText(/COURS\./)).toBeVisible();
    await expect(page.getByText(/PRENDS TA VILLE\./)).toBeVisible();
    await expect(page.getByText(/boucle fermée/i)).toBeVisible();

    // §1.7 « une seule action principale par écran » : un CTA, et « Passer » est un lien.
    await expect(page.getByText(/CONTINUER/i).first()).toBeVisible();
    await expect(page.getByText(/Passer/i).first()).toBeVisible();
  });

  test('le parcours ENCHAÎNE : promesse → rivalité, sans écran mort', async ({ page }) => {
    await premierLancement(page);

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.getByText(/CONTINUER/i).first().click();

    // Carte 2 — la rivalité (« pourquoi tu reviens »).
    await expect(page.getByText(/reprise/i).first()).toBeVisible({ timeout: 15_000 });
    // Honnêteté : la démonstration est ÉTIQUETÉE comme un exemple, jamais présentée
    // comme l'état du monde du joueur (constitution : l'app ne ment jamais).
    await expect(page.getByText(/Exemple/i).first()).toBeVisible();

    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('auth : le gate 16+ passe AVANT toute création de compte', async ({ page }) => {
    await page.goto('/sign-in');

    // Apple 5.1.1 / mineurs : l'âge est demandé au point de CRÉATION de compte,
    // avant toute collecte. Ce n'est pas un écran optionnel — il précède la porte.
    await expect(page.getByText(/16 ans/i).first()).toBeVisible({ timeout: 20_000 });
    // Une décision, deux issues, et le refus n'est pas caché.
    await expect(page.getByText(/moins de 16 ans/i).first()).toBeVisible();
  });

  test('auth : aucun bouton mort — seules les portes RÉELLEMENT utilisables sont peintes', async ({ page }) => {
    await page.goto('/sign-in');

    // On franchit le gate d'âge pour atteindre les portes (cf. test précédent).
    await page.getByText(/OUI, J.AI 16 ANS/i).first().click();

    // Sur le web, Apple et Google n'ont aucun chemin utilisable tant qu'O2 est
    // ouvert : la règle « aucun bouton mort » impose qu'ils soient ABSENTS, pas
    // grisés. L'e-mail (OTP, HTTP pur) est donc la seule porte, et elle est visible.
    await expect(page.getByText(/e-?mail/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Continuer avec Apple/i)).toHaveCount(0);
    await expect(page.getByText(/Continuer avec Google/i)).toHaveCount(0);

    // Le pied légal est présent : on ne crée pas de compte sans dire à quoi on consent.
    await expect(page.getByText(/Conditions/i).first()).toBeVisible();
  });
});
