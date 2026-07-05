/**
 * GRYD — contenu de l'explicabilité (AMENDEMENT-23 §B / §32-§34, C2).
 * DONNÉES (pas d'UI) des 6 sections de « Comment GRYD calcule tes zones » et de
 * la FAQ « Calculs & règles du jeu » (20 Q/R §33 + FAQ courte post-run §34).
 *
 * Discipline (AMENDEMENT-23 §0) : ces textes DÉCRIVENT LE MOTEUR RÉEL post-C1
 * (défense graduée +24/48/72 h, decay 14 j + statuts, points multiplicatifs
 * zones × action × contexte × verify, verify 80/60, gate GPS 80, cap 3 km²,
 * largeur 80 m). AUCUN NOMBRE MAGIQUE dans le corps : toute valeur passe par un
 * helper de labels.ts (résolu à l'affichage). Les exemples chiffrés démo
 * (+247/+214/+33, 79/21 %, 620 m) sont des SCÉNARIOS (champ `example`),
 * signalés comme tels, jamais des règles.
 *
 * Structure exploitable par des accordéons (détails au tap) : chaque item porte
 * une icône propriétaire (`IconName`) et un `schemaId` optionnel pour le schéma
 * pédagogique associé. Textes COURTS, mobile-first, zéro jargon hors `advanced`.
 */
import type { IconName } from '@klaim/shared';
import {
  decayDaysLabel,
  zoneLifecycleLabels,
  defenseHoursLabels,
  coverageBufferLabel,
  actionCoeffLabel,
  contextCoeffLabel,
  verifyTiersLabel,
  verifyTiersSentence,
  gpsGateLabel,
  widthMinLabel,
  loopMaxAreaCapLabel,
  closeToleranceLabel,
  runMinDistanceLabel,
  runMinDurationLabel,
  crewLoopWindowLabel,
  finisherMinLabel,
  bonusCapLabel,
} from './labels';

/** Identifiants des 6 schémas SVG pédagogiques (§31). Un agent Écrans les rend. */
export type SchemaId =
  | 'ligne_vs_boucle' // 1 · trait ouvert vs boucle remplie
  | 'boucle_fait_zone' // 2 · avant/après : trace seule → gain de boucle
  | 'defense_frontiere' // 3 · traverser / longer / fermer
  | 'boucle_collective' // 4 · deux traits crew + contributions
  | 'bonus_cible' // 5 · segment manquant en pointillé + éclair
  | 'verify'; // 6 · check bleu / segment grisé

// ─── Page « Comment GRYD calcule tes zones » (§32) ───────────────────────────

/** Une des 6 sections : icône + phrase simple + schéma + exemple concret. */
export interface ExplainSection {
  id: SchemaId;
  /** Icône propriétaire (icons.ts). */
  icon: IconName;
  /** Titre court (2-4 mots). */
  title: string;
  /** UNE phrase simple, sans jargon. */
  line: string;
  /** Exemple concret — scénario démo (champ à afficher en accent secondaire). */
  example: string;
  /** Schéma pédagogique associé (§31). */
  schemaId: SchemaId;
}

/** Les 6 sections, dans l'ordre du doc §32. */
export const EXPLAIN_SECTIONS: readonly ExplainSection[] = [
  {
    id: 'ligne_vs_boucle',
    icon: 'boucle_ouverte',
    title: 'La ligne ouvre une route',
    line: 'Une course qui ne se referme pas ne crée pas de zone : elle ouvre une route.',
    example: 'Base → République, 4,2 km : route ouverte, aucune zone.',
    schemaId: 'ligne_vs_boucle',
  },
  {
    id: 'boucle_fait_zone',
    icon: 'boucle_fermee',
    title: 'La boucle crée une zone',
    line: 'Quand ton tracé revient à son départ, GRYD remplit l’intérieur : c’est ta zone.',
    example: 'Trace seule : +214 · boucle fermée : +247 · gain de boucle : +33.',
    schemaId: 'boucle_fait_zone',
  },
  {
    id: 'defense_frontiere',
    icon: 'bouclier',
    title: 'La défense protège',
    line: 'Repasser sur ta frontière prolonge ta zone : plus tu la couvres, plus elle tient.',
    example: `Traverser ${defenseHoursLabels().traverse} · longer ${defenseHoursLabels().longe} · couvrir ${defenseHoursLabels().cover}.`,
    schemaId: 'defense_frontiere',
  },
  {
    id: 'boucle_collective',
    icon: 'crew',
    title: 'Le crew ferme ensemble',
    line: 'Tu ouvres une frontière, un membre du crew la referme : la zone est au crew.',
    example: 'KORO ouvre 79 %, LENA ferme 21 % : zone crew capturée.',
    schemaId: 'boucle_collective',
  },
  {
    id: 'bonus_cible',
    icon: 'performance',
    title: 'Les bonus sont ciblés',
    line: 'Les bonus visent le bon moment (boucle presque fermée, zone qui expire), jamais du territoire.',
    example: 'Il reste 620 m à fermer : bonus Finisher actif.',
    schemaId: 'bonus_cible',
  },
  {
    id: 'verify',
    icon: 'badge',
    title: 'GRYD Verify valide',
    line: 'GRYD vérifie GPS et mouvement : une course fiable capture, une course douteuse compte en stats.',
    example: verifyTiersSentence(),
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
  q: string;
  a: string;
  schemaId?: SchemaId;
  /** true = détail technique (n'apparaît qu'en section avancée). */
  advanced?: boolean;
}

/** Libellés des catégories FAQ (pour les en-têtes d'accordéon). */
export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  zones: 'Zones & boucles',
  defense: 'Défense & durée',
  crew: 'Crew',
  verify: 'GRYD Verify',
  economie: 'Points & bonus',
};

