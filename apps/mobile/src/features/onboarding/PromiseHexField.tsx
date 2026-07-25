/**
 * GRYD — LE CHAMP D'HEXAGONES du hero de connexion (audit P2 visuel-2026).
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * Il vivait DEUX FOIS, à l'identique sur ~85 lignes : dans `(auth)/sign-in.tsx`
 * et dans `(auth)/sign-in.web.tsx`. Le fork entre les deux écrans n'existe que
 * pour tenir `expo-apple-authentication` hors du bundle web — ce visuel, lui, ne
 * dépend d'aucun module natif : il n'avait aucune raison d'être dupliqué, et deux
 * copies d'une géométrie déterministe divergent au premier réglage.
 *
 * ─── CE QU'IL MONTRE, ET CE QU'IL NE PRÉTEND PAS ÊTRE ───────────────────────
 * Un nid d'abeilles ÉGOCENTRÉ : une grappe capturée au foyer (rôle « moi »),
 * quelques tuiles en lisière (rôle « rival »), le reste à peine tracé (ville
 * neutre). Il MONTRE la promesse — « on capture des zones » — au lieu de se
 * contenter de l'écrire.
 *
 * Il est purement DÉCORATIF et déterministe : aucune ville, aucun classement,
 * aucun rival, aucun nom, aucun chiffre. Rien ici n'est une donnée du joueur, et
 * rien ne s'en approche — c'est ce qui l'autorise à exister sur un écran vu par
 * quelqu'un qui n'a encore RIEN dans le jeu. Ses couleurs sortent toutes de
 * `mapTokens`, donc il est cohérent au pixel avec la vraie Battle Map.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import { colors, mapTokens } from '@klaim/shared';

/**
 * Mesures de COMPOSITION (repère du dessin), pas des règles de jeu : la boîte du
 * motif et le rayon d'un hexagone. Le champ occupe le haut de l'écran et se fond
 * dans le noir avant le texte — d'où `HEIGHT_RATIO`, exprimé en part de hauteur.
 */
const FIELD_VB_W = 160;
const FIELD_VB_H = 240;
const HEX_R = 15;
const HEIGHT_RATIO = '64%';

type HexRole = 'neutral' | 'mine' | 'foe';
interface HexCell {
  points: string;
  role: HexRole;
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30); // pointy-top, comme AvatarHex/CrewFrame
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Nid d'abeilles déterministe : foyer capturé + frontière rivale + ville neutre. */
function buildHexField(): HexCell[] {
  const cells: HexCell[] = [];
  const w = Math.sqrt(3) * HEX_R; // largeur d'un hex pointy-top
  const vStep = 1.5 * HEX_R; // pas vertical du nid d'abeilles
  const focalX = FIELD_VB_W * 0.42;
  const focalY = FIELD_VB_H * 0.34;
  let row = 0;
  for (let cy = 0; cy <= FIELD_VB_H + HEX_R; cy += vStep, row += 1) {
    const offset = row % 2 ? w / 2 : 0;
    let col = 0;
    for (let cx = -w; cx <= FIELD_VB_W + w; cx += w, col += 1) {
      const x = cx + offset;
      const d = Math.hypot(x - focalX, cy - focalY);
      let role: HexRole = 'neutral';
      if (d < 24) role = 'mine';
      else if (d < 42 && (row + col) % 3 === 0) role = 'foe'; // quelques tuiles en lisière
      cells.push({ points: hexPoints(x, cy, HEX_R - 1.2), role });
    }
  }
  return cells;
}

const HEX_FIELD = buildHexField();

/** COULEUR PAR RÔLE (§C), jamais par identité : moi · rival · ville neutre. */
const HEX_FILL: Record<HexRole, string> = {
  neutral: 'none',
  mine: mapTokens.mineFill,
  foe: mapTokens.foeFill,
};
const HEX_STROKE: Record<HexRole, string> = {
  neutral: mapTokens.neutralStroke,
  mine: mapTokens.mineStroke,
  foe: mapTokens.foeStroke,
};

export function PromiseHexField() {
  return (
    <View style={styles.backdrop} pointerEvents="none" accessible={false}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${FIELD_VB_W} ${FIELD_VB_H}`}
        preserveAspectRatio="xMidYMin slice"
      >
        {HEX_FIELD.map((cell, i) => (
          <Polygon
            key={i}
            points={cell.points}
            fill={HEX_FILL[cell.role]}
            stroke={HEX_STROKE[cell.role]}
            strokeWidth={cell.role === 'neutral' ? 0.8 : 1.1}
          />
        ))}
        {/* Fondu vers le noir : le bas de l'écran reste un fond propre pour le texte. */}
        <Defs>
          <LinearGradient id="promiseFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.noir} stopOpacity="0" />
            <Stop offset="0.55" stopColor={colors.noir} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.noir} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={FIELD_VB_W} height={FIELD_VB_H} fill="url(#promiseFade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Plan de fond : premier enfant + absolu, derrière hero et actions.
  // pointerEvents none → n'intercepte rien.
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: HEIGHT_RATIO },
});
