/**
 * GRYD — Aperçus FIDÈLES des cosmétiques de l'Arsenal (« montre ce que ça fait »).
 *
 * Le fondateur : « on ne sait pas à quoi servent les objets ; mettre un détail avec
 * des ILLUSTRATIONS pour comprendre ». Chaque composant est un aperçu react-native-svg
 * PUR (aucun état, aucune dépendance runtime, viewBox fixe + `size` responsive) qui
 * RÉNDU le style RÉEL du cosmétique — pas une icône générique. Table de style par
 * `item.key`, FALLBACK propre par famille si la clé est inconnue.
 *
 * HONNÊTETÉ (règle n°1) : ces cosmétiques n'ont AUCUN effet de jeu. L'illustration ne
 * montre QUE du STYLE (frontière, remplissage, trait, cadre, étendard) — jamais un
 * avantage (pas de points, zones, protection, capture). Un mini-label au plus.
 *
 * Charte : tokens @klaim/shared uniquement. Fond des aperçus = sombre (elevation.raised),
 * donc chartreuse OK ; aucune couleur en dur hors tokens.
 */
import type { ReactElement } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, fonts, gameColors } from '@klaim/shared';
import { ARSENAL_PREVIEW_I18N } from '../../../i18n/catalog/arsenalPreview';
import { useT } from '../../../i18n/store';
import type { ArsenalCatalogItem } from '../catalog';
import { arsenalName } from '../copy';

/**
 * Décline un TOKEN hex (#RRGGBB) en rgba() à l'alpha voulu : les teintes
 * translucides des aperçus DÉRIVENT ainsi des tokens (§ charte « aucune couleur
 * en dur — toute couleur hors tokens = bug »). Même patron que mapStyle.withAlpha,
 * gardé LOCAL pour éviter un import croisé carte ↔ arsenal.
 */
