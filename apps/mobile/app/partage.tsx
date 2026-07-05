/**
 * GRYD — « PARTAGER TA CONQUÊTE » — IMPLÉMENTATION DE RÉFÉRENCE de la règle de
 * profondeur (AMENDEMENT-22 §7). Passage d'une UI EN BOÎTES à une UI EN SCÈNES :
 *
 *   ← Résultat
 *   Partager ta conquête
 *      [ preview story qui FLOTTE — la story EST le container, ombre très discrète ]
 *   Format  [ Story 9:16 | Carré 1:1 ]      ← segmented (accent)
 *   Style   [ Carte | Conquête | Défense ]  ← segmented (surface) + « Plus » léger
 *   [ Story Instagram ]                     ← UN SEUL gros CTA chartreuse
 *      ○ Sauver   ○ Copier   ○ Plus         ← actions légères (IconAction), zéro card
 *   Replay vidéo bientôt                    ← micro-lien discret
 *
 * Profondeur : N0 fond (colors.noir) · N1 la preview (unique surface) · N2 segments/actifs ·
 * N3 rare (glow/chartreuse). Plus de card-dans-card, plus de mini-carré autour de la zone, plus
 * de 3 grosses cards d'action, plus de replay card. Ce qui ressort : +47 · Zones · République ·
 * Story Instagram.
 *
 * Les 5 templates restent fonctionnels (Carte simple · Conquête · Défense · Boucle · Crew) : le
 * segmented « Style » montre les 3 principaux et « Plus » déplie les 2 restants (un seul
 * container, jamais de rectangles séparés). Actions CÂBLÉES (intention) ; en web/démo, capture &
 * Share natives indisponibles → toasts. En prod : ViewShot + Share + expo-media-library (O1).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation, fontSizes, motion, radii } from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { IconAction, Segmented, ShareCard, type ShareCardRatio } from '../src/ui/game';
import {
  SHARE_DEMO,
  SHARE_TEMPLATES,
  SHARE_TEMPLATES_BY_ID,
  type ShareTemplateId,
} from '../src/features/share/templates';

/** Formats d'export MVP (Story / Carré) — options du segmented « Format ». */
const FORMATS: readonly { id: ShareCardRatio; label: string; icon: 'partage' | 'carte' }[] = [
  { id: 'story', label: 'Story 9:16', icon: 'partage' },
  { id: 'square', label: 'Carré 1:1', icon: 'carte' },
];

/** Style = 3 principaux dans le segmented ; « Plus » déplie les 2 restants. */
const STYLE_MAIN: readonly ShareTemplateId[] = ['simple', 'conquete', 'defense'];
const STYLE_EXTRA: readonly ShareTemplateId[] = ['boucle', 'crew'];

/** Libellé COURT par style (jamais tronqué). Distinct du `chip` legacy des templates. */
const STYLE_LABEL: Record<ShareTemplateId, string> = {
  simple: 'Carte',
  conquete: 'Conquête',
  defense: 'Défense',
  boucle: 'Boucle',
  crew: 'Crew',
};

/** Largeur de preview par format (la hauteur suit l'aspect de la card). */
const PREVIEW_WIDTH: Record<ShareCardRatio, number> = {
  story: 232,
  square: 300,
  feed: 280,
};

