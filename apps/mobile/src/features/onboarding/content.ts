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
import { defineCatalog } from '../../i18n/types';
import { C } from '../../i18n/catalog/onboarding';

/**
 * Ordre du flow. Le stepper (app/onboarding/index) rend l'étape courante.
 *
 * ─── UN SEUL PARCOURS (décision fondateur 21/07/2026 : « l'app ne ment jamais »)
 *   hook → age → city → learn → permission → account → crew
 * Aucune course n'est mise en scène, donc aucune capture n'est célébrée : le
 * joueur apprend LA RÈGLE sur un exemple ÉTIQUETÉ (learn), puis va la vérifier
 * en courant pour de vrai. Sa première capture est la vraie.
 *
 * Les étapes `choose` / `sync` / `run` / `capture` ont été SUPPRIMÉES avec le
 * mode vitrine. `sync` « détectait » un run de 6,4 km « ce matin » (import Apple
 * Health / Strava non branché — O7/O8) que personne n'avait couru, puis l'app le
 * CÉLÉBRAIT (+47 zones, haptique de succès). Tant qu'aucun import RÉEL n'existe,
 * ce chemin n'existe pas — pas même derrière un flag.
 */
export const ONBOARDING_STEPS = [
  'hook', // 1 — splash / accroche
  'age', // 1b — age-gate 16+ (Apple 5.1.1 / mineurs RGPD), avant toute collecte
  'city', // 2 — le terrain de jeu en plateau (exemple étiqueté, aucune localisation)
  'learn', // 2b — la règle expliquée sur un EXEMPLE
  'permission', // 3b — permission GPS (pédagogique), avant d'aller courir
  'account', // 5 — création de compte APRÈS la valeur
  'crew', // 6 — rejoindre / créer un crew, puis sortie du flow
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * n de l'event `onboarding_step` (§8) pour le funnel A-30. Les n sont des
 * IDENTIFIANTS STABLES d'étape (continuité PostHog), pas des positions : les n
 * 4/5/6/7 (choose/sync/run/capture) ne sont plus jamais émis depuis la
 * suppression de la vitrine — ils restent RÉSERVÉS, jamais réattribués, pour ne
 * pas mélanger deux populations dans le même entonnoir historique.
 */
export const STEP_EVENT_N: Record<OnboardingStep, number> = {
  hook: 1,
  age: 12, // gate 16+ — n identifiant (hors séquence historique du funnel)
  city: 2,
  learn: 13, // la règle sur un exemple — n identifiant dédié
  permission: 3,
  account: 9,
  crew: 10,
};

/**
 * Copy AJOUTÉE le 21/07/2026 (étape `learn` + compte sans conquête préalable).
 *
 * Ces Entries respectent la règle i18n (5 langues, parité forcée par le type)
 * mais vivent ici plutôt que dans `i18n/catalog/onboarding.ts` : ce lot est
 * produit en parallèle d'autres agents qui écrivent dans ce catalogue partagé.
 * TODO : les remonter dans le catalogue au prochain passage mono-agent (aucun
 * changement de texte à prévoir — copier/coller).
 */
const L = defineCatalog({
  // ─── 2b LA RÈGLE, SUR UN EXEMPLE (produit installé) ────────────────────────
  learnKicker: {
    fr: 'COMMENT ON PREND UNE ZONE',
    en: 'HOW A ZONE IS TAKEN',
    es: 'CÓMO SE TOMA UNA ZONA',
    de: 'SO NIMMST DU EINE ZONE',
    pt: 'COMO SE TOMA UMA ZONA',
  },
  learnTitle: {
    fr: 'Ferme une boucle : toute la zone bascule.',
    en: 'Close a loop: the whole zone flips.',
    es: 'Cierra un bucle: toda la zona cambia de manos.',
    de: 'Schließ eine Runde: Die ganze Zone kippt.',
    pt: 'Feche um circuito: a zona inteira vira.',
  },
  learnTagline: {
    fr: 'Tout droit, tu prends les rues. Boucle fermée, tu prends tout l’intérieur.',
    en: 'Straight ahead, you take the streets. Loop closed, you take everything inside.',
    es: 'En línea recta, tomas las calles. Bucle cerrado, tomas todo el interior.',
    de: 'Geradeaus nimmst du die Straßen. Runde geschlossen, gehört dir alles darin.',
    pt: 'Em linha reta, você toma as ruas. Circuito fechado, você toma tudo dentro.',
  },
  /**
   * Sous le visuel : dit noir sur blanc que ce tracé n'est PAS le sien. Aucun
   * chiffre n'est attribué au joueur tant qu'il n'a pas couru.
   */
  learnNote: {
    fr: 'Exemple animé de la règle. Tes zones à toi arrivent après ta première course.',
    en: 'An animated example of the rule. Your own zones come after your first run.',
    es: 'Ejemplo animado de la regla. Tus zonas llegan tras tu primera carrera.',
    de: 'Ein animiertes Beispiel der Regel. Deine eigenen Zonen kommen nach deinem ersten Lauf.',
    pt: 'Exemplo animado da regra. Suas zonas chegam depois da sua primeira corrida.',
  },
  learnCta: {
    fr: 'Prendre ma première zone',
    en: 'Take my first zone',
    es: 'Tomar mi primera zona',
    de: 'Meine erste Zone holen',
    pt: 'Tomar minha primeira zona',
  },

  // ─── 5 COMPTE — variante « rien n'a encore été conquis » ───────────────────
  // « Sauvegarde ta conquête » suppose une conquête. Dans le produit installé,
  // le joueur n'a encore rien pris : la copy le dit au futur, jamais au passé.
  accountKickerFirstRun: {
    fr: 'AVANT DE COURIR',
    en: 'BEFORE YOU RUN',
    es: 'ANTES DE CORRER',
    de: 'BEVOR DU LOSLÄUFST',
    pt: 'ANTES DE CORRER',
  },
  accountTitleFirstRun: {
    fr: 'Crée ton compte.',
    en: 'Create your account.',
    es: 'Crea tu cuenta.',
    de: 'Erstell dein Konto.',
    pt: 'Crie sua conta.',
  },
  accountTaglineFirstRun: {
    fr: 'Un compte, un tap. Les zones que tu prendras te suivront sur tous tes appareils.',
    en: 'One account, one tap. The zones you take will follow you on every device.',
    es: 'Una cuenta, un toque. Las zonas que tomes te seguirán en todos tus dispositivos.',
    de: 'Ein Konto, ein Tap. Die Zonen, die du holst, folgen dir auf allen Geräten.',
    pt: 'Uma conta, um toque. As zonas que você tomar seguem você em todos os aparelhos.',
  },
  /**
   * Variante quand un backend est configuré : la carte EXIGE une session. Le
   * dire ici, c'est éviter que le joueur tape « Plus tard » et se cogne à une
   * porte fermée deux écrans plus loin (le cul-de-sac corrigé le 21/07/2026).
   */
  accountTaglineRequired: {
    fr: 'Un compte, un tap. Il est nécessaire pour entrer sur la carte et garder tes zones.',
    en: 'One account, one tap. It’s required to enter the map and keep your zones.',
    es: 'Una cuenta, un toque. Es necesaria para entrar al mapa y conservar tus zonas.',
    de: 'Ein Konto, ein Tap. Nötig, um auf die Karte zu kommen und deine Zonen zu behalten.',
    pt: 'Uma conta, um toque. Ela é necessária para entrar no mapa e manter suas zonas.',
  },
  /** 3e voie : code reçu par e-mail (marche même sans Apple/Google — O2). */
  accountEmail: {
    fr: 'Continuer avec un e-mail',
    en: 'Continue with email',
    es: 'Continuar con un correo',
    de: 'Mit E-Mail fortfahren',
    pt: 'Continuar com e-mail',
  },
});

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
 * 2b — LA RÈGLE, SUR UN EXEMPLE (produit installé). Remplace le trio
 * `choose → sync|run → capture` : on ENSEIGNE le geste (la boucle prend la zone)
 * au lieu de mettre en scène une course que le joueur n'a pas faite. L'exemple
 * est ÉTIQUETÉ (chip « Exemple » sur le visuel + note sous le visuel), n'affiche
 * AUCUN chiffre attribué au joueur, et n'est jamais célébré (ni haptique de
 * succès, ni compteur héros, ni event de célébration).
 */
