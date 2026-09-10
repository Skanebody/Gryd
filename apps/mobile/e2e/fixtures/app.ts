/**
 * GRYD — outils communs du harnais de parcours : etat de depart du STOCKAGE,
 * fixture Playwright qui monte le filet reseau, et les phrases FRANCAISES sur
 * lesquelles les tests s'appuient.
 *
 * ⚠️ POURQUOI LES ASSERTIONS PORTENT SUR DU TEXTE VISIBLE, JAMAIS SUR UNE
 * CLASSE CSS : react-native-web genere ses classes (`css-146c3p1`) a partir des
 * styles, elles changent des qu'un `StyleSheet` bouge et ne veulent rien dire
 * pour un joueur. Le seul contrat stable entre l'ecran et l'utilisateur est ce
 * qui est ECRIT. Les chaines ci-dessous sont donc des copies EXACTES des
 * catalogues i18n (`src/i18n/catalog/*`) ou des litteraux `text(fr, en)` des
 * ecrans — leur divergence est en soi une regression a voir.
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { installSupabaseMock, makeSession, type MockUser, type SupabaseMock, DEFAULT_USER } from './supabase-mock';

/** Cle AsyncStorage de l'onboarding (src/features/onboarding/store.ts). */
const ONBOARDING_KEY = 'gryd.onboarding.v1';
/**
 * Cle de session de supabase-js : `sb-<premier segment d'hote>-auth-token`
 * (dist/index.cjs). L'hote du bundle E2E est `e2e-mock.supabase.co`.
 */
const SESSION_KEY = 'sb-e2e-mock-auth-token';

/**
 * Etat de DEPART du stockage. AsyncStorage web ecrit dans `window.localStorage`
 * sans prefixe : on y pose directement les cles que l'app lit.
 *
 * ⚠️ SEME UNE SEULE FOIS, ET C'EST ESSENTIEL. `addInitScript` s'execute a CHAQUE
 * chargement de document, y compris un `page.goto` en cours de test. Sans le
 * garde ci-dessous, un test qui se deconnecte puis ouvre `/sign-in` par son URL
 * voyait la session REVENIR : le script re-semait l'etat initial par-dessus ce
 * que l'app venait d'ecrire, et le test se retrouvait connecte alors qu'il
 * venait de se deconnecter. Le garde donne la semantique d'un vrai appareil :
 * recharger la page ne remet pas le stockage a zero.
 */
export async function seedStorage(page: Page, entries: Record<string, string>): Promise<void> {
  await page.addInitScript((seed: Record<string, string>) => {
    const MARK = '__gryd_e2e_seeded__';
    try {
      if (window.localStorage.getItem(MARK) === '1') return;
      window.localStorage.clear();
      for (const [key, value] of Object.entries(seed)) window.localStorage.setItem(key, value);
      window.localStorage.setItem(MARK, '1');
    } catch {
      /* navigation privee : le test qui en depend le dira lui-meme */
    }
  }, entries);
}

/**
 * Le repere de l'ecran CARTE.
 *
 * ⚠️ POURQUOI `getByRole` ET PAS `getByLabel`. Deux pieges se cumulent :
 *  · `getByLabel` fait une correspondance PARTIELLE et insensible a la casse :
 *    « Couches » matche aussi « Fermer les couches » ;
 *  · expo-router garde les ecrans precedents MONTES dans la pile, donc le meme
 *    bouton peut exister plusieurs fois dans le DOM apres une navigation.
 * `getByRole` ne voit que l'arbre d'accessibilite — les ecrans en retrait en
 * sont exclus — et `exact` coupe la correspondance partielle.
 */
export function mapLayersButton(page: Page): Locator {
  return page.getByRole('button', { name: FR.mapLayers, exact: true });
}

/** Premiere ouverture : rien en memoire, ni onboarding vu ni session. */
export function firstLaunch(): Record<string, string> {
  return {};
}

/** Onboarding deja vu, toujours invite. */
export function exploredOnce(): Record<string, string> {
  return {
    [ONBOARDING_KEY]: JSON.stringify({ onboardingDone: true, reachedStep: 'map' }),
  };
}

/**
 * Compte deja connecte sur cet appareil (scenario S3). `ageConfirmed` est VRAI :
 * quelqu'un qui a un compte a forcement franchi le gate 16+ pour l'obtenir —
 * un etat de depart qui l'oublierait ne serait pas celui d'un membre qui revient.
 */
export function returningMember(user: MockUser = DEFAULT_USER): Record<string, string> {
  return {
    [ONBOARDING_KEY]: JSON.stringify({ onboardingDone: true, reachedStep: 'map', ageConfirmed: true }),
    [SESSION_KEY]: JSON.stringify(makeSession(user)),
  };
}

