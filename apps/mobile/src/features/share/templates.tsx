/**
 * GRYD — 5 templates de partage « Partager ta conquête » (AMENDEMENT-20 §3).
 * « Strava partage une activité. GRYD partage une conquête. » Chaque template
 * est un ShareCard variant PROPRE : fond carte sombre, trace chartreuse, zone
 * en glow, blason discret, ≤ 3 stats + 1 KPI, textes COURTS jamais tronqués.
 *
 *   Carte simple · Conquête · Défense · Boucle · Crew
 *
 * Données de DÉMO déterministes (scénario République — cohérent avec le
 * résultat). En prod, `ShareDemoData` viendra du run validé (IngestRunResponse).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gameColors } from '@klaim/shared';
import { CrewCrest, type ShareCardProps, type ShareStat } from '../../ui/game';
import { Icon } from '../../ui/Icon';
import { ShareMap } from './ShareMap';

/** Un template = id, libellé de chip, et une fabrique de props ShareCard. */
export interface ShareTemplate {
  id: ShareTemplateId;
  /** Libellé COURT du chip sélecteur. */
  chip: string;
  /** Construit les props visuelles de la card (hors ratio/width, gérés à part). */
  build: (d: ShareDemoData) => Omit<ShareCardProps, 'ratio' | 'width' | 'style'>;
}

export type ShareTemplateId = 'simple' | 'conquete' | 'defense' | 'boucle' | 'crew';

/** Données du run validé projetées dans les cards (démo — scénario République). */
export interface ShareDemoData {
  playerName: string;
  crewName: string;
  zoneName: string;
  zonesGained: number;
  loopBonusZones: number;
  zonesDefended: number;
  holdHours: number;
  crewPoints: number;
  distanceKm: string;
  paceLabel: string;
  clockLabel: string;
}

/** Scénario de démo (cohérent course-result : boucle République, +47 zones). */
export const SHARE_DEMO: ShareDemoData = {
  playerName: 'KORO',
  crewName: 'LES FOULÉES 9³',
  zoneName: 'République',
  zonesGained: 47,
  loopBonusZones: 33,
  zonesDefended: 2,
  holdHours: 48,
  crewPoints: 420,
  distanceKm: '4,4',
  paceLabel: "5'12",
  clockLabel: '22:54',
};

/** Bouclier « défense tenue » — icône charte discrète en glow (§3). */
function ShieldBadge({ accent }: { accent: string }): ReactNode {
  return (
    <View style={[styles.shield, { borderColor: accent }]}>
      <Icon name="bouclier" size={40} color={accent} />
    </View>
  );
}

/** Les 3 stats « façon Strava » communes (distance · allure · durée). */
function stravaStats(d: ShareDemoData): readonly ShareStat[] {
  return [
    { value: `${d.distanceKm} km`, label: 'Distance' },
    { value: `${d.paceLabel}`, label: 'Allure' },
    { value: d.clockLabel, label: 'Durée' },
  ];
}

export const SHARE_TEMPLATES: readonly ShareTemplate[] = [
  // 1. CARTE SIMPLE — façon Strava : trace chartreuse + 3 stats, sobre.
  {
    id: 'simple',
    chip: 'Carte simple',
    build: (d) => ({
      title: `${d.playerName} · ${d.crewName}`,
      stat: `${d.distanceKm} km`,
      statLabel: 'Course validée',
      stats: stravaStats(d),
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <ShareMap style={styles.map} />,
    }),
  },
  // 2. CONQUÊTE — « SECTEUR PRIS · +47 zones · République ».
  {
    id: 'conquete',
    chip: 'Conquête',
    build: (d) => ({
      kicker: 'SECTEUR PRIS',
      title: `${d.playerName} · ${d.crewName}`,
      stat: `+${d.zonesGained}`,
      statLabel: `Zones · ${d.zoneName}`,
      subtitle: `${d.zoneName} passe côté crew`,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <ShareMap style={styles.map} />,
    }),
  },
  // 3. DÉFENSE — « RÉPUBLIQUE DÉFENDUE · 2 zones · +48 h » + bouclier.
  {
    id: 'defense',
    chip: 'Défense',
    build: (d) => ({
      kicker: 'ZONE DÉFENDUE',
      title: `${d.playerName} · ${d.crewName}`,
      stat: `+${d.holdHours} h`,
      statLabel: `${d.zonesDefended} zones tenues`,
      subtitle: `${d.zoneName} · frontière gardée`,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <ShieldBadge accent={gameColors.crew} />,
    }),
  },
  // 4. BOUCLE — « BOUCLE FERMÉE · +33 zones bonus » (le geste malin).
  {
    id: 'boucle',
    chip: 'Boucle',
    build: (d) => ({
      kicker: 'BOUCLE FERMÉE',
      title: `${d.playerName} · ${d.crewName}`,
      stat: `+${d.loopBonusZones}`,
      statLabel: 'Zones bonus',
      subtitle: 'La boucle fait la zone',
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <ShareMap style={styles.map} />,
    }),
  },
  // 5. CREW — blason + « LES FOULÉES 9³ · Crew +420 pts ».
  {
    id: 'crew',
    chip: 'Crew',
    build: (d) => ({
      kicker: 'POUR LE CREW',
      title: d.crewName,
      stat: `+${d.crewPoints}`,
      statLabel: 'Points crew',
      subtitle: `${d.playerName} a fait monter ${d.crewName}`,
      children: <CrewCrest seed={d.crewName} name={d.crewName} size="xl" />,
    }),
  },
];

/** Accès direct par id (fallback typé sûr — pas d'index possiblement undefined). */
export const SHARE_TEMPLATES_BY_ID: Record<ShareTemplateId, ShareTemplate> = {
  simple: SHARE_TEMPLATES[0]!,
  conquete: SHARE_TEMPLATES[1]!,
  defense: SHARE_TEMPLATES[2]!,
  boucle: SHARE_TEMPLATES[3]!,
  crew: SHARE_TEMPLATES[4]!,
};

const styles = StyleSheet.create({
  map: { width: '50%', maxWidth: 170, maxHeight: 150 },
  shield: {
    width: 84,
    height: 84,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chartreuse14,
  },
});
