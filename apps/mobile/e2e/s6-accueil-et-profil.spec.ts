/**
 * S6 — CE QUE LE LIEN DIT EN ARRIVANT, ET CE QU'IL Y A APRÈS.
 *
 * C'est le scénario que le fondateur a demandé le 12/09/2026 : « le bouton mène
 * vers rien du tout ; il faudrait qu'appuyer sur le lien dise félicitations,
 * vous êtes inscrit ». Il joue la moitié du parcours que S2 ne couvrait pas —
 * l'ARRIVÉE :
 *
 *   lien ouvert → accueil (neuf / retour / lien mort)
 *   → configuration du profil (pseudo obligatoire, photo et ville facultatives)
 *   → discipline (ou « Plus tard »)
 *   → carte connectée.
 *
 * ⚠️ CE QUE CE FICHIER NE PROUVE PAS, ET QUI N'EST PAS UN OUBLI. Le retour est
 * servi sur l'ORIGINE LOCALE, jamais sur `https://gryd.run/callback` : un
 * navigateur de test ne peut pas y atterrir sans sortir de la machine, ce que
 * le filet réseau interdit. Ce qui est joué, c'est la FORME que l'app reçoit —
 * une URL absolue avec la session dans le fragment — et elle est identique.
 * Que `gryd.run` remette bien ce chemin à l'app est prouvé ailleurs, sur les
 * fichiers réellement embarqués (`src/lib/links.test.ts` : couture `app.json` ↔
 * `apple-app-site-association`). Qu'iOS l'ouvre vraiment demande un APPAREIL et
 * un nouveau build : aucun harnais ne peut le dire.
 */
import { expect, test, FR, exploredOnce, seedStorage, mapLayersButton, welcomeBackNamed } from './fixtures/app';
import { DEFAULT_USER, EXPIRED_LINK_RETURN, magicLinkReturn } from './fixtures/supabase-mock';

/** Le pseudo qu'un joueur choisit dans ce scénario. Jamais un compte réel. */
const CHOSEN_HANDLE = 'parcours_e2e';
const CHOSEN_NAME = 'Parcours';

