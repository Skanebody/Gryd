/**
 * GRYD — SHEET « PERSONNALISER » (planche E10 + spec E36).
 *
 *   Personnaliser                                    ✕
 *   Une chose à la fois. L’aperçu suit.
 *        [ mini-aperçu qui suit le BROUILLON ]
 *   Format          Story            ›     ← sections REPLIÉES,
 *   Style           Auto             ›       UNE SEULE ouverte
 *   Donnée          Surface          ˅       à la fois
 *      [ Auto | Surface | Zones | Distance ]
 *   Texte           Défi · Contexte  ›
 *   Confidentialité Masqués          ›
 *   [ APPLIQUER ]
 *
 * ═══ CE QUE CE COMPOSANT DÉCIDE, ET CE QU'IL NE DÉCIDE PAS ══════════════════
 * Il ne connaît ni les templates, ni les formats, ni les grandeurs : l'écran lui
 * passe des OPTIONS déjà filtrées par ce que la course peut tenir (verdict
 * serveur, géométrie, disponibilité des faits). C'est volontaire — la règle
 * « on ne peint que ce qui est atteignable » (constitution §2) se décide là où
 * les faits vivent, pas dans une feuille de réglages. Ici, une liste vide n'est
 * jamais grisée : la section le DIT (`customizeTabEmpty`).
 *
 * ═══ BROUILLON, PARCE QUE LA CROIX DIT « SANS APPLIQUER » ═══════════════════
 * L'état modifié est une COPIE (`ComposerDraft`) : `APPLIQUER` la commit, la
 * croix la jette. C'est la seule lecture qui rende vrais les deux textes déjà
 * écrits — `customizeCloseA11y` (« Fermer sans appliquer ») et le CTA
 * `APPLIQUER` de la spec E36, qui n'appliquerait rien si tout était déjà
 * appliqué. Et c'est ce qui donne son sens au mini-aperçu : « l'aperçu suit »
 * (`customizeHint`) désigne CELUI-CI, dans le sheet, pas celui de l'écran, que
 * le sheet recouvre.
 *
 * ═══ UN SEUL CHARTREUSE À L'ÉCRAN (§A) ═════════════════════════════════════
 * Le sheet monte au-dessus d'un voile plein (`colors.scrimStrong`) : la CTA de
 * l'écran est couverte pendant qu'`APPLIQUER` est visible. Les choix de section
 * sont donc en `tone="surface"` (jamais un segment chartreuse plein) — sinon
 * trois blocs chartreuse se disputeraient la même scène.
 *
 * ═══ LA SECTION « PHOTO » DE LA PLANCHE N'EST PAS ICI ══════════════════════
 * Voir `composerModel.ts` : `apps/mobile/app.json` déclare
 * `NSPhotoLibraryUsageDescription` pour un usage photo de PROFIL uniquement.
 * Peindre un mode Photo servirait à un autre usage une permission demandée pour
 * celui-là. Élargir cette chaîne est une décision de fondation (app.json + revue
 * App Store), pas un choix d'écran.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderState, colors, elevation, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { Segmented, useReduceMotion } from '../../ui/game';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/result';
import { SHARE_COPY } from './copy';
import { CUSTOMIZE_SECTIONS, type ComposerDraft, type CustomizeSectionId } from './composerModel';
import { haptics } from '../../lib/haptics';

/** Une option de section : un id libre (l'écran le renarrowe) et un libellé COURT. */
export interface CustomizeOption {
  readonly id: string;
  readonly label: string;
}

export interface CustomizeSheetProps<D extends ComposerDraft> {
  visible: boolean;
  /** L'état COMMITÉ de l'écran : point de départ du brouillon à chaque ouverture. */
  committed: D;
  /** Fermeture SANS appliquer (croix, voile, retour Android). */
  onClose: () => void;
  /** `APPLIQUER` : l'écran reçoit le brouillon complet et décide quoi en faire. */
  onApply: (next: D) => void;
  /** Section ouverte à l'ouverture du sheet (pour `share_customize_opened`). */
  onOpened: (section: CustomizeSectionId) => void;
  /** Formats réellement proposables (« Carte seule » tombe sans tracé connu). */
  formatOptions: readonly CustomizeOption[];
  /** Styles tenables par cette course. Vide = rien à choisir, et on le dit. */
  styleOptions: readonly CustomizeOption[];
  /** Grandeurs RÉELLEMENT disponibles pour le chiffre héros (+ « Auto »). */
  heroOptions: readonly CustomizeOption[];
  /** Les deux textes optionnels existent-ils sur la carte courante ? */
  textParts: { readonly challenge: boolean; readonly context: boolean };
  /** Mini-aperçu construit par l'écran à partir du BROUILLON. */
  renderPreview: (draft: D) => ReactNode;
}

/** Libellé de section — vocabulaire de la planche, moins la Photo. */
function sectionLabel(id: CustomizeSectionId): (typeof SHARE_COPY)[keyof typeof SHARE_COPY] {
  switch (id) {
    case 'format':
      return SHARE_COPY.customizeTabFormat;
    case 'style':
      return SHARE_COPY.customizeTabStyle;
    case 'data':
      return SHARE_COPY.customizeTabData;
    case 'text':
      return SHARE_COPY.customizeTabText;
    case 'privacy':
      return SHARE_COPY.customizeTabPrivacy;
  }
}

