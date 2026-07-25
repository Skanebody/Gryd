/**
 * GRYD — LA FRISE DE PROGRESSION du parcours d'onboarding.
 *
 * ─── POURQUOI ELLE EST UN COMPOSANT, ET PLUS UN BOUT DE E01 ─────────────────
 * Elle ne vivait que sur le premier écran : les trois suivants (rivalité, ville,
 * arrivée) n'avaient AUCUN repère de progression — le joueur ne savait plus s'il
 * en avait pour un écran ou pour dix. Deux surfaces la rendent désormais (le hero
 * E01, sous son CTA comme sur la planche ; l'en-tête commun des autres étapes),
 * donc elle est un composant : deux copies auraient divergé au premier
 * changement de flow, et c'est exactement ce qui a produit le mensonge d'origine
 * (cinq points en dur pour quatre étapes).
 *
 * ⚠️ LE NOMBRE DE POINTS NE SE DÉCRÈTE PAS. `index`/`count` viennent de
 * `stepProgress()` (content.ts), qui les DÉRIVE de `ONBOARDING_STEPS`. Une frise
 * qui annonce cinq étapes à un parcours de quatre est une promesse chiffrée
 * fausse : le cinquième point ne s'allume jamais.
 *
 * ─── CE QUI RESTE À L'APPELANT ──────────────────────────────────────────────
 * Le placement (`style`). Le libellé accessible aussi : la frise est le SEUL
 * élément de l'écran qui dit « où j'en suis », donc elle est lue — un lecteur
 * d'écran ne voit pas des points, il entend « Étape 2 sur 4 ».
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@klaim/shared';

/**
 * Mesures de COMPOSITION (planche E01), pas des règles de jeu : point inactif de
 * 5 px, point actif étiré à 16 px (une barre courte, pas un gros point — elle se
 * distingue à la forme autant qu'à la couleur, §C « la couleur ne porte jamais le
 * sens seule »).
 */
const DOT_SIZE = 5;
const DOT_ACTIVE_WIDTH = 16;
const DOT_GAP = 5;

export interface StepDotsProps {
  /** Étape courante, 0-indexée (cf. `stepProgress`). */
  index: number;
  /** Nombre TOTAL d'étapes du flow — jamais un littéral. */
  count: number;
  /** « Étape 2 sur 4 », déjà traduit par l'appelant. */
  a11yLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function StepDots({ index, count, a11yLabel, style }: StepDotsProps) {
  return (
    <View accessible accessibilityLabel={a11yLabel} style={[styles.row, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: DOT_GAP },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.grisLigne,
  },
  dotActive: { width: DOT_ACTIVE_WIDTH, backgroundColor: colors.chartreuse },
});
