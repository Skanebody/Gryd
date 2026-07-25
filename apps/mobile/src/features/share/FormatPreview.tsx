/**
 * GRYD — APERÇU DE FORMAT des cartes de partage (livrable (c), 25/07/2026).
 *
 * « Rendre les cartes prévisualisables sans course » — demande explicite du
 * fondateur. Le compositeur /partage ne s'ouvre qu'avec un résultat de course
 * armé ; sur localhost il n'y en a jamais, donc le rendu des cartes était
 * invisible et injugeable.
 *
 * ─── CE QUE CET ÉCRAN EST, ET CE QU'IL N'EST PAS ────────────────────────────
 * Il montre la MISE EN PAGE : le cadre, ses proportions par format, la
 * hiérarchie typographique, la place de la carte, l'ordre des emplacements. Il
 * ne montre AUCUNE valeur — pas une distance, pas une aire, pas un nom de zone,
 * pas un rang. Chaque emplacement porte son NOM, et rien d'autre.
 *
 * Quatre garde-fous, dont trois testés (formatPreviewModel.test.ts) :
 *   1. les libellés passent `isSlotLabelClean` AU RENDU — une traduction qui
 *      glisserait un chiffre est remplacée par un tiret, jamais affichée ;
 *   2. l'ordre et les proportions viennent du modèle pur, pas d'une intuition ;
 *   3. aucun chemin d'export : ce fichier n'importe ni `shareActions`, ni
 *      `react-native-view-shot`, ni `getShareRun` — il ne PEUT pas produire une
 *      image ni lire une course. Il n'y a pas non plus de CTA chartreuse (§A4) ;
 *   4. l'étiquette « APERÇU DE FORMAT » est DANS le cadre.
 *
 * ─── ET IL MONTRE LE CODE, PAS LA PLANCHE ───────────────────────────────────
 * Le cadre reproduit ce que `ShareCard` rend RÉELLEMENT en mode héros
 * (signature en haut · titre · carte · chiffre · contexte · défi). La liste
 * dessous confronte cet ordre à celui de la planche et nomme les écarts. Un
 * aperçu qui dessinerait l'idéal serait une doc promettant au-delà du code —
 * exactement la faute que la charte interdit.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fonts, gameColors, radii, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { Segmented, SHARE_CARD_ASPECT, type ShareCardRatio } from '../../ui/game';
import { withAlpha } from '../map/mapStyle';
import { C } from '../../i18n/catalog/result';
import { useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import { goBack } from '../../lib/nav';
import {
  PREVIEW_SLOTS,
  RENDERED_SLOT_ORDER,
  isSlotLabelClean,
  slotById,
  type PreviewSlotId,
  type SlotStatus,
} from './formatPreviewModel';

/** Formats de la planche + le sticker (PNG à fond transparent). */
type PreviewFormatId = Extract<ShareCardRatio, 'story' | 'feed' | 'square'> | 'sticker';

const FORMATS: readonly { id: PreviewFormatId; label: Entry; width: number }[] = [
  { id: 'story', label: C.formatStory, width: 216 },
  { id: 'feed', label: C.formatFeed, width: 252 },
  { id: 'square', label: C.formatSquare, width: 276 },
  { id: 'sticker', label: C.fpSticker, width: 276 },
];

const SLOT_LABEL: Record<PreviewSlotId, Entry> = {
  place: C.fpSlotPlace,
  event: C.fpSlotEvent,
  map: C.fpSlotMap,
  hero: C.fpSlotHero,
  context: C.fpSlotContext,
  challenge: C.fpSlotChallenge,
  signature: C.fpSlotSignature,
};

const STATUS_LABEL: Record<SlotStatus, Entry> = {
  rendered: C.fpStatusRendered,
  missing: C.fpStatusMissing,
  misplaced: C.fpStatusMisplaced,
};

