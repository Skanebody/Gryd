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
import { C } from '../../i18n/catalog/result';
import { t, useT } from '../../i18n/store';
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
  /** GRYD Verified de CE run (serveur seul juge) — plus jamais un `true` en dur. */
  verified: boolean;
  /**
   * Rang atteint (« #8 ») — template Classement (§4.7). NULL = pas de classement
   * réel disponible (season_scores vide) → le style Classement est RETIRÉ de la
   * liste plutôt que d'inventer un rang (charte : zéro donnée fabriquée).
   */
  rankLabel: string | null;
  rankZone: string | null;
  rankDelta: string | null;
  /** État de la zone AVANT la course (Avant/Après). NULL = inconnu → ligne masquée. */
  beforeState: string | null;
}

/**
 * Scénario de démo (cohérent course-result : boucle République, +47 zones).
 * Les noms propres/valeurs restent invariants ; seuls rankDelta et beforeState
 * sont de la copy traduisible → résolus à l'appel via `shareDemo()`.
 */
const SHARE_DEMO_BASE: Omit<ShareDemoData, 'rankDelta' | 'beforeState'> = {
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
  verified: true,
  rankLabel: '#8',
  rankZone: 'Paris Est',
};

/** Démo résolue dans la langue COURANTE (appelée au rendu/au partage, jamais figée). */
export function shareDemo(): ShareDemoData {
  return {
    ...SHARE_DEMO_BASE,
    rankDelta: t(C.demoRankDelta),
    beforeState: t(C.demoContested),
  };
}

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
function BeforeAfter({
  view,
  beforeState,
}: {
  view?: ShareView;
  beforeState: string | null;
}): ReactNode {
  const tt = useT();
  const trace = view?.trace;
  return (
    <View style={styles.beforeAfter}>
      <View style={styles.baCol}>
        <Text style={styles.baLabel}>{tt(C.beforeLabel)}</Text>
        <ShareMap
          style={styles.baMap}
          mode="defense"
          accent={gameColors.rival}
          captured={false}
          trace={trace}
        />
        {beforeState ? <Text style={styles.baState}>{beforeState}</Text> : null}
      </View>
      <View style={styles.baCol}>
        <Text style={[styles.baLabel, styles.baLabelAfter]}>{tt(C.afterLabel)}</Text>
        <ShareMap
          style={styles.baMap}
          mode="loop"
          accent={colors.chartreuse}
          animated={view?.animated}
          replayKey={view?.replayKey}
          trace={trace}
        />
        <Text style={[styles.baState, styles.baStateAfter]}>{tt(C.heldState)}</Text>
      </View>
    </View>
  );
}

/** Les 3 stats « façon Strava » communes (distance · allure · durée). */
function stravaStats(d: ShareDemoData): readonly ShareStat[] {
  return [
    { value: `${d.distanceKm} km`, label: t(C.distanceStat) },
    { value: `${d.paceLabel}`, label: t(C.paceStat) },
    { value: d.clockLabel, label: t(C.durationStat) },
  ];
}

/** Mini-carte partage réutilisée par les 5 templates SVG (VRAI tracé animé). */
/** Trace en GRAND pour le template héros (preuve visuelle, ~40 % de la card). */
function mapHero(d: ShareDemoData, view?: ShareView): ReactNode {
  return (
    <ShareMap
      style={styles.mapHero}
      animated={view?.animated}
      replayKey={view?.replayKey}
      trace={view?.trace ?? d.trace}
      captured={view?.captured}
    />
  );
}

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

/** Signature de card sans champ vide (« KORO · CREW », « KORO », ou la zone). */
function who(d: ShareDemoData): string {
  return [d.playerName, d.crewName].filter(Boolean).join(' · ') || d.zoneName;
}

