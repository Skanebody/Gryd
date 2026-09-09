/**
 * S2 — CREATION DE COMPTE, de la carte au profil connecte.
 *
 * C'est le scenario que le fondateur a demande : « des tests pour l'inscription,
 * voir si ca fonctionne parfaitement ». Il suit la chaine complete, dans l'ordre
 * ou un joueur la vit :
 *
 *   carte → porte de compte → /sign-in → e-mail → gate 16+ → adresse refusee
 *   → adresse acceptee → code envoye → cadence de renvoi → code faux → code juste
 *   → retour sur la carte, connecte → le Profil montre une identite.
 *
 * Le reseau Supabase est entierement simule : aucune adresse reelle n'est
 * sollicitee, aucun quota d'e-mail consomme, aucun compte cree nulle part.
 */
import type { Page } from '@playwright/test';
import { expect, test, FR, exploredOnce, seedStorage, mapLayersButton } from './fixtures/app';
import { BAD_CODE, DEFAULT_USER, GOOD_CODE } from './fixtures/supabase-mock';

/** L'identite visible attendue : le prefixe de l'adresse, jamais un mot invente. */
const EXPECTED_NAME = DEFAULT_USER.email.split('@')[0] ?? '';

/** Invite qui a deja explore : c'est de la carte qu'il part chercher un compte. */
async function guestOnMap(page: Page): Promise<void> {
  await seedStorage(page, exploredOnce());
  await page.goto('/');
  await expect(mapLayersButton(page)).toBeVisible({ timeout: 30_000 });
}

/**
 * Ouvre /email en suivant le VRAI chemin : carte → porte de compte → gate 16+.
 * Le gate a ses propres tests plus bas ; ici on ne fait que le franchir.
 */
async function reachEmailForm(page: Page): Promise<void> {
  await guestOnMap(page);
  await mapLayersButton(page).click();
  await page.getByText(FR.mapFindMyTerritories).click();
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 20_000 });
  await page.getByRole('button', { name: FR.authEmailDoor }).click();
  await page.getByRole('button', { name: FR.ageConfirmA11y, exact: true }).click();
  await expect(page).toHaveURL(/\/email/, { timeout: 20_000 });
  await expect(page.getByLabel(FR.emailLabel)).toBeVisible();
}

/**
 * Demande le code, puis ABSORBE le gate 16+ s'il est redemande.
 *
 * ⚠️ CE N'EST PAS UN CONFORT DE TEST, C'EST LE CONTOURNEMENT D'UN BUG REEL.
 * Le joueur qui vient de repondre « Oui, j'ai 16 ans ou plus » sur /sign-in se
 * voit reposer LA MEME question sur /email des qu'il valide son adresse. Le
 * parcours reste franchissable (il repond deux fois), et c'est ce que la suite
 * des tests prouve — mais la friction est reelle et le gate legal est double.
 *
 * Le bug est epingle a part, dans le test « le gate 16+ ne se redemande pas »,
 * marque `test.fail()`. On l'absorbe ICI pour que les tests SUIVANTS puissent
 * prouver ce qu'ils ont a prouver (envoi, cadence, code faux, code juste)
 * plutot que de mourir tous les cinq sur la meme cause deja identifiee.
 * Le jour ou le bug est corrige, ce bloc devient un no-op et le test rouge
 * passera au vert — ce qui fera echouer la suite tant que son `test.fail()`
 * n'aura pas ete retire. Rien ne peut donc pourrir en silence.
 */
async function requestCode(page: Page, email: string): Promise<void> {
  await page.getByLabel(FR.emailLabel).fill(email);
  await page.getByRole('button', { name: FR.otpRequestCta }).click();

  const codeField = page.getByLabel(FR.otpFieldA11y);
  // Sur /email le bouton de confirmation ne porte PAS d'accessibilityLabel :
  // son nom accessible est son libelle visible (contrairement a /sign-in).
  const secondGate = page.getByRole('button', { name: FR.ageConfirm, exact: true });
  await expect
    .poll(async () => (await codeField.count()) + (await secondGate.count()), { timeout: 15_000 })
    .toBeGreaterThan(0);
  if ((await secondGate.count()) > 0) await secondGate.click();
  await expect(codeField).toBeVisible();
}

