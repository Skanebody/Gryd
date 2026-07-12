/**
 * GRYD — templates de partage « Partager ta conquête » (AMENDEMENT-20 §3, carte
 * 3D AMENDEMENT-24, doc « partage social viral » §4-§5). « Strava partage une
 * activité. GRYD partage une conquête. » Chaque template est un ShareCard variant
 * PROPRE : fond carte sombre, VRAI tracé chartreuse (jamais une ellipse), zone en
 * glow, blason discret, ≤ 3 stats + 1 KPI, textes COURTS jamais tronqués, badge
 * GRYD Verified.
 *
 *   Carte · Conquête · Défense · Boucle · Crew · Classement · Avant/Après · Carte 3D
 *
 * La carte de chaque template dessine un VRAI tracé de rues (BOUCLE_REPUBLIQUE
 * via `ShareMap`) ; en partage le tracé passé (`view.trace`) est DÉJÀ masqué
 * (départ/arrivée retirés — `applySharePrivacy`). Le 6e « Carte 3D » (`carte3d`)
 * monte une VRAIE carte MapLibre pitchée avec la zone extrudée (`ShareMap3D`).
 *
 * ANIMATION : `view.animated` fait se DESSINER la trace puis se REMPLIR la zone
 * (payoff de conquête), `view.replayKey` rejoue (bouton Replay). Reduce motion →
 * état final direct (jamais d'info portée par l'animation seule).
 *
 * Données de DÉMO déterministes (scénario République). En prod, `ShareDemoData`
 * vient du run validé (IngestRunResponse) — le serveur reste seul juge.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gameColors } from '@klaim/shared';
import { CrewCrest, type ShareCardProps, type ShareStat } from '../../ui/game';
import { Icon } from '../../ui/Icon';
import { BOUCLE_REPUBLIQUE, type LatLngPoint } from '../map/realAnchors';
import { ShareMap } from './ShareMap';
import { ShareMap3D } from './ShareMap3D';

/** Un template = id, libellé de chip, et une fabrique de props ShareCard. */
export interface ShareTemplate {
  id: ShareTemplateId;
  /** Libellé COURT du chip sélecteur. */
  chip: string;
  /** Construit les props visuelles de la card (hors ratio/width, gérés à part). */
  build: (d: ShareDemoData, view?: ShareView) => Omit<ShareCardProps, 'ratio' | 'width' | 'style'>;
}

export type ShareTemplateId =
  | 'simple'
  | 'conquete'
  | 'defense'
  | 'boucle'
  | 'crew'
  | 'classement'
  | 'avantApres'
  | 'carte3d';

/**
 * État de RENDU (pas de la donnée) injecté par l'écran /partage dans chaque
 * carte : anime la trace, la rejoue, et fournit le tracé DÉJÀ masqué (privacy).
 * Absent → carte statique sur le tracé démo entier (aperçu/course-result).
 */
export interface ShareView {
  animated?: boolean;
  replayKey?: number;
  /** Tracé du run masqué (départ/arrivée retirés) — remplace le tracé démo. */
  trace?: readonly LatLngPoint[];
  /**
   * `false` = la course n'a RIEN capturé (social_run) : la zone ne se remplit
   * pas (pas de « secteur pris » mensonger). Défaut (undefined) → capturée.
   */
  captured?: boolean;
}

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
  /** VRAI tracé GPS du run (défaut : boucle République). Jamais une ellipse. */
  trace: readonly LatLngPoint[];
  /** Rang atteint (« #8 ») — template Classement (§4.7). */
  rankLabel: string;
  /** Zone/ligue du classement (« PARIS EST »). */
  rankZone: string;
  /** Variation de place (« +3 places cette semaine »). */
  rankDelta: string;
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
  trace: BOUCLE_REPUBLIQUE,
  rankLabel: '#8',
  rankZone: 'Paris Est',
  rankDelta: '+3 places',
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

/**
 * AVANT / APRÈS (doc §4.3) — split de deux VRAIES cartes de la même zone :
 * « avant » = zone contestée (tracé faible + frontière rivale, non capturée) ;
 * « après » = zone tenue (chartreuse, remplie, animée). « Strava montre ce que
 * tu as fait. GRYD montre ce que tu as changé. » Reduce motion : la carte
 * « après » est simplement remplie (l'anim ne porte aucune info).
 */
