/**
 * GRYD — LA COPIE DE « SAISON ET CLASSEMENTS » (lot W3).
 *
 * MOT POUR MOT `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3.4.
 *
 * ⚠️ INTERDIT FORMEL DU CAHIER, REPRIS ICI : ne nommer AUCUNE ville, ne citer
 * aucun pays voisin, ne promettre aucune ouverture européenne (ADR-006, « zéro
 * donnée EU factice »). La Saison 0 s'ouvre à toutes les communes de France, par
 * PRÉSENCE : la première boucle fermée chez toi suffit. Aucun nombre d'inscrits,
 * aucun nombre de communes ouvertes, aucun classement d'exemple : la base compte
 * 3 comptes et 0 sortie au 12/09/2026.
 *
 * Les deux DATES viennent de `season2026.ts`, unique copie du dépôt, miroir de
 * la ligne `season_collections_2026` configurée en production le 11/09/2026. La
 * durée et les paliers, eux, viennent de `PROGRESSION_RULES_2026`.
 */
import { SITE_COUNTS, SITE_FACTS, type SiteStat, stat } from './facts2026';
import {
  SEASON_ZERO_END_LABEL,
  SEASON_ZERO_NAME,
  SEASON_ZERO_START_LABEL,
  SEASON_ZERO_TIME_ZONE_LABEL,
} from './season2026';

export interface SaisonSection {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly facts?: readonly SiteStat[];
}

export const SAISON_COPY = {
  seo: {
    title: 'Saison 0 de Gryd : six semaines, ta commune',
    description:
      'La Saison 0 dure six semaines et s’ouvre à toutes les communes de France. Classement hebdomadaire sur le terrain nouveau, jamais sur le terrain gardé.',
  },

  hero: {
    title: `La ${SEASON_ZERO_NAME}`,
    lead: `Du ${SEASON_ZERO_START_LABEL} au ${SEASON_ZERO_END_LABEL}, ${SEASON_ZERO_TIME_ZONE_LABEL}. Six semaines, douze paliers, douze objets à débloquer.`,
    /** Les trois mesures de la saison, chacune avec sa constante. */
    facts: [
      stat(SITE_FACTS.seasonWeeks, 'de saison'),
      stat(SITE_FACTS.seasonTiers, 'paliers de collection'),
      stat(SITE_FACTS.seasonXpPerTier, 'par palier'),
    ] as readonly SiteStat[],
  },

  sections: [
    {
      id: 'partout',
      kicker: 'Ouverture',
      title: 'Elle s’ouvre partout en France',
      body: 'Il n’y a pas de ville pilote et pas de liste d’attente par quartier. Ta commune s’ouvre quand quelqu’un y court. La première boucle fermée chez toi suffit.',
    },
    {
      id: 'compteurs',
      kicker: 'Mesures',
      title: 'Deux compteurs qui ne se mélangent pas',
      body: `Le terrain se mesure en surface. Il change de mains : une boucle plus récente reprend la part qu’elle recouvre. Les XP mesurent ta régularité. Une journée avec au moins ${SITE_COUNTS.dailyMovementMinutes} minutes de mouvement vaut ${SITE_COUNTS.xpPerDay} XP, et les ${SITE_COUNTS.creditedDaysPerWeek} premières journées de la semaine rapportent, les deux sports confondus. Ils ne baissent jamais. Il n’y a aucune série quotidienne à tenir.`,
      facts: [
        stat(SITE_FACTS.dailyMovement, 'de mouvement pour valider une journée'),
        stat(SITE_FACTS.xpPerDay, 'pour une journée validée'),
        stat(SITE_FACTS.creditedDaysPerWeek, 'journées rapportent par semaine'),
      ],
    },
    {
      id: 'classement',
      kicker: 'Ta commune',
      title: 'Le classement de ta commune',
      body: `Chaque semaine, du lundi au dimanche, Gryd classe le terrain nouveau publié dans ta commune. Pas le terrain que tu gardes : sinon celui qui a commencé le premier resterait premier pour toujours. Le terrain tenu s’affiche à côté, comme un état. Tant qu’il y a moins de ${SITE_COUNTS.rankedMinimum} classés dans ta zone, il n’y a pas de classement du tout : l’écran dit « Premier ici ». Un podium à trois serait un chiffre inventé.`,
      facts: [stat(SITE_FACTS.rankedMinimum, 'classés au moins, sinon pas de classement')],
    },
    {
      id: 'defis',
      kicker: 'Chaque semaine',
      title: 'Les défis de la semaine',
      body: 'Deux défis personnels à la fois par discipline, renouvelés chaque semaine. Ils ne donnent jamais d’XP : la récompense est un objet. Leur expiration est silencieuse, sans compte à rebours et sans relance.',
    },
    {
      id: 'fair-play',
      kicker: 'Fair-play',
      title: 'Le fair-play',
      body: 'Aucun achat n’augmente le terrain, les XP ou les points. Aucun bouclier ne s’achète. Aucune protection ne se loue. Les trois multiplicateurs commerciaux valent 1, et c’est écrit dans le code.',
      facts: [
        stat(SITE_FACTS.captureMultiplier, 'sur le terrain pris'),
        stat(SITE_FACTS.xpMultiplier, 'sur les XP gagnés'),
        stat(SITE_FACTS.challengeMultiplier, 'sur les points de défi'),
      ],
    },
  ] as readonly SaisonSection[],

  cta: { label: 'Lire le guide complet', href: '/comment-ca-marche/' },
} as const;
