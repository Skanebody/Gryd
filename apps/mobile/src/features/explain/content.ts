/**
 * GRYD — contenu de l'explicabilité (AMENDEMENT-23 §B / §32-§34, C2), i18n.
 * DONNÉES (pas d'UI) des 6 sections de « Comment GRYD calcule tes zones » et de
 * la FAQ « Calculs & règles du jeu » (20 Q/R §33 + FAQ courte post-run §34).
 *
 * i18n : chaque texte est une `Entry` (5 langues, catalogue
 * i18n/catalog/explain.ts) que les ÉCRANS résolvent via t() à l'affichage —
 * la bascule de langue reste donc instantanée malgré le module scope. Les
 * valeurs de règles ({close}, {gps}, {window}…) sont injectées ICI, langue par
 * langue, via fillEntry (labels.ts) : présentation seule, zéro logique de jeu.
 *
 * Discipline (AMENDEMENT-23 §0) : ces textes DÉCRIVENT LE MOTEUR RÉEL post-C1
 * (défense graduée +24/48/72 h, decay 14 j + statuts, verify 80/60, gate GPS
 * 80, largeur 80 m). AUCUN NOMBRE MAGIQUE dans le corps : toute valeur passe
 * par un helper de labels.ts. Les exemples chiffrés démo (+247/+214/+33,
 * 79/21 %, 620 m) sont des SCÉNARIOS, signalés « Exemple : », jamais des
 * règles. Les réécritures zéro-friction historiques (« compte en stats », Q3
 * en liste, total additif) sont fondues dans le catalogue — plus d'overrides
 * d'écran.
 *
 * Structure exploitable par des accordéons (détails au tap) : chaque item porte
 * une icône propriétaire (`IconName`) et un `schemaId` optionnel pour le schéma
 * pédagogique associé. Textes COURTS, mobile-first, zéro jargon hors `advanced`.
 */
import type { IconName } from '@klaim/shared';
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/explain';
import {
  closeToleranceLabel,
  coverageBufferLabel,
  crewLoopWindowLabel,
  decayDaysEntry,
  defenseHoursLabels,
  fillEntry,
  finisherMinEntry,
  bonusCapEntry,
  gpsGateLabel,
  runMinDistanceLabel,
  runMinDurationLabel,
  verifyTiersLabel,
  verifyTiersSentenceEntry,
  widthMinLabel,
  zoneLifecycleEntries,
} from './labels';

/** Identifiants des 6 schémas SVG pédagogiques (§31). Un agent Écrans les rend. */
export type SchemaId =
  | 'ligne_vs_boucle' // 1 · trait ouvert vs boucle remplie
  | 'boucle_fait_zone' // 2 · avant/après : trace seule → gain de boucle
  | 'defense_frontiere' // 3 · traverser / longer / fermer
  | 'boucle_collective' // 4 · deux traits crew + contributions
  | 'bonus_cible' // 5 · segment manquant en pointillé + éclair
  | 'verify'; // 6 · check bleu / segment grisé

// Valeurs de règles injectées dans les textes (dérivées de game-rules.ts).
const HOURS = defenseHoursLabels();
const TIERS = verifyTiersLabel();
const LIFECYCLE = zoneLifecycleEntries();

// ─── Page « Comment GRYD calcule tes zones » (§32) ───────────────────────────

/** Une des 6 sections : icône + phrase simple + schéma + exemple concret. */
export interface ExplainSection {
  id: SchemaId;
  /** Icône propriétaire (icons.ts). */
  icon: IconName;
  /** Titre court (2-4 mots) — Entry résolue par l'écran via t(). */
  title: Entry;
  /** UNE phrase simple, sans jargon — Entry. */
  line: Entry;
  /** Exemple concret — scénario démo préfixé « Exemple : » — Entry. */
  example: Entry;
  /** Schéma pédagogique associé (§31). */
  schemaId: SchemaId;
}

