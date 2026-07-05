/**
 * GRYD — « PARTAGER TA CONQUÊTE » (AMENDEMENT-20 §3). Le moteur de viralité,
 * façon Strava : « Strava partage une activité. GRYD partage une conquête. »
 * Discipline : PREVIEW dominante en haut (grande card), 5 TEMPLATES en chips,
 * toggle FORMAT (Story 9:16 · Carré 1:1), 4 actions immédiates. On comprend et
 * on partage en 2 s. Card partage PLUS propre que le résultat.
 *
 * Chaque template = un ShareCard variant PROPRE (src/features/share/templates).
 * Les actions sont CÂBLÉES (intention) : en web/démo, capture/Share API natives
 * indisponibles → toasts « Image prête à partager » / « Copiée ». En prod
 * mobile : react-native ViewShot + Share, expo-media-library (TODO O1).
 * Replay vidéo = teaser V1.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, motion, radii } from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { ShareCard, type ShareCardRatio } from '../src/ui/game';
import {
  SHARE_DEMO,
  SHARE_TEMPLATES,
  SHARE_TEMPLATES_BY_ID,
  type ShareTemplateId,
} from '../src/features/share/templates';

/** Formats d'export MVP (Story / Carré). Le feed 4:5 reste dispo côté card. */
const FORMATS: readonly { id: ShareCardRatio; label: string; icon: 'partage' | 'carte' }[] = [
  { id: 'story', label: 'Story 9:16', icon: 'partage' },
  { id: 'square', label: 'Carré 1:1', icon: 'carte' },
];

/** Largeur de preview par format (la hauteur suit l'aspect de la card). */
const PREVIEW_WIDTH: Record<ShareCardRatio, number> = {
  story: 236,
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

  useEffect(() => {
    screen('partage', { template: selected });
    track(EVENTS.shareCardGenerated);
  }, []);

  const template = useMemo(
    () => SHARE_TEMPLATES.find((t) => t.id === selected) ?? SHARE_TEMPLATES_BY_ID.conquete,
    [selected],
  );
  const cardProps = useMemo(() => template.build(SHARE_DEMO), [template]);

  const pickTemplate = (id: ShareTemplateId) => {
    if (id === selected) return;
    haptics.light();
    setSelected(id);
    track(EVENTS.shareCardGenerated);
  };
  const pickFormat = (id: ShareCardRatio) => {
    if (id === ratio) return;
    haptics.light();
    setRatio(id);
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
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 },
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

        <Text style={styles.kicker}>PARTAGE</Text>
        <Text style={styles.title}>Partager ta conquête</Text>

        {/* PREVIEW dominante — la grande card en haut. */}
        <View style={styles.previewWrap}>
          <ShareCard {...cardProps} ratio={ratio} width={PREVIEW_WIDTH[ratio]} />
        </View>

        {/* Toggle FORMAT (Story / Carré) — change le ratio de la preview. */}
        <View style={styles.formatToggle}>
          {FORMATS.map((f) => {
            const on = f.id === ratio;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => pickFormat(f.id)}
                style={({ pressed }) => [
                  styles.formatBtn,
                  on && styles.formatBtnOn,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name={f.icon} size={15} color={on ? colors.noir : colors.gris} />
                <Text style={[styles.formatLabel, on && styles.formatLabelOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Sélecteur de 5 TEMPLATES (chips). */}
        <Text style={styles.sectionLabel}>TEMPLATE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {SHARE_TEMPLATES.map((t) => {
            const on = t.id === selected;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => pickTemplate(t.id)}
                style={({ pressed }) => [
                  styles.chip,
                  on && styles.chipOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ACTIONS — 1 CTA primaire (suit le format) + 3 secondaires. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => act('Image prête à partager', primaryCta.channel)}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.ctaLabel}>{primaryCta.label}</Text>
        </Pressable>

        <View style={styles.actionRow}>
          <ActionButton
            icon="cadeau"
            label="Sauvegarder"
            onPress={() => act('Image enregistrée', 'save')}
          />
          <ActionButton
            icon="copier"
            label="Copier"
            onPress={() => act('Copiée', 'copy')}
          />
          <ActionButton
            icon="partage"
            label="Partager"
            onPress={() => act('Image prête à partager', 'native')}
          />
        </View>

        {/* Replay vidéo = teaser V1 (désactivé, jamais un faux bouton actif). */}
        <View style={styles.teaser}>
          <View style={styles.teaserIcon}>
            <Icon name="guerre" size={16} color={colors.gris} />
          </View>
          <View style={styles.teaserText}>
            <Text style={styles.teaserTitle}>Replay vidéo</Text>
            <Text style={styles.teaserSub}>La conquête animée — bientôt</Text>
          </View>
          <Text style={styles.teaserTag}>V1</Text>
        </View>
      </ScrollView>

      <ShareToast opacity={toast.opacity} message={toast.message} />
    </View>
  );
}

/**
 * Toast local (démo) : bandeau carbone flottant, fondu + auto-dismiss
 * (motion.toastDismissMs). Piloté par un compteur pour re-jouer même si le
 * message est identique (taper deux fois « Copiée »). Aucune couleur hors
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

/** Bouton d'action secondaire (icône + label court). */
function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: 'cadeau' | 'copier' | 'partage';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Icon name={icon} size={18} color={colors.blanc} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function isTemplateId(v: string | undefined): v is ShareTemplateId {
  return v === 'simple' || v === 'conquete' || v === 'defense' || v === 'boucle' || v === 'crew';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: 20 },
  pressed: { opacity: 0.6 },

  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backChevron: { transform: [{ scaleX: -1 }] },
  backText: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.4 },

  kicker: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 2 },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginTop: 2,
  },

  previewWrap: { alignItems: 'center', marginTop: 20, marginBottom: 18 },

  formatToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 4,
    gap: 4,
  },
  formatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
  },
  formatBtnOn: { backgroundColor: colors.chartreuse },
  formatLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  formatLabelOn: { color: colors.noir },

  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  chipsRow: { gap: 8, paddingRight: 4 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  chipOn: { backgroundColor: colors.chartreuse, borderColor: colors.chartreuse },
  chipText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  chipTextOn: { color: colors.noir },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.card,
    paddingVertical: 16,
    marginTop: 28,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
  },
  actionLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.3 },

  teaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    opacity: 0.75,
  },
  teaserIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  teaserText: { flex: 1 },
  teaserTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  teaserSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  teaserTag: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  toastText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.2 },
});
