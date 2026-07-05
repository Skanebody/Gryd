/**
 * GRYD — Live Run GUIDÉ (AMENDEMENT-18 PARTIE C §C.3) : le système d'indications
 * à 3 NIVEAUX qui guide sans distraire dangereusement.
 *
 *   « Vois le territoire. Suis la route. Ferme la boucle. Prends la zone. »
 *
 * PRINCIPE (fait foi) : guider sans distraire. JAMAIS de modale bloquante
 * pendant l'effort ; indications RARES, COURTES, utiles + signal visuel +
 * haptique. Décisions complexes AVANT/APRÈS, jamais pendant.
 *
 *   - N1 info douce  : toast discret + vibration LÉGÈRE, disparaît vite.
 *                      « Boucle possible » · « Route ouverte ».
 *   - N2 action      : card courte en BAS + vibration MOYENNE, reste tant que
 *                      l'action est pertinente. « Presque fermé · 180 m » ·
 *                      « Il reste 300 m ».
 *   - N3 événement   : mini-anim 2 s + haptique FORTE mais COURTE, ne masque
 *                      jamais la route longtemps. « ZONE CONQUISE · +18 » ·
 *                      « Canal repoussé · +12 » · « Zone défendue · +48 h » ·
 *                      « BOUCLE FERMÉE ».
 *
 * La simulation DÉMO joue ces événements dans l'ordre LOGIQUE (boucle possible →
 * presque fermé → fermée → zone conquise), scriptés par TICK — comme les toasts
 * de liveNav.ts. Purement présentation : AUCUNE règle de jeu ici, aucune
 * attribution client — le serveur (ingest_run) reste seul décideur, tout est
 * « estimé ». Copy courte NON tronquée (Partie D), vocabulaire zones/frontières.
 */
import { colors, type IconName } from '@klaim/shared';
import { SIM_SECONDS_PER_TICK, type LiveRunMode } from './simulation';

// ─── Niveaux d'indication (AMENDEMENT-18 §C.3) ───────────────────────────────

/**
 * Les 3 niveaux d'intensité d'une indication live. Le niveau décide de la façon
 * dont l'UI la présente (toast discret / card basse / mini-anim) ET de l'haptique.
 */
export type IndicationLevel = 'n1' | 'n2' | 'n3';

/** Grammaire haptique par niveau (doc §25 — heavy réservé aux N3 événements). */
export const INDICATION_HAPTIC: Record<IndicationLevel, 'light' | 'medium' | 'heavy'> = {
  n1: 'light',
  n2: 'medium',
  n3: 'heavy',
};

/** Une indication scriptée jouée à un tick donné de la simulation. */
export interface LiveIndication {
  level: IndicationLevel;
  /** Texte COURT, non tronqué (Partie D) — verbe/état utile, jamais un roman. */
  text: string;
  /** Sous-texte optionnel (N3 : « +18 zones ») — reste court. */
  sub?: string;
  icon: IconName;
  /** Teinte fonctionnelle (tokens) — la couleur lit l'état de jeu. */
  tint: string;
}

/** Une indication + le tick où la simulation la déclenche. */
export interface ScriptedIndication extends LiveIndication {
  tick: number;
}

// ─── Timeline scriptée par mode (l'ordre LOGIQUE du guidage) ─────────────────
// Les ticks sont calés sur le scénario démo (96 ticks, cf. simulation.ts) et sur
// les fenêtres d'événements existantes (contesté 46-53, run groupé 62-66). En
// conquête : boucle possible (N1) → il reste 300 m (N2) → presque fermé (N2) →
// BOUCLE FERMÉE + ZONE CONQUISE (N3). La fermeture réelle (loop.closeTick) reste
// pilotée par course-live.tsx (burst existant) ; ici on POSE le chemin qui y mène.

/** Écart minimal entre deux indications (ticks) — anti-bruit, comme les toasts. */
export const INDICATION_MIN_GAP_TICKS = 5;

/** Scénario CONQUÊTE (ordre : possible → presque → fermée → conquise). */
const CONQUEST_TIMELINE: readonly ScriptedIndication[] = [
  {
    tick: 12,
    level: 'n1',
    text: 'Route ouverte',
    icon: 'route',
    tint: colors.blanc,
  },
  {
    tick: 40,
    level: 'n1',
    text: 'Boucle possible',
    icon: 'route',
    tint: colors.chartreuse,
  },
  {
    tick: 58,
    level: 'n2',
    text: 'Il reste 300 m',
    icon: 'cible',
    tint: colors.chartreuse,
  },
  {
    tick: 70,
    level: 'n2',
    text: 'Presque fermé · 180 m',
    icon: 'route',
    tint: colors.chartreuse,
  },
  // La fermeture N3 (« BOUCLE FERMÉE » + « ZONE CONQUISE · +N ») est déclenchée
  // par course-live.tsx au loop.closeTick réel (déterministe) — pas ici, pour
  // que le +N zones reste synchronisé avec le moteur (jamais un nombre en dur).
];

