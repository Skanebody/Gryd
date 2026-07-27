/**
 * GRYD — contenu des étapes de l'onboarding. Copy CENTRALISÉE (l'écran reste du
 * rendu) : titres géants courts, sous-titres, CTA courts jamais tronqués.
 *
 * ═══ REFONTE 27/07/2026 — LES PLANCHES E01b ═════════════════════════════════
 * Le fondateur a re-fourni les planches E01b et demandé que l'onboarding y
 * corresponde. La SPEC PRODUIT (`docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md`,
 * décision D-19 « prends le dernier ») définit explicitement E01→E06 et
 * l'emporte sur AMENDEMENT-30, dont l'arbitrage « garder 4 cartes » lui est
 * ANTÉRIEUR. Ce renversement est VOULU et daté ; ne pas le « recorriger » au
 * prochain audit en invoquant A-30.
 *
 * ⚠️ RÈGLE DE CTA (arbitrage fondateur 22/07/2026, toujours valide). « CONTINUER »
 * est admis sur les écrans PÉDAGOGIQUES, qui ne décident de rien : des écrans qui
 * s'enchaînent sont UN parcours, et un verbe différent à chaque fois y ferait
 * croire à autant de décisions. Le CTA NOMME la suite dès qu'il y a une décision
 * — et le seul de ce flow est celui de E05 (« Autoriser la localisation »). Ne
 * pas confondre avec l'override AMENDEMENT-38 (« GO »), qui ne concerne QUE le
 * bouton d'action central de l'app, jamais l'onboarding.
 *
 * Zéro nom de lieu tant qu'aucun GPS n'est obtenu (le plateau est « le terrain de
 * jeu », jamais « ton quartier »). Aucune valeur de jeu ici : des Entries i18n
 * (5 langues, parité forcée par le type — les textes vivent dans
 * i18n/catalog/onboarding, l'écran résout via t()).
 *
 * ⚠️ REGISTRE : LE DÉPÔT TUTOIE PARTOUT, et les planches VOUVOIENT (« votre
 * tracé », « vos zones »). Le tutoiement est CONSERVÉ — c'est une décision
 * fondateur verrouillée par des tests (`explain/copyDiscipline.test.ts` refuse
 * « votre/vos/vous » dans ce catalogue). Basculer cinq catalogues pour cinq
 * écrans créerait DEUX registres dans la même app, ce qui est pire que l'écart.
 * L'écart est donc assumé et signalé, pas corrigé en douce.
 */
import { C } from '../../i18n/catalog/onboarding';

