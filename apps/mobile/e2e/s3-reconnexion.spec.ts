/**
 * S3 — RECONNEXION. L'appareil porte deja une session : l'app doit ouvrir la
 * CARTE, sans repasser par la decouverte. Puis la deconnexion doit rendre la
 * porte de compte a nouveau atteignable — et la reconnexion doit fonctionner.
 *
 * Ce qui se joue ici est la garde de `app/(tabs)/_layout.tsx` : « Existing
 * accounts go straight to the app; guests see the welcome once ». Un membre
 * qui reverrait l'onboarding a chaque lancement serait une regression muette,
 * invisible en test unitaire.
 */
import { expect, test, FR, exploredOnce, returningMember, seedStorage, mapLayersButton } from './fixtures/app';
import { DEFAULT_USER, GOOD_CODE } from './fixtures/supabase-mock';

const EXPECTED_NAME = DEFAULT_USER.email.split('@')[0] ?? '';

test.describe('S3 — reconnexion', () => {
  test('session en memoire : la carte s’ouvre directement, aucune decouverte', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await seedStorage(page, returningMember());
    await page.goto('/');

    await expect(mapLayersButton(page)).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByText(FR.onboardingTitle)).toHaveCount(0);

    // Et l'app se sait connectee : le profil montre l'identite du compte.
    // Par la barre basse — `goto('/profil')` sert un AUTRE ecran (test epingle
    // en fin de fichier).
    await page.getByRole('tab', { name: FR.navProfil }).click();
    await expect(page.getByText(EXPECTED_NAME, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FR.profileGuest, { exact: true })).toHaveCount(0);

    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('deconnexion : l’app redevient invitee et la porte de compte se repeint', async ({
    page,
    supabase,
  }) => {
    await seedStorage(page, returningMember());
    await page.goto('/parametres');

    const signOut = page.getByRole('button', { name: FR.settingsSignOut });
    await expect(signOut).toBeVisible({ timeout: 30_000 });
    await signOut.click();

    // La deconnexion est REELLE : elle passe par le serveur, pas par un oubli local.
    await expect.poll(() => supabase.countOf('POST /auth/v1/logout'), { timeout: 15_000 }).toBe(1);
    await expect(page.getByText(FR.settingsSignOutFailed)).toHaveCount(0);

    // Retour au profil, invite : la porte de compte est peinte a nouveau.
    await expect(page.getByText(FR.profileSignIn, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FR.profileGuest, { exact: true })).toBeVisible();
    await expect(page.getByText(EXPECTED_NAME, { exact: true })).toHaveCount(0);

    // Et elle mene quelque part.
    await page.getByText(FR.profileSignIn, { exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 20_000 });
    await expect(page.getByText(FR.authMethodsTitle)).toBeVisible();
  });

  test('reconnexion : l’age deja declare n’est pas redemande, et la session revient', async ({
    page,
  }) => {
    await seedStorage(page, returningMember());
    await page.goto('/parametres');
    await page.getByRole('button', { name: FR.settingsSignOut }).click();
    await expect(page.getByText(FR.profileSignIn, { exact: true })).toBeVisible({ timeout: 30_000 });

    await page.goto('/sign-in');
    await expect(page.getByText(FR.authMethodsTitle)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: FR.authEmailDoor }).click();

    // Le gate 16+ a deja ete franchi sur cet appareil : le redemander serait
    // une friction pour une reponse qu'on connait deja.
    await expect(page).toHaveURL(/\/email/, { timeout: 20_000 });
    await expect(page.getByText(FR.ageTitle)).toHaveCount(0);

    await page.getByLabel(FR.emailLabel).fill(DEFAULT_USER.email);
    await page.getByRole('button', { name: FR.otpRequestCta }).click();
    await expect(page.getByLabel(FR.otpFieldA11y)).toBeVisible();
    await page.getByLabel(FR.otpFieldA11y).fill(GOOD_CODE);
    await page.getByRole('button', { name: FR.otpVerifyCta }).click();

    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/, { timeout: 20_000 });
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 20_000 });
  });
});

/**
 * ═══ BUG EPINGLE — UNE URL, DEUX ECRANS ════════════════════════════════════
 *
 * CE QUE LE JOUEUR VIT : il ouvre son Profil par la barre basse et voit
 * l'ecran du cahier de septembre (« Profil · Invite · Sur cet appareil ·
 * Connexion »). Il rafraichit la page, ou rouvre le meme lien plus tard — et
 * il tombe sur un ECRAN COMPLETEMENT DIFFERENT : « Toi · Sans compte, GRYD ne
 * sait pas encore ce qui est a toi · Se connecter », qui est
 * `app/(mvp)/profil.tsx`, la ligne MASTER mise EN QUARANTAINE par ADR-001 et
 * remplacee par ADR-012.
 *
 * POURQUOI. Deux fichiers servent le meme chemin : `app/(tabs)/profil.tsx` et
 * `app/(mvp)/profil.tsx` (les parentheses d'un groupe expo-router ne comptent
 * pas dans l'URL). La navigation INTERNE resout dans le navigateur d'onglets et
 * rend le cahier ; le chargement A FROID d'une URL resout dans l'arbre de
 * linking et rend le legacy.
 *
 * `scripts/audit-routes.mjs` voit deja la collision de FICHIERS et l'ecrit
 * (« servie(s) AUSSI hors quarantaine : /profil — conflit de routes
 * expo-router »), mais il ajoute « le script ne seme l'arbre qu'avec celui du
 * cahier » : il SUPPOSE que le cahier gagne. A l'execution, sur le bundle web
 * exporte, c'est le legacy qui gagne. La quarantaine n'est donc pas etanche par
 * le lien profond — ce que l'audit dit deja par ailleurs de /carte, /course,
 * /prete, /resultat.
 *
 * CORRECTIF PROPOSE (hors perimetre de ce harnais) : trancher la collision a la
 * source — retirer `app/(mvp)/profil.tsx` de l'arbre servi, ou lui donner un
 * chemin qui lui soit propre. Tant que deux fichiers repondent a `/profil`,
 * lequel gagne est un detail d'implementation d'expo-router, pas une decision.
 *
 * Marque `test.fail()` : le jour ou la collision est tranchee, ce test passera
 * et Playwright exigera qu'on retire la marque.
 */
test.describe('S3 (suite) — collision de routes', () => {
  test('/profil en lien profond sert le MEME ecran que la barre basse', async ({ page }) => {
    // Invite : le Profil du cahier dit « Invite · Sur cet appareil », le legacy
    // dit « Toi ». Deux copies incompatibles — impossible de les confondre.
    await seedStorage(page, exploredOnce());
    await page.goto('/profil');

    // Delai court ASSUME (meme raison que le test epingle de s2).
    await expect(page.getByText(FR.profileOnThisDevice, { exact: true })).toBeVisible();
    await expect(page.getByText(FR.legacyProfileTitle, { exact: true })).toHaveCount(0);
  });
});
