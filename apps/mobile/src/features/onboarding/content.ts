/**
 * GRYD — contenu des étapes de l'onboarding SANS FRICTION (AMENDEMENT-30 §1/§7).
 * Copy CENTRALISÉE (l'écran reste du rendu) : titres géants courts, sous-titres,
 * CTA à VERBES CONTEXTUELS (jamais « GO »/« Continuer » — §A4). Principe :
 * « aucun écran ne demande avant d'avoir donné » — la permission GPS ne vit QUE
 * dans la branche « run » (juste avant de lancer le run), le compte et le crew
 * viennent APRÈS la 1re capture, et les notifications sont HORS onboarding
 * (opt-in au 1er contexte utile). Zéro nom de lieu tant qu'aucun GPS n'est
 * obtenu (plateau démo = « le terrain de jeu », jamais « ton quartier »).
 * Aucune valeur de jeu ici, juste des chaînes FR.
 */

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

// ─── Copy par étape ──────────────────────────────────────────────────────────

/** 1 — Splash / hook : 1 phrase, pas de carrousel (§1). */
export const HOOK = {
  brand: 'GRYD',
  title: 'Prends ta ville.',
  tagline: 'Cours. Capture. Défends. Le jeu de conquête pour run clubs.',
  cta: 'Découvrir ma ville',
} as const;

/**
 * 1b — Age-gate 16+ (Apple Guideline 5.1.1 / protection des mineurs RGPD). Vient
 * APRÈS le splash mais AVANT toute collecte (GPS, compte). Auto-déclaration : un
 * choix clair « 16+ » (CTA) vs « moins de 16 » (lien → écran de blocage terminal).
 */
export const AGE = {
  kicker: 'AVANT DE COMMENCER',
  title: 'Tu as 16 ans ou plus ?',
  tagline:
    'GRYD utilise ta position et se joue en communauté. L’âge minimum est 16 ans.',
  confirm: 'Oui, j’ai 16 ans ou plus',
  under: 'J’ai moins de 16 ans',
  /** Écran de blocage si &lt; 16 (pas de chemin vers l'avant). */
  blockedTitle: 'Reviens à 16 ans.',
  blockedTagline:
    'GRYD n’est pas accessible avant 16 ans. On garde ta ville au chaud pour toi.',
} as const;

/**
 * 2 — Le terrain de jeu : plateau DÉMO, valeur < 60 s (§2). Copy HONNÊTE :
 * aucune localisation n'est encore obtenue → jamais « ton quartier », jamais un
 * nom de lieu. Les deux couleurs sont nommées en toutes lettres (l'info n'est
 * jamais portée par la seule couleur).
 */
export const CITY = {
  kicker: 'LA VILLE · MAINTENANT',
  title: 'Voilà le terrain de jeu. À prendre.',
  // Retour terrain 20/07 : la légende nomme les 3 ÉTATS DE ZONE que le plateau
  // montre (§C) — comprendre prise / contestée / au rival AVANT la vraie carte.
  tagline:
    'Chaque zone se gagne en courant. Chartreuse = à toi, violet = contestée, orange = à un crew rival.',
  cta: 'Prendre ce terrain',
} as const;

/**
 * 3b — Permission GPS PÉDAGOGIQUE, UNIQUEMENT dans la branche « run » (juste
 * avant Lancer le run — la branche « sync » ne la voit jamais). On EXPLIQUE
 * avant la demande système. Web preview : demande simulée, aucune API système.
 */
export const PERMISSION = {
  kicker: 'UNE SEULE CHOSE',
  title: 'Le GPS dessine ton territoire.',
  tagline:
    'GRYD suit ta trace pendant la course pour transformer tes rues en zones. Rien n’est partagé en direct.',
  // Verbe d'ACCORD honnête (jamais « GO » §A4) : ce tap n'ouvre AUCUNE boîte
  // système ici — il consent à l'usage du GPS et mène au run, où la vraie
  // demande expo-location arrive. « Activer le GPS » promettait une activation
  // immédiate qui n'a pas lieu → « Utiliser le GPS » (consentement à l'usage).
  cta: 'Utiliser le GPS',
  /** Sortie douce : on n'impose rien (la vraie demande revient au 1er run réel). */
  skip: 'Plus tard',
} as const;

