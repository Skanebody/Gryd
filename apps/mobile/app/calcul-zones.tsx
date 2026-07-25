/**
 * GRYD — « Comment GRYD calcule tes zones » (AMENDEMENT-23 §B.1 / doc §32, C2).
 * Route d'explicabilité : des SCÈNES posées sur le fond (AMENDEMENT-22, pas de
 * card-dans-card), chacune = icône propriétaire + phrase simple + mini-schéma
 * SVG + exemple concret. Les schémas DÉCRIVENT LE MOTEUR RÉEL ; les valeurs
 * injectées (défense +24/48/72 h, verify 80/60, valeur d'une zone, durée de vie)
 * viennent des CONSTANTES game-rules.ts via ExplainSchema + labels.ts — AUCUN
 * nombre magique ici. Les chiffres en prose (+247/+214/+33, 79/21 %, 620 m) sont
 * des SCÉNARIOS démo signalés « Exemple : » dans le catalogue.
 *
 * L'ordre des scènes suit l'ordre des questions qu'on se pose : comment une
 * course devient une zone → ce qu'elle rapporte → ce qui se passe à plusieurs
 * dessus (LE RELAIS) → comment on la garde → pourquoi on la perd → ce qui peut
 * l'invalider.
 *
 * Accès : Support (« Pourquoi ma course n'a pas compté ? »), Paramètres, et le
 * lien post-run « Comment est calculé ce résultat ? ».
 *
 * i18n : titres, phrases et exemples arrivent en `Entry` 5 langues (content.ts
 * + catalogue explain) et sont résolus ICI via t(). Les réécritures
 * zéro-friction historiques (additif 214 + 33 = 247, « compte en stats »,
 * préfixe « Exemple : » systématique) vivent désormais dans le catalogue.
 * Positionnement : cette page = VISITE GUIDÉE ; la FAQ = questions précises —
 * le lien de pied dit « Voir toutes les questions » pour lever l'homonymie.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, iconSizes, spacing } from '@klaim/shared';
import {
  EXPLAIN_SECTIONS,
  type ExplainSection,
} from '../src/features/explain/content';
import { ExplainSchema } from '../src/features/explain/ExplainSchema';
import { C } from '../src/i18n/catalog/explain';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

/** Une scène : numéro + icône + titre, phrase, schéma centré, exemple discret. */
function SceneBlock({ section, index }: { section: ExplainSection; index: number }) {
  const t = useT();
  // Largeur du schéma bornée à la scène (padding écran des deux côtés).
  const schemaWidth = 280;
  return (
    <View style={styles.scene}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Icon name={section.icon} size={20} color={colors.blanc} />
        </View>
        <Text style={styles.step}>{`0${index + 1}`}</Text>
        <Text style={styles.title}>{t(section.title)}</Text>
      </View>
      <Text style={styles.line}>{t(section.line)}</Text>
      <View style={styles.schemaWrap}>
        <ExplainSchema id={section.schemaId} width={schemaWidth} />
      </View>
      <Text style={styles.example}>{t(section.example)}</Text>
    </View>
  );
}

export default function CalculZonesScreen() {
  const t = useT();

  useEffect(() => {
    screen('calcul_zones');
  }, []);

  return (
    <StackScreen
      title={t(C.calcTitle)}
      icon="info"
      kicker={t(C.calcKicker, { n: EXPLAIN_SECTIONS.length })}
      subtitle={t(C.calcSubtitle)}
    >
      <View style={styles.list}>
        {EXPLAIN_SECTIONS.map((section, i) => (
          <SceneBlock key={section.id} section={section} index={i} />
        ))}
      </View>

      {/* Sortie explicite vers la FAQ : verbe + objet, jamais un quasi-homonyme
          du titre de cette page. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.calcSeeAllQuestions)}
        onPress={() => router.push('/faq')}
        style={({ pressed }) => [styles.faqLink, pressed && styles.pressed]}
      >
        <Icon name="aide" size={iconSizes.md} color={colors.blanc} />
        <Text style={styles.faqLinkText}>{t(C.calcSeeAllQuestions)}</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.sm },
  // Une SCÈNE posée sur le fond : séparée par l'espace, sans contour (AMENDEMENT-22).
  scene: { marginBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  title: { flex: 1, color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  line: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.sm,
  },
  schemaWrap: { alignItems: 'center', marginTop: 18 },
  // Exemple concret = contenu clé (pas un micro-label) : sm, lisible en mouvement.
  example: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.55,
    marginTop: spacing.md,
  },
  // Action légère de bas de page (pas un gros CTA chartreuse — celui-ci reste rare).
  faqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  faqLinkText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