/**
 * Le sticker est une capsule, pas un cadre : la signature y est le wordmark
 * (rendu tel quel), et il ne reste que deux emplacements nommés.
 */
const STICKER_SLOTS: readonly PreviewSlotId[] = ['event', 'hero'];

export function FormatPreview() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const [format, setFormat] = useState<PreviewFormatId>('story');

  /**
   * GARDE-FOU 1, AU RENDU. `isSlotLabelClean` est aussi vérifié par un test qui
   * relit le catalogue, mais une traduction ajoutée après coup passerait par
   * ici : plutôt qu'afficher un chiffre dans un aperçu de format — c'est-à-dire
   * fabriquer une donnée —, on affiche un tiret et on le signale en console.
   */
  const label = (entry: Entry): string => {
    const value = t(entry);
    if (isSlotLabelClean(value)) return value;
    console.warn('[apercu-format] libellé porteur de valeur, remplacé :', value);
    return '—';
  };

  const current = FORMATS.find((f) => f.id === format) ?? FORMATS[0]!;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.fpBackA11y)}
          onPress={() => goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>{t(C.fpBack)}</Text>
        </Pressable>

        <Text style={styles.title}>{t(C.fpTitle)}</Text>
        <Text style={styles.intro}>{t(C.fpIntro)}</Text>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>{t(C.fpFormatLabel)}</Text>
          <Segmented
            accessibilityLabel={t(C.fpFormatLabel)}
            options={FORMATS.map((f) => ({ id: f.id, label: t(f.label) }))}
            value={format}
            onChange={setFormat}
            // `surface` et jamais `accent` : aucun chartreuse fort sur cet écran,
            // qui ne propose AUCUNE action de partage (§A4).
            tone="surface"
            scrollable
          />
        </View>

        <View style={styles.frameWrap}>
          {format === 'sticker' ? (
            <StickerFrame width={current.width} label={label} />
          ) : (
            <CardFrame
              width={current.width}
              aspect={SHARE_CARD_ASPECT[format]}
              label={label}
            />
          )}
        </View>

        {/* Non partageable — dit DANS l'écran, sous le cadre qui le dit déjà. */}
        <Text style={styles.notShareable}>{t(C.fpNotShareable)}</Text>

        {/* Les sept emplacements de la planche, confrontés à ce que le code rend. */}
        <Text style={styles.sectionLabel}>{t(C.fpSlotsLabel)}</Text>
        {PREVIEW_SLOTS.map((slot) => (
          <View key={slot.id} style={styles.slotRow}>
            <Text style={styles.slotName} numberOfLines={1} ellipsizeMode="clip">
              {label(SLOT_LABEL[slot.id])}
            </Text>
            <Text
              style={[styles.slotStatus, slot.status !== 'rendered' && styles.slotStatusOff]}
              numberOfLines={2}
            >
              {t(STATUS_LABEL[slot.status])}
              {slot.unsourced ? ` · ${t(C.fpSlotUnsourced)}` : ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Le CADRE, tel que ShareCard le rend en mode héros. Chaque emplacement est une
 * zone nommée : la typographie et les proportions sont celles de la vraie card,
 * le CONTENU est le nom de l'emplacement — jamais une valeur.
 */
function CardFrame({
  width,
  aspect,
  label,
}: {
  width: number;
  aspect: number;
  label: (e: Entry) => string;
}) {
  const t = useT();
  return (
    <View style={[styles.card, { width, aspectRatio: aspect }]}>
      {/* GARDE-FOU 4 : l'étiquette est DANS le cadre. Impossible de confondre
          cet aperçu avec une carte partageable, même sur une capture d'écran. */}
      <View style={styles.badge}>
        <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="clip">
          {t(C.fpBadge)}
        </Text>
      </View>

      {RENDERED_SLOT_ORDER.map((id) => {
        const slot = slotById(id);
        const share = slot ? slot.heightShare : 0.1;
        if (id === 'signature') {
          // Le wordmark est du contenu RÉEL de la card (une marque, pas une
          // donnée) : on le rend tel quel, à sa place réelle — en haut.
          return (
            <View key={id} style={styles.signatureRow}>
              <Text style={styles.wordmark}>GRYD</Text>
              <Text style={styles.slotTag} numberOfLines={1} ellipsizeMode="clip">
                {label(SLOT_LABEL.signature)}
              </Text>
            </View>
          );
        }
        return (
          <View key={id} style={[styles.slot, id === 'map' ? styles.slotMap : null, { flex: share }]}>
            <Text
              style={[
                styles.slotLabel,
                id === 'event' ? styles.slotLabelEvent : null,
                id === 'hero' ? styles.slotLabelHero : null,
              ]}
              numberOfLines={2}
              ellipsizeMode="clip"
            >
              {label(SLOT_LABEL[id])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Le STICKER : capsule sur fond TRANSPARENT (le damier dit la transparence, il
 * n'y a pas d'autre façon de la montrer à l'écran). Même grammaire, resserrée.
 */
function StickerFrame({ width, label }: { width: number; label: (e: Entry) => string }) {
  const t = useT();
  return (
    <View style={[styles.checker, { width }]}>
      <View style={styles.capsule}>
        <Text style={styles.wordmark}>GRYD</Text>
        {STICKER_SLOTS.map((id) => (
          <View key={id} style={styles.slotCompact}>
            <Text style={styles.slotLabel} numberOfLines={1} ellipsizeMode="clip">
              {label(SLOT_LABEL[id])}
            </Text>
          </View>
        ))}
        <Text style={styles.badgeTextInline} numberOfLines={1} ellipsizeMode="clip">
          {t(C.fpBadge)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: spacing.lg },
  pressed: { opacity: 0.6 },

  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  backChevron: { transform: [{ scaleX: -1 }] },
  backText: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.4 },

  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  intro: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.sm,
  },

  controlRow: { marginTop: spacing.xl },
  controlLabel: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  frameWrap: { alignItems: 'center', marginTop: spacing.xl },

  // Même cadre que la vraie card (fond carbone, rayon, filet quasi invisible) —
  // c'est ce qui rend l'aperçu utile : les proportions sont les vraies.
  card: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: withAlpha(colors.blanc, 0.05),
    padding: spacing.cardPadding,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  // L'étiquette vit DANS le cadre. Neutre (jamais chartreuse : ce n'est ni un
  // gain ni une action), et elle prime visuellement sur tout le reste.
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gris,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: { color: colors.gris, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  badgeTextInline: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: spacing.xxs,
  },

  signatureRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 4 },
  slotTag: { color: colors.gris, fontSize: 10, fontWeight: '600', flexShrink: 1 },

  // Un emplacement = un contour pointillé NEUTRE et son nom. Pas une card (§A) :
  // un simple repère de mise en page.
  slot: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.grisLigne,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
  slotCompact: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.grisLigne,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  // La carte domine : c'est la preuve, elle tient le centre optique (planche).
  slotMap: { borderColor: colors.gris },
  slotLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Le titre est en display : l'aperçu le montre à sa vraie échelle relative.
  slotLabelEvent: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800' },
  // Le chiffre héros domine — sa taille, pas sa valeur (il n'y en a aucune).
  slotLabelHero: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '800' },

  // Damier = fond transparent du PNG. Deux tons neutres, aucun token de couleur
  // détourné : c'est une convention de damier, pas une surface de l'app.
  checker: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.grisLigne,
    backgroundColor: withAlpha(colors.blanc, 0.04),
  },
  capsule: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.lg,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },

  notShareable: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  slotName: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', flexShrink: 1 },
  slotStatus: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '58%',
  },
  // Un écart n'est pas une alerte : il reste gris, il est juste DIT.
  slotStatusOff: { color: colors.blanc },
});
