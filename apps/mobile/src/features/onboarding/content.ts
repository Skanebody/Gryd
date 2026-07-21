/**
 * GRYD — contenu des étapes de l'onboarding (AMENDEMENT-30, refondu le
 * 21/07/2026). Copy CENTRALISÉE (l'écran reste du rendu) : titres géants courts,
 * sous-titres, CTA à VERBES CONTEXTUELS (jamais « GO »/« Continuer » — §A4).
 * Zéro nom de lieu tant qu'aucun GPS n'est obtenu (le plateau est « le terrain
 * de jeu », jamais « ton quartier »). Aucune valeur de jeu ici : des Entries
 * i18n (5 langues, parité forcée par le type — les textes vivent dans
 * i18n/catalog/onboarding, l'écran résout via t()).
 */
import { C } from '../../i18n/catalog/onboarding';

/**
 * Ordre du flow. Le stepper (app/onboarding/index) rend l'étape courante.
 *
 * ─── QUATRE ÉCRANS (retour fondateur 21/07/2026 : « trop de cliques ») ───────
 *     hook → age → learn → account
 *
 * Il y en avait SEPT : hook · age · city · learn · permission · account · crew.
 * Trois sont tombées, chacune pour une raison qui tient sans elle :
 *
 *   · `city` FONDUE dans `learn`. Les deux enseignaient la même chose — le
 *     plateau et la règle — en deux temps. Le plateau EST l'explication : un
 *     seul visuel montre le terrain DÉJÀ OCCUPÉ (zone contestée, zone rivale)
 *     ET la boucle qui en fait basculer une. Deux écrans qui disent la même
 *     chose ne l'expliquent pas deux fois mieux, ils coûtent un tap.
 *
 *   · `permission` SUPPRIMÉE, pas déplacée : elle n'ouvrait AUCUNE boîte
 *     système (son propre code le disait — « cet écran est PÉDAGOGIQUE »). La
 *     vraie demande expo-location vit depuis toujours au premier GO
 *     (`useRealRun.acquireNative`), en contexte. Un écran qui demande la
 *     permission de demander une permission est un tap pour rien ; le joueur
 *     comprend mieux le GPS quand il s'apprête à courir. Ce qu'il en reste :
 *     UNE phrase honnête dans `learnNote` (« le GPS s'allume au départ »), pour
 *     que la boîte système ne tombe jamais de nulle part.
 *
 *   · `crew` RENDUE À SON ONGLET. §7 dit « proposé APRÈS la 1re capture, jamais
 *     imposé » — le poser AVANT la première course était exactement l'inverse,
 *     et l'app a déjà un onglet Crew permanent en 1 tap. L'étape faisait
 *     doublon avec une surface qui, elle, marche vraiment (rejoindre par code,
 *     RPC serveur 0042).
 *
 * Ce qui NE PEUT PAS tomber, et pourquoi : `age` est un gate LÉGAL (Apple 5.1.1,
 * RGPD mineurs) qui doit précéder toute collecte — GPS comme compte. Le fondre
 * dans le hook en ferait une case à cocher passive (gate affaibli) et donnerait
 * deux décisions au premier écran (§A1). Il reste donc un écran plein, et il est
 * sur les DEUX chemins : découverte comme connexion (voir `index.tsx`).
 */
