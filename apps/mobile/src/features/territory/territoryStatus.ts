/**
 * GRYD — « Mon territoire » comme RÉSUMÉ STRATÉGIQUE (AMENDEMENT-18 Partie B + A.5).
 *
 * La card du Profil n'est PAS décorative : elle répond en un coup d'œil à
 * « voici ce que je contrôle · ce qui est menacé · ma PROCHAINE action ». Ce
 * module produit l'état affiché — DÉMO adaptative, un flag pour basculer entre
 * les scénarios (crew multi-ville, mono-ville, débutant, sous attaque, solo).
 *
 * Principes tenus ici :
 *  - Vocabulaire GRYD : zones · frontières contestées · routes ouvertes ·
 *    quartiers/villes (§Partie D). Jamais « hexagones », jamais de tracé public.
 *  - Libellés d'ACTION jamais tronqués (§Partie D) → CTA courts (« Défendre »,
 *    « Terminer », « Trouver une route », « Créer une zone », « Trouver un crew »).
 *  - CTA CONTEXTUEL, jamais « Explorer la carte » vague.
 *  - Anti-shame : un débutant lit « Trace ta première boucle », pas « 0 zone,
 *    tu es nul ». Un solo lit « territoire perso » + suggestions, jamais un vide.
 *  - PERSO vs PUBLIC : ce module décrit MON profil (actionnable). La variante
 *    publique statutaire (ville/zones agrégées/rang, zéro tracé) est exposée par
 *    `publicTerritorySummary` pour que le profil d'autrui V1 s'y branche.
 *
 * Les chiffres « crew multi-ville » restent DÉRIVÉS du digital twin (franceKpi,
 * mêmes données que la vraie carte) — jamais recodés. Les autres scénarios sont
 * des ancrages démo purs (aucune règle de jeu ici). Remplacé par l'état réel du
 * joueur (hex_claims + menaces serveur) au Milestone 2.
 */
import type { IconName } from '@klaim/shared';
import { franceKpi } from './franceTerritories';

// ─── Statut de territoire (le mot d'ordre en un coup d'œil) ─────────────────

/**
 * Cinq statuts (AMENDEMENT-18 Partie B). Chacun porte sa couleur d'accent :
 * chartreuse = tout va bien / j'avance ; contested/violet = disputé ; rival =
 * pression ennemie ; gris = neutre (débutant, rien à défendre encore).
 */
export type TerritoryStatus =
  | 'stable'
  | 'contested'
  | 'fragile'
  | 'expanding'
  | 'under_attack';

/** Ton d'accent d'un statut → couleur de jeu (résolu côté UI par tokens). */
export type StatusTone = 'crew' | 'contested' | 'rival' | 'neutral';

export interface TerritoryStatusMeta {
  /** Libellé court affiché dans le badge de statut. */
  label: string;
  tone: StatusTone;
}

export const TERRITORY_STATUS_META: Readonly<Record<TerritoryStatus, TerritoryStatusMeta>> = {
  stable: { label: 'Stable', tone: 'crew' },
  expanding: { label: 'En expansion', tone: 'crew' },
  contested: { label: 'Contesté', tone: 'contested' },
  fragile: { label: 'Fragile', tone: 'contested' },
  under_attack: { label: 'Sous attaque', tone: 'rival' },
};

// ─── Micro-badges territoire (≤ 3, le reste au tap) ─────────────────────────

/** Reconnaissances territoire courtes (AMENDEMENT-18 : Multi-ville/Defender/Route Maker). */
export interface TerritoryBadge {
  label: string;
  icon: IconName;
}

// ─── Prochaine action + CTA contextuel ──────────────────────────────────────

/**
 * L'action recommandée. `intent` classe l'urgence (pilote la couleur du CTA) ;
 * `cta` est le libellé COURT du bouton (jamais tronqué) ; `route` la destination.
 */
export type NextActionIntent = 'defend' | 'finish' | 'route' | 'create' | 'crew';

