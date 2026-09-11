/**
 * S2 — CREATION DE COMPTE, de la carte au profil connecte.
 *
 * C'est le scenario que le fondateur a demande : « des tests pour l'inscription,
 * voir si ca fonctionne parfaitement ». Il suit la chaine complete, dans l'ordre
 * ou un joueur la vit :
 *
 *   carte → porte de compte → /sign-in → e-mail → gate 16+ → adresse refusee
 *   → adresse acceptee → LIEN envoye → cadence de renvoi → lien mort → lien bon
 *   → retour sur la carte, connecte → le Profil montre une identite.
 *
 * ⚠️ LE PARCOURS TESTE EST CELUI DU LIEN MAGIQUE, PAS D'UN CODE. Ce fichier a
 * longtemps tape six chiffres dans un champ : c'etait le parcours d'un mode que
 * l'app REFUSE de servir sans preuve serveur (`emailDelivery2026`, appele avec
 * un `false` litteral par les deux `lib/auth*` depuis le 10/09/2026). L'ecran
 * dit « Recevoir le lien », l'e-mail porte un lien, et le retour se fait par
 * `/callback` — c'est ce que le harnais joue desormais.
 *
 * Le reseau Supabase est entierement simule : aucune adresse reelle n'est
 * sollicitee, aucun quota d'e-mail consomme, aucun compte cree nulle part.
 */
import type { Page } from '@playwright/test';
import { expect, test, FR, exploredOnce, linkSentBody, seedStorage, mapLayersButton } from './fixtures/app';
import { DEFAULT_USER, EXPIRED_LINK_RETURN, magicLinkReturn } from './fixtures/supabase-mock';

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
 * Demande le lien, et n'attend rien d'autre que l'etat « envoye ».
 *
 * ⚠️ CE HELPER NE CONTOURNE PLUS RIEN. Il absorbait un gate 16+ redemande sur
 * /email alors qu'il venait d'etre franchi sur /sign-in — un bug reel, epingle
 * ici meme. Il est corrige (`src/features/onboarding/store.ts` : etat de module
 * partage + `useSyncExternalStore`, au lieu d'un instantane prive lu une fois au
 * montage), le contournement est retire, et le test qui le prouve est plus bas,
 * VERT. Si la question revenait, ce helper echouerait bruyamment — c'est le but.
 */
async function requestLink(page: Page, email: string): Promise<void> {
  await page.getByLabel(FR.emailLabel).fill(email);
  await page.getByRole('button', { name: FR.linkRequestCta }).click();
  await expect(page.getByText(linkSentBody(email))).toBeVisible();
}

