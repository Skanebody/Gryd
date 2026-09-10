/**
 * S4 — ECHECS HONNETES. Le backend ne repond pas. L'ecran doit le DIRE et
 * proposer de reessayer. Jamais un spinner qui tourne pour toujours, jamais un
 * vide qui a l'air d'etre la verite.
 *
 * C'est l'interdit constitutionnel numero un (« l'app ne ment jamais », quatre
 * etats distincts : pas connecte / vide / echec / en cours). Un ecran qui rend
 * un vide silencieux quand le serveur est muet confond DEUX de ces etats, et
 * c'est precisement le mensonge que ce scenario cherche.
 *
 * Deux pannes sont jouees, parce qu'elles ne produisent PAS le meme message :
 *   · `abort`     — la requete ne part pas (avion, tunnel) → « quand tu as du reseau » ;
 *   · `http-503`  — le serveur repond, mal → « rien n'a ete enregistre ».
 * Confondre les deux ferait donner au joueur un conseil faux.
 */
import { expect, test, FR, exploredOnce, returningMember, seedStorage, mapLayersButton } from './fixtures/app';
import { DEFAULT_USER } from './fixtures/supabase-mock';

async function emailFormAsGuest(page: import('@playwright/test').Page): Promise<void> {
  // L'age est deja declare : ce scenario teste la PANNE, pas le gate.
  await seedStorage(page, {
    'gryd.onboarding.v1': JSON.stringify({ onboardingDone: true, reachedStep: 'map', ageConfirmed: true }),
  });
  await page.goto('/email');
  await expect(page.getByLabel(FR.emailLabel)).toBeVisible({ timeout: 30_000 });
}

test.describe('S4 — echecs honnetes', () => {
  test('reseau coupe : le message NOMME le reseau, et le bouton se rearme', async ({
    page,
    supabase,
  }) => {
    await emailFormAsGuest(page);
    supabase.setOutage('abort');

    await page.getByLabel(FR.emailLabel).fill(DEFAULT_USER.email);
    const cta = page.getByRole('button', { name: FR.otpRequestCta });
    await cta.click();

    await expect(page.getByText(FR.errorNetwork)).toBeVisible();
    // PAS DE SPINNER INFINI : le bouton sort de son etat occupe, donc le joueur
    // peut reessayer. `aria-busy` est ce que l'ecran DECLARE de lui-meme.
    await expect(cta).toHaveAttribute('aria-busy', 'false');
    // `aria-disabled` n'est pas emis quand il vaut false (react-native-web) :
    // on verifie l'absence de « true », pas la presence de « false ».
    await expect(cta).not.toHaveAttribute('aria-disabled', 'true');
    // Et l'ecran n'a pas prononce de verdict qu'il ne peut pas tenir.
    await expect(page.getByLabel(FR.otpFieldA11y)).toHaveCount(0);
    await expect(page).toHaveURL(/\/email/);

    // Une fois le reseau revenu, le MEME bouton marche : rien n'est reste coince.
    supabase.setOutage('none');
    await cta.click();
    await expect(page.getByLabel(FR.otpFieldA11y)).toBeVisible();
  });

  test('serveur en panne (503) : l’echec est dit, et il dit que RIEN n’a ete enregistre', async ({
    page,
    supabase,
  }) => {
    await emailFormAsGuest(page);
    supabase.setOutage('http-503');

    await page.getByLabel(FR.emailLabel).fill(DEFAULT_USER.email);
    const cta = page.getByRole('button', { name: FR.otpRequestCta });
    await cta.click();

    await expect(page.getByText(FR.errorUnknown)).toBeVisible();
    await expect(cta).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByLabel(FR.otpFieldA11y)).toHaveCount(0);
  });

  test('carte connectee, backend muet : le bandeau DIT l’echec et propose de reessayer', async ({
    page,
    supabase,
  }) => {
    await seedStorage(page, returningMember());
    supabase.setOutage('http-503');
    await page.goto('/');

    await expect(mapLayersButton(page)).toBeVisible({ timeout: 30_000 });

    // La lecture des terrains echoue. L'ecran ne peut pas montrer « aucun
    // terrain » : ce serait un vide qui a l'air vrai. Il annonce la panne, et
    // le bandeau EST l'action de reessai.
    // Le bandeau ne porte AUCUN `accessibilityLabel` (MapHome.tsx:184) : son nom
    // accessible vient de son texte. `getByLabel` ne le trouverait donc pas.
    const banner = page.getByRole('button', { name: FR.mapTerrainsUnavailable });
    await expect(banner).toBeVisible({ timeout: 25_000 });

    // Le bandeau n'est pas un cul-de-sac : le serveur revenu, la carte retrouve
    // ses terrains et le bandeau s'efface.
    //
    // ⚠️ LE CLIC EST REJOUE JUSQU'A CE QU'IL ATTERRISSE. La camera de la carte
    // se pose de facon asynchrone ; chaque ajustement relance la lecture des
    // terrains, donc RECREE le noeud du bandeau. Un clic unique tombait par
    // moments sur un element « detached from the DOM » — un flake qui n'apprend
    // rien sur le produit. Recharger les terrains est idempotent : un clic de
    // trop ne fausse aucune assertion.
    supabase.setOutage('none');
    await expect
      .poll(
        async () => {
          if ((await banner.count()) === 0) return true;
          try {
            await banner.click({ timeout: 2_000 });
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect(banner).toHaveCount(0, { timeout: 25_000 });
  });

  test('invite hors ligne : la carte reste ouverte, elle ne se bloque pas sur un serveur muet', async ({
    page,
    supabase,
  }) => {
    await seedStorage(page, exploredOnce());
    supabase.setOutage('abort');
    await page.goto('/');

    // Aucune session : l'app n'a rien a demander au serveur pour explorer.
    // La carte doit s'ouvrir malgre la panne — c'est la promesse « l'exploration
    // precede le compte », et elle ne peut pas dependre du backend.
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(FR.onboardingTitle)).toHaveCount(0);
  });
});