export const LEARN = {
  kicker: L.learnKicker,
  title: L.learnTitle,
  tagline: L.learnTagline,
  note: L.learnNote,
  /** Chip d'honnêteté posée SUR le visuel (même mot que la vitrine). */
  exampleTag: C.syncDemoTag,
  cta: L.learnCta,
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

/**
 * Les blocs CHOOSE / SYNC / RUN / CAPTURE ont été retirés avec les étapes qu'ils
 * habillaient (vitrine). Leurs Entries restent dans `i18n/catalog/onboarding.ts`
 * — un agent de nettoyage tranchera leur sort quand on saura qu'aucun autre
 * écran ne les lit.
 */

/** 5 — Création de compte APRÈS la valeur (§6). */
export const ACCOUNT = {
  /**
   * Rien n'a encore été conquis, donc on ne demande pas de « sauvegarder sa
   * conquête » : la copy parle au FUTUR. (Les variantes au passé `accountKicker`
   * / `accountTitle` / `accountTagline` du catalogue ne sont plus lues — elles
   * n'avaient de sens que sur la capture mise en scène de la vitrine.)
   */
  kickerFirstRun: L.accountKickerFirstRun,
  titleFirstRun: L.accountTitleFirstRun,
  taglineFirstRun: L.accountTaglineFirstRun,
  /** Backend configuré : la carte exige une session — on le DIT (21/07/2026). */
  taglineRequired: L.accountTaglineRequired,
  apple: C.accountApple,
  google: C.accountGoogle,
  /** 3e voie réelle (code OTP e-mail) — sortie vers (auth)/sign-in. */
  email: L.accountEmail,
  /** Échec honnête : on reste sur l'écran (jamais un faux succès). */
  error: C.accountError,
  /**
   * Différer — proposé UNIQUEMENT quand aucune garde d'auth n'attend en aval
   * (Supabase non configuré). Avec backend, ce lien menait à /sign-in sans
   * sortie : la promesse était fausse, elle a été retirée plutôt que répétée.
   */
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
