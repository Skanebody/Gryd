/**
 * GRYD — E18 « Statistiques & data » : les TROIS graphiques de la planche.
 *
 * Règles graphiques CONTRAIGNANTES appliquées ici, sans exception :
 *  · UN message par graphique. Le regard obtient la réponse SANS lire un axe :
 *    la valeur qui porte le message est écrite en clair à côté de sa barre.
 *  · DEUX couleurs maximum : chartreuse = ma série / la valeur qui parle,
 *    `colors.grisLigne` = le contexte. Jamais une couleur par entrée.
 *  · Gridlines quasi invisibles (`colors.blanc12`), jamais de cadre, jamais de
 *    légende distante — les labels sont posés SOUS les marques.
 *  · Barres · aire · carrés SEULEMENT. Pas de radar, pas de donut décoratif.
 *  · Chiffres TABULAIRES partout (`typography.stat` / `fontVariant`).
 *  · Chaque marque est un bouton : `accessibilityLabel` complet (VoiceOver lit
 *    « Samedi, 8,2 km, 2 courses ») + bulle au tap pour le regard.
 *
 * Ces composants ne calculent RIEN et ne traduisent RIEN : ils reçoivent des
 * textes déjà composés par l'écran (locale-aware) et des nombres déjà dérivés
 * par le moteur pur. Aucune surface (pas de fond, pas de contour) : ils vivent
 * DANS la surface N1 de leur bloc — jamais une card dans une card.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import { colors, fontSizes, fonts, radii, spacing } from '@klaim/shared';

/** Hauteur utile d'un graphique (une seule valeur pour les deux tracés). */
const CHART_H = 96;
/** Hauteur d'une barre à zéro : un jour sans course reste VISIBLE comme un jour. */
const EMPTY_BAR_H = 2;

/**
 * Ligne de bulle partagée. Hauteur RÉSERVÉE même vide : sans elle, le premier
 * tap ferait sauter tout le bloc d'une ligne.
 */