/**
 * Ordre du flow. Le stepper (app/onboarding/index) rend l'étape courante.
 *
 * ═══ LA SÉQUENCE DES PLANCHES E01b ══════════════════════════════════════════
 *   mechanic (E01) → loop (E02) → rivalry (E03) → crew (E04) → location (E05)
 *                                                                     ↓
 *                                                            (auth)/sign-in (E06)
 *
 *   1. `mechanic` — E01, LA PROMESSE. Photo plein cadre + « COURS. / PRENDS TA
 *      VILLE. » (`E01Hero`). Rendu inchangé par ce chantier.
 *      ⚠️ Le nom `mechanic` est l'IDENTIFIANT HISTORIQUE de cet écran. Il est
 *      CONSERVÉ pour la continuité du funnel (son n=14 a une population) alors
 *      que la MÉCANIQUE proprement dite est désormais enseignée par `loop`.
 *      Le renommer coûterait la lisibilité de l'entonnoir sans rien apporter.
 *   2. `loop`     — E02, LE GESTE : ferme la boucle, la zone à l'intérieur
 *      devient la tienne. C'est ici que la mécanique s'enseigne, sur la boucle
 *      RÉCUPÉRÉE de la planche (`E02Loop`).
 *   3. `rivalry`  — E03, POURQUOI TU REVIENS : ta zone reste en jeu.
 *   4. `crew`     — E04, PLUS FORTS EN CREW. Il ENSEIGNE, il ne demande RIEN :
 *      la création/adhésion au crew reste post-onboarding (note de planche).
 *   5. `location` — E05, LA PRÉ-PERMISSION. Le dialogue SYSTÈME ne s'ouvre
 *      QU'AU TAP sur le CTA, jamais à froid ; « Plus tard » mène à la suite sans
 *      la moindre culpabilisation.
 *   puis E06, l'AUTHENTIFICATION, qui n'est PAS une étape de ce stepper : c'est
 *   un écran à lui (`app/(auth)/sign-in.tsx`), déjà recalé, qui porte le gate
 *   d'âge 16+ au point de création du compte.
 *
 * ─── CE QUI A QUITTÉ L'ONBOARDING, ET OÙ ÇA VIT MAINTENANT ──────────────────
 * La planche 06 le dit noir sur blanc : « Aucune création de profil ici — pseudo
 * et ville arrivent au premier usage réel. » Les deux écrans sortent donc du
 * flow. Ils ne deviennent inatteignables NI l'un NI l'autre, et ce n'est pas une
 * promesse : c'est vérifiable —
 *   · LE GATE D'ÂGE 16+ (obligation Apple 5.1.1) était DÉJÀ tenu là où il a un
 *     sens légal, au point de création du compte : `app/(auth)/sign-in.tsx`
 *     (question en place + blocage terminal) et son jumeau `.web.tsx`. Rien
 *     n'est perdu en le retirant du stepper — il y était un doublon.
 *   · LE CHOIX DE VILLE et LE PSEUDO vivent dans `app/profil-edit.tsx`, qui
 *     consomme le sélecteur PARTAGÉ `features/city/CityPicker` (les 7 870 villes
 *     réelles) et `DISPLAY_NAME_MAX`. Même liste, même recherche, mêmes états.
 * ⚠️ CE QUI RESTE À FAIRE (dit, pas caché) : `profil-edit` écrit le profil
 * LOCAL, pas `onboarding.cityId`. Or `MapScreen` s'en sert comme repli de
 * cadrage quand aucun fix GPS n'est disponible. Le repli n'est donc plus
 * alimenté — la carte garde alors sa vue monde, qui DIT la vérité (« je ne sais
 * pas encore où tu es ») au lieu de poser le joueur quelque part. Aucun mensonge
 * n'est introduit ; c'est un confort en moins, à recâbler avec l'écran E08
 * (`/setup/profile`) du premier usage réel.
 *
 * Rappel des suppressions antérieures, toujours valides : `hook` (le splash),
 * `learn`, `permission` (la vraie demande vit au premier GO), `crew` version
 * 2026-07-21 (rendue à l'onglet Crew — l'étape `crew` d'aujourd'hui est un écran
 * PÉDAGOGIQUE, il ne demande rien et porte un n NEUF).
 */
