/**
 * GRYD — Aperçus « à quoi ça sert » de l'Arsenal : SCHÉMAS DE MÉCANIQUE (§12
 * anti pay-to-win, RÈGLES §A épuration). Le fondateur : « on ne sait pas à quoi
 * servent les objets — un détail avec des illustrations qui MONTRE ce que ça
 * fait ». Chaque composant est PUR (aucun état, aucune dépendance runtime),
 * react-native-svg uniquement, viewBox fixe + prop `size` responsive — même
 * patron que `features/explain/schemas/*`. Rendu web ET natif.
 *
 * HONNÊTETÉ (règle n°1) + ANTI PAY-TO-WIN : chaque schéma montre l'EFFET RÉEL
 * *et sa LIMITE*. Aucun objet n'achète le jeu :
 *  - Bouclier   → protège une zone un temps borné, jamais l'invincibilité, ne capture rien.
 *  - Scout Ping → révèle une INFO, aucune capture automatique.
 *  - Streak Gel → protège la série hebdo (donc son multiplicateur de POINTS) ;
 *                 ne capture aucune zone, et ne se vend dans aucune monnaie.
 *  - Crew Boost → +25 % de progression du COFFRE crew, JAMAIS de points ni de zones.
 *  - Packs/Éclats → du STYLE (cosmétiques), jamais un avantage de jeu.
 *  - Abonnements → features de confort, zéro avantage de jeu, aucun bouclier.
 *
 * Fond des scènes = SOMBRE (elevation.raised / noir du sheet) → la chartreuse en
 * glyphe/texte y est lisible (jamais de chartreuse sur fond clair). Couleurs =
 * tokens @klaim/shared exclusivement. Labels courts (§A) : jamais un mur, jamais
 * tronqué.
 */
import type { ReactNode } from 'react';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  colors,
  CREW_BOOST_CHEST_MULTIPLIER,
  fonts,
  gameColors,
  SHIELD_DURATION_HOURS,
} from '@klaim/shared';
import type { ArsenalCatalogItem } from '../catalog';

/**
 * Contrat partagé des aperçus Arsenal (ré-exporté par l'orchestrateur). Déclaré à
 * l'IDENTIQUE dans `./cosmetic` (agent A) — l'orchestrateur unifiera sur une source.
 */
export interface ArsenalPreviewProps {
  item: ArsenalCatalogItem;
  size?: number;
}

// ─── Géométrie commune ───────────────────────────────────────────────────────
const VB_W = 240;
const VB_H = 180;
const RATIO = VB_H / VB_W;
const DEFAULT_SIZE = 200;

/** +25 % — dérivé de la constante moteur, jamais un nombre magique. */
const BOOST_PCT = Math.round((CREW_BOOST_CHEST_MULTIPLIER - 1) * 100);

/**
 * Enveloppe commune : Svg à viewBox fixe, hauteur au ratio, fond TRANSPARENT
 * (la scène hérite du disque sombre du sheet — pas de card-in-card).
 */
function Scene({
  size,
  label,
  children,
}: {
  size: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <Svg
      width={size}
      height={size * RATIO}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityLabel={label}
    >
      {children}
    </Svg>
  );
}

/** Légende honnête, une ligne, centrée en bas — courte (§A), jamais tronquée. */
function Caption({ text, fill = colors.gris }: { text: string; fill?: string }) {
  return (
    <SvgText
      x={VB_W / 2}
      y={VB_H - 12}
      fill={fill}
      fontSize={11}
      fontFamily={fonts.text}
      textAnchor="middle"
    >
      {text}
    </SvgText>
  );
}

