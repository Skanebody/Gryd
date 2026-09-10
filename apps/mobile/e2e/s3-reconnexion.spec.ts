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
import {
  expect,
  test,
  FR,
  exploredOnce,
  linkSentBody,
  returningMember,
  seedStorage,
  mapLayersButton,
} from './fixtures/app';
import { DEFAULT_USER, magicLinkReturn } from './fixtures/supabase-mock';

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
    // Par la barre basse — le geste du joueur.
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

  test('reconnexion : l’age deja declare n’est pas redemande, et la session revient par le LIEN', async ({
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
    await page.getByRole('button', { name: FR.linkRequestCta }).click();
    await expect(page.getByText(linkSentBody(DEFAULT_USER.email))).toBeVisible();

    // Le lien ouvert : la session revient, et la carte avec elle.
    await page.goto(magicLinkReturn());
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/, { timeout: 30_000 });
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 20_000 });
  });
});

/**
 * ═══ ANCIEN BUG EPINGLE — UNE URL, DEUX ECRANS (tranche) ═══════════════════
 *
 * CE QUE LE JOUEUR VIVAIT : il ouvrait son Profil par la barre basse et voyait
 * l'ecran du cahier de septembre (« Profil · Invite · Sur cet appareil ·
 * Connexion »). Il rafraichissait la page — et tombait sur un ECRAN
 * COMPLETEMENT DIFFERENT : « Toi · Se connecter », `app/(mvp)/profil.tsx`, la
 * ligne MASTER mise EN QUARANTAINE par ADR-001 et remplacee par ADR-012.
 *
 * POURQUOI. Deux fichiers servaient le meme chemin (les parentheses d'un groupe
 * expo-router ne comptent pas dans l'URL) : la navigation INTERNE resolvait dans
 * le navigateur d'onglets et rendait le cahier, le chargement A FROID d'une URL
 * resolvait dans l'arbre de linking et rendait le legacy. Lequel gagnait etait
 * un detail d'implementation, pas une decision.
 *
 * La collision est tranchee A LA SOURCE : le fichier legacy porte desormais un
 * chemin qui lui est propre (`app/(mvp)/profil-mvp.tsx`), et `/profil` n'a plus
 * qu'un seul fichier. Ce test reste comme GARDE — la quarantaine n'est etanche
 * que tant que personne ne repose un second fichier sur ce chemin.
 */
test.describe('S3 (suite) — collision de routes', () => {
  test('/profil en lien profond sert le MEME ecran que la barre basse', async ({ page }) => {
    // Invite : le Profil du cahier dit « Invite · Sur cet appareil », le legacy
    // dit « Toi ». Deux copies incompatibles — impossible de les confondre.
    await seedStorage(page, exploredOnce());
    await page.goto('/profil');

    await expect(page.getByText(FR.profileOnThisDevice, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(FR.legacyProfileTitle, { exact: true })).toHaveCount(0);
  });
});