function withAlpha(tokenHex: string, alpha: number): string {
  const h = tokenHex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * CONTRAT partagé des aperçus Arsenal (l'orchestrateur ré-exporte ce type depuis
 * preview/index.tsx). Un aperçu lit `item.key` / `item.section` pour choisir son rendu.
 */
export interface ArsenalPreviewProps {
  /** Item du catalogue Arsenal (miroir seed 0014). */
  item: ArsenalCatalogItem;
  /** Largeur cible en px (hauteur = size * ratio du viewBox). Défaut ~200. */
  size?: number;
}

const VB = 200;
const DEFAULT_SIZE = 200;

// ─── Géométries partagées (viewBox 200×200) ──────────────────────────────────

/** Zone de territoire ORGANIQUE (blob arrondi) centrée, ~ marge 34 px. */
const ZONE_BLOB =
  'M100 34 C 140 32, 168 52, 170 86 C 172 118, 156 150, 118 162 C 84 172, 48 160, 38 128 C 28 98, 34 62, 66 44 C 76 38, 88 35, 100 34 Z';

/** Trace de course SINUEUSE (polyline lissée) traversant le cadre. */
const TRACE_PATH =
  'M28 150 C 54 150, 58 108, 84 104 C 108 100, 106 60, 132 56 C 152 53, 160 40, 172 34';

/** Étendard de bannière (rectangle large, base en pointe douce). */
const BANNER_SHAPE =
  'M40 44 H160 V128 L100 156 L40 128 Z';

/** Écu de blason (bouclier). */
const SHIELD_SHAPE =
  'M100 30 L156 50 V96 C156 132, 130 156, 100 170 C 70 156, 44 132, 44 96 V50 Z';

// ══ Aperçu 1 — SKIN TERRITOIRE ════════════════════════════════════════════════

/** Traitement visuel d'un skin territoire (rendu DISTINCT par clé). */
interface TerritoryStyle {
  /** Remplissage de la zone. */
  fill: string;
  /** Couleur de frontière. */
  stroke: string;
  /** Épaisseur de frontière. */
  strokeWidth: number;
  /** Pointillé de frontière (optionnel). */
  dash?: string;
  /** Décor INTÉRIEUR : trame nocturne, hachures ivoire, ou marque founder. */
  inner?: 'grid' | 'hatch' | 'founder';
  /** Teinte du décor intérieur. */
  innerColor?: string;
  /** Mini-label (nom court du traitement). */
  label: string;
}

const TERRITORY_STYLES: Record<string, TerritoryStyle> = {
  skin_territory_gold_border: {
    fill: withAlpha(gameColors.gold, 0.1),
    stroke: gameColors.gold,
    strokeWidth: 4,
    label: 'Frontière or',
  },
  skin_territory_ghost: {
    fill: withAlpha(colors.blanc, 0.05),
    stroke: withAlpha(colors.blanc, 0.22),
    strokeWidth: 2,
    dash: '1 7',
    label: 'Fantôme',
  },
  skin_territory_night_grid: {
    fill: withAlpha(gameColors.electricBlue, 0.08),
    stroke: gameColors.electricBlue,
    strokeWidth: 2,
    inner: 'grid',
    innerColor: withAlpha(gameColors.electricBlue, 0.35),
    label: 'Trame nuit',
  },
  skin_territory_blackout: {
    fill: colors.noir,
    stroke: colors.blanc,
    strokeWidth: 2.5,
    label: 'Blackout',
  },
  skin_territory_ivory_lines: {
    fill: withAlpha(colors.blanc, 0.04),
    stroke: colors.blanc,
    strokeWidth: 1.5,
    inner: 'hatch',
    innerColor: withAlpha(colors.blanc, 0.3),
    label: 'Hachures',
  },
  skin_territory_ember: {
    fill: withAlpha(gameColors.rival, 0.1),
    stroke: gameColors.rival,
    strokeWidth: 3.5,
    label: 'Braise',
  },
  skin_territory_frost: {
    fill: withAlpha(gameColors.verify, 0.08),
    stroke: gameColors.verify,
    strokeWidth: 3,
    dash: '10 5',
    label: 'Givre',
  },
  skin_territory_founder_glow: {
    fill: colors.chartreuse14,
    stroke: colors.chartreuse40,
    strokeWidth: 3,
    inner: 'founder',
    innerColor: colors.chartreuse,
    label: 'Founder',
  },
};

const TERRITORY_FALLBACK: TerritoryStyle = {
  fill: withAlpha(colors.blanc, 0.05),
  stroke: colors.gris,
  strokeWidth: 2,
  label: 'Skin zone',
};

/** Décor intérieur d'une zone (clippé visuellement à l'aire du blob par recouvrement). */
function TerritoryInner({ kind, color }: { kind: TerritoryStyle['inner']; color: string }) {
  if (kind === 'grid') {
    const lines = [];
    for (let x = 54; x <= 158; x += 20) {
      lines.push(<Path key={`v${x}`} d={`M${x} 50 V150`} stroke={color} strokeWidth={1} />);
    }
    for (let y = 56; y <= 150; y += 20) {
      lines.push(<Path key={`h${y}`} d={`M50 ${y} H160`} stroke={color} strokeWidth={1} />);
    }
    return <G opacity={0.9}>{lines}</G>;
  }
  if (kind === 'hatch') {
    const lines = [];
    for (let i = -40; i <= 160; i += 16) {
      lines.push(<Path key={i} d={`M${i} 172 L${i + 130} 42`} stroke={color} strokeWidth={1} />);
    }
    return <G opacity={0.85}>{lines}</G>;
  }
  if (kind === 'founder') {
    // Marque Founder = petite étoile chartreuse discrète au centre.
    return (
      <Path
        d="M100 78 L108 98 L130 98 L112 111 L119 132 L100 119 L81 132 L88 111 L70 98 L92 98 Z"
        fill={color}
        opacity={0.9}
      />
    );
  }
  return null;
}

export function TerritorySkinPreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const t = useT();
  const s = TERRITORY_STYLES[item.key] ?? TERRITORY_FALLBACK;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      accessibilityLabel={t(ARSENAL_PREVIEW_I18N['preview.cosmetic.skinTerritory'], { name: arsenalName(item, t) })}
    >
      {/* Remplissage de la zone */}
      <Path d={ZONE_BLOB} fill={s.fill} stroke="none" />
      {/* Décor intérieur, masqué à l'aire du blob (donut evenodd, cf. inZone) */}
      {s.inner ? inZone(<TerritoryInner kind={s.inner} color={s.innerColor ?? colors.gris} />) : null}
      {/* Frontière (le traitement dominant du skin) */}
      <Path
        d={ZONE_BLOB}
        fill="none"
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        strokeDasharray={s.dash}
        strokeLinejoin="round"
      />
      <PreviewLabel text={s.label} />
    </Svg>
  );
}