export interface NextAction {
  /** Phrase de contexte : « 1 zone à défendre », « Il manque 620 m »… */
  headline: string;
  /** Libellé COURT du bouton (Défendre / Terminer / Trouver une route…). */
  cta: string;
  intent: NextActionIntent;
  /** Destination du tap CTA (route expo-router). */
  route: string;
  /** CTA d'urgence (rouge, plein) vs action normale (chartreuse). */
  urgent?: boolean;
  /**
   * Autorise un headline sur 3 lignes (au lieu de 2) — réservé aux cards sans
   * autre contenu (débutant), pour afficher le message d'accueil EN ENTIER
   * (anti-ellipse §Partie D). Défaut = 2 lignes (cas nominaux compacts).
   */
  allowLongHeadline?: boolean;
}

// ─── Résumé stratégique complet (ce que la card consomme) ───────────────────

export interface TerritorySummary {
  /** A-t-on un crew ? Pilote le bloc solo (« Rejoins un crew… »). */
  hasCrew: boolean;
  status: TerritoryStatus;
  /** KPI héroïque : nombre de zones tenues (0 = débutant). */
  zonesHeld: number;
  /**
   * Portée géographique en clair (jamais tronqué) :
   *  - mono-ville  → « Paris Est » (quartier)
   *  - multi-ville → « Paris 42 · Lille 13 »
   *  - débutant    → « Aucune zone tenue »
   *  - solo        → « Paris Est » (perso)
   */
  scopeLabel: string;
  /** Sous-titre sous le gros chiffre (« zones tenues », « zone personnelle »…). */
  zonesUnit: string;
  /**
   * Les 3 faits stratégiques (frontières contestées · routes ouvertes · zone à
   * défendre). Chaîne prête à l'affichage, séparateur médian. Vide pour débutant.
   */
  facts: readonly string[];
  next: NextAction;
  badges: readonly TerritoryBadge[];
  /**
   * Bannière de crise optionnelle (SOUS ATTAQUE) — rendue au-dessus du reste,
   * ton rival. `null` en temps normal (anti-alarmisme).
   */
  alert: string | null;
  /**
   * Bloc solo optionnel (A.5) : « 3 crews actifs près de toi ». Présent
   * uniquement quand `hasCrew === false` — l'app ne semble jamais vide en solo.
   */
  soloCrewHint: { headline: string; cta: string; route: string } | null;
}

// ─── Scénarios démo (un flag pour basculer) ─────────────────────────────────

/**
 * États démonstrables sur /profil. Le flag par défaut = `crew_multi` (le cas
 * nominal de la Saison 0 : mon crew tient Paris + Lille). Bascule via le
 * paramètre de route `?territory=<flag>` (voir profil.tsx) pour itérer.
 */
export type TerritoryDemoFlag =
  | 'crew_multi'
  | 'crew_mono'
  | 'beginner'
  | 'under_attack'
  | 'solo';

export const TERRITORY_DEMO_FLAGS: readonly TerritoryDemoFlag[] = [
  'crew_multi',
  'crew_mono',
  'beginner',
  'under_attack',
  'solo',
] as const;

/** Micro-badges communs aux joueurs établis (≤ 3, ordre = importance). */
const ESTABLISHED_BADGES: readonly TerritoryBadge[] = [
  { label: 'Multi-ville', icon: 'pin' },
  { label: 'Defender', icon: 'bouclier' },
  { label: 'Route Maker', icon: 'route' },
];

/**
 * Construit le résumé stratégique pour un scénario démo. Le cas `crew_multi`
 * lit le VRAI digital twin (franceKpi) ; les autres sont des ancrages démo.
 */
