/**
 * GRYD — LA CARD DE PARTAGE : l'objet qui sort de l'app (L13).
 *
 * ─── CE QU'ELLE MONTRE, ET POURQUOI C'EST FIGÉ ──────────────────────────────
 * Le tracé RÉEL de la course en héros, puis trois chiffres, puis la signature.
 * Rien n'est personnalisable, et c'est le point : « la contrainte fait la
 * reconnaissabilité » (modèle Strava, dont la card se reconnaît en une
 * demi-seconde dans un feed précisément parce qu'elle est toujours la même).
 * Chaque option ajoutée ici retire de la reconnaissance à toutes les autres.
 *
 * ─── CE QU'ELLE NE MONTRE PAS, ET CE N'EST PAS NÉGOCIABLE ───────────────────
 * Aucun fond de carte, aucune coordonnée, aucun nom de lieu, aucune date. Une
 * forme sur du noir. Le tracé arrive déjà MASQUÉ de ses extrémités
 * (`share/privacy.ts`, la règle du serveur) : le domicile n'est pas dessiné.
 * Le commentaire de `notifTaken` dans le catalogue dit la règle en une ligne —
 * « le territoire se partage, le domicile jamais ».
 *
 * ⚠️ CE N'EST PAS `TerritoryMark`. Cet objet-là est un DESSIN DE MARQUE, un
 * contour inventé qui ne se convertit en rien ; le mettre ici ferait passer une
 * illustration pour la course de quelqu'un. Ce composant ne dessine QUE ce que
 * le joueur a réellement couru, ou rien.
 *
 * ─── POURQUOI ELLE EST RENDUE HORS ÉCRAN ────────────────────────────────────
 * L13 : « carte pré-générée pendant l'écran de résultat ». Le joueur regarde sa
 * célébration ; pendant ce temps la card est montée, mesurée et rasterisée. Au
 * tap, il ne reste plus qu'à ouvrir la feuille de partage — aucune attente,
 * donc aucun spinner à inventer.
 *
 * L15 — entièrement masquée aux lecteurs d'écran : elle est HORS de l'écran et
 * n'a aucun sens à l'oreille (le verdict est annoncé par l'écran lui-même).
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, fontSizes, spacing, typography } from '@klaim/shared';
import { TRACE_VIEWBOX } from '../share/trace';
import { C } from '../../i18n/catalog/mvp';
import { useT } from '../../i18n/store';

/**
 * Gabarit de la card, en points.
 *
 * 4:5 — le format le plus haut qu'un feed accepte sans recadrer, donc le plus
 * de surface pour le tracé. La capture se fait à la densité de l'appareil
 * (aucun `width`/`height` passé à `captureRef`) : sur un écran 3×, ces 320×400
 * pt sortent en 960×1 200 px, gravés par le moteur de rendu natif — un texte
 * net, plutôt qu'un agrandissement d'image.
 */
export const SHARE_CARD_W = 320;
export const SHARE_CARD_H = 400;

/**
 * Épaisseur du tracé, en unités du `viewBox` (donc en pourcentage du cadre :
 * elle suit la card à toutes les densités). 3,2/100 reprend le rapport de
 * `TerritoryMark` (6 sur un viewBox de 168, soit 3,6 %) : les deux objets de la
 * marque ont le même trait.
 */
const TRAIT = 3.2;

export interface ShareCardProps {
  /** Le chemin SVG du tracé masqué (`share/trace.ts`). Jamais `null` ici. */
  readonly path: string;
  /** Les m² déjà formatés par `heroArea` — jamais un nombre brut. */
  readonly area: string;
  /** Les km déjà formatés, sans unité. */
  readonly km: string;
  /** Le chrono déjà formaté (`formatChrono`). */
  readonly chrono: string;
}

export function ShareCard({ path, area, km, chrono }: ShareCardProps) {
  const t = useT();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Comme pour `TerritoryMark` : mesuré en preview, les deux props
      // ci-dessus ne produisent AUCUN `aria-hidden` sur react-native-web.
      aria-hidden
      style={styles.card}
    >
      {/* LE TRACÉ, EN HÉROS — il occupe tout ce que les chiffres laissent. */}
      <View style={styles.scene}>
        <Svg
          viewBox={`0 0 ${TRACE_VIEWBOX} ${TRACE_VIEWBOX}`}
          width="100%"
          height="100%"
        >
          {/* Remplissage DISCRET : la trace domine, jamais l'aplat. */}
          <Path d={path} fill={colors.chartreuse14} />
          <Path
            d={path}
            fill="none"
            stroke={colors.chartreuse}
            strokeWidth={TRAIT}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* LES TROIS CHIFFRES. Les m² dominent (L12) ; la distance et le temps
          restent à l'échelle du corps — ce sont des faits, pas la nouvelle. */}
      <View style={styles.chiffres}>
        <View style={styles.bloc}>
          <Text style={styles.hero}>{area}</Text>
          <Text style={styles.uniteHero}>{t(C.unitM2)}</Text>
        </View>
        <View style={styles.secondaires}>
          <Text style={styles.stat}>
            {km}
            <Text style={styles.unite}> {t(C.unitKm)}</Text>
          </Text>
          <Text style={styles.stat}>{chrono}</Text>
        </View>
      </View>

      {/* LA SIGNATURE — invariante, comme « GO » (§5.2). */}
      <Text style={styles.signature}>{t(C.shareTagline)}</Text>
    </View>
  );
}

/**
 * `fontVariant` recopié : le token est figé par `as const`, donc son tuple est
 * en LECTURE SEULE là où `TextStyle` attend un tableau mutable (même raison que
 * dans `resultat.tsx`). Les chiffres tabulaires comptent ici aussi — trois
 * nombres alignés sous un tracé, c'est la moitié de la composition.
 */
const STAT = { ...typography.stat, fontVariant: [...typography.stat.fontVariant] };

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_W,
    height: SHARE_CARD_H,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  // Le tracé prend tout l'espace restant : c'est lui le héros.
  scene: { flex: 1, alignSelf: 'stretch' },
  chiffres: { gap: spacing.xs, paddingTop: spacing.md },
  bloc: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs },
  hero: { ...STAT, color: colors.chartreuse, fontSize: fontSizes.xxl },
  uniteHero: { ...typography.statUnit, color: colors.chartreuse },
  secondaires: { flexDirection: 'row', gap: spacing.md },
  stat: { ...STAT, color: colors.blanc, fontSize: fontSizes.lg },
  unite: { fontFamily: fonts.textSemi, fontSize: fontSizes.md, color: colors.gris },
  signature: {
    ...typography.kicker,
    color: colors.gris,
    paddingTop: spacing.sm,
  },
});