/**
 * Clippe un décor à l'aire de la zone (le blob sert de fenêtre). react-native-svg
 * supporte `clipPath` via <ClipPath>, mais pour rester ultra-portable web+natif on
 * superpose un masque : on rend le décor puis on masque l'extérieur par un anneau. Ici
 * l'approche simple = recouvrir l'extérieur du blob avec la couleur de fond (transparent
 * sur elevation.raised) via un « donut » path evenodd.
 */
function inZone(child: ReactElement) {
  return (
    <G>
      {child}
      {/* Donut : rectangle plein - trou en forme de zone (evenodd) coupe le décor hors zone. */}
      <Path
        d={`M0 0 H${VB} V${VB} H0 Z ${ZONE_BLOB}`}
        fill={colors.carbone2}
        fillRule="evenodd"
      />
    </G>
  );
}

// ══ Aperçu 2 — SKIN TRACE ═════════════════════════════════════════════════════

interface TraceStyle {
  stroke: string;
  strokeWidth: number;
  dash?: string;
  cap: 'round' | 'butt';
  /** Casing (halo dessous) pour l'effet lumineux/électrique. */
  glow?: string;
  glowWidth?: number;
  /** Effilé aux extrémités (blade). */
  taper?: boolean;
  opacity?: number;
  label: string;
}

const TRACE_STYLES: Record<string, TraceStyle> = {
  skin_trace_electric: {
    stroke: gameColors.verify,
    strokeWidth: 4,
    cap: 'round',
    glow: withAlpha(gameColors.verify, 0.3),
    glowWidth: 11,
    label: 'Électrique',
  },
  skin_trace_chartreuse_pulse: {
    stroke: colors.chartreuse,
    strokeWidth: 4,
    cap: 'round',
    dash: '2 12',
    glow: colors.chartreuse40,
    glowWidth: 10,
    label: 'Pulse',
  },
  skin_trace_neon_ivory: {
    stroke: colors.blanc,
    strokeWidth: 4,
    cap: 'round',
    glow: withAlpha(colors.blanc, 0.22),
    glowWidth: 10,
    label: 'Neon Ivory',
  },
  skin_trace_ghost_line: {
    stroke: colors.blanc,
    strokeWidth: 3.5,
    cap: 'round',
    opacity: 0.35,
    label: 'Ghost',
  },
  skin_trace_carbon_dash: {
    stroke: colors.blanc,
    strokeWidth: 3.5,
    cap: 'butt',
    dash: '3 5',
    label: 'Carbon Dash',
  },
  skin_trace_midnight: {
    stroke: gameColors.electricBlue,
    strokeWidth: 4,
    cap: 'round',
    label: 'Midnight',
  },
  skin_trace_blade: {
    stroke: colors.blanc,
    strokeWidth: 5,
    cap: 'butt',
    taper: true,
    label: 'Blade',
  },
  skin_trace_founder_line: {
    stroke: colors.chartreuse,
    strokeWidth: 4,
    cap: 'round',
    glow: colors.chartreuse40,
    glowWidth: 12,
    label: 'Founder Line',
  },
};

