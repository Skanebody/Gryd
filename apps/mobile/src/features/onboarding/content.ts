/**
 * GRYD — contenu des 8 étapes de l'onboarding SANS FRICTION (AMENDEMENT-30 §1/§7).
 * Copy CENTRALISÉE (l'écran reste du rendu) : titres géants courts, sous-titres,
 * CTA à VERBES CONTEXTUELS (jamais « GO » — §A4). Principe : « aucun écran ne
 * demande avant d'avoir donné » — permission/compte/crew/notifs viennent APRÈS
 * la valeur. Aucune valeur de jeu ici, juste des chaînes FR.
 */

/**
 * Ordre du flow (§7). Le stepper (app/onboarding/index) rend l'étape courante.
 * `choose` bifurque vers `sync` OU `run` (4a/4b) ; les deux rejoignent `capture`
 * (5, le payoff), puis compte (6), crew (7), notifs (8).
 */
export const ONBOARDING_STEPS = [
  'hook', // 1 — splash / accroche
  'city', // 2 — ta ville en plateau de jeu
  'permission', // 3 — permission GPS pédagogique
  'choose', // 4 — choix du chemin (sync / run)
  'sync', // 4a — import démo (branche « J'ai déjà des runs »)
  'run', // 4b — premier run 1 tap (branche « Je vais courir »)
  'capture', // 5 — 1re capture, moment signature
  'invite', // 5b — amène ton crew (seeding densité, APRÈS la valeur — AMENDEMENT-31 §1)
  'account', // 6 — création de compte APRÈS la valeur
  'crew', // 7 — rejoindre / créer un crew
  'notifications', // 8 — opt-in notifs cadré
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * n de l'event `onboarding_step` (§8) pour le funnel A-30. Numérotation dédiée
 * (1..10) qui suit l'ORDRE du flow sans friction — distincte de l'ancien mapping
 * motivationnel. Les branches 4a/4b partagent l'esprit « étape 4 » mais gardent
 * un n propre pour mesurer sync vs run (§4 : « choix sync vs run »).
 */
export const STEP_EVENT_N: Record<OnboardingStep, number> = {
  hook: 1,
  city: 2,
  permission: 3,
  choose: 4,
  sync: 5,
  run: 6,
  capture: 7, // activation = 1re capture (métrique nord, §4)
  invite: 8, // seeding densité — le moat crew, mesuré juste après l'activation
  account: 9,
  crew: 10,
  notifications: 11,
};

// ─── Copy par étape ──────────────────────────────────────────────────────────

/** 1 — Splash / hook : 1 phrase, pas de carrousel (§1). */
export const HOOK = {
  brand: 'GRYD',
  title: 'Prends ta ville.',
  tagline: 'Cours. Capture. Défends. Le jeu de conquête pour run clubs.',
  cta: 'Découvrir ma ville',
} as const;

/** 2 — Ta ville maintenant : le quartier réel en plateau, valeur < 60 s (§2). */
export const CITY = {
  kicker: 'TA VILLE · MAINTENANT',
  title: 'Voilà ton quartier. À prendre.',
  tagline:
    'Chaque zone se gagne en courant. Le chartreuse, c’est toi. L’orange, un crew rival déjà là.',
  cta: 'Je veux ce terrain',
} as const;

/**
 * 3 — Permission GPS PÉDAGOGIQUE : on EXPLIQUE avant la demande système (§3).
 * Web preview : la demande est simulée (bouton démo), aucune API système.
 */
export const PERMISSION = {
  kicker: 'UNE SEULE CHOSE',
  title: 'Le GPS dessine ton territoire.',
  tagline:
    'GRYD suit ta trace pendant la course pour transformer tes rues en zones. Rien n’est partagé en direct.',
  /** Verbe d'ACCORD, jamais « GO » (§A4). */
  cta: 'Activer le GPS',
  /** Sortie douce : on n'impose rien (mais on a déjà donné la valeur en 2). */
  skip: 'Plus tard',
} as const;

/** 4 — Choix du chemin : 2 options claires (§4). Verbes, pas « GO ». */
export const CHOOSE = {
  kicker: 'DEUX FAÇONS DE COMMENCER',
  title: 'On capture ta première zone ?',
  tagline: 'Choisis ton point de départ — les deux mènent à ta première capture.',
  /** 4a — branche sync. */
  syncTitle: 'J’ai déjà des runs',
  syncSubtitle: 'Apple Health, Strava — on transforme ta dernière course.',
  /** 4b — branche run in-app. */
  runTitle: 'Je vais courir',
  runSubtitle: 'Un run tout simple, zéro réglage. Ferme une boucle.',
} as const;

/** 4a — Sync (démo) : positionnement §6 + l'import scénarisé. */
export const SYNC = {
  kicker: 'CAPTURE DEPUIS TES RUNS',
  title: 'Ta course devient une conquête.',
  tagline:
    'Cours comme tu veux — Apple Watch, Garmin, Strava. GRYD fait le reste. Choisis une source :',
  /** Lancement de l'import (verbe d'action, pas « GO »). */
  cta: 'Transformer ma course',
  /** Pendant/après le déroulé. */
  running: 'Import en cours',
} as const;

/** 4b — Premier run : 1 tap, objectif ultra-simple, zéro config (§4b). */
export const RUN = {
  kicker: 'TON PREMIER RUN',
  title: 'Un objectif. Ferme une boucle.',
  tagline: 'Pas de réglages, pas de plan. Tu pars, tu reviens, la zone est à toi.',
  /** Le lancement de course — verbe RUN (charte : le seul « RUN », pas « GO »). */
  cta: 'Lancer le run',
  /** Pendant le run démo. */
  running: 'Run en cours',
} as const;

/** 5 — 1re capture, MOMENT SIGNATURE (§5) : le payoff. */
export const CAPTURE = {
  kicker: 'PREMIÈRE CAPTURE',
  /** Titre du reveal — court, célébratif, jamais tronqué. */
  title: 'Première zone prise.',
  zonesLabel: 'zones capturées',
  loopLabel: 'en boucle',
  /** Actions proposées (jamais imposées). */
  share: 'Partager',
  cta: 'Continuer',
} as const;

/**
 * 5b — AMÈNE TON CREW : seeding densité, APRÈS la 1re capture (AMENDEMENT-31 §1
 * [P0], teardown Strava §2). Le moat DENSITÉ : un crew = rétention + clustering
 * géo. Jamais imposé (§7 : après la valeur — le joueur a déjà pris sa 1re zone).
 * Le lien est CÂBLÉ DÉMO (build via crew/invite ; deep link réel = prod). Copy
 * orientée « prends le quartier à plusieurs », jamais une promesse d'avantage
 * (anti pay-to-win : inviter amène des joueurs, pas du territoire).
 */
export const INVITE = {
  kicker: 'AMÈNE TON CREW',
  /** Titre court, non tronqué — la promesse densité en une phrase. */
  title: 'Prends le quartier à plusieurs.',
  tagline:
    'Seul tu prends des rues. À trois, vous tenez le quartier. Envoie ton lien, courez du même côté.',
  /** Étiquette au-dessus du lien de partage démo. */
  linkLabel: 'TON LIEN D’INVITE',
  /** Objectif doux (jamais un quota bloquant) — « invite 3 potes ». */
  goal: 'Invite 3 potes pour verrouiller ton quartier.',
  /** CTA primaire (verbe contextuel — jamais « GO »). */
  cta: 'Partager mon lien',
  /** Action secondaire : copier le lien (icône + libellé). */
  copy: 'Copier le lien',
  /** Feedbacks courts (toast) — jamais bloquants. */
  copied: 'Lien copié',
  shared: 'Lien prêt à envoyer',
  /** Sortie douce — on n'impose jamais (la valeur est déjà donnée). */
  skip: 'Plus tard',
} as const;

/** 6 — Création de compte APRÈS la valeur (§6). Jamais un mur en écran 1. */
export const ACCOUNT = {
  kicker: 'GARDE TES ZONES',
  title: 'Sauvegarde ta conquête.',
  tagline: 'Un compte, un tap. Tes zones te suivent sur tous tes appareils.',
  apple: 'Continuer avec Apple',
  google: 'Continuer avec Google',
  /** Différer reste possible (non bloquant). */
  skip: 'Plus tard',
} as const;

/** 7 — Crew : proposé APRÈS la 1re capture, jamais imposé (§7). */
export const CREW = {
  kicker: 'TU N’ES PAS SEUL',
  title: 'Rejoins un crew. Prends la ville.',
  tagline: 'Seul tu prends des rues. En crew, tu tiens le quartier. Rien n’est bloqué.',
  join: 'Rejoindre un crew proche',
  create: 'Créer mon crew',
  skip: 'Plus tard',
} as const;

/** 8 — Notifications : opt-in cadré, APRÈS la valeur (§8). */
export const NOTIFICATIONS = {
  kicker: 'RESTE DANS LA PARTIE',
  title: 'Sois prévenu quand on t’attaque.',
  tagline: 'Une alerte quand ton territoire est menacé, quand ton crew a besoin de toi. Rien d’autre.',
  cta: 'Activer les alertes',
  skip: 'Plus tard',
} as const;
