/**
 * GRYD — STICKER À FOND TRANSPARENT (planche E10 : « sticker PNG transparent »).
 *
 * Ce qu'il remplace : `stickerText()`, qui copiait 4 lignes de TEXTE. Ce n'était
 * pas un mensonge (le toast disait bien « copié »), mais ce n'était pas non plus
 * un sticker : on ne colle pas quatre lignes de texte sur une story.
 *
 * Le fond de CE composant est transparent — c'est tout l'enjeu du PNG : une fois
 * rasterisé (`captureRef({ format: 'png' })`), il se colle sur n'importe quelle
 * photo. La capsule sombre, elle, existe pour que le texte reste lisible sur un
 * fond clair comme sur un fond sombre : jamais de chartreuse sur clair (charte),
 * donc la chartreuse ne vit que DANS la capsule noire.
 *
 * HONNÊTETÉ : ce composant n'invente rien. Il ne rend que ce que l'écran lui
 * passe — et l'écran ne lui passe que le verdict serveur. Un `verified` faux
 * n'affiche aucun sceau ; une ligne vide n'est pas rendue.
 *
 * Il est monté HORS ÉCRAN par /partage (jamais visible) : c'est la cible de la
 * capture, pas un élément d'interface.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';

export interface StickerCardProps {
  /** Ligne principale : « +12 zones · Zone » ou « 5,20 km sur GRYD ». */
  headline: string;
  /** Ligne de mesures « 5,20 km · 27:12 » — vide si rien n'est mesuré. */
  metrics: string;
  /** Sceau GRYD Verified — affirmation du SERVEUR, jamais un défaut de rendu. */
  verified: boolean;
}

export function StickerCard({ headline, metrics, verified }: StickerCardProps) {
  return (
    // Le conteneur EXTÉRIEUR reste transparent : c'est lui qu'on capture, et
    // c'est ce qui rend le PNG collable sur n'importe quelle story.
    <View style={styles.transparentRoot}>
      <View style={styles.capsule}>
        <Text style={styles.wordmark}>GRYD</Text>
        <Text style={styles.headline} numberOfLines={2}>
          {headline}
        </Text>
        {metrics ? (
          <Text style={styles.metrics} numberOfLines={1}>
            {metrics}
          </Text>
        ) : null}
        {verified ? <Text style={styles.verified}>✓ GRYD Verified</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  transparentRoot: { backgroundColor: 'transparent', padding: 0, alignSelf: 'flex-start' },
  capsule: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
    maxWidth: 320,
  },
  wordmark: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 4,
  },
  // Chartreuse sur carbone (fond SOMBRE) — jamais sur clair (charte).
  headline: {
    color: colors.chartreuse,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metrics: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  verified: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700' },
});