const TRACE_FALLBACK: TraceStyle = {
  stroke: colors.blanc,
  strokeWidth: 4,
  cap: 'round',
  label: 'Skin trace',
};

export function TraceSkinPreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const t = useT();
  const s = TRACE_STYLES[item.key] ?? TRACE_FALLBACK;
  const gradId = `blade-${item.key}`;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      accessibilityLabel={t(ARSENAL_PREVIEW_I18N['preview.cosmetic.skinTrace'], { name: arsenalName(item, t) })}
    >
      {s.taper ? (
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={s.stroke} stopOpacity={0.15} />
            <Stop offset="0.5" stopColor={s.stroke} stopOpacity={1} />
            <Stop offset="1" stopColor={s.stroke} stopOpacity={0.15} />
          </LinearGradient>
        </Defs>
      ) : null}
      {/* Casing / glow dessous (façon trace héros §B) */}
      {s.glow ? (
        <Path
          d={TRACE_PATH}
          fill="none"
          stroke={s.glow}
          strokeWidth={s.glowWidth ?? s.strokeWidth + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {/* Core */}
      <Path
        d={TRACE_PATH}
        fill="none"
        stroke={s.taper ? `url(#${gradId})` : s.stroke}
        strokeWidth={s.strokeWidth}
        strokeLinecap={s.cap}
        strokeLinejoin="round"
        strokeDasharray={s.dash}
        opacity={s.opacity ?? 1}
      />
      {/* Points de départ / arrivée (repère de course, neutres) */}
      <Circle cx={28} cy={150} r={4} fill={s.stroke} opacity={s.opacity ?? 1} />
      <Circle cx={172} cy={34} r={4} fill={s.stroke} opacity={s.opacity ?? 1} />
      <PreviewLabel text={s.label} />
    </Svg>
  );
}

// ══ Aperçu 3 — FRAME (cadre de Player Card) ═══════════════════════════════════

interface FrameStyle {
  ring: string;
  ringWidth: number;
  dash?: string;
  /** Double liséré (tiers hauts). */
  outerRing?: string;
  /** Badge d'angle (founder). */
  badge?: 'founder' | 'title';
  label: string;
}

const FRAME_STYLES: Record<string, FrameStyle> = {
  frame_road: { ring: colors.gris, ringWidth: 3, label: 'Road' },
  frame_tempo: { ring: colors.blanc, ringWidth: 3, label: 'Tempo' },
  frame_race: { ring: gameColors.verify, ringWidth: 3.5, label: 'Race' },
  frame_carbon: { ring: colors.blanc, ringWidth: 4, outerRing: withAlpha(colors.blanc, 0.2), label: 'Carbon' },
  frame_elite: { ring: gameColors.gold, ringWidth: 4, outerRing: withAlpha(gameColors.gold, 0.35), label: 'Elite' },
  frame_founder: { ring: colors.chartreuse, ringWidth: 4, outerRing: colors.chartreuse40, badge: 'founder', label: 'Founder' },
  founder_badge: { ring: colors.chartreuse, ringWidth: 4, outerRing: colors.chartreuse40, badge: 'founder', label: 'Badge Founder' },
  title_founder_runner: { ring: colors.chartreuse40, ringWidth: 3, badge: 'title', label: 'Founder Runner' },
};

const FRAME_FALLBACK: FrameStyle = { ring: colors.gris, ringWidth: 3, label: 'Cadre' };

export function FramePreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const t = useT();
  const s = FRAME_STYLES[item.key] ?? FRAME_FALLBACK;
  const cx = VB / 2;
  const cy = 92;
  const rAvatar = 40;
  const rRing = 54;
  const isTitle = s.badge === 'title';
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      accessibilityLabel={t(ARSENAL_PREVIEW_I18N['preview.cosmetic.frame'], { name: arsenalName(item, t) })}
    >
      {/* Avatar (silhouette neutre) */}
      <Circle cx={cx} cy={cy} r={rAvatar} fill={colors.carbone} stroke={colors.grisLigne} strokeWidth={1} />
      <Circle cx={cx} cy={cy - 8} r={13} fill={colors.gris} opacity={0.7} />
      <Path d={`M${cx - 22} ${cy + 30} C ${cx - 20} ${cy + 6}, ${cx + 20} ${cy + 6}, ${cx + 22} ${cy + 30} Z`} fill={colors.gris} opacity={0.7} />
      {/* Cadre externe (double liséré des tiers hauts) */}
      {s.outerRing ? (
        <Circle cx={cx} cy={cy} r={rRing + 5} fill="none" stroke={s.outerRing} strokeWidth={2} />
      ) : null}
      {/* Cadre principal du tier */}
      <Circle
        cx={cx}
        cy={cy}
        r={rRing}
        fill="none"
        stroke={s.ring}
        strokeWidth={s.ringWidth}
        strokeDasharray={s.dash}
      />
      {/* Badge Founder (petite étoile en bas) */}
      {s.badge === 'founder' ? (
        <G>
          <Circle cx={cx} cy={cy + rRing + 2} r={12} fill={colors.noir} stroke={s.ring} strokeWidth={2} />
          <Path
            d={`M${cx} ${cy + rRing - 5} l4 8 l9 0 l-7 6 l3 9 l-9 -6 l-9 6 l3 -9 l-7 -6 l9 0 Z`}
            fill={colors.chartreuse}
          />
        </G>
      ) : null}
      {isTitle ? (
        <G>
          {/* Ruban de titre sous l'avatar */}
          <Rect x={cx - 52} y={cy + rRing - 2} width={104} height={22} rx={11} fill={colors.noir} stroke={colors.chartreuse40} strokeWidth={1.5} />
          <SvgText x={cx} y={cy + rRing + 13} fill={colors.chartreuse} fontSize={11} fontFamily={fonts.text} textAnchor="middle">
            Founder Runner
          </SvgText>
        </G>
      ) : (
        <PreviewLabel text={s.label} />
      )}
    </Svg>
  );
}