export const SHARE_TEMPLATES: readonly ShareTemplate[] = [
  // 1. CARTE SIMPLE — façon Strava : trace chartreuse + 3 stats, sobre.
  {
    id: 'simple',
    chip: 'Carte simple',
    build: (d, view) => ({
      title: who(d),
      stat: `${d.distanceKm} km`,
      statLabel: t(C.runValidatedLabel),
      stats: stravaStats(d),
      verified: d.verified,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: map(d, view),
    }),
  },
  // 2. CONQUÊTE — TEMPLATE PRINCIPAL, mode HÉROS (retour fondateur 17/07) :
  //    « une information principale, une preuve visuelle, un défi ». 5 éléments :
  //    J'AI PRIS {ZONE} · grande trace · +47 ZONES · identité · PRENDS-LA-MOI.
  //    Supprimés du visuel : kicker, phrase narrative, note privacy (déplacée
  //    dans l'aperçu), badge hexagonal, mascotte, hashtag. Verified = « ✓ »
  //    discret. Beaucoup d'émotion, une seule capsule.
  {
    id: 'conquete',
    chip: 'Conquête',
    build: (d, view) => ({
      heroTitle: t(C.heroTook, { zone: d.zoneName.toUpperCase() }),
      challenge: t(C.challengeTakeIt),
      title: who(d),
      stat: `+${d.zonesGained}`,
      statLabel: t(C.zonesStatLabel),
      verified: d.verified,
      children: mapHero(d, view),
    }),
  },
  // 3. DÉFENSE — « RÉPUBLIQUE DÉFENDUE · 2 zones · +48 h » + bouclier.
  {
    id: 'defense',
    chip: 'Défense',
    build: (d) => ({
      kicker: t(C.heroDefended),
      title: who(d),
      stat: `+${d.holdHours} h`,
      statLabel: t(C.zonesHeldLabel, { n: d.zonesDefended }),
      subtitle: t(C.borderGuarded, { zone: d.zoneName }),
      verified: d.verified,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <ShieldBadge accent={gameColors.crew} />,
    }),
  },
  // 4. BOUCLE — « BOUCLE FERMÉE · +33 zones bonus » (le geste malin).
  {
    id: 'boucle',
    chip: 'Boucle',
    build: (d, view) => ({
      kicker: t(C.loopClosedKicker),
      title: who(d),
      stat: `+${d.loopBonusZones}`,
      statLabel: t(C.bonusZonesLabel),
      subtitle: t(C.loopMakesZoneSub),
      verified: d.verified,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: map(d, view),
    }),
  },
  // 5. CREW — blason + « LES FOULÉES 9³ · Crew +420 pts ».
  {
    id: 'crew',
    chip: 'Crew',
    build: (d) => ({
      kicker: t(C.forCrewKicker),
      title: d.crewName,
      stat: `+${d.crewPoints}`,
      statLabel: t(C.crewPointsLabel),
      subtitle: t(C.liftedCrew, { player: d.playerName, crew: d.crewName }),
      verified: d.verified,
      children: <CrewCrest seed={d.crewName} name={d.crewName} size="xl" />,
    }),
  },
  // 6. CLASSEMENT (doc §4.7) — « TOP 10 PARIS EST · #8 · +3 places ». Format
  //    statutaire : le ranking est un moteur viral de base (jamais bloqué premium).
  {
    id: 'classement',
    chip: 'Classement',
    build: (d, view) => ({
      kicker: d.rankZone ? t(C.top10Kicker, { zone: d.rankZone.toUpperCase() }) : t(C.rankingKicker),
      title: who(d),
      stat: d.rankLabel ?? '—',
      statLabel: d.rankDelta
        ? t(C.rankDeltaWeek, { delta: d.rankDelta })
        : t(C.rankingSoonLabel),
      subtitle: d.rankLabel && d.rankZone
        ? t(C.climbsTo, { who: who(d), rank: d.rankLabel, zone: d.rankZone })
        : t(C.rankingOpensSeason),
      verified: d.verified,
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
      kicker: t(C.beforeAfterKicker),
      title: who(d),
      stat: `+${d.zonesGained}`,
      statLabel: t(C.zoneRetaken, { zone: d.zoneName }),
      verified: d.verified,
      crest: <CrewCrest seed={d.crewName} name={d.crewName} size="s" />,
      children: <BeforeAfter view={view} beforeState={d.beforeState} />,
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
      kicker: t(C.sectorTakenKicker),
      title: who(d),
      stat: `+${d.zonesGained}`,
      statLabel: t(C.zonesOfZone, { zone: d.zoneName }),
      verified: d.verified,
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
  // Héros : la preuve visuelle domine — large, carrée, bornée par le slot flex.
  mapHero: { width: '86%', maxWidth: 300, aspectRatio: 1, maxHeight: 300 },
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