export const ONBOARDING_STEPS = [
  'hook', // 1 — splash / accroche + porte « J'ai déjà un compte »
  'age', // 2 — age-gate 16+ (Apple 5.1.1 / mineurs RGPD), avant toute collecte
  'learn', // 3 — le terrain de jeu ET la règle, sur un exemple étiqueté
  'account', // 4 — compte (création OU connexion), puis sortie du flow
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * n de l'event `onboarding_step` (§8) pour le funnel A-30. Les n sont des
 * IDENTIFIANTS STABLES d'étape (continuité PostHog), pas des positions.
 *
 * RÉSERVÉS, jamais réattribués — chacun a eu une population, les mélanger
 * fausserait l'entonnoir historique :
 *   2  `city`        — fondue dans `learn` le 21/07/2026 ;
 *   3  `permission`  — écran supprimé (la demande vit au 1er GO) ;
 *   4/5/6/7 `choose`/`sync`/`run`/`capture` — supprimés avec le mode vitrine ;
 *   10 `crew`        — rendue à l'onglet Crew le 21/07/2026.
 *
 * `learn` garde le n 13 (et non le 2 de `city`) alors qu'il hérite du plateau :
 * le 13 n'a vu QUE la population post-vitrine, donc lui seul est comparable
 * d'une semaine sur l'autre. Reprendre le 2 aurait recollé deux populations que
 * la suppression de la vitrine avait justement séparées.
 */
export const STEP_EVENT_N: Record<OnboardingStep, number> = {
  hook: 1,
  age: 12,
  learn: 13,
  account: 9,
};

// ─── Copy par étape (Entries — l'écran appelle t()) ──────────────────────────

/** Navigation du stepper : flèche retour discrète (a11y uniquement). */
export const NAV = {
  back: C.navBack,
} as const;

/**
 * 1 — Splash / hook : 1 phrase, pas de carrousel (§1), + LA PORTE DE CONNEXION.
 * `signIn` est un lien gris (jamais un 2e CTA chartreuse) : la majorité des
 * arrivants sont nouveaux, mais celui qui réinstalle doit trouver son chemin du
 * premier coup d'œil au lieu de traverser tout le flow pédagogique.
 */
export const HOOK = {
  /** Invariant de marque — jamais traduit. */
  brand: 'GRYD',
  title: C.hookTitle,
  tagline: C.hookTagline,
  cta: C.hookCta,
  signIn: C.hookSignIn,
} as const;

/**
 * 2 — Age-gate 16+ (Apple Guideline 5.1.1 / protection des mineurs RGPD). Vient
 * APRÈS le splash mais AVANT toute collecte (GPS, compte) — et avant la
 * connexion, car l'OTP e-mail CRÉE le compte quand l'adresse est inconnue
 * (`shouldCreateUser: true`) : laisser passer un raccourci « déjà un compte »
 * sans gate ouvrirait une porte de création sans vérification d'âge.
 * Auto-déclaration : « 16+ » (CTA) vs « moins de 16 » (lien → blocage terminal).
 */
export const AGE = {
  kicker: C.ageKicker,
  /** Le joueur vient de « J'ai déjà un compte » : on lui dit où il en est. */
  kickerSignIn: C.ageKickerSignIn,
  title: C.ageTitle,
  tagline: C.ageTagline,
  confirm: C.ageConfirm,
  confirmA11y: C.ageConfirmA11y,
  under: C.ageUnder,
  /** Écran de blocage si &lt; 16 (pas de chemin vers l'avant). */
  blockedTitle: C.ageBlockedTitle,
  blockedTagline: C.ageBlockedTagline,
} as const;

/**
 * 3 — LE TERRAIN ET LA RÈGLE, sur un exemple (ex-`city` + ex-`learn`).
 *
 * On ENSEIGNE le geste — la boucle prend la zone — sur un plateau déjà occupé
 * par d'autres crews, au lieu de mettre en scène une course que le joueur n'a
 * pas faite. L'exemple est ÉTIQUETÉ (chip « Exemple » sur le visuel + note
 * dessous), n'affiche AUCUN chiffre attribué au joueur, et n'est jamais célébré
 * (ni haptique de succès, ni compteur héros, ni event de célébration).
 * La note porte aussi la seule chose utile que disait l'écran `permission` :
 * le GPS s'allume au départ d'une course, jamais avant.
 */
export const LEARN = {
  kicker: C.learnKicker,
  title: C.learnTitle,
  tagline: C.learnTagline,
  note: C.learnNote,
  /** Chip d'honnêteté posée SUR le visuel. */
  exampleTag: C.exampleTag,
  cta: C.learnCta,
} as const;

/**
 * 4 — Compte : CRÉER **OU** SE CONNECTER (§6). Le titre nomme les deux portes,
 * et `emailHint` dit ce que fait réellement le code e-mail — il connecte si
 * l'adresse existe, il crée sinon. Un joueur qui se trompe de porte arrive donc
 * quand même au bon endroit, et il le sait avant de taper.
 */
export const ACCOUNT = {
  kicker: C.accountKicker,
  title: C.accountTitle,
  tagline: C.accountTagline,
  /** Backend configuré : la carte exige une session — on le DIT (21/07/2026). */
  taglineRequired: C.accountTaglineRequired,
  apple: C.accountApple,
  google: C.accountGoogle,
  /** Voie e-mail (code OTP) — sortie vers (auth)/sign-in. */
  email: C.accountEmail,
  emailHint: C.accountEmailHint,
  /** Échec honnête : on reste sur l'écran (jamais un faux succès). */
  error: C.accountError,
  /**
   * Différer — proposé UNIQUEMENT quand aucune garde d'auth n'attend en aval
   * (Supabase non configuré). Avec backend, ce lien menait à /sign-in sans
   * sortie : la promesse était fausse, elle a été retirée plutôt que répétée.
   */
  skip: C.later,
} as const;

/**
 * Notifications — HORS onboarding : l'opt-in se fait au 1er contexte utile
 * (push contextuel §35), plus jamais dans le stepper. Copy conservée pour cet
 * écran contextuel à venir.
 */
export const NOTIFICATIONS = {
  kicker: C.notifKicker,
  title: C.notifTitle,
  tagline: C.notifTagline,
  cta: C.notifCta,
  skip: C.later,
} as const;