// ══ Aperçu 4 — BANNER (étendard crew) ═════════════════════════════════════════

interface BannerStyle {
  fill: string;
  /** Barre / accent secondaire. */
  accent: string;
  /** Motif : diagonale, ligne, orage. */
  motif?: 'diagonal' | 'baseline' | 'storm' | 'district';
  label: string;
}

const BANNER_STYLES: Record<string, BannerStyle> = {
  crew_banner_impact: { fill: colors.blanc, accent: colors.noir, motif: 'diagonal', label: 'Impact' },
  crew_banner_war_ready: { fill: gameColors.rival, accent: colors.noir, motif: 'diagonal', label: 'War Ready' },
  crew_banner_blackline: { fill: colors.noir, accent: colors.blanc, motif: 'baseline', label: 'Black Line' },
  crew_banner_chartreuse: { fill: colors.noir, accent: colors.chartreuse, motif: 'storm', label: 'Chartreuse Storm' },
  crew_banner_district: { fill: colors.carbone2, accent: colors.gris, motif: 'district', label: 'District' },
  crew_banner_legend: { fill: colors.noir, accent: gameColors.gold, motif: 'baseline', label: 'Legend Row' },
};

const BANNER_FALLBACK: BannerStyle = { fill: colors.carbone2, accent: colors.gris, label: 'Bannière' };