/** Scénario DÉFENSE (frontière couverte → secteur repoussé → zone défendue). */
const DEFENSE_TIMELINE: readonly ScriptedIndication[] = [
  {
    tick: 12,
    level: 'n1',
    text: 'Route ouverte',
    icon: 'route',
    tint: colors.blanc,
  },
  {
    tick: 36,
    level: 'n1',
    text: 'Frontière à portée',
    icon: 'bouclier',
    tint: colors.chartreuse,
  },
  {
    // Aligné sur la fenêtre « contesté » (46-53) : le rival pousse, on repousse.
    tick: 54,
    level: 'n3',
    text: 'Canal repoussé',
    sub: '+12 zones tenues',
    icon: 'bouclier',
    tint: colors.chartreuse,
  },
  {
    tick: 72,
    level: 'n2',
    text: 'Il reste 300 m',
    icon: 'bouclier',
    tint: colors.chartreuse,
  },
  {
    tick: 88,
    level: 'n3',
    text: 'Zone défendue',
    sub: '+48 h de tenue',
    icon: 'bouclier',
    tint: colors.chartreuse,
  },
];

/** Scénario TERMINER une frontière crew (route → connexion → boucle crew fermée). */
const COMPLETE_TIMELINE: readonly ScriptedIndication[] = [
  {
    tick: 12,
    level: 'n1',
    text: 'Route ouverte',
    icon: 'route',
    tint: colors.blanc,
  },
  {
    tick: 44,
    level: 'n1',
    text: 'Connexion en vue',
    icon: 'route',
    tint: colors.chartreuse,
  },
  {
    tick: 64,
    level: 'n2',
    text: 'Il reste 300 m',
    icon: 'route',
    tint: colors.chartreuse,
  },
  {
    tick: 78,
    level: 'n2',
    text: 'Presque connecté · 180 m',
    icon: 'route',
    tint: colors.chartreuse,
  },
  // BOUCLE FERMÉE (crew) reste piloté par course-live.tsx au loop.closeTick.
];

/**
 * Timeline scriptée du run selon le CONTEXTE (conquête / défense / terminer /
 * libre). Le run libre (`social_run`/`course_privee`, sans intention) reste
 * silencieux côté indications de jeu (stats only) — on ne guide pas une capture
 * qui n'existe pas. Retourne une map tick → indication, écarts garantis.
 */
export function buildIndicationScript(context: {
  mode: LiveRunMode;
  completing: boolean;
  intention: 'conquest' | 'defense' | null;
}): ReadonlyMap<number, LiveIndication> {
  const source = pickTimeline(context);
  const out = new Map<number, LiveIndication>();
  let lastTick = -INDICATION_MIN_GAP_TICKS;
  for (const ind of source) {
    // Respecte l'écart minimal (déterministe : la timeline est déjà espacée).
    const tick = Math.max(ind.tick, lastTick + INDICATION_MIN_GAP_TICKS);
    lastTick = tick;
    const { tick: _drop, ...rest } = ind;
    out.set(tick, rest);
  }
  return out;
}

function pickTimeline(context: {
  mode: LiveRunMode;
  completing: boolean;
  intention: 'conquest' | 'defense' | null;
}): readonly ScriptedIndication[] {
  if (context.completing) return COMPLETE_TIMELINE;
  if (context.intention === 'defense') return DEFENSE_TIMELINE;
  if (context.mode === 'conquete') return CONQUEST_TIMELINE;
  // Run libre / social / privé sans intention : aucune indication de jeu.
  return [];
}

// ─── N2 — Card live BASSE selon le mode (AMENDEMENT-18 §C.2) ──────────────────
// « Cartes live basses selon mode » : un résumé PERMANENT de l'objectif en cours,
// distinct des indications ÉVÉNEMENTIELLES ci-dessus. Une card = 3 infos max
// (Partie D). Vit en bas de l'écran, au-dessus des contrôles, dans les 2 vues.

