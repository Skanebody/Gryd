/**
 * GRYD — les DEUX primitives de l'UI MVP : la scène et son unique action.
 *
 * ─── POURQUOI DE NOUVELLES PRIMITIVES ───────────────────────────────────────
 * `src/ui/Button.tsx` et consorts existent, mais ne figurent pas sur
 * `docs/SALVAGE.md` : ADR-001 les laisse en quarantaine logique. Les reprendre
 * ferait rentrer par la fenêtre les habitudes que la reconstruction visait —
 * variantes accumulées, tailles négociables, plusieurs CTA possibles par écran.
 *
 * Celles-ci sont volontairement PAUVRES, et c'est leur intérêt : elles rendent
 * les lois du MASTER structurelles au lieu de les laisser à la discipline.
 *
 * ─── CE QUE LA FORME IMPOSE, PLUTÔT QUE DE LE RECOMMANDER ───────────────────
 * L2 — `Stage` n'accepte QU'UNE action primaire (`cta`, pas un tableau). Un
 *      second CTA de même poids est impossible à écrire, pas seulement
 *      déconseillé.
 * L4 — le CTA vit dans un `footer` SŒUR du contenu défilant, donc ancré en bas
 *      quoi qu'on mette au-dessus, et sa hauteur minimale est la cible tactile
 *      de 44 pt. Il ne peut PAS défiler hors de portée du pouce.
 * L15 — le libellé du CTA EST son `accessibilityLabel` : impossible d'expédier
 *      un bouton que VoiceOver annonce autrement que ce qu'on lit.
 * L18 — `title`/`body`/`cta.label` reçoivent des chaînes DÉJÀ résolues par `t`.
 *      Aucun texte n'est écrit ici.
 *
 * Le lien secondaire (`link`) est un TEXTE, jamais un bouton plein : c'est ce
 * qui garde « une seule action primaire » vrai à l'œil, pas seulement au type.
 */
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';

/** Cible tactile minimale (L4). Constante d'ACCESSIBILITÉ, pas de jeu. */
const TOUCH_TARGET_PT = 44;

export interface StageAction {
  /** Déjà traduit. Impératif court (Annexe C). */
  readonly label: string;
  readonly onPress: () => void;
  /** `true` pendant un appel en cours : le libellé reste, le tap ne part plus. */
  readonly busy?: boolean;
}

export function Stage({
  title,
  body,
  cta,
  link,
  visual,
}: {
  readonly title: string;
  readonly body: string;
  /** L'UNIQUE action primaire de l'écran (L2). */
  readonly cta: StageAction;
  /** Sortie secondaire — TEXTE, jamais un bouton plein. */
  readonly link?: StageAction;
  readonly visual?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      {/* Le contenu défile ; l'action, elle, ne défile JAMAIS hors de portée. */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {visual}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          accessibilityState={{ disabled: cta.busy === true }}
          disabled={cta.busy === true}
          onPress={cta.onPress}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          {/* Pas de `numberOfLines` : un texte d'action tronqué par « … » est
              interdit (§A). Un libellé trop long doit être RACCOURCI, pas coupé. */}
          <Text style={styles.ctaLabel}>{cta.label}</Text>
        </Pressable>

        {link ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={link.label}
            onPress={link.onPress}
            hitSlop={spacing.sm}
            style={({ pressed }) => [styles.link, pressed && styles.dim]}
          >
            <Text style={styles.linkLabel}>{link.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // `colors.noir` est le near-black VERDI du dépôt (ADR-008) — jamais #000.
  root: { flex: 1, backgroundColor: colors.noir },
  content: {
    flexGrow: 1,
    // `center` et non `flex-end` : avec un visuel, « flex-end » collait tout le
    // contenu au CTA et laissait les deux tiers hauts VIDES — un écran qui ne
    // montre rien ne montre pas la valeur (L9), même s'il dit la bonne phrase.
    // Le CTA reste ancré en bas par le `footer`, hors de ce conteneur : la
    // conformité L4 ne dépend donc pas de cet alignement.
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xxl },
  body: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md, lineHeight: 24 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  cta: {
    minHeight: TOUCH_TARGET_PT,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ctaPressed: { backgroundColor: colors.chartreusePressed },
  // Texte SOMBRE sur chartreuse : l'inverse serait illisible (1,19:1).
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
  link: { minHeight: TOUCH_TARGET_PT, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  dim: { opacity: 0.6 },
});
