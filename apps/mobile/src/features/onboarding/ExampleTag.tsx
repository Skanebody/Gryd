/**
 * GRYD — LA CHIP « EXEMPLE », composant unique.
 *
 * ─── POURQUOI ELLE EXISTE ───────────────────────────────────────────────────
 * Un visuel d'onboarding a le droit d'ENSEIGNER une règle (une boucle qui se
 * ferme, une zone qui bascule) à condition d'être ÉTIQUETÉ comme exemple et de
 * n'être jamais présenté comme les données du joueur. C'est la frontière posée le
 * 21/07/2026 par le lot « Retour terrain 2 » — et elle a sauté une fois déjà :
 * quand le premier écran est passé de `CaptureDemo` à `E01Hero`, la chip est
 * partie avec l'ancien composant, laissant une boucle chartreuse qui se ferme
 * PUIS SE REMPLIT — la représentation exacte d'une capture — sans rien qui dise
 * que c'est un exemple.
 *
 * La chip vit donc dans SON fichier : deux surfaces la posent (le plateau des
 * démonstrations et le hero E01), et un garde-fou qui vit dans le composant qu'il
 * garde disparaît avec lui.
 *
 * ─── CE QUI EST FIXÉ ICI, ET CE QUI RESTE À L'APPELANT ──────────────────────
 * Fixé : la forme (pilule, contour gris-ligne, fond noir opaque) et la couleur
 * (GRIS — jamais chartreuse : ce n'est pas un gain). À l'appelant : le
 * POSITIONNEMENT (`style`), parce qu'il dépend de ce que le visuel occupe déjà —
 * coin haut-DROIT sur le plateau, coin haut-GAUCHE sur E01 où « Passer » tient
 * déjà la droite.
 *
 * Le libellé vient de l'écran (copie i18n) : le composant ne porte aucun texte.
 * Sans libellé il ne rend RIEN — une chip vide n'étiquette rien.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '@klaim/shared';

export function ExampleTag({ label, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  if (!label) return null;
  return (
    <View style={[styles.tag, style]} pointerEvents="none">
      {/* Aucun `numberOfLines` : le mot s'enroule plutôt que d'être coupé (§A). */}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  label: {
    color: colors.gris,
    fontFamily: fonts.textSemi, // la famille porte la graisse (jamais de fontWeight par-dessus)
    fontSize: fontSizes.xs, // plancher typo : 12
    letterSpacing: 0.5,
  },
});