function BeforeAfter({ view }: { view?: ShareView }): ReactNode {
  const trace = view?.trace;
  return (
    <View style={styles.beforeAfter}>
      <View style={styles.baCol}>
        <Text style={styles.baLabel}>AVANT</Text>
        <ShareMap
          style={styles.baMap}
          mode="defense"
          accent={gameColors.rival}
          captured={false}
          trace={trace}
        />
        <Text style={styles.baState}>Contestée</Text>
      </View>
      <View style={styles.baCol}>
        <Text style={[styles.baLabel, styles.baLabelAfter]}>APRÈS</Text>
        <ShareMap
          style={styles.baMap}
          mode="loop"
          accent={colors.chartreuse}
          animated={view?.animated}
          replayKey={view?.replayKey}
          trace={trace}
        />
        <Text style={[styles.baState, styles.baStateAfter]}>Tenue</Text>
      </View>
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

/** Mini-carte partage réutilisée par les 5 templates SVG (VRAI tracé animé). */
function map(d: ShareDemoData, view: ShareView | undefined, mode: 'loop' | 'defense' = 'loop'): ReactNode {
  return (
    <ShareMap
      style={styles.map}
      mode={mode}
      animated={view?.animated}
      replayKey={view?.replayKey}
      trace={view?.trace ?? d.trace}
      // social_run → captured=false : la zone ne se remplit pas (aucune capture).
      captured={view?.captured}
    />
  );
}

export const SHARE_TEMPLATES: readonly ShareTemplate[] = [
  // 1. CARTE SIMPLE — façon Strava : trace chartreuse + 3 stats, sobre.
  {
    id: 'simple',
    chip: 'Carte simple',
    build: (d, view) => ({
      title: `${d.playerName} · ${d.crewName}`,
      stat: `${d.distanceKm} km`,
      statLabel: 'Course validée',
      stats: stravaStats(d),
      verified: true,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: map(d, view),
    }),
  },
  // 2. CONQUÊTE — « SECTEUR PRIS · +47 zones · République ».
  {
    id: 'conquete',
    chip: 'Conquête',
    build: (d, view) => ({
      kicker: 'SECTEUR PRIS',
      title: `${d.playerName} · ${d.crewName}`,
      stat: `+${d.zonesGained}`,
      statLabel: `Zones · ${d.zoneName}`,
      subtitle: `${d.zoneName} passe côté crew`,
      verified: true,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: map(d, view),
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
      verified: true,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <ShieldBadge accent={gameColors.crew} />,
    }),
  },
  // 4. BOUCLE — « BOUCLE FERMÉE · +33 zones bonus » (le geste malin).
  {
    id: 'boucle',
    chip: 'Boucle',
    build: (d, view) => ({
      kicker: 'BOUCLE FERMÉE',
      title: `${d.playerName} · ${d.crewName}`,
      stat: `+${d.loopBonusZones}`,
      statLabel: 'Zones bonus',
      subtitle: 'La boucle fait la zone',
      verified: true,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: map(d, view),
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
      verified: true,
      children: <CrewCrest seed={d.crewName} name={d.crewName} size="xl" />,
    }),
  },
  // 6. CLASSEMENT (doc §4.7) — « TOP 10 PARIS EST · #8 · +3 places ». Format
  //    statutaire : le ranking est un moteur viral de base (jamais bloqué premium).
  {
    id: 'classement',
    chip: 'Classement',
    build: (d, view) => ({
      kicker: `TOP 10 ${d.rankZone.toUpperCase()}`,
      title: `${d.playerName} · ${d.crewName}`,
      stat: d.rankLabel,
      statLabel: `${d.rankDelta} cette semaine`,
      subtitle: `${d.playerName} grimpe à ${d.rankLabel} sur ${d.rankZone}`,
      verified: true,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: map(d, view),
    }),
  },
  // 7. AVANT / APRÈS (doc §4.3) — le format qui montre ce que tu as CHANGÉ :
  //    zone contestée → zone tenue, split de deux vraies cartes.
  {
    id: 'avantApres',
    chip: 'Avant/Après',
    build: (d, view) => ({
      kicker: 'AVANT · APRÈS',
      title: `${d.playerName} · ${d.crewName}`,
      stat: `+${d.zonesGained}`,
      statLabel: `${d.zoneName} reprise`,
      verified: true,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <BeforeAfter view={view} />,
    }),
  },
  // 8. CARTE 3D (AMENDEMENT-24) — GRYD 3D Conquest Map : fond carte MapLibre
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
      verified: true,
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
  classement: SHARE_TEMPLATES[5]!,
  avantApres: SHARE_TEMPLATES[6]!,
  carte3d: SHARE_TEMPLATES[7]!,
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
  // Avant/Après : deux colonnes égales, séparées par l'espace (pas de card-dans-card).
  beforeAfter: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  baCol: { flex: 1, alignItems: 'center', gap: 6 },
  baMap: { width: '100%', maxWidth: 120, maxHeight: 120 },
  baLabel: { color: colors.gris, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  baLabelAfter: { color: colors.chartreuse },
  baState: { color: gameColors.rival, fontSize: 12, fontWeight: '600' },
  baStateAfter: { color: colors.blanc },
});