export function CustomizeSheet<D extends ComposerDraft>({
  visible,
  committed,
  onClose,
  onApply,
  onOpened,
  formatOptions,
  styleOptions,
  heroOptions,
  textParts,
  renderPreview,
}: CustomizeSheetProps<D>) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const reduceMotion = useReduceMotion();
  const [draft, setDraft] = useState<D>(committed);
  /** UNE SEULE section ouverte (planche). `null` = tout replié. */
  const [open, setOpen] = useState<CustomizeSectionId | null>('format');

  // Chaque ouverture repart de l'état COMMITÉ : un brouillon abandonné ne doit
  // pas ressusciter au rendez-vous suivant (la croix dit « sans appliquer »).
  useEffect(() => {
    if (visible) {
      setDraft(committed);
      setOpen('format');
      onOpened('format');
    }
    // `committed` volontairement hors deps : on ne veut PAS écraser le brouillon
    // en cours si l'écran se re-rend pendant que le sheet est ouvert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const patch = (p: Partial<ComposerDraft>) => setDraft((d) => ({ ...d, ...p }) as D);

  const toggleSection = (id: CustomizeSectionId) => {
    haptics.light();
    setOpen((cur) => (cur === id ? null : id));
  };

  /** Résumé affiché à droite du titre de section — l'état, sans l'ouvrir. */
  const summaryOf = (id: CustomizeSectionId): string => {
    switch (id) {
      case 'format':
        return formatOptions.find((o) => o.id === draft.ratio)?.label ?? '';
      case 'style':
        return styleOptions.find((o) => o.id === draft.style)?.label ?? '';
      case 'data':
        return heroOptions.find((o) => o.id === draft.hero)?.label ?? '';
      case 'text': {
        const parts = [
          draft.showChallenge && textParts.challenge ? t(SHARE_COPY.textPartChallenge) : '',
          draft.showContext && textParts.context ? t(SHARE_COPY.textPartContext) : '',
        ].filter(Boolean);
        return parts.length === 0 ? t(SHARE_COPY.textPartNone) : parts.join(' · ');
      }
      case 'privacy':
        return draft.maskEndpoints
          ? t(SHARE_COPY.privacyEndpointsHidden)
          : t(SHARE_COPY.privacyEndpointsVisible);
    }
  };

  const renderBody = (id: CustomizeSectionId): ReactNode => {
    switch (id) {
      // Les deux libellés d'accessibilité qui existaient DÉJÀ pour ces mêmes
      // choix quand ils vivaient à plat sur l'écran (« Format de partage »,
      // « Style de la carte ») : ils décrivent l'action, pas l'onglet, et les
      // remplacer par le nom de section aurait appauvri VoiceOver.
      case 'format':
        return (
          <SingleChoice
            a11y={t(C.formatA11y)}
            options={formatOptions}
            value={draft.ratio}
            onChange={(v) => patch({ ratio: v })}
          />
        );
      case 'style':
        return (
          <SingleChoice
            a11y={t(C.styleA11y)}
            options={styleOptions}
            value={draft.style}
            onChange={(v) => patch({ style: v })}
          />
        );
      case 'data':
        return (
          <SingleChoice
            a11y={t(SHARE_COPY.customizeTabData)}
            options={heroOptions}
            value={draft.hero}
            onChange={(v) => patch({ hero: v })}
          />
        );
      case 'text': {
        // On ne propose QUE les textes que la carte courante porte réellement :
        // un interrupteur sur un texte absent serait un contrôle sans effet.
        if (!textParts.challenge && !textParts.context) return <EmptyNote />;
        return (
          <View style={styles.toggleRow}>
            {textParts.challenge ? (
              <TogglePill
                label={t(SHARE_COPY.textPartChallenge)}
                on={draft.showChallenge}
                onPress={() => patch({ showChallenge: !draft.showChallenge })}
              />
            ) : null}
            {textParts.context ? (
              <TogglePill
                label={t(SHARE_COPY.textPartContext)}
                on={draft.showContext}
                onPress={() => patch({ showContext: !draft.showContext })}
              />
            ) : null}
          </View>
        );
      }
      case 'privacy':
        return (
          <>
            <SingleChoice
              a11y={t(SHARE_COPY.privacyEndpointsLabel)}
              options={[
                { id: 'on', label: t(SHARE_COPY.privacyEndpointsHidden) },
                { id: 'off', label: t(SHARE_COPY.privacyEndpointsVisible) },
              ]}
              value={draft.maskEndpoints ? 'on' : 'off'}
              onChange={(v) => patch({ maskEndpoints: v === 'on' })}
            />
            {/* Ce réglage n'est PAS local au partage : il est persisté et vaut
                pour tous les partages suivants. Le taire serait mentir par
                omission sur la portée d'un contrôle de confidentialité. */}
            <Text style={styles.note}>{t(SHARE_COPY.privacyEndpointsGlobal)}</Text>
          </>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      // Reduce Motion respecté : aucune translation imposée à qui l'a demandé.
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(SHARE_COPY.customizeCloseA11y)}
          style={styles.backdrop}
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{t(SHARE_COPY.customizeTitle)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(SHARE_COPY.customizeCloseA11y)}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Icon name="fermer" size={16} color={colors.gris} />
            </Pressable>
          </View>
          <Text style={styles.hint}>{t(SHARE_COPY.customizeHint)}</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* L'APERÇU de E36 : il suit le BROUILLON, c'est lui qui rend vraie
                la promesse « l'aperçu suit » pendant que le sheet couvre
                l'aperçu de l'écran. */}
            <View style={styles.preview}>{renderPreview(draft)}</View>

            {CUSTOMIZE_SECTIONS.map((id) => {
              const isOpen = open === id;
              return (
                <View key={id} style={styles.section}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={t(sectionLabel(id))}
                    accessibilityHint={summaryOf(id)}
                    onPress={() => toggleSection(id)}
                    style={({ pressed }) => [styles.sectionHead, pressed && styles.pressed]}
                  >
                    <Text style={styles.sectionName}>{t(sectionLabel(id))}</Text>
                    {/* §A.9 — jamais d'ellipse sur un texte d'état : on coupe net
                        si l'espace manque, et le détail est dans la section. */}
                    <Text style={styles.sectionValue} numberOfLines={1} ellipsizeMode="clip">
                      {summaryOf(id)}
                    </Text>
                    <View style={isOpen ? styles.chevronOpen : styles.chevronClosed}>
                      <Icon name="chevron" size={12} color={colors.gris} />
                    </View>
                  </Pressable>
                  {isOpen ? <View style={styles.sectionBody}>{renderBody(id)}</View> : null}
                </View>
              );
            })}
          </ScrollView>

          {/* CTA de la spec E36, mot pour mot. Il APPLIQUE réellement : c'est
              lui, et lui seul, qui écrit le brouillon dans l'écran. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(SHARE_COPY.customizeApply)}
            onPress={() => {
              haptics.light();
              onApply(draft);
            }}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaLabel}>{t(SHARE_COPY.customizeApply)}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Un groupe de choix = UN segmented (§A r.6), jamais N pills séparées. `tone`
 * surface : le seul chartreuse de la scène est `APPLIQUER`.
 * Liste vide → on DIT qu'il n'y a rien à régler, on ne peint pas une rangée vide.
 */
function SingleChoice({
  a11y,
  options,
  value,
  onChange,
}: {
  a11y: string;
  options: readonly CustomizeOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (options.length === 0) return <EmptyNote />;
  return (
    <Segmented
      accessibilityLabel={a11y}
      options={options.map((o) => ({ id: o.id, label: o.label }))}
      value={value}
      onChange={onChange}
      tone="surface"
      // Défilant : §A.9 interdit qu'un libellé soit tronqué à 375 px.
      scrollable
    />
  );
}

function EmptyNote() {
  const t = useT();
  return <Text style={styles.note}>{t(SHARE_COPY.customizeTabEmpty)}</Text>;
}

/**
 * Interrupteur d'un texte de la carte. `accessibilityRole="switch"` + `checked` :
 * l'état ne tient jamais à la seule couleur (§15) — et la coche le double à
 * l'écran. Cible tactile RÉELLE ≥ 44 pt (`sizes.touchTarget`), pas un hitSlop.
 */
function TogglePill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.toggle, on && styles.toggleOn, pressed && styles.pressed]}
    >
      <Icon name={on ? 'badge' : 'plus'} size={12} color={on ? colors.blanc : colors.gris} />
      <Text style={[styles.toggleLabel, on && styles.toggleLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrimStrong },
  // N1 : UNE surface pour tout le sheet (jamais une card dans la card).
  sheet: {
    backgroundColor: elevation.base,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    // Planche : sheet 50 → 90 %.
    maxHeight: '90%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  close: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  hint: { color: colors.gris, fontSize: fontSizes.xs, marginTop: spacing.xxs },
  scroll: { marginTop: spacing.md },
  scrollContent: { paddingBottom: spacing.sm },
  preview: { alignItems: 'center', marginBottom: spacing.md },
  section: { borderTopWidth: 1, borderTopColor: borderState.hairline },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.xs,
  },
  sectionName: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  sectionValue: { color: colors.gris, fontSize: fontSizes.xs, flex: 1, textAlign: 'right' },
  chevronClosed: { transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  sectionBody: { paddingBottom: spacing.sm },
  note: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xs,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // Le contour signale un ÉTAT (règle 80/20), il n'est jamais permanent. Filet
  // chartreuse DISCRET, exactement comme le segment actif de `Segmented`
  // (tone surface) : un interrupteur ne se dispute pas la scène avec le CTA.
  toggleOn: { borderColor: borderState.activeSoft },
  toggleLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  toggleLabelOn: { color: colors.blanc },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chartreuse,
    borderRadius: radii.card,
    minHeight: sizes.buttonMd,
    marginTop: spacing.md,
  },
  ctaLabel: {
    color: colors.noir,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pressed: { opacity: 0.6 },
});
