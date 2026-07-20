/**
 * GRYD — « Calculs & règles du jeu » (AMENDEMENT-23 §B.2 / doc §33-§34, C2).
 * FAQ in-app en ACCORDÉONS : question au repos, réponse + schéma AU TAP
 * (AMENDEMENT-22 §6). Sections posées sur le fond, séparées par l'espace, sans
 * card-dans-card. Les 20 Q/R (§33) regroupées par catégorie + la FAQ courte
 * post-run (§34). Le jargon technique (`advanced`) est masqué derrière un
 * segmented control « Simple / Avancé » (cible tactile ≥ 44 px).
 *
 * i18n : contenu et libellés arrivent en `Entry` 5 langues (content.ts +
 * catalogue explain) et sont résolus ICI via t() — bascule instantanée. Les
 * valeurs sont déjà dérivées des CONSTANTES game-rules.ts (labels.ts) : AUCUN
 * nombre magique. Les réécritures zéro-friction historiques (« compte en
 * stats », Q3 en liste, total additif) vivent désormais dans le catalogue.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import {
  FAQ_CATEGORY_LABELS,
  FAQ_ITEMS,
  POST_RUN_FAQ,
  type FaqCategory,
  type FaqItem,
  type PostRunFaqItem,
  type SchemaId,
} from '../src/features/explain/content';
import {
  defenseHoursLabels,
  verifyTiersLabel,
} from '../src/features/explain/labels';
import {
  BonusCible,
  BoucleCollective,
  BoucleFaitLaZone,
  DefenseFrontiere,
  LigneVsBoucle,
  VerifySchema,
} from '../src/features/explain/schemas';
import { C } from '../src/i18n/catalog/explain';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

// Android : activer l'animation de layout douce à l'ouverture d'un accordéon.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Ordre d'affichage des catégories (les 20 Q/R sont réparties dedans). */
const CATEGORY_ORDER: readonly FaqCategory[] = [
  'zones',
  'defense',
  'crew',
  'verify',
  'economie',
];

/** Schéma associé à une Q/R (mêmes labels game-rules que la page calcul). */
function Schema({ id }: { id: SchemaId }) {
  const t = useT();
  const width = 260;
  switch (id) {
    case 'ligne_vs_boucle':
      return <LigneVsBoucle size={width} />;
    case 'boucle_fait_zone':
      return <BoucleFaitLaZone size={width} />;
    case 'defense_frontiere': {
      const h = defenseHoursLabels();
      return (
        <DefenseFrontiere
          size={width}
          traverseLabel={h.traverse}
          longeLabel={h.longe}
          coverLabel={h.cover}
        />
      );
    }
    case 'boucle_collective':
      return <BoucleCollective size={width} />;
    case 'bonus_cible':
      return <BonusCible size={width} />;
    case 'verify': {
      const tiers = verifyTiersLabel();
      return (
        <VerifySchema
          size={width}
          validLabel={t(C.verifyValidWithTier, { n: tiers.full })}
          excludedLabel={t(C.verifyExcludedWithTier, { n: tiers.partial })}
        />
      );
    }
  }
}

/** Une ligne d'accordéon : question au repos, réponse + schéma au tap. */
function AccordionRow({
  icon,
  q,
  a,
  schemaId,
  open,
  onToggle,
}: {
  icon: FaqItem['icon'];
  q: string;
  a: string;
  schemaId?: SchemaId;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={q}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.rowHead, pressed && styles.pressed]}
      >
        <View style={styles.iconWrap}>
          <Icon name={icon} size={16} color={colors.blanc} />
        </View>
        <Text style={styles.q}>{q}</Text>
        <View style={open ? styles.chevronOpen : undefined}>
          <Icon name="chevron" size={16} color={colors.gris} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.answer}>
          <Text style={styles.a}>{a}</Text>
          {schemaId ? (
            <View style={styles.schemaWrap}>
              <Schema id={schemaId} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function FaqScreen() {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    screen('faq_calculs');
  }, []);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  };

  // Q/R filtrées : les items `advanced` n'apparaissent qu'en mode Avancé.
  const itemsByCategory = useMemo(() => {
    const map = new Map<FaqCategory, FaqItem[]>();
    for (const item of FAQ_ITEMS) {
      if (item.advanced && !advanced) continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [advanced]);

  return (
    <StackScreen
      title={t(C.faqTitle)}
      icon="aide"
      kicker={t(C.faqKicker)}
      subtitle={t(C.faqSubtitle)}
    >
      {/* Segmented control (AMENDEMENT-22 §4) : masque le jargon par défaut. */}
      <View style={styles.segmented}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.faqSimpleA11y)}
          accessibilityState={{ selected: !advanced }}
          onPress={() => setAdvanced(false)}
          style={[styles.segment, !advanced && styles.segmentOn]}
        >
          <Text style={!advanced ? styles.segmentTextOn : styles.segmentText}>
            {t(C.faqSimple)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.faqAdvancedA11y)}
          accessibilityState={{ selected: advanced }}
          onPress={() => setAdvanced(true)}
          style={[styles.segment, advanced && styles.segmentOn]}
        >
          <Text style={advanced ? styles.segmentTextOn : styles.segmentText}>
            {t(C.faqAdvanced)}
          </Text>
        </Pressable>
      </View>

      {CATEGORY_ORDER.map((cat) => {
        const items = itemsByCategory.get(cat);
        if (items === undefined || items.length === 0) return null;
        return (
          <View key={cat} style={styles.group}>
            <Text style={styles.groupLabel}>{t(FAQ_CATEGORY_LABELS[cat])}</Text>
            {items.map((item) => (
              <AccordionRow
                key={item.id}
                icon={item.icon}
                q={t(item.q)}
                a={t(item.a)}
                schemaId={item.schemaId}
                open={openId === item.id}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </View>
        );
      })}

      {/* FAQ courte post-run (§34) : questions express après une course. */}
      <View style={styles.group}>
        <Text style={styles.groupLabel}>{t(C.faqPostRunGroup)}</Text>
        {POST_RUN_FAQ.map((item: PostRunFaqItem) => (
          <AccordionRow
            key={item.id}
            icon={item.icon}
            q={t(item.q)}
            a={t(item.a)}
            schemaId={item.schemaId}
            open={openId === `post_${item.id}`}
            onToggle={() => toggle(`post_${item.id}`)}
          />
        ))}
      </View>

      <Text style={styles.footnote}>{t(C.faqFootnote)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // Segmented : UN seul container pour le groupe de choix (AMENDEMENT-22 §4).
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.carbone,
    borderRadius: radii.control,
    padding: spacing.xxs,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  // Cible tactile ≥ 44 px (HIG) : minHeight garanti, texte centré verticalement.
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: colors.carbone2 },
  segmentText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  segmentTextOn: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },

  group: { marginTop: spacing.xl },
  groupLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },

  // Un accordéon = une ligne posée sur le fond, séparée par un filet discret.
  row: { borderBottomWidth: 1, borderBottomColor: colors.grisLigne },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  q: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', lineHeight: fontSizes.sm * 1.35 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },

  answer: { paddingBottom: spacing.md, paddingLeft: 42 },
  a: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.55 },
  schemaWrap: { alignItems: 'center', marginTop: spacing.md },

  // Texte de lecture (pas un micro-label) : sm pour rester lisible en mouvement.
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.6,
    marginTop: 28,
  },
});