test.describe('S2 — creation de compte', () => {
  test('la carte porte une entree vers le compte, et elle ne ment pas sur son prix', async ({
    page,
  }) => {
    await guestOnMap(page);
    await mapLayersButton(page).click();

    await expect(page.getByText(FR.mapFindMyTerritories)).toBeVisible();
    // L'invitation dit CE QU'ELLE COUTE : rien. « L'exploration precede le compte ».
    await expect(page.getByText(FR.mapNoAccountNeeded)).toBeVisible();

    await page.getByText(FR.mapFindMyTerritories).click();
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 20_000 });
  });

  test('/sign-in : seules les portes REELLEMENT utilisables sont peintes', async ({ page }) => {
    await seedStorage(page, exploredOnce());
    await page.goto('/sign-in');

    await expect(page.getByText(FR.authMethodsTitle)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: FR.authEmailDoor })).toBeVisible();

    // Sur le web, Apple et Google n'ont aucun chemin utilisable (O2 ouvert) :
    // la regle « aucun bouton mort » impose qu'ils soient ABSENTS, pas grises.
    await expect(page.getByText(FR.authGoogle)).toHaveCount(0);

    // On ne cree pas de compte sans dire a quoi on consent.
    await expect(page.getByText(FR.authTerms)).toBeVisible();
    // Et l'invite garde toujours sa sortie.
    await expect(page.getByRole('button', { name: FR.authGuest }).first()).toBeVisible();
  });

  test('gate 16+ : il precede la collecte, et le refus est un ETAT TERMINAL honnete', async ({
    page,
  }) => {
    await seedStorage(page, exploredOnce());
    await page.goto('/sign-in');
    await expect(page.getByText(FR.authMethodsTitle)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: FR.authEmailDoor }).click();

    // L'age est demande AVANT que le moindre champ n'existe (Apple 5.1.1).
    await expect(page.getByText(FR.ageTitle)).toBeVisible();
    await expect(page.getByText(FR.ageAccountOnly)).toBeVisible();
    await expect(page.getByLabel(FR.emailLabel)).toHaveCount(0);

    await page.getByRole('button', { name: FR.ageUnder, exact: true }).click();

    // Refus : l'ecran le DIT, et ne propose plus de contourner sa propre regle.
    await expect(page.getByText(FR.ageBlockedTitle)).toBeVisible();
    await expect(page.getByText(FR.ageBlockedTagline)).toBeVisible();
    await expect(page.getByRole('button', { name: FR.ageConfirmA11y, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: FR.ageUnder, exact: true })).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/email/);

    // Ce n'est pas un mur : courir sans compte reste possible, comme annonce.
    await expect(page.getByRole('button', { name: FR.authGuest }).first()).toBeVisible();
  });

  test('gate 16+ : l’acceptation ouvre le formulaire e-mail', async ({ page }) => {
    await seedStorage(page, exploredOnce());
    await page.goto('/sign-in');
    await expect(page.getByText(FR.authMethodsTitle)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: FR.authEmailDoor }).click();
    await page.getByRole('button', { name: FR.ageConfirmA11y, exact: true }).click();

    await expect(page).toHaveURL(/\/email/, { timeout: 20_000 });
    await expect(page.getByText(FR.emailTitle)).toBeVisible();
    await expect(page.getByLabel(FR.emailLabel)).toBeVisible();
  });

  /**
   * ═══ BUG EPINGLE — LE GATE 16+ EST REDEMANDE ═══════════════════════════════
   *
   * CE QUE LE JOUEUR VIT : il repond « Oui, j'ai 16 ans ou plus » sur /sign-in,
   * arrive sur le formulaire e-mail, tape son adresse, touche « Recevoir un
   * code » — et l'ecran lui repose EXACTEMENT la meme question. Il doit
   * declarer son age DEUX FOIS pour creer un compte.
   *
   * POURQUOI. `useOnboardingState` (src/features/onboarding/store.ts:167) donne
   * a chaque appelant un instantane PRIVE, lu une seule fois au montage, sans
   * magasin partage ni relecture. `AuthEntry2026.confirmAge`
   * (src/features/account/AuthEntry2026.tsx:106) ecrit la reponse SANS
   * l'attendre (`void update(...)`, ligne 111) puis navigue dans le meme tick
   * (ligne 112) : /email se monte et lit le disque AVANT que l'ecriture n'y
   * soit. Le disque, lui, est correct — verifie : deux secondes plus tard il
   * porte bien `ageConfirmed: true`, alors que l'ecran continue de croire le
   * contraire. `email.tsx:100` tranche donc sur un instantane perime.
   *
   * CORRECTIF PROPOSE (hors perimetre de ce harnais, qui ne touche pas la
   * logique des ecrans) : donner a `useOnboardingState` un etat de module
   * partage + un jeu d'abonnes, exactement comme `writePatch` est deja au
   * niveau module — une ecriture par un consommateur reveille tous les autres.
   * `await`er l'ecriture avant de naviguer marcherait aussi, mais contredirait
   * la doctrine du store (« Navigation never waits for disk »).
   *
   * Ce test decrit le comportement ATTENDU. Il est marque `test.fail()` : le
   * jour ou le bug est corrige, il passera, Playwright signalera « expected to
   * fail but passed », et il faudra retirer la marque. Un bug epingle ne peut
   * donc pas se refermer en silence.
   */
  test('le gate 16+ ne se redemande PAS apres avoir ete franchi', async ({ page }) => {
    test.fail(true, 'gate 16+ redemande sur /email — instantane perime de useOnboardingState');

    await reachEmailForm(page);
    await page.getByLabel(FR.emailLabel).fill(DEFAULT_USER.email);
    await page.getByRole('button', { name: FR.otpRequestCta }).click();

    // Une seule declaration d'age suffit : l'ecran suivant doit envoyer le code.
    // Delai court ASSUME : le comportement attendu est immediat, et un test
    // epingle ne doit pas faire payer sa propre attente a toute la suite.
    await expect(page.getByLabel(FR.otpFieldA11y)).toBeVisible({ timeout: 4_000 });
    await expect(page.getByText(FR.ageTitle)).toHaveCount(0);
  });

  test('adresse invalide : erreur LISIBLE, et rien ne part au serveur', async ({
    page,
    supabase,
  }) => {
    await reachEmailForm(page);

    await page.getByLabel(FR.emailLabel).fill('parcours.e2e@example');
    await page.getByRole('button', { name: FR.otpRequestCta }).click();

    await expect(page.getByText(FR.errorInvalidEmail)).toBeVisible();
    // Le refus est LOCAL : on ne fait pas croire a un verdict serveur.
    expect(supabase.countOf('POST /auth/v1/otp')).toBe(0);
  });

  test('adresse valide → code envoye, et le renvoi respecte la cadence serveur', async ({
    page,
    supabase,
  }) => {
    await reachEmailForm(page);
    await requestCode(page, DEFAULT_USER.email);

    // Etat « envoye » : l'ecran nomme l'adresse a laquelle il a ecrit.
    await expect(page.getByText(`${FR.otpSentPrefix} ${DEFAULT_USER.email}`)).toBeVisible();
    expect(supabase.countOf('POST /auth/v1/otp')).toBe(1);

    // CADENCE : le renvoi n'est pas peint arme alors qu'il serait refuse. Le
    // bouton porte son compte a rebours et se declare desactive.
    const resend = page.getByRole('button', { name: new RegExp(FR.resendCountdownPrefix) });
    await expect(resend).toBeVisible();
    await expect(resend).toHaveAttribute('aria-disabled', 'true');
    // Un bouton desactive qui ne fait rien n'est pas un bouton mort : il DIT
    // pourquoi. On le verifie en tentant le clic — aucun second envoi ne part.
    await resend.click({ force: true });
    expect(supabase.countOf('POST /auth/v1/otp')).toBe(1);
  });

  test('code faux : erreur lisible, et le bouton de validation reste vivant', async ({ page }) => {
    await reachEmailForm(page);
    await requestCode(page, DEFAULT_USER.email);

    await page.getByLabel(FR.otpFieldA11y).fill(BAD_CODE);
    await page.getByRole('button', { name: FR.otpVerifyCta }).click();

    await expect(page.getByText(FR.signInFailed)).toBeVisible();
    // On reste sur l'ecran, avec de quoi reessayer : aucun cul-de-sac.
    await expect(page).toHaveURL(/\/email/);
    const verify = page.getByRole('button', { name: FR.otpVerifyCta });
    await expect(verify).toBeVisible();
    // react-native-web N'EMET PAS `aria-disabled` quand il vaut false : exiger
    // la chaine « false » testerait le moteur de rendu, pas l'ecran. Ce qui
    // compte est qu'il ne se declare PAS desactive.
    await expect(verify).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('code juste → session, retour a la carte, et le Profil montre une IDENTITE', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await reachEmailForm(page);
    await requestCode(page, DEFAULT_USER.email);

    await page.getByLabel(FR.otpFieldA11y).fill(GOOD_CODE);
    await page.getByRole('button', { name: FR.otpVerifyCta }).click();

    // La session prend, et l'ecran de connexion se retire de lui-meme.
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/, { timeout: 20_000 });
    await expect(mapLayersButton(page)).toBeVisible({ timeout: 20_000 });

    // Le profil connecte : une identite REELLE (le prefixe de l'adresse),
    // jamais « Invite », et jamais le « … » de l'hydratation fige.
    //
    // ⚠️ ON Y VA PAR LA BARRE, PAS PAR `goto('/profil')`. La meme URL sert DEUX
    // ecrans selon la facon dont on y arrive (voir le test epingle « /profil en
    // lien profond » dans s3). Naviguer par l'URL testerait le legacy.
    await page.getByRole('tab', { name: FR.navProfil }).click();

    // L'IDENTITE est l'assertion, pas le titre de l'ecran : c'est elle que le
    // joueur reconnait comme la sienne. Ici, le prefixe de son adresse.
    await expect(page.getByText(EXPECTED_NAME, { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FR.profileGuest, { exact: true })).toHaveCount(0);
    // Aucun « … » d'hydratation fige : l'ecran a fini de decider qui il montre.
    await expect(page.getByText('…', { exact: true })).toHaveCount(0);
    // Connecte : la porte de compte a disparu du profil.
    await expect(page.getByRole('button', { name: FR.profileSignIn, exact: true })).toHaveCount(0);

    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });
});