/** Les 20 Q/R du §33, dans l'ordre du doc. Réponses courtes, moteur réel. */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'q1',
    category: 'zones',
    icon: 'boucle_fermee',
    q: 'Comment GRYD calcule une zone ?',
    a: 'GRYD analyse ton tracé GPS. Si ton parcours forme une boucle valide, l’intérieur devient ta zone.',
    schemaId: 'ligne_vs_boucle',
  },
  {
    id: 'q2',
    category: 'zones',
    icon: 'route',
    q: 'Une ligne droite capture-t-elle une zone ?',
    a: 'Non. Une ligne ouvre une route ou défend un passage, mais ne crée pas de territoire.',
    schemaId: 'ligne_vs_boucle',
  },
  {
    id: 'q3',
    category: 'zones',
    icon: 'boucle_ouverte',
    q: 'Pourquoi ma boucle n’a pas créé de zone ?',
    a: `Boucle pas assez fermée (écart > ${closeToleranceLabel()}), GPS sous ${gpsGateLabel()}, forme trop étroite (< ${widthMinLabel()} de large), trop petite, trop grande, ou course sous ${runMinDistanceLabel()} / ${runMinDurationLabel()}.`,
  },
  {
    id: 'q4',
    category: 'defense',
    icon: 'bouclier',
    q: 'Que veut dire « frontière couverte » ?',
    a: `La portion de ta frontière que tu as vraiment courue. GRYD mesure ce qui passe à moins de ${coverageBufferLabel()} de ton tracé.`,
    schemaId: 'defense_frontiere',
    advanced: true,
  },
  {
    id: 'q5',
    category: 'crew',
    icon: 'crew',
    q: 'Un membre du crew peut-il finir ma boucle ?',
    a: `Oui. Si tu ouvres une frontière et qu’il manque un segment, ton crew a ${crewLoopWindowLabel()} pour la refermer (contribution mini ${finisherMinLabel()}).`,
    schemaId: 'boucle_collective',
  },
  {
    id: 'q6',
    category: 'crew',
    icon: 'cible',
    q: 'Un rival peut-il finir ma boucle ?',
    a: 'Non. Un rival peut contester la zone, mais jamais compléter une boucle pour ton crew.',
  },
  {
    id: 'q7',
    category: 'zones',
    icon: 'conquete',
    q: 'Comment GRYD calcule les zones reprises à un rival ?',
    a: 'Si ta boucle recouvre un territoire rival, GRYD recalcule les cellules à l’intérieur et met à jour le contrôle du secteur.',
  },
  {
    id: 'q8',
    category: 'verify',
    icon: 'segment_exclu',
    q: 'Pourquoi une partie de ma course est « segment exclu » ?',
    a: 'GPS faible, vitesse incohérente, saut GPS ou mouvement suspect. La course reste valide sportivement, mais ce segment ne capture pas.',
    schemaId: 'verify',
  },
  {
    id: 'q9',
    category: 'verify',
    icon: 'badge',
    q: 'C’est quoi GRYD Verify ?',
    a: `Un contrôle de fiabilité (GPS, vitesse, mouvement, source). ${verifyTiersSentence()}`,
    schemaId: 'verify',
  },
  {
    id: 'q10',
    category: 'verify',
    icon: 'segment_exclu',
    q: 'Pourquoi ma course est en « stats only » ?',
    a: `Elle compte pour tes stats mais pas pour la capture : pas de boucle, GPS sous ${verifyTiersLabel().partial}, source non éligible ou zone interdite.`,
  },
  {
    id: 'q11',
    category: 'defense',
    icon: 'bouclier',
    q: 'Comment fonctionne la défense ?',
    a: `Traverser, longer ou refermer ta frontière. Plus tu la couvres, plus la zone tient : ${defenseHoursLabels().traverse}, ${defenseHoursLabels().longe} ou ${defenseHoursLabels().cover}.`,
    schemaId: 'defense_frontiere',
  },
  {
    id: 'q12',
    category: 'defense',
    icon: 'sablier',
    q: 'Combien de temps une zone reste à nous ?',
    a: `Stable ${zoneLifecycleLabels().stable}, fragile ${zoneLifecycleLabels().fragile}, à défendre les ${zoneLifecycleLabels().aDefendre}, decay ${zoneLifecycleLabels().decay}.`,
  },
  {
    id: 'q13',
    category: 'defense',
    icon: 'sablier',
    q: 'Les zones expirent-elles ?',
    a: `Oui. Sans défense pendant ${decayDaysLabel()}, une zone devient fragile puis repasse neutre — plus facile à reprendre.`,
  },
  {
    id: 'q14',
    category: 'economie',
    icon: 'performance',
    q: 'Les bonus sont-ils aléatoires ?',
    a: 'Partiellement : aléatoires dans l’apparition, ciblés dans la pertinence (ta position, ton crew, les zones faibles, les boucles ouvertes).',
    schemaId: 'bonus_cible',
  },
  {
    id: 'q15',
    category: 'economie',
    icon: 'coffre',
    q: 'Peut-on acheter une zone ?',
    a: 'Non. Le territoire ne s’achète jamais, il se gagne en courant. Les achats servent au style, au confort et au coffre crew.',
  },
  {
    id: 'q16',
    category: 'economie',
    icon: 'performance',
    q: 'Les boosts payants sont-ils pay-to-win ?',
    a: `Non : aucun bonus ne donne de territoire ni de victoire. Pas de cumul, total capé à ${bonusCapLabel()}, impact sur coffre, XP et cosmétiques seulement.`,
  },
  {
    id: 'q17',
    category: 'zones',
    icon: 'carte',
    q: 'Pourquoi mes zones ne collent pas exactement à ma trace ?',
    a: 'GRYD transforme ton tracé en zone propre et lissée. Le calcul reste précis en arrière-plan, l’affichage est simplifié.',
    advanced: true,
  },
  {
    id: 'q18',
    category: 'zones',
    icon: 'carte',
    q: 'Pourquoi GRYD n’affiche pas les cellules techniques ?',
    a: 'Trop complexe à l’œil. Tu vois des territoires lisibles ; le calcul par micro-cellules reste précis en coulisses.',
    advanced: true,
  },
  {
    id: 'q19',
    category: 'zones',
    icon: 'route',
    q: 'Comment fonctionne une route ouverte ?',
    a: 'Une course sans boucle peut ouvrir une route : relier deux secteurs, préparer une conquête ou une défense, proposer un itinéraire crew.',
  },
  {
    id: 'q20',
    category: 'crew',
    icon: 'crew',
    q: 'Comment sont calculées les contributions dans une boucle collective ?',
    a: 'Chaque membre est crédité selon la longueur de frontière qu’il a validée. Exemple : KORO 79 %, LENA 21 %. La zone appartient au crew.',
    schemaId: 'boucle_collective',
  },
] as const;

