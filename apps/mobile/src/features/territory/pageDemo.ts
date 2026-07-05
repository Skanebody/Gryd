/**
 * GRYD — données démo de la page détaillée « Mon territoire » (/territoire),
 * AMENDEMENT-18 PARTIE B. La page est un RÉSUMÉ STRATÉGIQUE, pas une carte
 * décorative : voici ce que je contrôle (VILLES) · ce qui est menacé
 * (À DÉFENDRE) · mes prochaines actions (ROUTES OUVERTES) · ma fierté
 * (RECORDS). Vocabulaire zones/secteurs/frontières/rues (Partie D), libellés
 * courts NON tronqués, anti-shame, zéro position live/tracé public.
 *
 * Déterministe, pur ancrage démo Saison 0 (Paris + Lille). Le TITRE et les
 * comptes VILLES restent cohérents avec franceKpi() (55 zones · Paris + Lille) ;
 * remplacé par les données serveur (hex_claims / defenses) au Milestone 2.
 * AUCUNE règle de jeu ici (game-rules.ts reste la source des constantes).
 */
import type { IconName } from '@klaim/shared';

/** Une ville tenue : nom en clair + zones (vocabulaire Saison 0). */
export interface CityHolding {
  city: string;
  zones: number;
  /** Statut de la ville — lecture rapide (Partie B). */
  status: 'Stable' | 'Contesté' | 'En expansion';
}

/** Une zone/frontière menacée : quoi · pourquoi · l'action est le CTA du bas. */
export interface ThreatItem {
  icon: IconName;
  /** Nom en clair (République, Canal) — jamais tronqué. */
  name: string;
  /** Raison courte de la menace : « expire 18 h », « contesté ». */
  detail: string;
  /** true = urgence (expiration proche) → accent danger. */
  urgent: boolean;
}

/** Une route ouverte = prochaine action concrète (Base → cible · distance). */
export interface OpenRoute {
  /** Libellé court de la route — jamais tronqué. */
  label: string;
  /** Distance formatée fr (« 4,2 km »). */
  distance: string;
}

/** Un record territoire = fierté (anti-shame : que du positif). */
export interface TerritoryRecord {
  icon: IconName;
  /** Ce qui est record (« Plus grande zone »). */
  label: string;
  /** La valeur en clair (« République », « hier »). */
  value: string;
}

export interface TerritoryPageDemo {
  /** Coureur (pseudo court, jamais tronqué dans l'en-tête). */
  runner: string;
  /** Zones tenues (cohérent franceKpi : Paris 42 + Lille 13 = 55). */
  totalZones: number;
  /** Villes — vocabulaire Saison 0. */
  citiesLabel: string;
  /** Frontières contestées (chiffre de l'en-tête). */
  contestedBorders: number;
  cities: readonly CityHolding[];
  threats: readonly ThreatItem[];
  routes: readonly OpenRoute[];
  records: readonly TerritoryRecord[];
}

/**
 * Démo Saison 0 — KORO, 55 zones (Paris 42 · Lille 13), 3 frontières
 * contestées. Aligné sur franceKpi() (Paris + Lille · 55). Volontairement
 * concis : chaque section a ≤ 3 items, la page en montre 2 + « Voir tout ».
 */
export const TERRITORY_PAGE_DEMO: TerritoryPageDemo = {
  runner: 'KORO',
  totalZones: 55,
  citiesLabel: 'Paris + Lille',
  contestedBorders: 3,
  cities: [
    { city: 'Paris', zones: 42, status: 'Stable' },
    { city: 'Lille', zones: 13, status: 'En expansion' },
  ],
  threats: [
    { icon: 'sablier', name: 'République', detail: 'Expire dans 18 h', urgent: true },
    { icon: 'guerre', name: 'Canal', detail: 'Frontière contestée', urgent: false },
    { icon: 'bouclier', name: 'Bastille', detail: 'Pression rivale', urgent: false },
  ],
  routes: [
    { label: 'Base → République', distance: '4,2 km' },
    { label: 'Quai de l’Ourcq', distance: '2,6 km' },
    { label: 'Boucle Bastille', distance: '3,4 km' },
  ],
  records: [
    { icon: 'crest', label: 'Plus grande zone', value: 'République' },
    { icon: 'bouclier', label: 'Meilleure défense', value: 'Canal' },
    { icon: 'sablier', label: 'Dernière conquête', value: 'Hier' },
  ],
};