function Tooltip({ text }: { text: string | null }) {
  return (
    <Text
      style={styles.tooltip}
      numberOfLines={1}
      ellipsizeMode="clip"
      accessibilityLiveRegion="polite"
    >
      {text ?? ' '}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOC 1 — histogramme des 7 jours (L M M J V S D)
// ─────────────────────────────────────────────────────────────────────────────

export interface Bars7Props {
  /** 7 valeurs, lundi → dimanche. */
  values: readonly number[];
  /** Jour qui porte le message (chartreuse). `null` = aucun (tout à zéro). */
  bestIndex: number | null;
  /** 7 abréviations d'axe, déjà traduites. */
  shortLabels: readonly string[];
  /** 7 libellés VoiceOver complets, déjà composés (« Samedi, 8,2 km, 2 courses »). */
  a11yLabels: readonly string[];
  /** 7 textes de bulle, déjà composés. */
  tooltips: readonly string[];
  /** Libellé du graphique entier (groupe). */
  groupLabel: string;
  /** Valeur du meilleur jour, formatée — label DIRECT posé au-dessus de sa barre. */
  bestValueLabel: string | null;
}

export function Bars7({
  values,
  bestIndex,
  shortLabels,
  a11yLabels,
  tooltips,
  groupLabel,
  bestValueLabel,
}: Bars7Props) {
  const [open, setOpen] = useState<number | null>(null);
  const max = Math.max(...values, 0);
  // La zone de barre laisse la place au label direct du meilleur jour.
  const barMax = CHART_H - 18;

  return (
    <View accessibilityLabel={groupLabel} style={styles.chartWrap}>
      <Tooltip text={open === null ? null : (tooltips[open] ?? null)} />
      <View style={[styles.plot, { height: CHART_H }]}>
        {/* Gridline unique, à peine visible : elle donne un sol, pas une grille. */}
        <View style={styles.gridBaseline} pointerEvents="none" />
        {values.map((v, i) => {
          const best = i === bestIndex;
          const h = max > 0 ? Math.max(EMPTY_BAR_H, Math.round((v / max) * barMax)) : EMPTY_BAR_H;
          return (
            <Pressable
              key={shortLabels[i] ?? String(i)}
              accessibilityRole="button"
              accessibilityLabel={a11yLabels[i] ?? ''}
              hitSlop={10}
              onPress={() => setOpen((cur) => (cur === i ? null : i))}
              style={styles.col}
            >
              {best && bestValueLabel ? (
                <Text style={styles.directValue} numberOfLines={1} ellipsizeMode="clip">
                  {bestValueLabel}
                </Text>
              ) : null}
              <View style={[styles.bar, { height: h }, best && styles.barBest]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {shortLabels.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            style={[styles.axisLabel, i === bestIndex && styles.axisLabelBest]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOC 2 — aire discrète des GAINS par semaine
// ─────────────────────────────────────────────────────────────────────────────

/** Repère interne du tracé SVG (mis à l'échelle par le conteneur). */
const VB_W = 300;
const VB_H = 84;

export interface AreaMiniProps {
  /** Une valeur par semaine, de la plus ANCIENNE à la semaine en cours. */
  values: readonly number[];
  /** Libellés VoiceOver, un par point, déjà composés. */
  a11yLabels: readonly string[];
  /** Textes de bulle, un par point. */
  tooltips: readonly string[];
  groupLabel: string;
  /** Extrémités de l'axe (« S-11 » … « Cette sem. ») — labels DIRECTS. */
  firstLabel: string;
  lastLabel: string;
}

export function AreaMini({
  values,
  a11yLabels,
  tooltips,
  groupLabel,
  firstLabel,
  lastLabel,
}: AreaMiniProps) {
  const [open, setOpen] = useState<number | null>(null);
  const n = values.length;
  const max = Math.max(...values, 0);
  // Un seul point ne fait pas une courbe : l'appelant ne doit pas nous appeler
  // dans ce cas (il affiche son état « pas encore de tendance »).
  if (n < 2 || max <= 0) return null;

  const x = (i: number) => (i / (n - 1)) * VB_W;
  const y = (v: number) => VB_H - 2 - (v / max) * (VB_H - 10);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `0,${VB_H} ${line} ${VB_W},${VB_H}`;

  return (
    <View accessibilityLabel={groupLabel} style={styles.chartWrap}>
      <Tooltip text={open === null ? null : (tooltips[open] ?? null)} />
      <View style={styles.areaBox}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Polygon points={area} fill={colors.chartreuse14} />
          <Polyline
            points={line}
            fill="none"
            stroke={colors.chartreuse}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        {/* Zones tactiles au-dessus du tracé : une par point, jamais dessinées. */}
        <View style={styles.areaHits} pointerEvents="box-none">
          {values.map((_, i) => (
            <Pressable
              key={a11yLabels[i] ?? String(i)}
              accessibilityRole="button"
              accessibilityLabel={a11yLabels[i] ?? ''}
              onPress={() => setOpen((cur) => (cur === i ? null : i))}
              style={styles.areaHit}
            />
          ))}
        </View>
        <View style={styles.gridBaseline} pointerEvents="none" />
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisEdge} numberOfLines={1} ellipsizeMode="clip">
          {firstLabel}
        </Text>
        <Text style={[styles.axisEdge, styles.axisEdgeEnd]} numberOfLines={1} ellipsizeMode="clip">
          {lastLabel}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOC 3 — une case par semaine, remplies = semaines actives
// ─────────────────────────────────────────────────────────────────────────────

export interface WeekSquaresProps {
  /** Une entrée par semaine, de la plus ANCIENNE à la semaine en cours. */
  active: readonly boolean[];
  a11yLabels: readonly string[];
  tooltips: readonly string[];
  groupLabel: string;
}

export function WeekSquares({ active, a11yLabels, tooltips, groupLabel }: WeekSquaresProps) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View accessibilityLabel={groupLabel} style={styles.chartWrap}>
      <Tooltip text={open === null ? null : (tooltips[open] ?? null)} />
      <View style={styles.squares}>
        {active.map((on, i) => (
          <Pressable
            key={a11yLabels[i] ?? String(i)}
            accessibilityRole="button"
            accessibilityLabel={a11yLabels[i] ?? ''}
            hitSlop={12}
            onPress={() => setOpen((cur) => (cur === i ? null : i))}
            style={[styles.square, on && styles.squareOn]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: { gap: spacing.xxs },
  // Bulle au tap : une ligne, hauteur réservée (jamais de saut de mise en page).
  tooltip: {
    minHeight: 16,
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },

  // ── Histogramme ──
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xxs },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    alignSelf: 'stretch',
    backgroundColor: colors.grisLigne, // contexte
    borderRadius: radii.sm,
  },
  barBest: { backgroundColor: colors.chartreuse }, // la valeur qui porte le message
  directValue: {
    color: colors.chartreuse,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  // Sol du graphique : un filet à peine visible, pas une grille.
  gridBaseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.blanc12,
  },
  axis: { flexDirection: 'row', gap: spacing.xxs },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.grisFaible,
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
  },
  axisLabelBest: { color: colors.blanc },
  axisEdge: { flex: 1, color: colors.grisFaible, fontFamily: fonts.mono, fontSize: fontSizes.xs },
  axisEdgeEnd: { textAlign: 'right' },

  // ── Aire ──
  areaBox: { width: '100%', height: VB_H, justifyContent: 'flex-end' },
  areaHits: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  areaHit: { flex: 1 },

  // ── Carrés de semaines ──
  squares: { flexDirection: 'row', gap: spacing.xxs, paddingVertical: spacing.xxs },
  square: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 24,
    borderRadius: radii.sm,
    backgroundColor: colors.grisLigne, // semaine sans course : contexte, ton neutre
  },
  squareOn: { backgroundColor: colors.chartreuse },
});