export interface LiveCard {
  /** Étiquette courte de l'objectif (« BOUCLE EN COURS », « DÉFENSE »). */
  kicker: string;
  /** Valeur forte lisible d'un coup d'œil (« 78 % · 280 m »). */
  value: string;
  /** Complément court optionnel (« 2 rues sauvées »). */
  detail?: string;
  icon: IconName;
  /** Progression 0-1 pour la barre (absente → pas de barre). */
  progress?: number;
}

/** Arrondi 10 m des distances lisibles (même règle que la lecture nav). */
const CARD_ROUND_M = 10;
function roundM(m: number): number {
  return Math.max(CARD_ROUND_M, Math.round(m / CARD_ROUND_M) * CARD_ROUND_M);
}

/**
 * Card live basse du mode « Boucle en cours » (conquête) :
 * « BOUCLE EN COURS · 78 % · 280 m » + barre. Fermée → « BOUCLE FERMÉE · +N ».
 */
export function loopLiveCard(input: {
  closed: boolean;
  pct: number;
  distToCloseM: number;
  enclosedZones: number;
}): LiveCard {
  if (input.closed) {
    return {
      kicker: 'BOUCLE FERMÉE',
      value: `+${input.enclosedZones} zones`,
      icon: 'carte',
      progress: 1,
    };
  }
  return {
    kicker: 'BOUCLE EN COURS',
    value: `${input.pct} % · ${roundM(input.distToCloseM)} m`,
    detail: 'Ferme la boucle',
    icon: 'route',
    progress: Math.max(0, Math.min(1, input.pct / 100)),
  };
}

/** Card live basse « Défense » : « DÉFENSE · 64 % couverte · 2 sauvées ». */
export function defenseLiveCard(input: {
  zone: string;
  coveredPct: number;
  streetsSaved: number;
}): LiveCard {
  return {
    kicker: `DÉFENSE ${input.zone.toUpperCase()}`,
    value: `${input.coveredPct} % couverte`,
    detail: `${input.streetsSaved} rues sauvées`,
    icon: 'bouclier',
    progress: Math.max(0, Math.min(1, input.coveredPct / 100)),
  };
}

/** Card live basse « Terminer » : « TERMINER · 420 m · connexion 2 rues ». */
export function completeLiveCard(input: {
  zone: string;
  remainingM: number;
  coveredPct: number;
}): LiveCard {
  return {
    kicker: `TERMINER ${input.zone.toUpperCase()}`,
    value: `${roundM(input.remainingM)} m`,
    detail: 'Connexion 2 rues',
    icon: 'route',
    progress: Math.max(0, Math.min(1, input.coveredPct / 100)),
  };
}

/** Card live basse « Run libre » : « RUN LIBRE · 1 route ouverte · boucle possible ». */
export function freeRunLiveCard(input: { loopPossible: boolean }): LiveCard {
  return {
    kicker: 'RUN LIBRE',
    value: '1 route ouverte',
    detail: input.loopPossible ? 'Boucle possible' : 'GRYD analyse ton tracé',
    icon: 'route',
  };
}

// ─── QUICK PINGS (AMENDEMENT-18 §C.4) — pas de clavier en courant ─────────────
// Un petit menu de pings PRÉDÉFINIS pour parler au crew sans taper. Démo : le
// ping déclenche un toast + haptic (aucun réseau — le vrai envoi crew est V1).
// Copy courte non tronquée (Partie D). Actionnables au pouce, une main.

export interface QuickPing {
  id: string;
  /** Libellé COURT du bouton (jamais tronqué). */
  label: string;
  /** Confirmation affichée après l'envoi (« Ping envoyé · Je prends le nord »). */
  sent: string;
  icon: IconName;
}

/** Les 5 pings prédéfinis (doc §C.4). Ordre = fréquence d'usage attendue. */
export const QUICK_PINGS: readonly QuickPing[] = [
  { id: 'north', label: 'Je prends le nord', sent: 'Je prends le nord', icon: 'cible' },
  { id: 'finish', label: 'Je termine', sent: 'Je termine', icon: 'route' },
  { id: 'help', label: "Besoin d'aide", sent: "Besoin d'aide", icon: 'alerte' },
  { id: 'covered', label: 'Zone couverte', sent: 'Zone couverte', icon: 'bouclier' },
  { id: 'out', label: 'Je suis out', sent: 'Je suis out', icon: 'fermer' },
];

// ─── Formatage temps d'indication (journal) ──────────────────────────────────

/** Seconde simulée d'un tick d'indication (pour un éventuel journal). */
export function indicationAtS(tick: number): number {
  return (tick + 1) * SIM_SECONDS_PER_TICK;
}
