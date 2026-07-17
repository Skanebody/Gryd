/**
 * GRYD — « Calculs & règles du jeu » (AMENDEMENT-23 §B.2 / doc §33-§34, C2).
 * FAQ in-app en ACCORDÉONS : question au repos, réponse + schéma AU TAP
 * (AMENDEMENT-22 §6). Sections posées sur le fond, séparées par l'espace, sans
 * card-dans-card. Les 20 Q/R (§33) regroupées par catégorie + la FAQ courte
 * post-run (§34). Le jargon technique (`advanced`) est masqué derrière un
 * segmented control « Simple / Avancé » (cible tactile ≥ 44 px).
 *
 * Contenu et libellés viennent de content.ts / labels.ts : les valeurs sont
 * déjà résolues depuis les CONSTANTES game-rules.ts. AUCUN nombre magique ici.
 * Cet écran applique en plus des RÉÉCRITURES D'AFFICHAGE locales (zéro-friction) :
 * « stats only » → « compte en stats » (même vocabulaire que la pill du Résultat
 * de course), Q3 en une raison de refus par ligne avec seuils étiquetés, total
 * post-run additif avec unité nommée. Les seuils restent dérivés des helpers
 * labels.ts — jamais de littéral.
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
  closeToleranceLabel,
  defenseHoursLabels,
  gpsGateLabel,
  runMinDistanceLabel,
  runMinDurationLabel,
  verifyTiersLabel,
  widthMinLabel,
  zoneLifecycleLabels,
} from '../src/features/explain/labels';
import {
  BonusCible,
  BoucleCollective,
  BoucleFaitLaZone,
  DefenseFrontiere,
  LigneVsBoucle,
  VerifySchema,
} from '../src/features/explain/schemas';
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

/**
 * Francisation d'affichage : le statut « stats only » arrive tel quel de
 * content.ts / labels.ts (hors périmètre de cet écran) ; ici il s'affiche
 * « compte en stats » — exactement le libellé de la pill du Résultat de course.
 */
function frStatut(text: string): string {
  return text.replace(/stats only/g, 'compte en stats');
}

/**
 * Réécritures locales zéro-friction (les textes source vivent dans content.ts,
 * hors périmètre de cet écran). Q3 : UNE raison de refus par ligne, chaque
 * seuil étiqueté — fini les trois « 80 » de sens différents dans une même
 * phrase ; les valeurs restent dérivées des helpers labels.ts (aucun nombre
 * magique). Q10 / Q12 / Q16 : zéro anglicisme (« stats only », « decay »,
 * « boosts pay-to-win »).
 */
const FAQ_TEXT_OVERRIDES: Readonly<Record<string, { q?: string; a?: string }>> = {
  q3: {
    a: [
      `· Boucle non refermée : écart départ-arrivée > ${closeToleranceLabel()}.`,
      `· Signal GPS trop faible : indice sous ${gpsGateLabel()}.`,
      `· Tracé trop étroit : moins de ${widthMinLabel()} de large.`,
      '· Surface trop petite, ou au-dessus du plafond.',
      `· Course trop courte : moins de ${runMinDistanceLabel()} ou ${runMinDurationLabel()}.`,
    ].join('\n'),
  },
  q10: { q: 'Pourquoi ma course compte seulement en stats ?' },
  q12: {
    a: `Stable ${zoneLifecycleLabels().stable}, fragile ${zoneLifecycleLabels().fragile}, à défendre les ${zoneLifecycleLabels().aDefendre}, expirée ${zoneLifecycleLabels().decay}.`,
  },
  q16: { q: 'Les bonus payants font-ils gagner ?' },
};

/**
 * FAQ post-course : total ADDITIF avec unité nommée (214 + 33 = 247 zones,
 * signalé comme exemple — jamais présenté comme la vraie course de l'utilisateur)
 * et statut en français, aligné sur la pill « Compte en stats » du Résultat.
 */
const POST_RUN_TEXT_OVERRIDES: Readonly<Record<string, { q?: string; a?: string }>> = {
  zones: {
    a: 'Exemple : la trace couvre +214 zones, la fermeture de la boucle en ajoute +33. Total : +247 zones.',
  },
  stats_only: { q: 'Pourquoi « compte en stats » ?' },
};

/** Schéma associé à une Q/R (mêmes labels game-rules que la page calcul). */
function Schema({ id }: { id: SchemaId }) {
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
      const t = verifyTiersLabel();
      return (
        <VerifySchema
          size={width}
          validLabel={`Capture validée · ${t.full}+`}
          excludedLabel={`Segment exclu · < ${t.partial}`}
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
      title="Calculs & règles"
      icon="aide"
      kicker="QUESTIONS & RÉPONSES"
      subtitle="Toutes les réponses, détails au tap. Chaque capture — ou refus — s'explique."
    >
      {/* Segmented control (AMENDEMENT-22 §4) : masque le jargon par défaut. */}
      <View style={styles.segmented}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réponses simples"
          accessibilityState={{ selected: !advanced }}
          onPress={() => setAdvanced(false)}
          style={[styles.segment, !advanced && styles.segmentOn]}
        >
          <Text style={!advanced ? styles.segmentTextOn : styles.segmentText}>Simple</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réponses avancées"
          accessibilityState={{ selected: advanced }}
          onPress={() => setAdvanced(true)}
          style={[styles.segment, advanced && styles.segmentOn]}
        >
          <Text style={advanced ? styles.segmentTextOn : styles.segmentText}>Avancé</Text>
        </Pressable>
      </View>

      {CATEGORY_ORDER.map((cat) => {
        const items = itemsByCategory.get(cat);
        if (items === undefined || items.length === 0) return null;
        return (
          <View key={cat} style={styles.group}>
            <Text style={styles.groupLabel}>{FAQ_CATEGORY_LABELS[cat]}</Text>
            {items.map((item) => {
              const local = FAQ_TEXT_OVERRIDES[item.id];
              return (
                <AccordionRow
                  key={item.id}
                  icon={item.icon}
                  q={frStatut(local?.q ?? item.q)}
                  a={frStatut(local?.a ?? item.a)}
                  schemaId={item.schemaId}
                  open={openId === item.id}
                  onToggle={() => toggle(item.id)}
                />
              );
            })}
          </View>
        );
      })}

      {/* FAQ courte post-run (§34) : questions express après une course. */}
      <View style={styles.group}>
        <Text style={styles.groupLabel}>Après une course</Text>
        {POST_RUN_FAQ.map((item: PostRunFaqItem) => {
          const local = POST_RUN_TEXT_OVERRIDES[item.id];
          return (
            <AccordionRow
              key={item.id}
              icon={item.icon}
              q={frStatut(local?.q ?? item.q)}
              a={frStatut(local?.a ?? item.a)}
              schemaId={item.schemaId}
              open={openId === `post_${item.id}`}
              onToggle={() => toggle(`post_${item.id}`)}
            />
          );
        })}
      </View>

      <Text style={styles.footnote}>
        Une question sans réponse ici ? L'aide GRYD reprend chaque cas, et une personne lit chaque
        demande.
      </Text>
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