test.describe('S6 — l’accueil du lien, puis le profil', () => {
  test('compte NEUF : le lien dit félicitations, et un seul bouton', async ({ page }) => {
    await seedStorage(page, exploredOnce());
    // `type=signup` : c'est GoTrue qui dit que ce lien a CRÉÉ le compte.
    await page.goto(magicLinkReturn(DEFAULT_USER, 'signup'));

    await expect(page.getByText(FR.welcomeFreshTitle)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(FR.welcomeFreshBody)).toBeVisible();

    // On ne félicite pas quelqu'un qui revient : la phrase du voisin est ABSENTE.
    await expect(page.getByText(FR.welcomeBackTitle)).toHaveCount(0);
    await expect(page.getByText(FR.welcomeUnknownTitle)).toHaveCount(0);
    await expect(page.getByText(FR.linkExpiredTitle)).toHaveCount(0);

    // UN bouton, et il mène quelque part.
    const cta = page.getByRole('button', { name: FR.welcomeFreshCta, exact: true });
    await expect(cta).toBeVisible();
    await expect(page.getByRole('button', { name: FR.welcomeBackCta, exact: true })).toHaveCount(0);

    await cta.click();
    await expect(page).toHaveURL(/\/setup\/profile/, { timeout: 20_000 });
  });

  test('compte EXISTANT : « Bon retour », son pseudo, et la carte', async ({ page, supabase }) => {
    // Ce compte a déjà NOMMÉ son pseudo (`handle_chosen_2026` vrai, 0175).
    supabase.setHandleChosen(true);
    await seedStorage(page, exploredOnce());
    await page.goto(magicLinkReturn(DEFAULT_USER, 'magiclink'));

    // Le pseudo affiché est celui que le SERVEUR a rendu, pas un préfixe
    // d'e-mail fabriqué pour remplir la phrase.
    const expected = welcomeBackNamed(`runner_${DEFAULT_USER.id.replace(/-/g, '').slice(0, 12)}`);
    await expect(page.getByText(expected)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(FR.welcomeBackBody)).toBeVisible();
    await expect(page.getByText(FR.welcomeFreshTitle)).toHaveCount(0);

    await page.getByRole('button', { name: FR.welcomeBackCta, exact: true }).click();
    // Il a déjà tout : rien à lui redemander, on rend la carte.
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/, { timeout: 30_000 });
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 20_000 });
  });

  /**
   * LE PSEUDO DÉRIVÉ N'EST PAS UN PSEUDO. `runner_5f3a91c0…` est l'étiquette
   * que l'inscription colle (0154) ; quelqu'un qui la porte encore n'a jamais
   * fini de s'inscrire, même si son compte est vieux. C'est `handle_chosen`
   * qui tranche, pas l'horloge — et c'est lui qui rattrape le cas où le `type`
   * manque (lien recopié, client mail qui coupe le fragment).
   */
  test('sans `type`, c’est `handle_chosen` qui décide — et il dit « neuf »', async ({ page }) => {
    await seedStorage(page, exploredOnce());
    const withoutType = magicLinkReturn(DEFAULT_USER, 'magiclink').replace('&type=magiclink', '');
    await page.goto(withoutType);

    await expect(page.getByText(FR.welcomeFreshTitle)).toBeVisible({ timeout: 30_000 });
  });

  test('lien mort : aucune félicitation, et la sortie rouvre le champ', async ({ page }) => {
    await seedStorage(page, exploredOnce());
    await page.goto(EXPIRED_LINK_RETURN);

    await expect(page.getByText(FR.linkExpiredTitle)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(FR.welcomeFreshTitle)).toHaveCount(0);
    await expect(page.getByText(FR.welcomeBackTitle)).toHaveCount(0);

    await page.getByRole('button', { name: FR.linkExpiredCta }).click();
    await expect(page).toHaveURL(/\/email/, { timeout: 20_000 });
  });

  /**
   * LA CHAÎNE COMPLÈTE. Ce test est le seul endroit du dépôt où l'on voit,
   * d'un bout à l'autre, ce qu'un joueur traverse entre « j'ai cliqué dans mon
   * e-mail » et « je suis sur la carte, avec un pseudo à moi ».
   */
  test('accueil → pseudo → discipline → carte, sans un seul cul-de-sac', async ({ page, supabase }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await seedStorage(page, exploredOnce());
    await page.goto(magicLinkReturn(DEFAULT_USER, 'signup'));
    await expect(page.getByText(FR.welcomeFreshTitle)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: FR.welcomeFreshCta, exact: true }).click();

    // ── E08 — l'identité. Le pseudo est obligatoire, le reste ne l'est pas ──
    await expect(page.getByText(FR.setupProfileTitle)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FR.setupPhotoOptional)).toBeVisible();
    await expect(page.getByRole('button', { name: FR.setupPhotoAdd })).toBeVisible();
    // La ville ne gronde pas : elle dit ce qui se passera si on la laisse vide.
    await expect(page.getByText(FR.setupCityOptional)).toBeVisible();

    const cta = page.getByRole('button', { name: FR.setupCta });
    // Rien n'est saisi : le CTA est inerte, et il le DIT (aria-disabled).
    await expect(cta).toHaveAttribute('aria-disabled', 'true');

    await page.getByLabel(FR.setupNameLabel).fill(CHOSEN_NAME);
    await page.getByLabel(FR.setupHandleLabel).fill(CHOSEN_HANDLE);
    // La disponibilité se vérifie EN DIRECT, et c'est le serveur qui répond.
    await expect(page.getByText(FR.setupHandleFree)).toBeVisible({ timeout: 20_000 });
    await expect(cta).not.toHaveAttribute('aria-disabled', 'true');

    await cta.click();

    // ── Le pseudo est parti par la RPC, pas en écriture directe sur la table ─
    await expect
      .poll(() => supabase.savedProfile()?.handle, { timeout: 20_000 })
      .toBe(CHOSEN_HANDLE);
    expect(supabase.savedProfile()?.displayName).toBe(CHOSEN_NAME);
    expect(supabase.countOf('POST /rest/v1/rpc/save_my_social_profile_2026')).toBeGreaterThan(0);

    // ── E09 — la discipline, et sa sortie ───────────────────────────────────
    await expect(page).toHaveURL(/\/setup\/activity/, { timeout: 20_000 });
    await expect(page.getByText(FR.setupActivityTitle)).toBeVisible();
    await page.getByRole('button', { name: FR.setupActivitySkip, exact: true }).click();

    // ── La carte, connecté ──────────────────────────────────────────────────
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/, { timeout: 30_000 });
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 20_000 });

    /**
     * ET L'IDENTITÉ EST LA SIENNE. On y va PAR LA BARRE, pas par
     * `goto('/profil')` : c'est le geste du joueur, et la même URL a déjà servi
     * DEUX écrans dans ce dépôt (voir le test de collision de routes dans s3).
     * L'assertion porte sur le nom que le joueur vient de CHOISIR, jamais sur
     * « Invité » ni sur le « … » d'une hydratation figée.
     */
    await page.getByRole('tab', { name: FR.navProfil }).click();
    await expect(page.getByText(CHOSEN_NAME, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FR.profileGuest, { exact: true })).toHaveCount(0);
    await expect(page.getByText('…', { exact: true })).toHaveCount(0);

    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });

  /**
   * LA DÉCONNEXION NE REMET PAS LE COMPTEUR À ZÉRO. Quelqu'un qui a un compte a
   * forcément vu la découverte et déclaré son âge : le lui redemander à la
   * reconnexion serait une friction inventée. L'écriture est faite par l'écran
   * de retour lui-même, à la seconde où la session existe.
   */
  test('arriver par le lien inscrit la découverte et l’âge sur cet appareil', async ({ page, supabase }) => {
    supabase.setHandleChosen(true);
    // STOCKAGE VIDE : ni découverte vue, ni âge déclaré. C'est un téléphone neuf.
    await seedStorage(page, {});
    await page.goto(magicLinkReturn(DEFAULT_USER, 'magiclink'));
    await page.getByRole('button', { name: FR.welcomeBackCta, exact: true }).click();
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 30_000 });

    const stored = await page.evaluate(() => window.localStorage.getItem('gryd.onboarding.v1'));
    const state = JSON.parse(stored ?? '{}') as Record<string, unknown>;
    expect(state.onboardingDone, 'la découverte ne doit plus être repoussée').toBe(true);
    expect(state.ageConfirmed, 'le gate 16+ a déjà été franchi pour obtenir ce compte').toBe(true);
  });
});
