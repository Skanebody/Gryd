/**
 * GRYD — contenu des étapes de l'onboarding (AMENDEMENT-30, refondu le
 * 21/07/2026). Copy CENTRALISÉE (l'écran reste du rendu) : titres géants courts,
 * sous-titres, CTA courts jamais tronqués.
 *
 * ⚠️ RÈGLE DE CTA RÉVISÉE LE 22/07/2026 (arbitrage fondateur). Ce fichier
 * imposait « CTA à VERBES CONTEXTUELS — jamais “GO”/“Continuer” (§A4) ». Elle
 * tient toujours partout où le CTA porte une DÉCISION (« Choisir ma ville »,
 * « Continuer avec {city} », « Entrer sur la carte »), mais elle est LEVÉE pour
 * les cartes pédagogiques 1 et 2, qui ne décident de rien : trois cartes qui
 * s'enchaînent sont UN parcours, et trois verbes différents y feraient croire à
 * trois décisions distinctes. Le fondateur a tranché « CONTINUER » / « CHOISIR
 * MA VILLE ». Ne pas « recorriger » ce point au prochain audit §A — et ne pas le
 * confondre avec l'override AMENDEMENT-38, qui ne concerne QUE le bouton
 * d'action central de l'app (« GO »), jamais l'onboarding.
 *
 * Zéro nom de lieu tant qu'aucun GPS n'est obtenu (le plateau est « le terrain
 * de jeu », jamais « ton quartier »). Aucune valeur de jeu ici : des Entries
 * i18n (5 langues, parité forcée par le type — les textes vivent dans
 * i18n/catalog/onboarding, l'écran résout via t()).
 */
import { C } from '../../i18n/catalog/onboarding';

/**
 * Ordre du flow. Le stepper (app/onboarding/index) rend l'étape courante.
 *
 * ═══ TROIS CARTES, PUIS UN PROFIL (refonte fondateur 22/07/2026) ════════════
 *     mechanic → rivalry → age → city → profile → account
 *
 * Le diagnostic était sans appel : le premier écran ressemblait à une landing
 * page, il parlait de CREW à quelqu'un qui ne sait pas encore ce qu'est un crew,
 * et son CTA (« Découvrir ma ville ») promettait une ville qu'aucun écran ne
 * demandait. L'onboarding ne fait que trois choses — comprendre le concept,
 * personnaliser un peu, entrer dans l'app — et la PREMIÈRE COURSE VIENT APRÈS,
 * jamais pendant.
 *
 * QUATRE ÉCRANS DE PRODUIT, et ce sont exactement les quatre demandés :
 *   1. `mechanic` — le geste : ferme une boucle, prends la zone. Rien d'autre :
 *      ni rival, ni crew, ni ville. La démonstration animée se comprend SANS
 *      lire le texte (`CaptureDemo`).
 *   2. `rivalry`  — pourquoi revenir : ta zone peut être reprise. C'est ICI que
 *      le crew entre, parce qu'il répond enfin à une question posée.
 *   3. `city`     — la première DÉCISION : choisir sa ville, À LA MAIN, sans
 *      GPS. Assis, dans le métro, en vacances : ça doit marcher.
 *   4. `profile`  — pseudo. Rien de plus (ni niveau sportif, ni poids, ni
 *      objectif km, ni photo imposée : ouvrir la photothèque est une permission,
 *      et l'onboarding n'en demande aucune).
 *
 * DEUX ÉCRANS QUI NE SONT PAS DES ÉCRANS DE PRODUIT, et qu'on ne peut pas
 * supprimer sans mentir :
 *   · `age` — gate LÉGAL (Apple 5.1.1, mineurs RGPD). Il doit précéder toute
 *     COLLECTE, et la carte `city` en est une : elle porte un raccourci qui LIT
 *     LA POSITION. Il descend donc derrière les deux cartes pédagogiques (elles
 *     ne collectent rien) mais reste devant la ville. Le fondre en case à cocher
 *     en ferait un gate passif et donnerait deux décisions à un écran (§A1).
 *   · `account` — la carte EXIGE une session dès qu'un backend existe
 *     ((tabs)/_layout). Tant que ce n'est pas le cas, promettre « explore
 *     d'abord, crée ton compte ensuite » peindrait un chemin mort (§A4). Ouvrir
 *     une lecture anonyme est un chantier backend, pas une décision d'écran.
 *
 * ─── CE QUI A ÉTÉ SUPPRIMÉ, ET POURQUOI ─────────────────────────────────────
 *   · `hook` — le splash. Son fond de carte décoratif (rues grises traversant
 *     l'écran, polygone, point chartreuse isolé) et son logo couru figurent mot
 *     pour mot dans la liste « à supprimer » du fondateur ; son titre parlait de
 *     crew ; son CTA promettait une ville. Ce qu'il portait d'utile — la porte
 *     « J'ai déjà un compte » — a migré sur la carte 1, qui est le nouveau
 *     premier écran : celui qui réinstalle trouve toujours son chemin du premier
 *     coup d'œil.
 *   · `learn` — remplacé par les cartes 1 et 2, qui enseignent SÉPARÉMENT ce
 *     qu'il montrait en bloc (le geste, puis la menace). Sa note honnête sur le
 *     GPS n'a PAS disparu avec lui : c'est tout ce qui restait de l'écran
 *     `permission` supprimé, elle vit maintenant dans `PROFILE.gpsNote`, sur le
 *     dernier écran avant la carte — au plus près du premier GO.
 * Rappel des suppressions antérieures, toujours valides : `permission` (la vraie
 * demande vit au premier GO, en contexte) et `crew` (§7 : proposé APRÈS la 1re
 * capture ; l'app a déjà un onglet Crew permanent).
 */