/**
 * Les phrases exactes que le joueur lit. Miroir des catalogues i18n.
 *
 * ⚠️ LE PARCOURS E-MAIL EST CELUI DU LIEN MAGIQUE. Les constantes `otp*` ont
 * disparu de ce bloc avec le code a six chiffres : `EMAIL_DELIVERY` vaut
 * `'link'` tant qu'aucune source ne prouve que le gabarit e-mail porte
 * `{{ .Token }}` (`emailDelivery2026`, appele avec un `false` litteral par les
 * deux `lib/auth*`). Une constante qui decrirait encore l'ecran a code ferait
 * passer le harnais a cote du produit — c'est exactement ce qui est arrive.
 */
export const FR = {
  // src/features/onboarding/Discovery2026Screen.tsx
  onboardingTitle: 'La ville est ton terrain.',
  onboardingCta: 'Explorer la carte',
  onboardingHowTo: 'Comment jouer',
  onboardingLoopTitle: 'Trace. Ferme. Capture.',
  onboardingExample: 'Le dessin est un exemple, pas un territoire gagné.',

  // src/features/refonte/MapHome.tsx (accessibilityLabel)
  mapLayers: 'Couches',
  mapRun: 'Courir',
  mapFindMe: 'Me recentrer',

  // src/features/refonte/MapHome.tsx — la porte de compte de la feuille Couches
  mapFindMyTerritories: 'Retrouver mes terrains',
  /**
   * CE QUE COUTE L'ABSENCE DE COMPTE, DIT SANS FAUSSE LIMITE. La carte promettait
   * « Ta première sortie peut se faire sans compte. » — un essai gratuit qui
   * n'existe pas : sans compte, TOUTES les sorties tournent, elles ne prennent
   * simplement aucun terrain. `features/run/liveChain2026.test.ts` interdit
   * desormais l'ancienne phrase ; celle-ci est la vraie.
   */
  mapGuestNoTerrain: 'Sans compte, tes sorties restent sur cet appareil et ne prennent aucun terrain.',
  /** Bandeau de la carte elle-meme, invite : ce qui manque, et pourquoi. */
  mapGuestNotice: 'Connecte-toi pour voir les terrains de ton compte.',

  // src/features/nav/tabs.ts — les trois destinations de la barre basse
  navProfil: 'Profil',

  /**
   * Ecran LEGACY de la ligne MASTER, en quarantaine (ADR-001/ADR-012). Sa copie
   * sert de temoin : si elle apparait sur `/profil`, c'est qu'un lien profond a
   * servi le legacy a la place du cahier de septembre.
   */
  legacyProfileTitle: 'Toi',

  // app/parametres.tsx
  settingsSignOut: 'Me déconnecter',
  settingsSignOutFailed: 'La déconnexion n’a pas abouti. Réessaie.',

  // src/features/refonte/MapHome.tsx — bandeaux d'echec (accessibilityLabel)
  mapTerrainsUnavailable: 'Terrains indisponibles · Réessayer',

  // src/features/refonte/ProfileHomeScreen.tsx
  profileTitle: 'Profil',
  /** ⚠️ CE N'EST PLUS UN LIEN, C'EST LE CTA PRIMAIRE DU PROFIL INVITÉ
   *  (10/09/2026) : « Connexion » ne s'adressait qu'à ceux qui ont déjà un
   *  compte. Le libellé a changé, et la nature de l'élément aussi : un
   *  `getByText().click()` échouerait maintenant, le texte du bouton portant
   *  `pointerEvents="none"`. Les specs le résolvent par RÔLE. */
  profileSignIn: 'Créer mon compte',
  profileGuest: 'Invité',
  profileOnThisDevice: 'Sur cet appareil',

  // src/i18n/catalog/auth.ts
  authKicker: 'TON COMPTE',
  authMethodsTitle: 'Crée ton compte ou connecte-toi',
  authEmailDoor: 'Continuer avec un e-mail',
  authGuest: 'Continuer sans compte',
  ageNotMe: 'Ce n’est pas moi',
  authTerms: 'Conditions',
  authGoogle: 'Continuer avec Google',
  ageAccountOnly: 'Cette vérification protège la création du compte. Tu peux toujours courir sans compte.',

  // src/i18n/catalog/onboarding.ts (gate 16+)
  ageTitle: 'Tu as 16 ans ou plus ?',
  ageConfirm: 'Oui, j’ai 16 ans ou plus',
  /** ⚠️ Sur /sign-in, ce bouton porte un accessibilityLabel DIFFERENT de son
   *  libelle visible (AGE.confirmA11y) : c'est LUI que voit un lecteur d'ecran,
   *  et donc lui que Playwright resout par role. Sur /email le meme bouton n'en
   *  porte pas et garde son libelle. Deux noms accessibles pour un meme geste. */
  ageConfirmA11y: 'J’ai 16 ans ou plus',
  ageUnder: 'J’ai moins de 16 ans',
  ageBlockedTitle: 'Reviens à 16 ans.',
  ageBlockedTagline: 'GRYD n’est pas accessible avant 16 ans. On garde ta ville au chaud pour toi.',

  // ─── src/i18n/catalog/authEmail.ts — l'ecran /email ────────────────────────
  emailKicker: 'PAR E-MAIL',
  emailTitle: 'Ton adresse e-mail',
  emailLabel: 'Adresse e-mail',
  emailBack: 'Retour',
  emailBackA11y: 'Revenir aux autres façons de se connecter',
  /** Ce que le lien FAIT — il connecte OU cree, et l'ecran ne devine pas lequel. */
  emailWhatHappens: 'Un lien de connexion : il te connecte si ton compte existe, il le crée sinon.',
  /** Le CTA unique de l'ecran. C'est un LIEN qui part, pas un code. */
  linkRequestCta: 'Recevoir le lien',

  // Etat « envoye »
  linkSentTitle: 'Lien envoyé',
  /** Gabarit du catalogue — voir `linkSentBody()` pour la phrase remplie. */
  linkSentBody: 'Regarde dans {email}.',
  linkSentHint: 'Ouvre l’e-mail sur cet appareil, puis tape le lien qu’il contient : il te connecte directement. Il expire dans l’heure et ne sert qu’une fois.',
  linkResendCta: 'Renvoyer le lien',
  linkResendDone: 'Nouveau lien envoyé. Le précédent ne marche plus.',
  linkChangeEmail: 'Changer d’adresse',
  resendCountdownPrefix: 'Renvoyer dans',

  // Refus d'envoi
  errorInvalidEmail: 'Cette adresse n’a pas le bon format. Vérifie le @ et ce qui suit.',
  errorRateLimited: 'Trop de demandes d’affilée. Attends une minute avant de réessayer.',
  errorNetwork: 'Envoi impossible — réessaie quand tu as du réseau.',
  errorUnknown: 'L’envoi a échoué. Réessaie — rien n’a été enregistré.',

  /**
   * ─── LES CINQ VERDICTS DE `/callback` ─────────────────────────────────────
   * `authCallbackVerdict2026` (src/features/account/authCallback2026.ts) rend
   * cinq verdicts, et l'ecran leur donne CINQ phrases : c'est le correctif du
   * 10/09 (« quatre faits, une seule phrase » avant lui). Les cinq sont ici
   * pour qu'un test puisse verifier qu'on ne lit PAS celle du voisin — dire
   * « demande un nouveau lien » a quelqu'un dont le reseau est coupe lui fait
   * bruler son quota d'envoi pour un lien encore bon.
   */
  linkExpiredTitle: 'Ce lien a expiré',
  linkExpiredBody: 'Les liens ne durent qu’une heure et ne servent qu’une fois. Rien n’est perdu : demandes-en un neuf.',
  linkExpiredCta: 'DEMANDER UN NOUVEAU LIEN',
  linkInvalid: 'Ce lien est incomplet. Ouvre-le directement depuis l’e-mail, sans le recopier.',
  callbackNetwork: 'La connexion au serveur n’a pas abouti. Ton lien reste valable : réessaie quand tu as du réseau.',
  callbackRetryCta: 'Réessayer',
  callbackNoReturn: 'Aucun retour de connexion n’est arrivé jusqu’ici. Ouvre le lien depuis ton e-mail, sur cet appareil.',
  callbackFailed: 'Ce retour de connexion n’est plus valide. Demande un nouveau lien.',
  callbackChecking: 'Connexion en cours…',
  callbackVerifying: 'Vérification du lien…',
} as const;