export const ONBOARDING_STEPS = [
  'mechanic', // E01 — la promesse (photo plein cadre, E01Hero)
  'loop', // E02 — ferme la boucle
  'rivalry', // E03 — on peut te la reprendre
  'crew', // E04 — plus forts en crew
  'location', // E05 — ta position crée le tracé (pré-permission)
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Une valeur lue sur le disque est-elle une étape du flow COURANT ? */
export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/**
 * Étape précédente (flèche retour discrète, §A : rattraper un mistap sans
 * quitter le flow). DÉRIVÉE du flow — une table écrite à la main a déjà divergé
 * de `ONBOARDING_STEPS` ici. La première étape n'a pas de précédent.
 */
export function stepBefore(step: OnboardingStep): OnboardingStep | undefined {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i > 0 ? ONBOARDING_STEPS[i - 1] : undefined;
}

/**
 * Étape suivante. `undefined` sur la dernière : le flow SORT alors vers E06
 * (l'authentification), qui n'est pas une étape de ce stepper.
 */
export function stepAfter(step: OnboardingStep): OnboardingStep | undefined {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i >= 0 && i < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[i + 1] : undefined;
}

/**
 * n de l'event `onboarding_step` (§8) pour le funnel. Les n sont des
 * IDENTIFIANTS STABLES d'étape (continuité PostHog), pas des positions.
 *
 * RÉSERVÉS, jamais réattribués — chacun a eu une population, les mélanger
 * fausserait l'entonnoir historique :
 *   1  `hook`        — splash supprimé le 22/07/2026 ;
 *   2  `city` (v1)   — fondue dans `learn` le 21/07/2026 ;
 *   3  `permission`  — écran supprimé (la demande vivait au 1er GO) ;
 *   4/5/6/7 `choose`/`sync`/`run`/`capture` — supprimés avec le mode vitrine ;
 *   9  `account`     — écran d'arrivée (pseudo + création de compte) SORTI du
 *                      flow le 27/07/2026 : la planche 06 place le profil au
 *                      premier usage réel, et l'auth est E06 ;
 *   10 `crew` (v1)   — rendue à l'onglet Crew le 21/07/2026. ⚠️ L'étape `crew`
 *                      d'aujourd'hui (E04) est un écran PÉDAGOGIQUE qui ne
 *                      demande rien : elle prend un n NEUF (19), pas ce 10 ;
 *   12 `age`         — gate sorti du flow le 23/07/2026 (il vit sur /sign-in) ;
 *   13 `learn`       — remplacé par des cartes séparées ;
 *   16 `city` (v2)   — l'écran de choix de ville, SORTI du flow le 27/07/2026 ;
 *   17 `profile`     — fondu dans `account` le 23/07/2026.
 *
 * `mechanic` GARDE son 14 : c'est le MÊME écran (E01Hero, même copie, même
 * photo), seule sa place dans une séquence plus longue a changé. `rivalry` garde
 * son 15 pour la même raison — l'écran change de visuel, pas d'objet.
 */
export const STEP_EVENT_N: Record<OnboardingStep, number> = {
  mechanic: 14,
  loop: 18,
  rivalry: 15,
  crew: 19,
  location: 20,
};

/**
 * OÙ EN EST LE JOUEUR — la seule source de la frise de points.
 *
 * ⚠️ CE QUE CETTE FONCTION RÉPARE. La frise annonçait CINQ étapes (`stepCount={5}`
 * écrit en dur dans l'écran) pour un parcours qui en comptait QUATRE : une
 * promesse chiffrée fausse, dont le cinquième point ne s'allumait jamais. Le
 * parcours en compte CINQ aujourd'hui — et c'est exactement pour ça que le
 * nombre ne se décrète pas dans un JSX : il se DÉRIVE du flow, sinon les deux
 * divergent au premier écran ajouté ou retiré. C'est arrivé trois fois en un mois
 * ici (fusion nom+entrée, sortie de l'age-gate, planches E01b).
 *
 * `index` est 0-indexé (position dans `ONBOARDING_STEPS`), `count` est le total.
 * Pure et testée (`flow.test.ts`) : la frise ne peut plus mentir sans faire
 * rougir le filet.
 */
export interface StepProgress {
  readonly index: number;
  readonly count: number;
}

export function stepProgress(step: OnboardingStep): StepProgress {
  return { index: ONBOARDING_STEPS.indexOf(step), count: ONBOARDING_STEPS.length };
}

// ─── Copy par étape (Entries — l'écran appelle t()) ──────────────────────────

/**
 * Navigation du stepper : flèche retour discrète (a11y uniquement) et libellé de
 * la frise de progression, LUE par les lecteurs d'écran (des points ne
 * s'entendent pas — « Étape 2 sur 5 », si).
 */
export const NAV = {
  back: C.navBack,
  progressA11y: C.stepProgressA11y,
} as const;

/**
 * Marque GRYD. Invariant — jamais traduit. Elle n'est PLUS peinte dans le
 * stepper : les planches E01b ne montrent aucune signature en haut des écrans
 * pédagogiques (photo/plateau plein cadre + bloc bas). Elle reste exportée parce
 * que la constante est la source du mot pour les écrans qui la posent.
 */
export const BRAND = 'GRYD';

/** « Passer » de l'onboarding (planches, haut à droite). */
export const ONB_SKIP = C.onbSkip;

/**
 * E01 — LA PROMESSE, rendue par le hero plein cadre `E01Hero`. Une PHOTO propre
 * (aucune boucle par-dessus) + la copie ; la mécanique loop→zone s'enseigne à
 * l'écran suivant.
 *
 * ⚠️ `kicker` N'EST PAS RENDU (E01Hero n'en peint pas — retour fondateur : « la
 * photo + le titre suffisent à ouvrir »), et `exampleTag` non plus (aucune
 * démonstration sur cet écran). Les deux sont CONSERVÉS ici : le premier comme
 * source du sur-titre si la planche le réintroduit, le second comme source unique
 * du libellé « Exemple » (= `C.exampleTag`) partagé par les plateaux.
 */
export const MECHANIC = {
  kicker: C.mechanicKicker,
  title: C.mechanicTitle,
  tagline: C.mechanicTagline,
  exampleTag: C.exampleTag,
  cta: C.ctaContinue,
} as const;

/**
 * E02 — FERME LA BOUCLE. Le geste, et rien d'autre : ni rival, ni crew, ni
 * ville. La boucle se dessine (900 ms) PUIS la surface se remplit — l'ordre est
 * la règle, il est verrouillé dans `plancheMotion.ts`.
 */
export const LOOP = {
  title: C.loopTitle,
  tagline: C.loopTagline,
  exampleTag: C.exampleTag,
  cta: C.ctaContinue,
} as const;

/**
 * E03 — ON PEUT TE LA REPRENDRE. Ton FACTUEL, jamais menaçant (note de planche) :
 * la phrase constate une règle du jeu et propose les deux rôles (défendre,
 * reprendre). `takenLabel` est le mot posé DANS la moitié reprise du visuel.
 */
export const RIVALRY = {
  title: C.rivalryTitle,
  tagline: C.rivalryTagline,
  exampleTag: C.exampleTag,
  takenLabel: C.rivalryTakenLabel,
  cta: C.ctaContinue,
} as const;

/**
 * E04 — PLUS FORTS EN CREW. C'est ICI que le mot CREW entre, et pas avant : il
 * répond à une question que le joueur vient de se poser (« on peut me la
 * reprendre ? ») au lieu d'être un mot qu'il ne connaît pas.
 *
 * ⚠️ AUCUNE ADHÉSION N'EST DEMANDÉE ICI (note de planche). Pas de champ, pas de
 * bouton « créer un crew », pas de liste : l'écran enseigne, l'onglet Crew fait
 * le reste, après.
 */
export const CREW = {
  title: C.crewTitle,
  tagline: C.crewTagline,
  exampleTag: C.exampleTag,
  cta: C.ctaContinue,
} as const;

/**
 * E05 — LA PRÉ-PERMISSION DE LOCALISATION.
 *
 * ⚠️ RÈGLE CAPITALE (planche + spec E05) : le dialogue SYSTÈME ne s'ouvre QU'AU
 * TAP sur le CTA. Les trois garanties sont donc lues AVANT — la boîte système ne
 * tombe jamais de nulle part. « Plus tard » mène à la suite, et la carte
 * fonctionnera en lecture seule, SANS la moindre culpabilisation : le libellé est
 * neutre (`C.later`), et aucune phrase ne dit au joueur ce qu'il « rate ».
 *
 * `unavailable` n'est pas une variante cosmétique : là où aucun capteur ne peut
 * répondre (web sans `navigator.geolocation`), le CTA d'autorisation n'est PAS
 * peint — un bouton qui échoue à coup sûr est un bouton mort (§A4) — et l'écran
 * DIT pourquoi au lieu de se taire.
 */
export const LOCATION = {
  title: C.locationTitle,
  /** Les TROIS garanties de la planche, une par ligne, avec coche et filet. */
  guarantees: [C.locationGuaranteeRuns, C.locationGuaranteeLive, C.locationGuaranteeBlur] as const,
  /** L'unique CTA chartreuse du flow qui DÉCIDE (il ouvre la boîte système). */
  cta: C.locationAllow,
  /** Sortie douce — jamais un 2e CTA, jamais un reproche. */
  later: C.later,
  /** Aucun capteur sur cette plateforme : on le dit, on ne peint pas le bouton. */
  unavailable: C.locationUnavailable,
  /** …et le parcours continue quand même (le CTA redevient neutre). */
  continueCta: C.ctaContinue,
} as const;

/**
 * 1b — Age-gate 16+ (Apple Guideline 5.1.1 / protection des mineurs RGPD).
 *
 * ⚠️ CE GROUPE N'EST PLUS LU PAR L'ONBOARDING, et ce n'est pas un oubli : le gate
 * vit au POINT DE CRÉATION DU COMPTE, `app/(auth)/sign-in.tsx` (+ `.web.tsx`),
 * qui l'importe d'ici. C'est le seul endroit où il a un sens légal — un refus n'y
 * peint AUCUNE voie d'auth, il n'y a rien à créer. Ne pas le remettre dans le
 * stepper : il y était un doublon, et il y rendait menteur le CTA de l'écran
 * précédent.
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

// ═══════════════════════════════════════════════════════════════════════════
// COPY EN ATTENTE DE SURFACE — le PREMIER USAGE RÉEL (spec E08/E09)
//
// ⚠️ CES TROIS GROUPES NE SONT RENDUS PAR AUCUN ÉCRAN DEPUIS LE 27/07/2026, et
// c'est une exception ASSUMÉE à la règle du dossier (« une Entry que plus aucun
// écran ne lit est une promesse de texte sans écran derrière »).
//
// La règle vise les Entries ORPHELINES — la copie d'un écran mort. Ici, l'écran
// n'est pas mort : la planche 06 le DÉPLACE (« pseudo et ville arrivent au
// premier usage réel »), et la spec produit lui donne déjà une route (E08,
// `/setup/profile`). Supprimer cette copie obligerait le chantier suivant à la
// réécrire — donc à la retraduire en cinq langues — pour un écran que le
// fondateur a explicitement demandé de conserver atteignable.
//
// ⚠️ CE QUI EST VRAI AUJOURD'HUI, SANS EMBELLISSEMENT : le choix de ville et le
// pseudo restent atteignables par `app/profil-edit.tsx` (sélecteur partagé
// `CityPicker` + champ pseudo), pas par un écran de premier usage dédié. Cette
// copie-ci attend CET écran. Si le chantier E08 n'arrive pas, la bonne action
// n'est pas de garder ces Entries indéfiniment : c'est de les supprimer.
// ═══════════════════════════════════════════════════════════════════════════

/** Choix MANUEL de la ville (spec E08) — sans GPS, aucune ville inventée. */
export const CITY = {
  kicker: C.cityKicker,
  title: C.cityTitle,
  tagline: C.cityTagline,
  searchPlaceholder: C.citySearchPlaceholder,
  openList: C.cityOpenList,
  useLocation: C.cityUseLocation,
  locationWhy: C.cityLocationWhy,
  /** Position hors de toute ville ouverte — jamais un repli inventé. */
  locationOutside: C.cityLocationOutside,
  /** Position REFUSÉE — distincte de « indisponible » (deux causes, deux phrases). */
  locationDenied: C.cityLocationDenied,
  /** Position indisponible (GPS coupé, capteur muet, timeout). */
  locationFailed: C.cityLocationFailed,
  noMatch: C.cityNoMatch,
  more: C.cityMore,
  cta: C.ctaChooseCity,
  /** CTA qui NOMME la ville choisie (format({ city })). */
  ctaWithCity: C.cityContinueWith,
} as const;

/** Identité minimale (spec E08) : pseudo + rappel de la ville. Rien d'autre. */
export const PROFILE = {
  kicker: C.profileKicker,
  title: C.profileTitle,
  pseudoLabel: C.profilePseudoLabel,
  cityLabel: C.profileCityLabel,
  privacyNote: C.profilePrivacyNote,
  gpsNote: C.firstRunGpsNote,
} as const;

/** Entrée : créer **OU** se connecter — aujourd'hui portée par E06 (/sign-in). */
export const ACCOUNT = {
  taglineRequired: C.accountTaglineRequired,
  apple: C.accountApple,
  google: C.accountGoogle,
  email: C.accountEmail,
  emailHint: C.accountEmailHint,
  error: C.accountError,
  skip: C.later,
} as const;

/**
 * LA PORTE DE CONNEXION (« J'ai déjà un compte »). Elle n'est PAS peinte sur E01
 * : la planche ne la montre pas, et l'authentification E06 clôt la séquence — le
 * joueur qui réinstalle y arrive par « Passer » comme par le CTA. Conservée pour
 * l'écran qui la reprendra.
 */
export const SIGN_IN_DOOR = C.hookSignIn;

/**
 * Notifications — HORS onboarding : l'opt-in se fait au 1er contexte utile
 * (push contextuel §35), jamais dans le stepper.
 */
export const NOTIFICATIONS = {
  kicker: C.notifKicker,
  title: C.notifTitle,
  tagline: C.notifTagline,
  cta: C.notifCta,
  skip: C.later,
} as const;

/**
 * BUDGET DE CARACTÈRES DU CTA « Continuer avec {ville} » (écran VILLE, spec E08).
 *
 * Le CTA est une pill de hauteur FIXE (56 px) dont le libellé n'a pas de
 * `numberOfLines` : au-delà d'une ligne, le texte passe à la ligne DANS une boîte
 * qui ne grandit pas — il est rogné. La valeur est celle mesurée par
 * `copyFit.test.ts` : 327 px utiles (375 − 2×24), libellé en 16 px gras, ~34
 * caractères par ligne, borné à 26 pour garder de l'air dans les 5 langues.
 * Au-delà, l'écran repasse au CTA neutre — il n'abrège JAMAIS la ville en
 * « Villeneuve-d'A… » (§A : aucun texte d'action coupé).
 */
export const CITY_CTA_LABEL_MAX = 26;