export const ONBOARDING_STEPS = [
  'mechanic', // 1 — le geste (démo animée) + porte « J'ai déjà un compte »
  'rivalry', // 2 — la reprise, et le crew qui la défend
  'city', // 3 — choix MANUEL de la ville (sans GPS), CTA qui la nomme
  'profile', // 4 — profil minimal : pseudo, et rien d'autre
  'account', // 5 — compte (création OU connexion), puis sortie du flow
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Une valeur lue sur le disque est-elle une étape du flow COURANT ? */
export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/**
 * L'AGE-GATE N'EST PLUS UNE ÉTAPE DU PARCOURS (23/07/2026), et ce n'est pas un
 * relâchement : il est tenu là où il a un SENS LÉGAL, au point de création du
 * compte (`app/(auth)/sign-in.tsx`), où un refus ne peint AUCUNE voie d'auth —
 * il n'y a rien à créer. Le redemander en écran 3 du flow était un doublon.
 *
 * Ce doublon coûtait deux choses, toutes deux relevées en revue :
 *  · il portait le parcours à SIX écrans obligatoires, contre QUATRE fixés par
 *    la doctrine ;
 *  · il rendait MENTEUR le CTA de la carte 2. Celle-ci annonce « Choisir ma
 *    ville » ; l'écran suivant était en réalité « Tu as 16 ans ou plus ? ».
 *    C'est exactement le reproche fait à l'ancien « Découvrir ma ville » — un
 *    CTA doit annoncer l'étape qui vient, pas une autre.
 * Le retirer d'ici corrige les deux d'un seul geste, sans rien céder sur l'âge.
 */
export const stepAfterRivalry = (): OnboardingStep => 'city';

/** Symétrique en marche arrière — le parcours est désormais linéaire. */
export const stepBeforeCity = (): OnboardingStep => 'rivalry';

/**
 * n de l'event `onboarding_step` (§8) pour le funnel A-30. Les n sont des
 * IDENTIFIANTS STABLES d'étape (continuité PostHog), pas des positions.
 *
 * RÉSERVÉS, jamais réattribués — chacun a eu une population, les mélanger
 * fausserait l'entonnoir historique :
 *   1  `hook`        — splash supprimé le 22/07/2026 (refonte 3 cartes) ;
 *   2  `city` (v1)   — fondue dans `learn` le 21/07/2026 ;
 *   3  `permission`  — écran supprimé (la demande vit au 1er GO) ;
 *   4/5/6/7 `choose`/`sync`/`run`/`capture` — supprimés avec le mode vitrine ;
 *   10 `crew`        — rendue à l'onglet Crew le 21/07/2026 ;
 *   13 `learn`       — remplacé par les cartes `mechanic` + `rivalry`.
 *
 * ⚠️ LE NOUVEL ÉCRAN VILLE PREND 16, PAS 2. Reprendre le 2 recollerait la
 * population d'un écran de 2026 avec celle d'un écran supprimé qui enseignait
 * autre chose (il MONTRAIT une ville, celui-ci en fait CHOISIR une). Idem pour
 * les cartes : 14/15 neufs, pas le 13 de `learn`.
 */
export const STEP_EVENT_N: Record<OnboardingStep, number> = {
  mechanic: 14,
  rivalry: 15,
  city: 16,
  profile: 17,
  account: 9,
};

// ─── Copy par étape (Entries — l'écran appelle t()) ──────────────────────────

/** Navigation du stepper : flèche retour discrète (a11y uniquement). */
export const NAV = {
  back: C.navBack,
} as const;

/**
 * Marque posée DISCRÈTEMENT en haut de chaque écran du flow (demande fondateur :
 * « logo GRYD discret en haut à gauche, il ne concurrence pas le titre »).
 * Invariant — jamais traduit.
 */
export const BRAND = 'GRYD';

/**
 * LA PORTE DE CONNEXION, sur le tout premier écran du flow (la carte 1 depuis la
 * refonte). Lien gris, jamais un 2e CTA chartreuse (§A4) : la majorité des
 * arrivants sont nouveaux, mais celui qui réinstalle doit trouver son chemin du
 * premier coup d'œil au lieu de traverser tout le flow pédagogique.
 */
export const SIGN_IN_DOOR = C.hookSignIn;

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

// ═══════════════════════════════════════════════════════════════════════════
// REFONTE « 3 CARTES + COMPTE » (demande fondateur 22/07/2026) — COPY PRÊTE
//
//   1. MÉCANIQUE  → CONTINUER          2. RIVALITÉ → CONTINUER
//   3. VILLE      → CHOISIR MA VILLE / CONTINUER AVEC {city}
//   puis PROFIL MINIMAL → ENTRER SUR LA CARTE
//
// Ces quatre groupes sont la copy du parcours cible. Ils sont posés ICI pour que
// le lot d'écrans n'ait qu'à les rendre : la structure et les 5 langues sont
// déjà tenues par le typage. `ONBOARDING_STEPS` / `STEP_EVENT_N` ci-dessus
// sont la vérité du flow EN PLACE, déjà à jour, avec des `n` NEUFS (2 `city`, 3 `permission`, 4-7, 10 `crew`, 12 `age`
// sont RÉSERVÉS et ne se réattribuent jamais — 12 rejoint la liste le 23/07 :
// l'age-gate a quitté le flow, son numéro reste gelé pour ne pas recoller deux
// populations distinctes dans le funnel).
//
// L'utilisable est le critère : assis · sans GPS · sans courir · sans crew ·
// sans donner de permission · à une main · en moins de 45 s.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Carte 1 — LA MÉCANIQUE. Un seul objet enseigné : le geste qui prend une zone.
 * Ni crew, ni rival, ni ville : chacun a sa carte. La démonstration animée
 * (`CaptureDemo`) doit se comprendre SANS lire ce texte ; le texte confirme.
 */
export const MECHANIC = {
  kicker: C.mechanicKicker,
  title: C.mechanicTitle,
  tagline: C.mechanicTagline,
  /** Chip d'honnêteté posée SUR le visuel. */
  exampleTag: C.exampleTag,
  /** Label bref du 4e temps de l'animation (jamais une célébration). */
  demoLabel: C.captureDemoLabel,
  /** a11y du visuel tapable — absent en mouvement réduit (rien à rejouer). */
  demoReplay: C.demoReplay,
  cta: C.ctaContinue,
} as const;

/**
 * Carte 2 — LA RIVALITÉ : la réponse à « pourquoi revenir ? ». C'est ICI que le
 * CREW entre, et pas avant : il répond à une question que le joueur vient de se
 * poser (« on peut me la reprendre ? ») au lieu d'un mot qu'il ne connaît pas.
 */
export const RIVALRY = {
  kicker: C.rivalryKicker,
  title: C.rivalryTitle,
  tagline: C.rivalryTagline,
  exampleTag: C.exampleTag,
  demoLabel: C.rivalryDemoLabel,
  demoReplay: C.demoReplay,
  cta: C.ctaChooseCity,
} as const;

/**
 * Carte 3 — LA VILLE, choisie À LA MAIN. Jamais « autorise ta localisation pour
 * continuer » : on peut être dans un train, en vacances, loin de chez soi. La
 * position est un RACCOURCI secondaire, et elle porte sa phrase d'explication
 * AVANT la boîte système (`locationWhy`). Aucune ville n'est inventée : la liste
 * vient de `city_zones` (repli game-rules CITIES), et une recherche sans
 * résultat le DIT (`noMatch`) au lieu de proposer un ersatz.
 */
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
  /**
   * Position REFUSÉE — distincte de « indisponible ». C'est la même règle que
   * les cinq états de la carte (`map/locationState.ts`) : appeler « refus » un
   * capteur muet, ou « indisponible » un refus, met sur le dos du joueur ce
   * qu'il n'a pas fait. Deux causes, deux phrases.
   */
  locationDenied: C.cityLocationDenied,
  /** Position indisponible (GPS coupé, capteur muet, timeout) — jamais un écran muet. */
  locationFailed: C.cityLocationFailed,
  noMatch: C.cityNoMatch,
  /** La liste est bornée (pas de ScrollView) : on dit qu'il y en a d'autres. */
  more: C.cityMore,
  /** CTA sans sélection… */
  cta: C.ctaChooseCity,
  /** …et CTA qui NOMME la ville choisie (format({ city })). */
  ctaWithCity: C.cityContinueWith,
} as const;

