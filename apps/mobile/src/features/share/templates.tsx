/**
 * GRYD — 6 templates de partage « Partager ta conquête » (AMENDEMENT-20 §3 +
 * carte 3D AMENDEMENT-24). « Strava partage une activité. GRYD partage une
 * conquête. » Chaque template est un ShareCard variant PROPRE : fond carte
 * sombre, trace chartreuse, zone en glow, blason discret, ≤ 3 stats + 1 KPI,
 * textes COURTS jamais tronqués.
 *
 *   Carte simple · Conquête · Défense · Boucle · Crew · Carte 3D
 *
 * Les 5 premiers utilisent le faux-map SVG léger (`ShareMap`, rapide). Le 6e,
 * « Carte 3D » (`carte3d`), monte une VRAIE carte MapLibre PITCHEE avec la zone
 * conquise EXTRUDEE en volume (`ShareMap3D`) — l'équivalent propriétaire de la
 * carte 3D Strava, sans clé ni Mapbox.
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
import { ShareMap3D } from './ShareMap3D';

/** Un template = id, libellé de chip, et une fabrique de props ShareCard. */
export interface ShareTemplate {
  id: ShareTemplateId;
  /** Libellé COURT du chip sélecteur. */
  chip: string;
  /** Construit les props visuelles de la card (hors ratio/width, gérés à part). */
  build: (d: ShareDemoData) => Omit<ShareCardProps, 'ratio' | 'width' | 'style'>;
}

export type ShareTemplateId = 'simple' | 'conquete' | 'defense' | 'boucle' | 'crew' | 'carte3d';

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

/**
 * Bouclier « défense tenue » — emblème en GLOW (AMENDEMENT-22), pas une boîte
 * cadrée : disque de halo chartreuse translucide, aucun contour dur. Il flotte
 * sur la card comme la zone dessinée (jamais de container-dans-container).
 */
function ShieldBadge({ accent }: { accent: string }): ReactNode {
  return (
    <View style={styles.shieldGlow}>
      <Icon name="bouclier" size={48} color={accent} />
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
  // 6. CARTE 3D (AMENDEMENT-24) — GRYD 3D Conquest Map : fond carte MapLibre
  //    PITCHEE, zone conquise EXTRUDEE en volume chartreuse, trace épaisse, zone
  //    rivale atténuée. Overlay stats : GRYD · +47 · Zones · République. La carte
  //    est le SLOT PLEIN CADRE (`mapBackground`) — pas de mini-carte `children`.
  {
    id: 'carte3d',
    chip: 'Carte 3D',
    build: (d) => ({
      kicker: 'SECTEUR PRIS',
      title: `${d.playerName} · ${d.crewName}`,
      stat: `+${d.zonesGained}`,
      statLabel: `Zones · ${d.zoneName}`,
      mapBackground: <ShareMap3D style={styles.map3d} />,
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
  carte3d: SHARE_TEMPLATES[5]!,
};

const styles = StyleSheet.create({
  map: { width: '50%', maxWidth: 170, maxHeight: 150 },
  // Carte 3D : remplit le slot plein cadre `mapBackground` de la ShareCard.
  map3d: { flex: 1 },
  // Halo doux (glow), disque translucide sans contour dur — un emblème, pas une boîte.
  shieldGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chartreuse14,
  },
});