export function BannerPreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const t = useT();
  const s = BANNER_STYLES[item.key] ?? BANNER_FALLBACK;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      accessibilityLabel={t(ARSENAL_PREVIEW_I18N['preview.cosmetic.banner'], { name: arsenalName(item, t) })}
    >
      {/* Étendard */}
      <Path d={BANNER_SHAPE} fill={s.fill} stroke={colors.grisLigne} strokeWidth={1} strokeLinejoin="round" />
      {/* Motif par clé */}
      {s.motif === 'diagonal' ? (
        <G>
          <Path d="M40 128 L110 44" stroke={s.accent} strokeWidth={10} />
          <Path d="M70 138 L140 54" stroke={s.accent} strokeWidth={4} opacity={0.6} />
        </G>
      ) : null}
      {s.motif === 'baseline' ? (
        <Path d="M40 118 H160" stroke={s.accent} strokeWidth={6} />
      ) : null}
      {s.motif === 'storm' ? (
        <Path d="M108 52 L86 96 L102 96 L92 128 L124 82 L106 82 Z" fill={s.accent} />
      ) : null}
      {s.motif === 'district' ? (
        <G opacity={0.8}>
          <Path d="M56 64 H120 M56 84 H144 M76 84 V120 M112 64 V128" stroke={s.accent} strokeWidth={2} />
        </G>
      ) : null}
      {/* Sceau crew (petit disque neutre) */}
      <Circle cx={100} cy={92} r={13} fill={colors.noir} stroke={s.accent} strokeWidth={2} opacity={s.motif === 'storm' ? 0 : 0.9} />
      <PreviewLabel text={s.label} onLight={false} />
    </Svg>
  );
}

// ══ Aperçu 5 — TEMPLATE (mini share card 9:16) ════════════════════════════════

interface TemplateStyle {
  bg: string;
  trace: string;
  accent: string;
  /** Deux traces (before/after). */
  beforeAfter?: boolean;
  label: string;
}

const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  template_first_zone: { bg: colors.carbone, trace: colors.chartreuse, accent: colors.chartreuse40, label: 'Première zone' },
  template_zone_taken: { bg: colors.noir, trace: colors.chartreuse, accent: gameColors.rival, label: 'Zone prise' },
  template_night_run: { bg: colors.noir, trace: colors.chartreuse, accent: gameColors.electricBlue, label: 'Night Run' },
  template_before_after: { bg: colors.carbone, trace: colors.chartreuse, accent: colors.gris, beforeAfter: true, label: 'Before / After' },
  template_route_opened: { bg: colors.carbone, trace: colors.blanc, accent: colors.chartreuse, label: 'Route ouverte' },
  template_founder: { bg: colors.noir, trace: colors.chartreuse, accent: colors.chartreuse40, label: 'Founder' },
  crew_recruit_template: { bg: colors.carbone, trace: colors.chartreuse, accent: gameColors.gold, label: 'Recrutement' },
};

const TEMPLATE_FALLBACK: TemplateStyle = { bg: colors.carbone, trace: colors.chartreuse, accent: colors.gris, label: 'Template' };

/** Cadre 9:16 centré dans le viewBox 200×200. */
const CARD_W = 96;
const CARD_H = 168;
const CARD_X = (VB - CARD_W) / 2;
const CARD_Y = (VB - CARD_H) / 2;

export function TemplatePreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const t = useT();
  const s = TEMPLATE_STYLES[item.key] ?? TEMPLATE_FALLBACK;
  const midX = VB / 2;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      accessibilityLabel={t(ARSENAL_PREVIEW_I18N['preview.cosmetic.template'], { name: arsenalName(item, t) })}
    >
      {/* Carte 9:16 */}
      <Rect x={CARD_X} y={CARD_Y} width={CARD_W} height={CARD_H} rx={12} fill={s.bg} stroke={colors.grisLigne} strokeWidth={1} />
      {/* Trace (ou before/after) */}
      {s.beforeAfter ? (
        <G>
          <Polyline
            points={`${midX - 26},110 ${midX - 18},92 ${midX - 24},74 ${midX - 12},58`}
            fill="none"
            stroke={s.accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
          <Polyline
            points={`${midX + 4},118 ${midX + 16},96 ${midX + 6},76 ${midX + 22},56`}
            fill="none"
            stroke={s.trace}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : (
        <Polyline
          points={`${midX - 26},128 ${midX - 8},104 ${midX - 18},84 ${midX + 6},68 ${midX - 2},52`}
          fill="none"
          stroke={s.trace}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* Bandeau de label court en bas de la card */}
      <Rect x={CARD_X + 10} y={CARD_Y + CARD_H - 30} width={CARD_W - 20} height={7} rx={3.5} fill={s.accent} opacity={0.8} />
      <Rect x={CARD_X + 10} y={CARD_Y + CARD_H - 18} width={(CARD_W - 20) * 0.6} height={5} rx={2.5} fill={colors.gris} opacity={0.7} />
      <PreviewLabel text={s.label} />
    </Svg>
  );
}

// ══ Aperçu 6 — EMBLEM (blason crew) ═══════════════════════════════════════════

interface EmblemStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Charge centrale (glyphe du blason). */
  charge: string;
  chargeColor: string;
  opacity?: number;
  label: string;
}