/** `sentBody` du catalogue avec son `{email}` rempli — la phrase REELLEMENT peinte. */
export function linkSentBody(email: string): string {
  return FR.linkSentBody.replace('{email}', email);
}

/**
 * Le harnais monte le filet reseau AVANT toute navigation, et refuse de laisser
 * passer un test qui aurait fait sortir une requete non simulee.
 *
 * ⚠️ `auto: true` N'EST PAS UN DETAIL. Une fixture Playwright ordinaire n'est
 * construite que si le test la DEMANDE dans sa signature. Un test ecrit
 * `async ({ page })` — ce qui est parfaitement naturel quand il ne consulte pas
 * le journal reseau — n'installait alors AUCUN filet, et ses requetes partaient
 * pour de vrai. C'est exactement ce qui est arrive pendant la mise au point de
 * ce harnais : deux tests echouaient sur « Envoi impossible — reessaie quand tu
 * as du reseau », parce que l'app appelait vraiment le reseau et que l'hote
 * fictif ne resolvait pas. La securite du harnais ne peut pas dependre de ce
 * que l'auteur d'un test pense a ecrire dans sa signature : `auto` la rend
 * inconditionnelle.
 */
export const test = base.extend<{ supabase: SupabaseMock }>({
  supabase: [
    async ({ page }, use) => {
      const mock = await installSupabaseMock(page);
      await use(mock);
      expect(
        mock.violations,
        `requetes non simulees (le harnais ne doit RIEN laisser sortir) :\n${mock.violations.join('\n')}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