/** Losange « Éclat » (monnaie de style) centré sur (cx,cy). */
function Gem({ cx, cy, r, fill, stroke }: { cx: number; cy: number; r: number; fill: string; stroke: string }) {
  const d = `M${cx} ${cy - r} L${cx + r * 0.72} ${cy} L${cx} ${cy + r} L${cx - r * 0.72} ${cy} Z`;
  return <Path d={d} fill={fill} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. BOUCLIER — protège une zone un temps borné (48 h), pas d'invincibilité.
// ═══════════════════════════════════════════════════════════════════════════
export function ShieldSchema({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const label = `${item.name} : protège une zone pendant ${SHIELD_DURATION_HOURS} h, sans la rendre invincible.`;
  return (
    <Scene size={size} label={label}>
      {/* « … » : la protection EXPIRE (temporaire) */}
      <Circle cx={108} cy={54} r={2.4} fill={colors.gris} />
      <Circle cx={120} cy={54} r={2.4} fill={colors.gris} />
      <Circle cx={132} cy={54} r={2.4} fill={colors.gris} />

      {/* Dôme de protection (bleu électrique = ÉTAT protégé) + halo */}
      <Path d="M66 128 A 60 48 0 0 1 174 128" fill="none" stroke={gameColors.electricBlue} strokeOpacity={0.22} strokeWidth={9} strokeLinecap="round" />
      <Path d="M66 128 A 60 48 0 0 1 174 128" fill="none" stroke={gameColors.electricBlue} strokeWidth={3.5} strokeLinecap="round" />

      {/* Ma zone protégée (fill possession chartreuse) */}
      <Rect x={80} y={112} width={80} height={38} rx={10} fill={colors.chartreuse14} stroke={colors.chartreuse40} strokeWidth={2} />
      <Circle cx={120} cy={131} r={5} fill={colors.chartreuse} />

      {/* Flèche rivale qui REBONDIT sur le dôme (ne capture rien) */}
      <Path d="M208 34 L154 84" fill="none" stroke={gameColors.rival} strokeWidth={3} strokeLinecap="round" />
      <Path d="M154 84 L162 74 M154 84 L166 86" fill="none" stroke={gameColors.rival} strokeWidth={3} strokeLinecap="round" />
      <Path d="M154 84 L202 62" fill="none" stroke={gameColors.rival} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="5 6" />

      {/* Horloge « 48 h » : durée BORNÉE */}
      <G transform="translate(34 40)">
        <Circle r={14} fill="none" stroke={colors.gris} strokeWidth={2} />
        <Line x1={0} y1={0} x2={0} y2={-8} stroke={colors.blanc} strokeWidth={2} strokeLinecap="round" />
        <Line x1={0} y1={0} x2={6} y2={2} stroke={colors.blanc} strokeWidth={2} strokeLinecap="round" />
      </G>
      <SvgText x={34} y={70} fill={colors.blanc} fontSize={13} fontFamily={fonts.mono} textAnchor="middle">
        {`${SHIELD_DURATION_HOURS} h`}
      </SvgText>

      <Caption text="Protège une zone · pas invincible" />
    </Scene>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. SCOUT PING — révèle une info (zone fragile/rentable), aucune capture auto.
// ═══════════════════════════════════════════════════════════════════════════
export function ScoutPingSchema({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const label = `${item.name} : un ping révèle une zone fragile ou rentable — une info, aucune capture automatique.`;
  const cx = 62;
  const cy = 92;
  return (
    <Scene size={size} label={label}>
      {/* Radar : anneaux + balayage */}
      <Circle cx={cx} cy={cy} r={50} fill="none" stroke={colors.grisLigne} strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={33} fill="none" stroke={colors.grisLigne} strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={16} fill="none" stroke={colors.grisLigne} strokeWidth={1.5} />
      <Path d={`M${cx} ${cy} L${cx + 46} ${cy - 20} L${cx + 40} ${cy + 16} Z`} fill={colors.chartreuse} fillOpacity={0.18} />
      <Line x1={cx} y1={cy} x2={cx + 46} y2={cy - 20} stroke={colors.chartreuse} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={3.5} fill={colors.chartreuse} />

      {/* Liaison ping → zone révélée (pointillé) */}
      <Line x1={cx + 40} y1={cy - 6} x2={150} y2={92} stroke={colors.gris} strokeWidth={1.5} strokeDasharray="3 5" />

      {/* Zone RÉVÉLÉE en surbrillance (info) */}
      <Rect x={148} y={80} width={56} height={40} rx={10} fill={colors.chartreuse14} stroke={colors.chartreuse40} strokeWidth={2} />

      {/* Badge info « i » = pure information */}
      <G transform="translate(176 62)">
        <Circle r={13} fill={gameColors.verify} />
        <Circle cx={0} cy={-5} r={1.8} fill={colors.noir} />
        <Rect x={-1.6} y={-1} width={3.2} height={9} rx={1.6} fill={colors.noir} />
      </G>

      <Caption text="Révèle une info · aucune capture" />
    </Scene>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. STREAK GEL — protège la série hebdo une semaine, zéro territoire.
// ═══════════════════════════════════════════════════════════════════════════
export function StreakGelSchema({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  /**
   * L'ANCIEN LIBELLÉ DISAIT « sans toucher au territoire » : faux. La série
   * porte un multiplicateur jusqu'à ×1,5 sur les POINTS de territoire — c'est
   * même la raison pour laquelle cet objet n'est vendu dans aucune monnaie.
   */
  const label = `${item.name} : gèle et protège ta série hebdo une semaine — et donc le multiplicateur de points qu'elle porte. Ne capture aucune zone, ne se vend jamais.`;
  const days = 7;
  const x0 = 40;
  const step = 27;
  const yDot = 96;
  return (
    <Scene size={size} label={label}>
      {/* Capsule « gelée » (bleu électrique) qui protège la série */}
      <Rect x={26} y={80} width={188} height={34} rx={17} fill={gameColors.electricBlue} fillOpacity={0.12} stroke={gameColors.electricBlue} strokeWidth={1.5} />

      {/* Chaîne des jours (série) */}
      <Line x1={x0} y1={yDot} x2={x0 + step * (days - 1)} y2={yDot} stroke={colors.chartreuse40} strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: days }).map((_, i) => (
        <Circle key={i} cx={x0 + step * i} cy={yDot} r={8} fill={colors.chartreuse} />
      ))}

      {/* Flocon = GEL (protection) au-dessus de la série */}
      <G transform="translate(120 52)" stroke={gameColors.electricBlue} strokeWidth={2} strokeLinecap="round">
        <Line x1={0} y1={-11} x2={0} y2={11} />
        <Line x1={-9.5} y1={-5.5} x2={9.5} y2={5.5} />
        <Line x1={-9.5} y1={5.5} x2={9.5} y2={-5.5} />
      </G>

      <Caption text="Ne capture aucune zone · jamais vendu" />
    </Scene>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CREW BOOST — +25 % progression du COFFRE, JAMAIS de points ni de zones.
//    (Point anti-p2w le plus sensible : la scène rend évident que ça n'achète
//     PAS la victoire — seule la jauge de coffre accélère.)
// ═══════════════════════════════════════════════════════════════════════════
export function CrewBoostSchema({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const label = `${item.name} : +${BOOST_PCT} % de progression du coffre crew — jamais de points ni de zones.`;
  const barX = 96;
  const barW = 116;
  return (
    <Scene size={size} label={label}>
      {/* Coffre crew */}
      <G transform="translate(40 66)">
        <Rect x={-22} y={-2} width={44} height={30} rx={4} fill={colors.carbone2} stroke={colors.chartreuse40} strokeWidth={2} />
        <Path d="M-22 8 A 22 14 0 0 1 22 8" fill="none" stroke={colors.chartreuse40} strokeWidth={2} />
        <Rect x={-4} y={4} width={8} height={9} rx={2} fill={colors.chartreuse} />
      </G>

      {/* Jauge COFFRE : accélère (+25 %) */}
      <SvgText x={barX} y={54} fill={colors.blanc} fontSize={11} fontFamily={fonts.text}>COFFRE</SvgText>
      <Rect x={barX} y={60} width={barW} height={13} rx={6.5} fill={colors.carbone2} stroke={colors.grisLigne} strokeWidth={1} />
      <Rect x={barX} y={60} width={barW * 0.64} height={13} rx={6.5} fill={colors.chartreuse} />
      <Rect x={barX + barW * 0.64} y={60} width={barW * 0.24} height={13} fill={colors.chartreuse} fillOpacity={0.4} />
      <SvgText x={barX + barW} y={54} fill={colors.chartreuse} fontSize={11} fontFamily={fonts.mono} textAnchor="end">
        {`+${BOOST_PCT}%`}
      </SvgText>

      {/* Jauge POINTS · ZONES : INCHANGÉE (jamais touchée) */}
      <SvgText x={barX} y={102} fill={colors.gris} fontSize={11} fontFamily={fonts.text}>POINTS · ZONES</SvgText>
      <Rect x={barX} y={108} width={barW} height={13} rx={6.5} fill={colors.carbone2} stroke={colors.grisLigne} strokeWidth={1} />
      {/* Symbole « interdit » = jamais affecté */}
      <G transform={`translate(${barX + barW - 8} 114.5)`}>
        <Circle r={8} fill="none" stroke={colors.gris} strokeWidth={2} />
        <Line x1={-5.5} y1={-5.5} x2={5.5} y2={5.5} stroke={colors.gris} strokeWidth={2} strokeLinecap="round" />
      </G>

      <Caption text={`+${BOOST_PCT}% coffre · jamais points ni zones`} fill={colors.blanc} />
    </Scene>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PACK — un bundle : plusieurs COSMÉTIQUES d'un coup (jamais un avantage).
//    (Les packs Éclats délèguent à la scène monnaie.)
// ═══════════════════════════════════════════════════════════════════════════
export function PackPreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  if (item.slug.startsWith('eclats')) return <EclatsPreview item={item} size={size} />;
  const accent = item.rarity === 'legend' ? gameColors.gold : colors.chartreuse;
  const label = `${item.name} : un bundle qui livre plusieurs cosmétiques d'un coup — du style, aucun avantage de jeu.`;
  return (
    <Scene size={size} label={label}>
      {/* Coffre/paquet ouvert */}
      <Path d="M84 150 L84 116 L156 116 L156 150 Z" fill={colors.carbone2} stroke={colors.grisLigne} strokeWidth={1.5} />
      <Path d="M78 116 L162 116 L156 104 L84 104 Z" fill={colors.carbone2} stroke={accent} strokeWidth={2} strokeLinejoin="round" />
      <Line x1={120} y1={116} x2={120} y2={150} stroke={colors.grisLigne} strokeWidth={1} />

      {/* Cosmétiques qui sortent : gem · frame · skin trace · skin territoire */}
      <Gem cx={120} cy={40} r={13} fill={accent} stroke={colors.noir} />
      <Circle cx={82} cy={64} r={13} fill="none" stroke={colors.blanc} strokeWidth={3} />
      <Path d="M144 58 q 8 -10 16 0 q 8 10 16 0" fill="none" stroke={colors.chartreuse} strokeWidth={3} strokeLinecap="round" />
      <Rect x={100} y={72} width={26} height={20} rx={5} fill={colors.chartreuse14} stroke={colors.chartreuse40} strokeWidth={2} />

      <Caption text="Plusieurs cosmétiques · pas un avantage" />
    </Scene>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ÉCLATS — la monnaie de STYLE. Sert au style, pas au territoire.
// ═══════════════════════════════════════════════════════════════════════════
export function EclatsPreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  const label = `${item.name} : des Éclats — la monnaie du style (skins, frames, templates), jamais du territoire.`;
  return (
    <Scene size={size} label={label}>
      {/* Pile d'Éclats (losanges) */}
      <Gem cx={120} cy={78} r={30} fill={colors.chartreuse} stroke={colors.noir} />
      <Gem cx={86} cy={98} r={20} fill={colors.chartreuse40} stroke={colors.noir} />
      <Gem cx={154} cy={98} r={20} fill={colors.chartreuse40} stroke={colors.noir} />
      {/* Éclat de brillance sur le gem central */}
      <Path d="M114 70 L120 60 L126 70" fill="none" stroke={colors.noir} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Étincelles */}
      <Path d="M52 60 l0 -8 M48 56 l8 0" stroke={colors.blanc} strokeWidth={2} strokeLinecap="round" />
      <Path d="M192 64 l0 -6 M189 61 l6 0" stroke={colors.blanc} strokeWidth={2} strokeLinecap="round" />

      <Caption text="Pour le style · pas le territoire" />
    </Scene>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. ABONNEMENTS — Club (features de confort) & Pass (30 niveaux, bientôt).
//    Zéro avantage de jeu, aucun bouclier.
// ═══════════════════════════════════════════════════════════════════════════
export function SubscriptionPreview({ item, size = DEFAULT_SIZE }: ArsenalPreviewProps) {
  if (item.key === 'gryd_pass') return <PassScene item={item} size={size} />;
  return <ClubScene item={item} size={size} />;
}

/**
 * Club : 4 features en petites tuiles (stats · heatmap · export · templates).
 *
 * LA 4ᵉ TUILE ÉTAIT UN RADAR (23/07/2026). Elle illustrait le « radar des zones
 * contestées » que le Club annonçait — une INFORMATION TACTIQUE, donc un
 * avantage de jeu payant qu'AMENDEMENT-45 §2 C1 interdit mot pour mot. Le Club
 * ne la vend plus (cf. catalog.ts) : le schéma montre désormais les templates
 * de partage premium, qui sont réellement dans l'offre.
 */
function ClubScene({ item, size }: { item: ArsenalCatalogItem; size: number }) {
  const label = `${item.name} : stats, heatmap, export HD et templates premium — zéro avantage de jeu, aucun bouclier, aucune info tactique.`;
  const tw = 66;
  const th = 42;
  const gx = 8;
  const gy = 8;
  const ox = (VB_W - (tw * 2 + gx)) / 2;
  const oy = 30;
  const tiles: { x: number; y: number }[] = [
    { x: ox, y: oy },
    { x: ox + tw + gx, y: oy },
    { x: ox, y: oy + th + gy },
    { x: ox + tw + gx, y: oy + th + gy },
  ];
  return (
    <Scene size={size} label={label}>
      {tiles.map((t, i) => (
        <Rect key={i} x={t.x} y={t.y} width={tw} height={th} rx={8} fill={colors.carbone2} stroke={colors.grisLigne} strokeWidth={1} />
      ))}
      {/* Tuile 1 — stats (barres) */}
      <G transform={`translate(${ox + 20} ${oy + 28})`}>
        <Rect x={0} y={-8} width={5} height={8} fill={colors.chartreuse} />
        <Rect x={9} y={-14} width={5} height={14} fill={colors.chartreuse} />
        <Rect x={18} y={-20} width={5} height={20} fill={colors.chartreuse} />
      </G>
      {/* Tuile 2 — heatmap (grille) */}
      <G transform={`translate(${ox + tw + gx + 22} ${oy + 12})`}>
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <Rect key={`${r}-${c}`} x={c * 8} y={r * 8} width={6} height={6} rx={1.5} fill={colors.chartreuse} fillOpacity={0.25 + ((r + c) % 3) * 0.28} />
          )),
        )}
      </G>
      {/* Tuile 3 — export (flèche hors boîte) */}
      <G transform={`translate(${ox + 33} ${oy + th + gy + 22})`} stroke={colors.blanc} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <Path d="M0 -2 L0 -16" />
        <Path d="M-6 -10 L0 -16 L6 -10" strokeLinejoin="round" />
        <Path d="M-9 2 L9 2" />
      </G>
      {/* Tuile 4 — template de partage (carte 9:16 + ligne de titre) */}
      <G transform={`translate(${ox + tw + gx + 33} ${oy + th + gy + 21})`}>
        <Rect x={-8} y={-13} width={16} height={26} rx={3} fill="none" stroke={colors.blanc} strokeWidth={1.5} />
        <Path d="M-4 6 L4 6" stroke={colors.chartreuse} strokeWidth={2} strokeLinecap="round" />
        <Path d="M-4 -6 L2 -1 L4 -3" fill="none" stroke={colors.blanc} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </G>

      <Caption text="Zéro avantage de jeu · aucun bouclier" />
    </Scene>
  );
}

/** Pass : 30 niveaux de récompenses (jalons) — teaser « bientôt ». */
function PassScene({ item, size }: { item: ArsenalCatalogItem; size: number }) {
  const label = `${item.name} : 30 niveaux de récompenses de saison — pas encore lancé (bientôt).`;
  const nodes = 6;
  const x0 = 34;
  const step = 34;
  const y = 84;
  return (
    <Scene size={size} label={label}>
      {/* Piste de progression : jalons (les derniers en pointillé = à venir) */}
      <Line x1={x0} y1={y} x2={x0 + step * 2.5} y2={y} stroke={colors.chartreuse40} strokeWidth={3} strokeLinecap="round" />
      <Line x1={x0 + step * 2.5} y1={y} x2={x0 + step * (nodes - 1)} y2={y} stroke={colors.grisLigne} strokeWidth={3} strokeLinecap="round" strokeDasharray="4 6" />
      {Array.from({ length: nodes }).map((_, i) => {
        const reached = i <= 2;
        return (
          <Circle
            key={i}
            cx={x0 + step * i}
            cy={y}
            r={reached ? 8 : 6}
            fill={reached ? colors.chartreuse : colors.carbone2}
            stroke={reached ? colors.noir : colors.gris}
            strokeWidth={reached ? 0 : 2}
          />
        );
      })}
      {/* « 30 niveaux » */}
      <SvgText x={VB_W / 2} y={46} fill={colors.blanc} fontSize={14} fontFamily={fonts.display} textAnchor="middle">
        30 niveaux
      </SvgText>
      {/* Pastille « bientôt » */}
      <G transform="translate(120 120)">
        <Rect x={-34} y={-12} width={68} height={24} rx={12} fill={colors.carbone2} stroke={colors.grisLigne} strokeWidth={1} />
        <SvgText x={0} y={5} fill={colors.gris} fontSize={12} fontFamily={fonts.text} textAnchor="middle">bientôt</SvgText>
      </G>

      <Caption text="Récompenses de saison · à venir" />
    </Scene>
  );
}

/**
 * Clés/patterns COUVERTS par ce module de schémas mécaniques — pour que le
 * résolveur route correctement (le reste des items = aperçus cosmétiques, agent A).
 *  - `byKey`             : items fonctionnels à clé exacte.
 *  - `crewBoostPrefix`   : tous les `crew_boost*` → CrewBoostSchema.
 *  - `sections`          : `packs` → PackPreview (délègue Éclats), `subscriptions` → SubscriptionPreview.
 */
export const MECHANIC_KEYS = {
  byKey: ['shield', 'scout_ping', 'streak_gel'] as const,
  crewBoostPrefix: 'crew_boost' as const,
  sections: ['packs', 'subscriptions'] as const,
} as const;
