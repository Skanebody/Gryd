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

  /**
   * ⚠️ SÉQUENCE RECALÉE LE 27/07/2026. Ce test affirmait que la carte 2 était la
   * RIVALITÉ (« Ta zone peut être reprise »). L'onboarding a depuis été rebâti en
   * cinq planches E01→E05 (commit « Onboarding : la séquence des planches E01b »)
   * et la rivalité est passée en TROISIÈME position — le test échouait donc sur
   * une copie qui n'existe plus à cet endroit. Il balaie maintenant la séquence
   * RÉELLE, jusqu'à sa sortie sur E06.
   */
  test('le parcours ENCHAÎNE : E01 → E05, puis sortie sur E06 (connexion)', async ({ page }) => {
    await premierLancement(page);

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // E02 — la mécanique (« ferme la boucle »).
    await page.getByText(/^CONTINUER$/i).first().click();
    await expect(page.getByText(/FERME/i).first()).toBeVisible({ timeout: 15_000 });
    // Honnêteté : la démonstration est ÉTIQUETÉE comme un exemple, jamais présentée
    // comme l'état du monde du joueur (constitution : l'app ne ment jamais).
    await expect(page.getByText(/Exemple/i).first()).toBeVisible();

    // E03 — la rivalité (« pourquoi tu reviens »).
    await page.getByText(/^CONTINUER$/i).first().click();
    await expect(page.getByText(/LA REPRENDRE/i).first()).toBeVisible();

    // E04 — le crew.
    await page.getByText(/^CONTINUER$/i).first().click();
    await expect(page.getByText(/EN CREW/i).first()).toBeVisible();

    // E05 — la localisation, demandée AVEC sa contrepartie. « Plus tard » est une
    // VRAIE sortie, pas un renvoi : c'est ce qui interdit d'affirmer plus loin
    // que la position est réglée (cf. le sous-titre de E10).
    await page.getByText(/^CONTINUER$/i).first().click();
    await expect(page.getByText(/AUTORISER LA LOCALISATION/i).first()).toBeVisible();
    await expect(page.getByText(/Plus tard/i).first()).toBeVisible();

    // Sortie du flow → E06. Aucun écran mort entre les deux.
    await page.getByText(/Plus tard/i).first().click();
    await expect(page).toHaveURL(/sign-in/, { timeout: 15_000 });

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

/**
 * §25.1 (suite) — LE PARCOURS DE PREMIER USAGE, après l'authentification :
 * E08 `/setup/profile` → E09 `/setup/activity` → E10 `/setup/permissions` → carte.
 *
 * ⚠️ CE QUI N'EST PAS COUVERT ICI, ET POURQUOI. La PORTE elle-même — « après une
 * authentification réussie, aller vers /setup/profile si le profil minimal
 * n'existe pas » — exige une VRAIE session Supabase et une vraie ligne
 * `user_profiles`. La créer depuis un test consommerait le quota e-mail du
 * projet du fondateur et laisserait des comptes parasites dans une base dont
 * l'état est un fait de production. Cette décision est donc prouvée là où elle
 * peut l'être honnêtement : par les tests PURS de
 * `apps/mobile/src/features/setup/firstRun.test.ts` (quatre états jamais
 * confondus) et par les tripwires de source de `setupChain.test.ts` (la garde
 * existe et mène bien au premier écran).
 *
 * Ce que ces tests-ci prouvent, et seulement ça : E09 et E10 MONTENT, portent la
 * bonne copie, LA CHAÎNE ENCHAÎNE réellement (aucun `NEXT_STEP` ne tombe sur
 * « Unmatched route ») — et E08 REFUSE de s'ouvrir sans session (voir son test).
 */
test.describe('§25.1 — Parcours de premier usage (E08 → E09 → E10)', () => {
  /**
   * ⚠️ TEST RÉÉCRIT LE 27/07/2026, ET LE COMPORTEMENT A CHANGÉ POUR DE BON.
   *
   * Il assertait « E08 monte : trois champs annoncés » en visitant
   * `/setup/profile` SANS session. C'est précisément la situation qui était un
   * mensonge : `submit()` enveloppait toute l'écriture serveur dans
   * `if (client && userId)`, sautait la branche sans session, puis émettait
   * `setup_profile_completed` et naviguait vers E09. Le joueur voyait son unique
   * CTA chartreuse aboutir alors que son @handle n'était réservé nulle part.
   *
   * E08 refuse donc désormais de s'ouvrir quand rien ne peut être enregistré
   * (`<Redirect href="/" />`, même patron que `app/(auth)/email.tsx`). Ce test
   * prouve ce refus — c'est-à-dire l'absence du formulaire, qui est la nouvelle
   * garantie. La COPIE de E08 n'est plus prouvable ici : la prouver exigerait
   * une vraie session Supabase, ce que ce fichier explique déjà ne pas vouloir
   * fabriquer (quota e-mail, comptes parasites dans une base de production).
   */
  test('E08 ne s’ouvre PAS sans session : aucun formulaire qu’on ne peut enregistrer', async ({
    page,
  }) => {
    await page.goto('/setup/profile');
    // La redirection laisse le temps au provider de session de trancher : on
    // attend le VERDICT (le formulaire absent), pas un instant arbitraire.
    await expect(page.getByText(/Qui es-tu sur la carte/i)).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText(/ni âge, ni genre, ni poids/i)).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/setup\/profile/);
  });

  test('E09 monte : deux disciplines, et la phrase qui déverrouille le choix', async ({ page }) => {
    await page.goto('/setup/activity');
    await expect(page.getByText(/Tu commences par quoi/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Course à pied/i).first()).toBeVisible();
    await expect(page.getByText(/Vélo/i).first()).toBeVisible();
    // Texte imposé par la spec (l.785) : le choix n'est pas définitif, et ça se dit.
    await expect(page.getByText(/changer à tout moment/i).first()).toBeVisible();
  });

  test('LA CHAÎNE ENCHAÎNE : E09 → E10, sans « Unmatched route »', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/setup/activity');
    await expect(page.getByText(/Tu commences par quoi/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByText(/Course à pied/i).first().click();
    await page.getByText(/^CONTINUER$/i).first().click();

    // E10 est bien servi — c'est exactement ce qui manquait tant que
    // `app/setup/permissions.tsx` n'existait pas : le CTA tombait sur l'écran
    // « Unmatched route » d'expo-router.
    await expect(page.getByText(/Deux choses qui aident/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/setup\/permissions/);
    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('RETOUR : peint quand il mène quelque part, ABSENT quand il ne mènerait nulle part', async ({
    page,
  }) => {
    // 1. Atteint par un `push` depuis E09 : le retour EXISTE, donc il est peint.
    await page.goto('/setup/activity');
    await expect(page.getByText(/Tu commences par quoi/i).first()).toBeVisible({ timeout: 20_000 });
    await page.getByText(/Course à pied/i).first().click();
    await page.getByText(/^CONTINUER$/i).first().click();
    await expect(page.getByText(/Deux choses qui aident/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const back = page.getByLabel(/Revenir au choix de discipline/i);
    await expect(back).toBeVisible();
    await back.click();
    await expect(page.getByText(/Tu commences par quoi/i).first()).toBeVisible();

    // 2. Atteint DIRECTEMENT (rien derrière dans la pile) : aucune flèche n'est
    //    peinte. « L'absence d'un bouton n'est pas un mensonge, un bouton qui
    //    échoue toujours en est un » — l'affichage se dérive de la capacité
    //    RÉELLE (`router.canGoBack()`), pas de l'apparence.
    await page.goto('/setup/permissions');
    await expect(page.getByText(/Deux choses qui aident/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel(/Revenir au choix de discipline/i)).toHaveCount(0);
  });

  test('E10 rend la main : CONTINUER sort du parcours, quelle que soit l’issue des permissions', async ({
    page,
  }) => {
    await page.goto('/setup/permissions');
    await expect(page.getByText(/Deux choses qui aident/i).first()).toBeVisible({
      timeout: 20_000,
    });
    // Le CTA n'attend AUCUNE permission : sur le bundle web les deux capacités
    // sont absentes, et il doit rester vivant (§A4, « aucun bouton mort »).
    await page.getByText(/^CONTINUER$/i).first().click();
    await expect(page).not.toHaveURL(/\/setup\//, { timeout: 15_000 });
  });
});
