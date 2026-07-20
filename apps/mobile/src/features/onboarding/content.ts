/**
 * GRYD — contenu des étapes de l'onboarding SANS FRICTION (AMENDEMENT-30 §1/§7).
 * Copy CENTRALISÉE (l'écran reste du rendu) : titres géants courts, sous-titres,
 * CTA à VERBES CONTEXTUELS (jamais « GO »/« Continuer » — §A4). Principe :
 * « aucun écran ne demande avant d'avoir donné » — la permission GPS ne vit QUE
 * dans la branche « run » (juste avant de lancer le run), le compte et le crew
 * viennent APRÈS la 1re capture, et les notifications sont HORS onboarding
 * (opt-in au 1er contexte utile). Zéro nom de lieu tant qu'aucun GPS n'est
 * obtenu (plateau démo = « le terrain de jeu », jamais « ton quartier »).
 * Aucune valeur de jeu ici : des Entries i18n (5 langues, parité forcée par le
 * type — les textes vivent dans i18n/catalog/onboarding, l'écran résout via t()).
 */
import { C } from '../../i18n/catalog/onboarding';

/**
 * Ordre du flow. Le stepper (app/onboarding/index) rend l'étape courante.
 * `choose` bifurque : `sync` (import, AUCUNE demande GPS) OU `permission → run`
 * (le GPS n'est demandé qu'à ceux qui vont courir). Les deux branches rejoignent
 * `capture` (le payoff), puis compte et crew. Max 7 écrans jusqu'à la capture.
 */