/** Les 6 sections, dans l'ordre du doc §32. */
export const EXPLAIN_SECTIONS: readonly ExplainSection[] = [
  {
    id: 'ligne_vs_boucle',
    icon: 'boucle_ouverte',
    title: C.secLigneTitle,
    line: C.secLigneLine,
    example: C.secLigneExample,
    schemaId: 'ligne_vs_boucle',
  },
  {
    id: 'boucle_fait_zone',
    icon: 'boucle_fermee',
    title: C.secBoucleTitle,
    line: C.secBoucleLine,
    example: C.secBoucleExample,
    schemaId: 'boucle_fait_zone',
  },
  {
    id: 'defense_frontiere',
    icon: 'bouclier',
    title: C.secDefenseTitle,
    line: C.secDefenseLine,
    example: fillEntry(C.secDefenseExample, {
      traverse: HOURS.traverse,
      longe: HOURS.longe,
      cover: HOURS.cover,
    }),
    schemaId: 'defense_frontiere',
  },
  {
    id: 'boucle_collective',
    icon: 'crew',
    title: C.secCrewTitle,
    line: C.secCrewLine,
    example: C.secCrewExample,
    schemaId: 'boucle_collective',
  },
  {
    id: 'bonus_cible',
    icon: 'performance',
    title: C.secBonusTitle,
    line: C.secBonusLine,
    example: C.secBonusExample,
    schemaId: 'bonus_cible',
  },
  {
    id: 'verify',
    icon: 'badge',
    title: C.secVerifyTitle,
    line: C.secVerifyLine,
    // Les paliers verify sont des RÈGLES réelles, mais l'écran les présente
    // dans le slot « exemple » — même préfixe d'honnêteté que les autres scènes.
    example: fillEntry(C.examplePrefixed, { text: verifyTiersSentenceEntry() }),
    schemaId: 'verify',
  },
] as const;

// ─── FAQ « Calculs & règles du jeu » (§33 : 20 Q/R) ──────────────────────────

/** Regroupement des Q/R en sections d'accordéon. */
export type FaqCategory = 'zones' | 'defense' | 'crew' | 'verify' | 'economie';

/** Une Q/R d'accordéon : question + réponse courte + icône + schéma optionnel. */
export interface FaqItem {
  id: string;
  category: FaqCategory;
  icon: IconName;
  /** Question — Entry résolue par l'écran via t(). */
  q: Entry;
  /** Réponse courte — Entry. */
  a: Entry;
  schemaId?: SchemaId;
  /** true = détail technique (n'apparaît qu'en section avancée). */
  advanced?: boolean;
}

/** Libellés des catégories FAQ (pour les en-têtes d'accordéon). */
export const FAQ_CATEGORY_LABELS: Record<FaqCategory, Entry> = {
  zones: C.catZones,
  defense: C.catDefense,
  crew: C.catCrew,
  verify: C.catVerify,
  economie: C.catEconomie,
};