// ─── FAQ courte post-run (§34) ───────────────────────────────────────────────

/** Une réponse express post-course (lien « Comment est calculé ce résultat ? »). */
export interface PostRunFaqItem {
  id: string;
  icon: IconName;
  q: string;
  a: string;
  schemaId?: SchemaId;
}

/** Les 4 réponses courtes du §34. Chiffres démo = scénario du run affiché. */
export const POST_RUN_FAQ: readonly PostRunFaqItem[] = [
  {
    id: 'zones',
    icon: 'boucle_fermee',
    q: 'Pourquoi +247 zones ?',
    a: 'Ta trace a couvert +214 zones. Ta boucle fermée en a ajouté +33. Total : +247.',
    schemaId: 'boucle_fait_zone',
  },
  {
    id: 'segment',
    icon: 'segment_exclu',
    q: 'Pourquoi un segment exclu ?',
    a: 'Une partie du GPS était trop faible. La course reste validée, mais ce segment ne capture pas.',
    schemaId: 'verify',
  },
  {
    id: 'stats_only',
    icon: 'historique',
    q: 'Pourquoi « stats only » ?',
    a: 'Ta course compte sportivement, mais ne remplit pas les conditions de capture.',
  },
  {
    id: 'frontiere_ouverte',
    icon: 'boucle_ouverte',
    q: 'Pourquoi « frontière ouverte » ?',
    a: 'Tu as presque fermé une zone. Il manque un segment que toi ou ton crew pouvez terminer.',
    schemaId: 'boucle_collective',
  },
] as const;