export const ONBOARDING_STEPS = [
  'hook', // 1 — splash / accroche
  'age', // 1b — age-gate 16+ (Apple 5.1.1 / mineurs RGPD), avant toute collecte
  'city', // 2 — le terrain de jeu en plateau (démo, aucune localisation)
  'choose', // 3 — choix du chemin (sync / run)
  'sync', // 3a — import démo (branche « J'ai déjà des runs » — pas de GPS)
  'permission', // 3b — permission GPS, UNIQUEMENT avant le premier run
  'run', // 3b — premier run 1 tap (branche « Je vais courir »)
  'capture', // 4 — 1re capture, moment signature
  'account', // 5 — création de compte APRÈS la valeur
  'crew', // 6 — rejoindre / créer un crew, puis sortie du flow
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * n de l'event `onboarding_step` (§8) pour le funnel A-30. Les n sont des
 * IDENTIFIANTS STABLES d'étape (continuité PostHog), pas des positions : la
 * permission (n=3) vit désormais dans la branche « run », l'âge garde son n
 * dédié (12) et les branches 3a/3b gardent un n propre pour mesurer sync vs run.
 */
export const STEP_EVENT_N: Record<OnboardingStep, number> = {
  hook: 1,
  age: 12, // gate 16+ — n identifiant (hors séquence historique du funnel)
  city: 2,
  choose: 4,
  sync: 5,
  permission: 3, // branche « run » uniquement (juste avant Lancer le run)
  run: 6,
  capture: 7, // activation = 1re capture (métrique nord, §4)
  account: 9,
  crew: 10,
};

// ─── Copy par étape (Entries — l'écran appelle t()) ──────────────────────────

/** Navigation du stepper : flèche retour discrète (a11y uniquement). */
export const NAV = {
  back: C.navBack,
} as const;

/** 1 — Splash / hook : 1 phrase, pas de carrousel (§1). */
export const HOOK = {
  /** Invariant de marque — jamais traduit. */
  brand: 'GRYD',
  title: C.hookTitle,
  tagline: C.hookTagline,
  cta: C.hookCta,
} as const;

/**
 * 1b — Age-gate 16+ (Apple Guideline 5.1.1 / protection des mineurs RGPD). Vient
 * APRÈS le splash mais AVANT toute collecte (GPS, compte). Auto-déclaration : un
 * choix clair « 16+ » (CTA) vs « moins de 16 » (lien → écran de blocage terminal).
 */
export const AGE = {
  kicker: C.ageKicker,
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
 * 2 — Le terrain de jeu : plateau DÉMO, valeur < 60 s (§2). Copy HONNÊTE :
 * aucune localisation n'est encore obtenue → jamais « ton quartier », jamais un
 * nom de lieu. Les couleurs sont nommées en toutes lettres (l'info n'est
 * jamais portée par la seule couleur) — la légende nomme les 3 ÉTATS DE ZONE
 * que le plateau montre (§C) : prise / contestée / au rival.
 */
export const CITY = {
  kicker: C.cityKicker,
  title: C.cityTitle,
  tagline: C.cityTagline,
  cta: C.cityCta,
} as const;

/**
 * 3b — Permission GPS PÉDAGOGIQUE, UNIQUEMENT dans la branche « run » (juste
 * avant Lancer le run — la branche « sync » ne la voit jamais). On EXPLIQUE
 * avant la demande système. Web preview : demande simulée, aucune API système.
 * Le CTA est un verbe d'ACCORD honnête (jamais « GO » §A4) : ce tap n'ouvre
 * AUCUNE boîte système — la vraie demande expo-location arrive au run réel.
 */
export const PERMISSION = {
  kicker: C.permissionKicker,
  title: C.permissionTitle,
  tagline: C.permissionTagline,
  cta: C.permissionCta,
  /** Sortie douce : on n'impose rien (la vraie demande revient au 1er run réel). */
  skip: C.later,
} as const;

/** 3 — Choix du chemin : 2 options claires (§4). Verbes, pas « GO ». */
export const CHOOSE = {
  kicker: C.chooseKicker,
  title: C.chooseTitle,
  tagline: C.chooseTagline,
  /** 3a — branche sync. */
  syncTitle: C.chooseSyncTitle,
  syncSubtitle: C.chooseSyncSubtitle,
  /** 3b — branche run in-app. */
  runTitle: C.chooseRunTitle,
  runSubtitle: C.chooseRunSubtitle,
} as const;

/**
 * 3a — Sync (démo) : positionnement §6 + l'import scénarisé. Pas de CTA dédié :
 * le tap sur une source LANCE l'import (une décision = un tap).
 */
export const SYNC = {
  kicker: C.syncKicker,
  title: C.syncTitle,
  tagline: C.syncTagline,
  /** Méta du run détecté (« 6,4 km · une boucle »). */
  loopMeta: C.syncLoopMeta,
  /** Pendant le déroulé. */
  running: C.syncRunning,
  /** Tag d'honnêteté sur le run détecté (import réel = O7/O8). */
  demoTag: C.syncDemoTag,
} as const;

/** 3b — Premier run : 1 tap, objectif ultra-simple, zéro config (§4b). */
export const RUN = {
  kicker: C.runKicker,
  title: C.runTitle,
  // Honnête (doc lignes droites §2 : les hexes traversés sont capturés) : même
  // tout droit tu prends les rues courues ; la boucle, elle, prend toute la zone.
  tagline: C.runTagline,
  /** L'objectif sous le hero (une seule règle, une phrase). */
  objective: C.runObjective,
  /** Le lancement de course — verbe RUN (charte : le seul « RUN », pas « GO »). */
  cta: C.runCta,
  /** Pendant le run démo. */
  running: C.runRunning,
} as const;

/** 4 — 1re capture, MOMENT SIGNATURE (§5) : le payoff. */
export const CAPTURE = {
  kicker: C.captureKicker,
  /** Titre du reveal — court, célébratif, jamais tronqué. */
  title: C.captureTitle,
  zonesLabel: C.captureZonesLabel,
  /**
   * Sous-ligne « dont {n} en boucle · autour de toi » — UNE Entry interpolée
   * (l'ordre des mots varie par langue). Localisation HONNÊTE : aucun GPS
   * encore → jamais un nom de lieu.
   */
  sub: C.captureSub,
  /** Actions proposées (jamais imposées). */
  share: C.captureShare,
  /** Verbe contextuel de la boucle Défends — jamais « Continuer » (§A4). */
  cta: C.captureCta,
} as const;

/** 5 — Création de compte APRÈS la valeur (§6). Jamais un mur en écran 1. */
export const ACCOUNT = {
  kicker: C.accountKicker,
  title: C.accountTitle,
  tagline: C.accountTagline,
  apple: C.accountApple,
  google: C.accountGoogle,
  /** Échec honnête : on reste sur l'écran (jamais un faux succès). */
  error: C.accountError,
  /** Différer reste possible (non bloquant). */
  skip: C.later,
} as const;

/** 6 — Crew : proposé APRÈS la 1re capture, jamais imposé (§7). Dernière étape. */
export const CREW = {
  kicker: C.crewKicker,
  title: C.crewTitle,
  tagline: C.crewTagline,
  join: C.crewJoin,
  create: C.crewCreate,
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