/** 3 — Choix du chemin : 2 options claires (§4). Verbes, pas « GO ». */
export const CHOOSE = {
  kicker: 'DEUX FAÇONS DE COMMENCER',
  title: 'On capture ta première zone ?',
  tagline: 'Choisis ton point de départ — les deux mènent à ta première capture.',
  /** 3a — branche sync. */
  syncTitle: 'J’ai déjà des runs',
  syncSubtitle: 'Apple Health, Strava — on transforme ta dernière course.',
  /** 3b — branche run in-app. */
  runTitle: 'Je vais courir',
  runSubtitle: 'Un run tout simple, zéro réglage. Ferme une boucle.',
} as const;

/**
 * 3a — Sync (démo) : positionnement §6 + l'import scénarisé. Pas de CTA dédié :
 * le tap sur une source LANCE l'import (une décision = un tap).
 */
export const SYNC = {
  kicker: 'CAPTURE DEPUIS TES RUNS',
  title: 'Ta course devient une conquête.',
  tagline:
    'Cours comme tu veux — Apple Watch, Garmin, Strava. GRYD fait le reste. Choisis une source :',
  /** Méta du run détecté (« 6,4 km · une boucle »). */
  loopMeta: 'une boucle',
  /** Pendant le déroulé. */
  running: 'Import en cours',
} as const;

/** 3b — Premier run : 1 tap, objectif ultra-simple, zéro config (§4b). */
export const RUN = {
  kicker: 'TON PREMIER RUN',
  title: 'Un objectif. Ferme une boucle.',
  // Honnête (doc lignes droites §2 : les hexes traversés sont capturés) : même
  // tout droit tu prends les rues courues ; la boucle, elle, prend toute la zone.
  tagline: 'Cours tout droit : tu prends les rues. Ferme la boucle : toute la zone est à toi.',
  /** L'objectif sous le hero (une seule règle, une phrase). */
  objective: 'Ferme une boucle. La zone est à toi.',
  /** Le lancement de course — verbe RUN (charte : le seul « RUN », pas « GO »). */
  cta: 'Lancer le run',
  /** Pendant le run démo. */
  running: 'Run en cours',
} as const;

/** 4 — 1re capture, MOMENT SIGNATURE (§5) : le payoff. */
export const CAPTURE = {
  kicker: 'PREMIÈRE CAPTURE',
  /** Titre du reveal — court, célébratif, jamais tronqué. */
  title: 'Première zone prise.',
  zonesLabel: 'zones capturées',
  loopLabel: 'en boucle',
  /** Localisation HONNÊTE : aucun GPS encore → jamais un nom de lieu. */
  nearLabel: 'autour de toi',
  /** Actions proposées (jamais imposées). */
  share: 'Partager',
  /** Verbe contextuel de la boucle Défends — jamais « Continuer » (§A4). */
  cta: 'Défendre ma zone',
} as const;

/** 5 — Création de compte APRÈS la valeur (§6). Jamais un mur en écran 1. */
export const ACCOUNT = {
  kicker: 'GARDE TES ZONES',
  title: 'Sauvegarde ta conquête.',
  tagline: 'Un compte, un tap. Tes zones te suivent sur tous tes appareils.',
  apple: 'Se connecter avec Apple',
  google: 'Se connecter avec Google',
  /** Différer reste possible (non bloquant). */
  skip: 'Plus tard',
} as const;

/** 6 — Crew : proposé APRÈS la 1re capture, jamais imposé (§7). Dernière étape. */
export const CREW = {
  kicker: 'TU N’ES PAS SEUL',
  title: 'Rejoins un crew. Prends la ville.',
  tagline: 'Seul tu prends des rues. En crew, tu tiens le quartier. Rien n’est bloqué.',
  join: 'Rejoindre un crew proche',
  create: 'Créer mon crew',
  skip: 'Plus tard',
} as const;

/**
 * Notifications — HORS onboarding : l'opt-in se fait au 1er contexte utile
 * (push contextuel §35), plus jamais dans le stepper. Copy conservée pour cet
 * écran contextuel à venir.
 */
export const NOTIFICATIONS = {
  kicker: 'RESTE DANS LA PARTIE',
  title: 'Sois prévenu quand on t’attaque.',
  tagline: 'Une alerte quand ton territoire est menacé, quand ton crew a besoin de toi. Rien d’autre.',
  cta: 'Activer les alertes',
  skip: 'Plus tard',
} as const;