/** Les Q/R du §33 (+ A-41 relais), dans l'ordre du doc. Réponses courtes, moteur réel. */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'q1',
    category: 'zones',
    icon: 'boucle_fermee',
    q: C.q1Q,
    a: C.q1A,
    schemaId: 'ligne_vs_boucle',
  },
  {
    // AMENDEMENT-41 (LE RELAIS) : la question n°1 d'une sortie de run club.
    id: 'q-relay',
    category: 'zones',
    icon: 'crew',
    q: C.qRelayQ,
    a: C.qRelayA,
  },
  {
    id: 'q2',
    category: 'zones',
    icon: 'route',
    q: C.q2Q,
    a: C.q2A,
    schemaId: 'ligne_vs_boucle',
  },
  {
    id: 'q3',
    category: 'zones',
    icon: 'boucle_ouverte',
    q: C.q3Q,
    // UNE raison de refus par ligne, chaque seuil étiqueté (zéro-friction).
    a: fillEntry(C.q3A, {
      close: closeToleranceLabel(),
      gps: gpsGateLabel(),
      width: widthMinLabel(),
      dist: runMinDistanceLabel(),
      dur: runMinDurationLabel(),
    }),
  },
  {
    id: 'q4',
    category: 'defense',
    icon: 'bouclier',
    q: C.q4Q,
    a: fillEntry(C.q4A, { buffer: coverageBufferLabel() }),
    schemaId: 'defense_frontiere',
    advanced: true,
  },
  {
    id: 'q5',
    category: 'crew',
    icon: 'crew',
    q: C.q5Q,
    a: fillEntry(C.q5A, {
      window: crewLoopWindowLabel(),
      min: finisherMinEntry(),
    }),
    schemaId: 'boucle_collective',
  },
  {
    id: 'q6',
    category: 'crew',
    icon: 'cible',
    q: C.q6Q,
    a: C.q6A,
  },
  {
    id: 'q7',
    category: 'zones',
    icon: 'conquete',
    q: C.q7Q,
    a: C.q7A,
  },
  {
    id: 'q8',
    category: 'verify',
    icon: 'segment_exclu',
    q: C.q8Q,
    a: C.q8A,
    schemaId: 'verify',
  },
  {
    id: 'q9',
    category: 'verify',
    icon: 'badge',
    q: C.q9Q,
    a: fillEntry(C.q9A, { sentence: verifyTiersSentenceEntry() }),
    schemaId: 'verify',
  },
  {
    id: 'q10',
    category: 'verify',
    icon: 'segment_exclu',
    q: C.q10Q,
    a: fillEntry(C.q10A, { partial: TIERS.partial }),
  },
  {
    id: 'q11',
    category: 'defense',
    icon: 'bouclier',
    q: C.q11Q,
    a: fillEntry(C.q11A, {
      traverse: HOURS.traverse,
      longe: HOURS.longe,
      cover: HOURS.cover,
    }),
    schemaId: 'defense_frontiere',
  },
  {
    id: 'q12',
    category: 'defense',
    icon: 'sablier',
    q: C.q12Q,
    a: fillEntry(C.q12A, LIFECYCLE),
  },
  {
    id: 'q13',
    category: 'defense',
    icon: 'sablier',
    q: C.q13Q,
    a: fillEntry(C.q13A, { days: decayDaysEntry() }),
  },
  {
    id: 'q14',
    category: 'economie',
    icon: 'performance',
    q: C.q14Q,
    a: C.q14A,
    schemaId: 'bonus_cible',
  },
  {
    id: 'q15',
    category: 'economie',
    icon: 'coffre',
    q: C.q15Q,
    a: C.q15A,
  },
  {
    id: 'q16',
    category: 'economie',
    icon: 'performance',
    q: C.q16Q,
    a: fillEntry(C.q16A, { cap: bonusCapEntry() }),
  },
  {
    id: 'q17',
    category: 'zones',
    icon: 'carte',
    q: C.q17Q,
    a: C.q17A,
    advanced: true,
  },
  {
    id: 'q18',
    category: 'zones',
    icon: 'carte',
    q: C.q18Q,
    a: C.q18A,
    advanced: true,
  },
  {
    id: 'q19',
    category: 'zones',
    icon: 'route',
    q: C.q19Q,
    a: C.q19A,
  },
  {
    id: 'q20',
    category: 'crew',
    icon: 'crew',
    q: C.q20Q,
    a: C.q20A,
    schemaId: 'boucle_collective',
  },
] as const;

// ─── FAQ courte post-run (§34) ───────────────────────────────────────────────

/** Une réponse express post-course (lien « Comment est calculé ce résultat ? »). */
export interface PostRunFaqItem {
  id: string;
  icon: IconName;
  /** Question — Entry résolue par l'écran via t(). */
  q: Entry;
  /** Réponse — Entry. */
  a: Entry;
  schemaId?: SchemaId;
}

/** Les 4 réponses courtes du §34. Chiffres démo = scénario, signalé « Exemple ». */
export const POST_RUN_FAQ: readonly PostRunFaqItem[] = [
  {
    id: 'zones',
    icon: 'boucle_fermee',
    q: C.postRunZonesQ,
    a: C.postRunZonesA,
    schemaId: 'boucle_fait_zone',
  },
  {
    id: 'segment',
    icon: 'segment_exclu',
    q: C.postRunSegmentQ,
    a: C.postRunSegmentA,
    schemaId: 'verify',
  },
  {
    id: 'stats_only',
    icon: 'historique',
    q: C.postRunStatsQ,
    a: C.postRunStatsA,
  },
  {
    id: 'frontiere_ouverte',
    icon: 'boucle_ouverte',
    q: C.postRunFrontiereQ,
    a: C.postRunFrontiereA,
    schemaId: 'boucle_collective',
  },
] as const;