/**
 * PROFIL MINIMAL : pseudo + ville (déjà choisie, rappelée et non redemandée).
 * Rien d'autre. Ce qui reste EXCLU : photo obligatoire, niveau sportif, poids,
 * taille, objectif kilométrique, fréquence, contacts, notifications, HealthKit,
 * Strava, crew. `privacyNote` ne PROMET rien que le code ne tienne : elle dit ce
 * qui est vrai (rien n'est publié depuis cet écran) et où le réglage vit.
 *
 * ⚠️ AUCUN CHOIX D'AVATAR ICI, ET C'EST VOLONTAIRE. Ouvrir la photothèque est
 * une PERMISSION, et l'onboarding n'en demande aucune — « facultatif » ne veut
 * pas dire « proposé quand même ». L'avatar (photo ou initiales) vit dans
 * l'écran Profil, après. L'Entry `profileAvatarOptional` a donc été retirée du
 * catalogue avec cette décision : une Entry que plus aucun écran ne lit est une
 * promesse de texte sans écran derrière.
 *
 * `gpsNote` est le SEUL héritage de l'écran `permission` supprimé, et il est
 * posé ici — dernier écran avant la carte, donc au plus près du premier GO :
 * la boîte système ne tombera pas de nulle part.
 */
export const PROFILE = {
  kicker: C.profileKicker,
  title: C.profileTitle,
  tagline: C.profileTagline,
  pseudoLabel: C.profilePseudoLabel,
  cityLabel: C.profileCityLabel,
  privacyNote: C.profilePrivacyNote,
  gpsNote: C.firstRunGpsNote,
  cta: C.profileCta,
  /**
   * Quand un écran COMPTE suit encore (backend configuré), le dernier CTA du
   * flow n'est pas celui qui entre sur la carte : le dire autrement serait
   * promettre une arrivée qu'un écran de plus dément.
   */
  ctaBeforeAccount: C.ctaContinue,
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