test.describe('S2 — creation de compte', () => {
  test('la carte porte une entree vers le compte, et elle ne ment pas sur son prix', async ({
    page,
  }) => {
    await guestOnMap(page);

    // Sur la carte elle-meme : ce qui manque a un invite, et pourquoi. Pas un
    // « 0 terrain » qui aurait l'air d'etre un resultat.
    await expect(page.getByText(FR.mapGuestNotice)).toBeVisible();

    await mapLayersButton(page).click();
    await expect(page.getByText(FR.mapFindMyTerritories)).toBeVisible();

    /**
     * L'INVITATION DIT CE QU'ELLE COUTE. Elle promettait « Ta premiere sortie
     * peut se faire sans compte. » — une limite d'essai qui n'existe pas : sans
     * compte, TOUTES les sorties tournent, elles ne prennent simplement aucun
     * terrain. La phrase actuelle est la vraie, et un test unitaire
     * (`features/run/liveChain2026.test.ts`) interdit desormais l'ancienne.
     */
    // La phrase est peinte deux fois (carte de compte + feuille Couches) : la premiere suffit.
    await expect(page.getByText(FR.mapGuestNoTerrain).first()).toBeVisible();

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

    // Depuis le 10/09 (lot compte), le refus est un MUR : aucune sortie vers l'app sous
    // « GRYD n'est pas accessible avant 16 ans » — sinon l'ecran affirmerait un blocage
    // qu'il n'applique pas. La seule commande restante corrige une erreur de tap.
    await expect(page.getByRole('button', { name: FR.authGuest })).toHaveCount(0);
    await expect(page.getByRole('button', { name: FR.ageNotMe })).toBeVisible();
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
    // Et l'ecran promet ce que l'e-mail contient VRAIMENT : un lien.
    // /sign-in reste monte sous la pile et porte la MEME phrase (meme entree de catalogue) : on vise celle de /email, la derniere.
    await expect(page.getByText(FR.emailWhatHappens).last()).toBeVisible();
    await expect(page.getByRole('button', { name: FR.linkRequestCta })).toBeVisible();
  });

  /**
   * ═══ REGRESSION GARDEE — LE GATE 16+ SE DEMANDAIT DEUX FOIS ════════════════
   *
   * CE QUE LE JOUEUR VIVAIT : il repondait « Oui, j'ai 16 ans ou plus » sur
   * /sign-in, arrivait sur le formulaire e-mail, tapait son adresse, touchait le
   * CTA — et l'ecran lui reposait EXACTEMENT la meme question. Il declarait son
   * age DEUX FOIS pour creer un compte.
   *
   * LA CAUSE, ET LE CORRECTIF. `useOnboardingState` donnait a chaque appelant un
   * instantane PRIVE, lu une seule fois au montage, sans magasin partage ni
   * relecture ; la porte de compte ecrivait `ageConfirmed: true` sans l'attendre
   * puis naviguait dans le meme tick, et /email lisait le disque AVANT que
   * l'ecriture n'y soit. L'etat vit desormais au NIVEAU DU MODULE
   * (`src/features/onboarding/store.ts`) : une lecture par processus, des
   * decisions de session qui priment sur le disque, et chaque instance abonnee
   * par `useSyncExternalStore` — un `update()` est visible par l'ecran suivant
   * avant meme sa persistance.
   *
   * Ce test etait epingle ROUGE. Il est VERT. Il reste ici comme garde : c'est
   * un defaut qui ne se voit pas sur une machine rapide, et qui reviendrait sans
   * bruit le jour ou quelqu'un re-privatiserait cet etat.
   */
  test('le gate 16+ ne se redemande PAS apres avoir ete franchi', async ({ page }) => {
    await reachEmailForm(page);
    await page.getByLabel(FR.emailLabel).fill(DEFAULT_USER.email);
    await page.getByRole('button', { name: FR.linkRequestCta }).click();

    // Une seule declaration d'age suffit : l'ecran suivant est l'etat « envoye ».
    await expect(page.getByText(linkSentBody(DEFAULT_USER.email))).toBeVisible();
    await expect(page.getByText(FR.ageTitle)).toHaveCount(0);
  });

  test('adresse invalide : erreur LISIBLE, et rien ne part au serveur', async ({
    page,
    supabase,
  }) => {
    await reachEmailForm(page);

    await page.getByLabel(FR.emailLabel).fill('parcours.e2e@example');
    await page.getByRole('button', { name: FR.linkRequestCta }).click();

    await expect(page.getByText(FR.errorInvalidEmail)).toBeVisible();
    // Le refus est LOCAL : on ne fait pas croire a un verdict serveur.
    expect(supabase.countOf('POST /auth/v1/otp')).toBe(0);
    // Et surtout : aucun « lien envoye » alors que rien n'est parti.
    await expect(page.getByText(FR.linkSentTitle)).toHaveCount(0);
  });

  test('adresse valide → lien envoye, et le renvoi respecte la cadence serveur', async ({
    page,
    supabase,
  }) => {
    await reachEmailForm(page);
    await requestLink(page, DEFAULT_USER.email);

    // Etat « envoye » : l'ecran nomme l'adresse a laquelle il a ecrit, et dit
    // les DEUX limites reelles du lien (cet appareil, une heure, une fois).
    await expect(page.getByText(FR.linkSentTitle)).toBeVisible();
    await expect(page.getByText(FR.linkSentHint)).toBeVisible();
    expect(supabase.countOf('POST /auth/v1/otp')).toBe(1);

    // Une adresse mal tapee n'enferme pas : la sortie de l'etat « envoye » existe.
    await expect(page.getByRole('button', { name: FR.linkChangeEmail })).toBeVisible();

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

  test('lien expire : l’ecran le DIT, et il rouvre le champ', async ({ page, supabase }) => {
    await seedStorage(page, exploredOnce());
    // Le lien de l'e-mail a ete ouvert trop tard, ou une seconde fois : GoTrue
    // redirige vers l'app avec son refus dans le fragment, pas avec une session.
    await page.goto(EXPIRED_LINK_RETURN);

    await expect(page.getByText(FR.linkExpiredTitle)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(FR.linkExpiredBody)).toBeVisible();

    /**
     * ⚠️ LE FOND DU TEST : CE N'EST PAS LE MESSAGE DU VOISIN. Avant le 10/09,
     * un seul booleen couvrait QUATRE faits — lien expire, lien tronque, panne
     * reseau, aucun retour — et tous disaient « Demande un nouveau lien ».
     * Conseiller ca a quelqu'un dont le reseau est coupe lui fait bruler son
     * quota d'envoi pour un lien qui, lui, est encore bon.
     */
    await expect(page.getByText(FR.callbackNetwork)).toHaveCount(0);
    await expect(page.getByText(FR.callbackNoReturn)).toHaveCount(0);
    await expect(page.getByText(FR.callbackFailed)).toHaveCount(0);
    await expect(page.getByText(FR.linkInvalid)).toHaveCount(0);

    // Le refus est LU dans l'URL : rien n'a ete echange avec le serveur, et
    // surtout aucune session n'a ete affirmee.
    expect(supabase.countOf('GET /auth/v1/user')).toBe(0);

    // Et ce n'est pas un cul-de-sac : la sortie rouvre le champ.
    await page.getByRole('button', { name: FR.linkExpiredCta }).click();
    await expect(page).toHaveURL(/\/email/, { timeout: 20_000 });
    await expect(page.getByLabel(FR.emailLabel)).toBeVisible();
  });

  test('lien valide → session, et l’app DIT que le compte est cree', async ({
    page,
    supabase,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await reachEmailForm(page);
    await requestLink(page, DEFAULT_USER.email);

    // OUVRIR LE LIEN. L'e-mail est hors d'atteinte d'un test ; ce qui arrive a
    // l'app, lui, est connu : GoTrue redirige vers `/callback` avec la session
    // dans le fragment (flux implicite) et le TYPE du geste. `signup` = ce lien
    // a CREE le compte, et c'est le serveur qui le dit.
    await page.goto(magicLinkReturn(DEFAULT_USER, 'signup'));

    // LA SESSION NE SORT PAS DE NULLE PART : `setSession` decode le jeton du
    // fragment puis va DEMANDER l'utilisateur au serveur. Sans cet appel, une
    // session « prise » ne prouverait qu'un etat local qu'on aurait pose
    // soi-meme — et le compteur a zero du test « lien expire » ne prouverait
    // rien non plus, faute d'un cas ou il monte.
    await expect
      .poll(() => supabase.countOf('GET /auth/v1/user'), { timeout: 20_000 })
      .toBeGreaterThan(0);

    /**
     * ⚠️ CE QUE CE TEST ATTENDAIT AVANT LE 12/09/2026 : la CARTE, directement.
     * C'etait le defaut du fondateur, mot pour mot — « il faudrait qu'appuyer
     * sur le lien dise felicitations, vous etes inscrit ». Le geste le plus
     * engageant du produit n'avait aucun accuse de reception : on passait de sa
     * boite mail a une carte, sans un mot. La suite du parcours (profil,
     * discipline, carte) est jouee de bout en bout par S6.
     */
    await expect(page.getByText(FR.welcomeFreshTitle)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: FR.welcomeFreshCta, exact: true }).click();
    await expect(page).toHaveURL(/\/setup\/profile/, { timeout: 20_000 });

    expect(errors, `erreurs runtime : ${errors.join(' | ')}`).toHaveLength(0);
  });
});