export function territorySummary(flag: TerritoryDemoFlag): TerritorySummary {
  switch (flag) {
    // (b) Multi-ville → mini-France « Paris 42 · Lille 13 » (données réelles).
    case 'crew_multi': {
      const kpi = franceKpi(); // zones tenues + « Paris + Lille »
      return {
        hasCrew: true,
        status: 'contested',
        zonesHeld: kpi.totalZones,
        scopeLabel: 'Paris 42 · Lille 13',
        zonesUnit: 'zones tenues',
        // 2 faits (la « zone à défendre » est déjà portée par la prochaine action
        // ci-dessous → on évite la redite et le wrap sur 2 lignes).
        facts: ['3 frontières contestées', '2 routes ouvertes'],
        next: {
          headline: '1 zone à défendre · Canal',
          cta: 'Défendre',
          intent: 'defend',
          route: '/territoire',
        },
        badges: ESTABLISHED_BADGES,
        alert: null,
        soloCrewHint: null,
      };
    }

    // (a) 1 ville active → quartier « Paris Est · 55 zones · 3 frontières ».
    case 'crew_mono':
      return {
        hasCrew: true,
        status: 'expanding',
        zonesHeld: 55,
        scopeLabel: 'Paris Est',
        zonesUnit: 'zones tenues',
        facts: ['3 frontières contestées', '2 routes ouvertes'],
        next: {
          // CTA « route » : progresser au classement en ouvrant une route.
          headline: '35 zones → #7 ville',
          cta: 'Trouver une route',
          intent: 'route',
          route: '/territoire',
        },
        badges: [
          { label: 'Defender', icon: 'bouclier' },
          { label: 'Route Maker', icon: 'route' },
        ],
        alert: null,
        soloCrewHint: null,
      };

    // (c) Débutant (0 zone) → anti-shame : « Trace ta première boucle ».
    case 'beginner':
      return {
        hasCrew: true,
        status: 'stable',
        zonesHeld: 0,
        scopeLabel: 'Aucune zone tenue',
        zonesUnit: 'zone tenue',
        facts: [],
        next: {
          headline: 'Trace ta première boucle pour créer ton territoire.',
          cta: 'Créer une zone',
          // 3 lignes autorisées ici (aucune autre info sur la card débutant) →
          // le message d'accueil s'affiche en entier, jamais tronqué.
          allowLongHeadline: true,
          intent: 'create',
          route: '/territoire',
        },
        badges: [],
        alert: null,
        soloCrewHint: null,
      };

    // (d) Sous attaque → bannière rouge + CTA d'urgence « Défendre ».
    case 'under_attack':
      return {
        hasCrew: true,
        status: 'under_attack',
        zonesHeld: 41,
        scopeLabel: 'Paris Est',
        zonesUnit: 'zones tenues',
        facts: ['Canal Crew attaque', '14 zones reprises', '2 frontières à tenir'],
        next: {
          headline: '14 zones reprises · Canal',
          cta: 'Défendre',
          intent: 'defend',
          route: '/territoire',
          urgent: true,
        },
        badges: [
          { label: 'Defender', icon: 'bouclier' },
          { label: 'Multi-ville', icon: 'pin' },
        ],
        alert: 'Canal Crew attaque · 14 zones reprises',
        soloCrewHint: null,
      };

    // SOLO (A.5) → territoire perso + « Rejoins un crew pour défendre ».
    case 'solo':
      return {
        hasCrew: false,
        status: 'stable',
        zonesHeld: 12,
        scopeLabel: 'Paris Est',
        zonesUnit: 'zones personnelles',
        facts: ['1 frontière contestée', '1 route ouverte'],
        next: {
          headline: 'Rejoins un crew pour défendre',
          cta: 'Trouver un crew',
          intent: 'crew',
          route: '/crew-discovery',
        },
        badges: [
          { label: 'Route Maker', icon: 'route' },
          { label: 'Solo', icon: 'foulees' },
        ],
        alert: null,
        soloCrewHint: {
          headline: '3 crews actifs près de toi',
          cta: 'Découvrir',
          route: '/crew-discovery',
        },
      };
  }
}

// ─── Variante PUBLIQUE (statutaire, zéro tracé — AMENDEMENT-17 ch3) ──────────

/**
 * Résumé pour le profil D'AUTRUI : statutaire, JAMAIS actionnable, JAMAIS de
 * tracé précis ni de « zone à défendre » (confidentialité). On n'expose que
 * l'agrégat public : ville · zones tenues · rang. Le profil public complet est
 * V1 ; cette fonction pose la variante pour qu'il s'y branche sans rejouer les
 * règles de confidentialité.
 */
export interface PublicTerritorySummary {
  scopeLabel: string;
  zonesHeld: number;
  zonesUnit: string;
  rankLabel: string;
  status: TerritoryStatus;
}

export function publicTerritorySummary(summary: TerritorySummary, rankLabel: string): PublicTerritorySummary {
  return {
    scopeLabel: summary.scopeLabel,
    zonesHeld: summary.zonesHeld,
    zonesUnit: summary.zonesUnit,
    rankLabel,
    status: summary.status,
  };
}
