/**
 * GRYD — DONNÉES DE PARTAGE de la course affichée (zéro-friction, partage VRAI).
 *
 * L'écran Résultat ARME ici les stats de LA course affichée (mêmes valeurs que
 * son KPI : zones, zone, boucle, distance/allure/durée, points) juste avant de
 * naviguer vers /partage ; PartageScreen les LIT pour alimenter les templates.
 * Singleton module (même pattern que run/runResult.ts) — lecture seule
 * d'affichage, rien ne part au serveur.
 *
 * Si /partage s'ouvre SANS course armée (deep link, widget, tap depuis la
 * Carte), il n'affiche AUCUNE carte : un état vide qui dit la vérité. Il n'y a
 * plus de « mode exemple » — voir l'en-tête de app/partage.tsx.
 */
import { DEFAULT_ACTIVITY } from '@klaim/shared';
import type { RunIntention } from '../run/intention';
import type { LiveRunMode } from '../run/simulation';
import type { NarrativeVerdict } from './narrative';
import type { ShareDemoData } from './templates';

export interface ShareRunData {
  /** Valeurs projetées dans les cards — celles de l'écran Résultat. */
  card: ShareDemoData;
  /** Intention client (teinte le TITRE de l'écran — jamais l'histoire ni l'attribution). */
  intention: RunIntention | null;
  /** Mode de la course (social_run = stats seules, aucune capture à montrer). */
  mode: LiveRunMode;
  /**
   * VERDICT SERVEUR de la course, tel que le Résultat l'a lu. C'est LUI qui
   * décide le récit (features/share/narrative.ts), pas l'intention du joueur.
   *
   * ─── LE BUG QUE CE CHAMP FERME ────────────────────────────────────────────
   * /partage choisissait son style sur `intention` : une course lancée en mode
   * conquête ouvrait donc la card héros « J'AI PRIS {ZONE} · +0 · PRENDS-LA-MOI »
   * même quand le serveur n'avait rien attribué — et cette card EST la cible
   * exacte de l'export PNG. Le garde qui existait ne protégeait que le TEXTE du
   * message, pas l'image. Ici, sans prise jugée, les styles qui affirment une
   * conquête ne sont même pas proposés.
   */
  verdict: NarrativeVerdict;
}

let current: ShareRunData | null = null;

/** Arme les données de partage (appelé par le Résultat avant router.push). */
export function setShareRun(data: ShareRunData | null): void {
  current = data;
}

/** Données de la course affichée, ou null (aucune course → exemple). */
export function getShareRun(): ShareRunData | null {
  return current;
}

/**
 * Socle NEUTRE d'une card de partage : que des valeurs « on ne sait pas ».
 *
 * ─── LA CAUSE, PAS LE SYMPTÔME (21/07/2026) ─────────────────────────────────
 * Ce socle était `shareDemo()` — le scénario KORO / LES FOULÉES 9³ / République
 * / 4,4 km / 5'12 / #8 Paris Est / boucle République / verified: true. Tout
 * champ qu'un appelant OUBLIAIT de fournir était donc silencieusement rempli
 * par les données d'un personnage de démonstration, puis exporté en PNG sous le
 * nom du joueur. Un oubli d'appelant ne doit pas pouvoir produire un mensonge :
 * ce qui n'est pas fourni est désormais VIDE, et les templates savent taire une
 * valeur vide (nom, crest, stats, rang, état « avant »).
 *
 * `verified: false` par défaut est délibéré : « GRYD VERIFIED » est une
 * affirmation du SERVEUR — jamais un défaut de rendu.
 */
const NEUTRAL_SHARE_CARD: ShareDemoData = {
  /**
   * DISCIPLINE (26/07/2026) : `DEFAULT_ACTIVITY` ('run', game-rules) n'est PAS
   * un repli de commodité — c'est la discipline DÉCLARÉE du jeu, donc exactement
   * le comportement d'avant le vélo pour tout appelant qui n'a rien à en dire.
   * Ce défaut n'est jamais la source réelle : /partage écrase ce champ avec la
   * discipline que le Résultat lui transmet (`START_ACTIVITY_PARAM`) avant de
   * construire la moindre carte. Voir app/partage.tsx.
   */
  activity: DEFAULT_ACTIVITY,
  playerName: '',
  crewName: '',
  zoneName: '',
  zonesGained: 0,
  loopBonusZones: 0,
  zonesDefended: 0,
  holdHours: 0,
  crewPoints: 0,
  distanceKm: '',
  paceLabel: '',
  clockLabel: '',
  trace: [],
  verified: false,
  rankLabel: null,
  rankZone: null,
  rankDelta: null,
  beforeState: null,
};

/**
 * Card de partage depuis les stats du Résultat. Les champs non fournis restent
 * VIDES (voir NEUTRAL_SHARE_CARD) — jamais empruntés à un scénario de démo.
 * TODO(O1) : en prod tout vient d'IngestRunResponse (le serveur reste seul juge).
 */
export function shareCardFromResult(overrides: Partial<ShareDemoData>): ShareDemoData {
  return { ...NEUTRAL_SHARE_CARD, ...overrides };
}