const EMBLEM_STYLES: Record<string, EmblemStyle> = {
  crew_emblem_ghost: {
    fill: withAlpha(colors.blanc, 0.04),
    stroke: withAlpha(colors.blanc, 0.25),
    strokeWidth: 2,
    charge: colors.blanc,
    chargeColor: colors.blanc,
    opacity: 0.45,
    label: 'Ghost',
  },
  crew_emblem_carbon: {
    fill: colors.carbone2,
    stroke: colors.blanc,
    strokeWidth: 2.5,
    charge: colors.blanc,
    chargeColor: colors.blanc,
    label: 'Carbon',
  },
  crew_emblem_gold: {
    fill: withAlpha(gameColors.gold, 0.1),
    stroke: gameColors.gold,
    strokeWidth: 3,
    charge: gameColors.gold,
    chargeColor: gameColors.gold,
    label: 'Or',
  },
  crew_emblem_founder: {
    fill: colors.chartreuse14,
    stroke: colors.chartreuse,
    strokeWidth: 3,
    charge: colors.chartreuse,
    chargeColor: colors.chartreuse,
    label: 'Founder',
  },
};

const EMBLEM_FALLBACK: EmblemStyle = {
  fill: colors.carbone2,
  stroke: colors.gris,
  strokeWidth: 2,
  charge: colors.gris,
  chargeColor: colors.gris,
  label: 'Blason',
};

export function EmblemPreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const t = useT();
  const s = EMBLEM_STYLES[item.key] ?? EMBLEM_FALLBACK;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      accessibilityLabel={t(ARSENAL_PREVIEW_I18N['preview.cosmetic.emblem'], { name: arsenalName(item, t) })}
    >
      {/* Écu */}
      <Path
        d={SHIELD_SHAPE}
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        strokeLinejoin="round"
        opacity={s.opacity ?? 1}
      />
      {/* Chevron intérieur (structure de blason) */}
      <Path
        d="M64 76 L100 96 L136 76"
        fill="none"
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={(s.opacity ?? 1) * 0.7}
      />
      {/* Charge centrale = étoile (marque du crew, neutre) */}
      <Path
        d="M100 104 l7 16 l17 1 l-13 11 l4 17 l-15 -9 l-15 9 l4 -17 l-13 -11 l17 -1 Z"
        fill={s.charge}
        opacity={s.opacity ?? 1}
      />
      <PreviewLabel text={s.label} />
    </Svg>
  );
}

// ─── Mini-label commun (une seule ligne, jamais tronquée) ─────────────────────

/**
 * Label court sous l'illustration. `onLight` force le noir quand le fond derrière le
 * texte est clair (jamais de chartreuse/blanc sur clair). Par défaut le fond est
 * sombre (elevation.raised) → texte gris.
 */
function PreviewLabel({ text, onLight = false }: { text: string; onLight?: boolean }) {
  return (
    <SvgText
      x={VB / 2}
      y={VB - 10}
      fill={onLight ? colors.noir : colors.gris}
      fontSize={13}
      fontFamily={fonts.text}
      textAnchor="middle"
    >
      {text}
    </SvgText>
  );
}