export default function PartageScreen() {
  const insets = useSafeAreaInsets();
  const toast = useShareToast();
  const params = useLocalSearchParams<{ template?: string }>();

  const [selected, setSelected] = useState<ShareTemplateId>(
    isTemplateId(params.template) ? params.template : 'conquete',
  );
  const [ratio, setRatio] = useState<ShareCardRatio>('story');
  // « Plus » ouvre le choix aux 5 styles (déplié aussi si on arrive sur un extra).
  const [stylesExpanded, setStylesExpanded] = useState<boolean>(
    isTemplateId(params.template) ? STYLE_EXTRA.includes(params.template) : false,
  );

  useEffect(() => {
    screen('partage', { template: selected });
    track(EVENTS.shareCardGenerated);
  }, []);

  const template = useMemo(
    () => SHARE_TEMPLATES.find((t) => t.id === selected) ?? SHARE_TEMPLATES_BY_ID.conquete,
    [selected],
  );
  const cardProps = useMemo(() => template.build(SHARE_DEMO), [template]);

  // Segments « Style » : 3 principaux, ou les 5 une fois « Plus » déplié.
  const styleOptions = useMemo(
    () =>
      (stylesExpanded ? [...STYLE_MAIN, ...STYLE_EXTRA] : STYLE_MAIN).map((id) => ({
        id,
        label: STYLE_LABEL[id],
      })),
    [stylesExpanded],
  );

  const pickStyle = (id: ShareTemplateId) => {
    setSelected(id);
    track(EVENTS.shareCardGenerated);
  };
  const expandStyles = () => {
    haptics.light();
    setStylesExpanded(true);
  };

  // Actions démo : intention câblée, confirmation immédiate par toast (§3).
  const act = (message: string, channel: string) => {
    haptics.light();
    track(EVENTS.shareCompleted, { channel });
    toast.show(message);
  };

  // CTA primaire aligné sur le format choisi (jamais « Story » en Carré).
  const primaryCta =
    ratio === 'square'
      ? { label: 'Partager en carré', channel: 'instagram_feed' as const }
      : { label: 'Story Instagram', channel: 'instagram_story' as const };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Retour (chevron inversé, charte §F). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir au résultat"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>Résultat</Text>
        </Pressable>

        <Text style={styles.title}>Partager ta conquête</Text>

        {/* PREVIEW qui FLOTTE : la story EST le container (pas de card noire autour). */}
        <View style={styles.previewWrap}>
          <ShareCard {...cardProps} ratio={ratio} width={PREVIEW_WIDTH[ratio]} />
        </View>

        {/* Format — UN segmented (accent chartreuse). */}
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, styles.controlLabelSolo]}>Format</Text>
          <Segmented
            accessibilityLabel="Format de partage"
            options={FORMATS}
            value={ratio}
            onChange={(id) => setRatio(id)}
            tone="accent"
          />
        </View>

        {/* Style — UN segmented (surface, car l'accent chartreuse vit déjà au-dessus). */}
        <View style={styles.controlRow}>
          <View style={styles.controlHead}>
            <Text style={styles.controlLabel}>Style</Text>
            {!stylesExpanded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Afficher plus de styles"
                onPress={expandStyles}
                hitSlop={10}
                style={({ pressed }) => [styles.moreLink, pressed && styles.pressed]}
              >
                <Text style={styles.moreLinkText}>+2 styles</Text>
              </Pressable>
            ) : null}
          </View>
          <Segmented
            accessibilityLabel="Style de la carte"
            options={styleOptions}
            value={selected}
            onChange={pickStyle}
            tone="surface"
            scrollable={stylesExpanded}
          />
        </View>

        {/* UN SEUL gros CTA chartreuse (suit le format). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryCta.label}
          onPress={() => act('Image prête à partager', primaryCta.channel)}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.ctaLabel}>{primaryCta.label}</Text>
        </Pressable>

        {/* Actions LÉGÈRES (icône + label), zéro grosse card. */}
        <View style={styles.actionRow}>
          <IconAction icon="cadeau" label="Sauver" onPress={() => act('Image enregistrée', 'save')} />
          <IconAction icon="copier" label="Copier" onPress={() => act('Copiée', 'copy')} />
          <IconAction
            icon="partage"
            label="Plus"
            accessibilityLabel="Plus d'options de partage"
            onPress={() => act('Image prête à partager', 'native')}
          />
        </View>

        {/* Replay vidéo : micro-lien discret (jamais une grosse card « bientôt »). */}
        <Text style={styles.replayLink}>Replay vidéo animé — bientôt</Text>
      </ScrollView>

      <ShareToast opacity={toast.opacity} message={toast.message} />
    </View>
  );
}

/**
 * Toast local (démo) : bandeau flottant, fondu + auto-dismiss (motion.toastDismissMs).
 * Piloté par un compteur pour re-jouer même si le message est identique. Aucune couleur hors
 * tokens. Volontairement minimal — les confirms de partage ne s'empilent pas.
 */
function useShareToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const show = (m: string) => {
    setMessage(m);
    setNonce((n) => n + 1);
  };

  useEffect(() => {
    if (nonce === 0) return;
    opacity.stopAnimation();
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.transitionMs,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.transitionMs,
        useNativeDriver: true,
      }).start();
    }, motion.toastDismissMs);
    return () => clearTimeout(t);
  }, [nonce, opacity]);

  return { opacity, message, show };
}

function ShareToast({
  opacity,
  message,
}: {
  opacity: Animated.Value;
  message: string | null;
}) {
  if (message === null) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]}>
      <Icon name="badge" size={16} color={colors.chartreuse} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

function isTemplateId(v: string | undefined): v is ShareTemplateId {
  return v === 'simple' || v === 'conquete' || v === 'defense' || v === 'boucle' || v === 'crew';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: 20 },
  pressed: { opacity: 0.6 },

  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  backChevron: { transform: [{ scaleX: -1 }] },
  backText: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.4 },

  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // La preview flotte librement dans l'espace (pas de container autour).
  previewWrap: { alignItems: 'center', marginTop: 22, marginBottom: 26 },

  // Un bloc « label + segmented » séparé du suivant par l'ESPACE, pas par une boîte.
  controlRow: { marginTop: 18 },
  controlHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  // Le label du bloc Style vit DANS controlHead (déjà espacé) → pas de marge propre.
  controlLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.2 },
  // Le label Format est un enfant direct de controlRow → il porte son propre espace.
  controlLabelSolo: { marginBottom: 10 },
  moreLink: { paddingVertical: 2 },
  moreLinkText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.card,
    paddingVertical: 16,
    marginTop: 26,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 44,
    marginTop: 22,
  },

  replayLink: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: 26,
    letterSpacing: 0.2,
  },

  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  toastText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.2 },
});
