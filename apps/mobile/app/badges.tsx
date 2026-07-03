/**
 * GRYD — écran « Collection de badges » (AMENDEMENT-04 §5), poussé depuis
 * Profil par-dessus les tabs. Compteur héros x/59, une section par famille
 * (bandeau teinté `familyColor` — exception polychrome §1 : les surfaces badge
 * sont la SEULE zone polychrome de l'app), grille d'hexagones, secrets en
 * « ? » en bas. Tap → bottom sheet maison (Animated, fade discret §G, pas de
 * lib). Déblocage factice (demo.ts) — TODO(O1) brancher user_badges.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, motion, radii, spacing } from '@klaim/shared';
import { BadgeHex, type BadgeHexState } from '../src/features/badges/BadgeHex';
import {
  BADGES,
  BADGE_FAMILIES,
  BADGE_TOTAL,
  SECRET_BADGE_COLOR,
  badgeColor,
  familyBadges,
  secretBadges,
  type BadgeDef,
} from '../src/features/badges/catalog';
import { UNLOCKED_DEMO, UNLOCKED_IDS } from '../src/features/badges/demo';
import { screen } from '../src/lib/analytics';

function badgeState(def: BadgeDef): BadgeHexState {
  if (UNLOCKED_IDS.has(def.id)) return 'unlocked';
  return def.secret ? 'secretLocked' : 'locked';
}

/** Cellule de grille : hexagone md + nom (ou « ??? ») + étiquette dormant. */
function BadgeCell({ def, onSelect }: { def: BadgeDef; onSelect: (def: BadgeDef) => void }) {
  const state = badgeState(def);
  const hidden = def.secret && state !== 'unlocked';
  const name = hidden ? '???' : def.name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Badge ${name}`}
      onPress={() => onSelect(def)}
      style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
    >
      <BadgeHex
        family={def.family}
        familyColor={badgeColor(def)}
        state={state}
        size="md"
        secret={def.secret}
      />
      <Text
        style={[styles.cellName, state === 'unlocked' ? styles.cellNameOn : null]}
        numberOfLines={2}
      >
        {name}
      </Text>
      {def.dormant ? (
        <View style={styles.dormantTag}>
          <Text style={styles.dormantTagText}>À venir</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Bandeau de famille : nom + trait teinté famille + compteur x/n (§1). */
function FamilyHeader({ name, color, unlocked, total }: {
  name: string;
  color: string;
  unlocked: number;
  total: number;
}) {
  return (
    <View style={styles.bandeau}>
      <Text style={styles.familyName}>{name}</Text>
      <View style={[styles.familyTrait, { backgroundColor: color }]} />
      <Text style={styles.familyCount}>
        {unlocked}/{total}
      </Text>
    </View>
  );
}

/** Bottom sheet maison : fond assombri + panneau qui glisse (fade discret §G). */
function BadgeSheet({ def, onDismiss }: { def: BadgeDef; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.transitionMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: motion.transitionMs,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, progress]);

  const state = badgeState(def);
  const unlocked = state === 'unlocked';
  const hidden = def.secret && !unlocked;
  const accent = badgeColor(def);
  const unlockedAt = UNLOCKED_DEMO.get(def.id);

  let stateLine = 'Verrouillé';
  if (unlocked) stateLine = unlockedAt !== undefined ? `Débloqué le ${unlockedAt}` : 'Débloqué';
  else if (def.dormant) stateLine = 'À venir — pas encore attribuable en Saison 0';
  else if (hidden) stateLine = 'Badge secret';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.overlay,
          { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }) },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer le détail du badge"
        style={StyleSheet.absoluteFill}
        onPress={close}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 24,
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.sheetHandle} />
        <BadgeHex
          family={def.family}
          familyColor={accent}
          state={state}
          size="lg"
          secret={def.secret}
        />
        <Text style={styles.sheetName}>{hidden ? '???' : def.name}</Text>
        <Text style={styles.sheetRequirement}>
          {hidden ? 'Condition secrète — continue à courir pour la découvrir.' : def.requirement}
        </Text>
        {/* État teinté famille : surface badge = exception polychrome §1 */}
        <Text style={[styles.sheetState, unlocked ? { color: accent } : null]}>{stateLine}</Text>
      </Animated.View>
    </View>
  );
}

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<BadgeDef | null>(null);

  useEffect(() => {
    // Pas d'event §8 dédié aux badges → screen view standard (analytics.ts)
    screen('badges');
  }, []);

  const unlockedTotal = BADGES.filter((b) => UNLOCKED_IDS.has(b.id)).length;
  const secrets = secretBadges();
  const secretsUnlocked = secrets.filter((b) => UNLOCKED_IDS.has(b.id)).length;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir au profil"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Text style={styles.backText}>‹ Profil</Text>
        </Pressable>

        <Text style={styles.kicker}>PROFIL · BADGES</Text>
        <Text style={styles.title}>Collection</Text>

        {/* Chiffre héros (addendum §E) — graisse 400 imposée par l'amendement */}
        <Text style={styles.heroCount}>
          {unlockedTotal}
          <Text style={styles.heroTotal}> / {BADGE_TOTAL}</Text>
        </Text>
        <Text style={styles.heroLabel}>badges débloqués</Text>

        {BADGE_FAMILIES.map((family) => {
          const defs = familyBadges(family.id);
          const unlocked = defs.filter((b) => UNLOCKED_IDS.has(b.id)).length;
          return (
            <View key={family.id} style={styles.section}>
              <FamilyHeader
                name={family.name}
                color={family.color}
                unlocked={unlocked}
                total={defs.length}
              />
              <View style={styles.grid}>
                {defs.map((def) => (
                  <BadgeCell key={def.id} def={def} onSelect={setSelected} />
                ))}
              </View>
            </View>
          );
        })}

        {/* Secrets — masqués en « ? » jusqu'au déblocage (§2) */}
        <View style={styles.section}>
          <FamilyHeader
            name="Secrets"
            color={SECRET_BADGE_COLOR}
            unlocked={secretsUnlocked}
            total={secrets.length}
          />
          <View style={styles.grid}>
            {secrets.map((def) => (
              <BadgeCell key={def.id} def={def} onSelect={setSelected} />
            ))}
          </View>
        </View>
      </ScrollView>

      {selected ? <BadgeSheet def={selected} onDismiss={() => setSelected(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: spacing.cardPadding },
  back: { alignSelf: 'flex-start', marginBottom: 14 },
  backPressed: { opacity: 0.6 },
  backText: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.4 },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
  title: { color: colors.blanc, fontSize: fontSizes.xl, fontWeight: '600', letterSpacing: -0.5 },
  heroCount: {
    color: colors.blanc,
    fontSize: fontSizes.hero,
    fontWeight: '400', // graisse 400 imposée (chiffre héros de la collection)
    letterSpacing: -1.5,
    marginTop: 14,
    fontVariant: ['tabular-nums'],
    // TODO fonts : Poppins (fallback AMENDEMENT-03) — police système en attendant
  },
  heroTotal: { color: colors.gris, fontSize: fontSizes.xxl, fontWeight: '400' },
  heroLabel: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 2 },
  section: { marginTop: 30 },
  bandeau: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  familyName: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  familyTrait: { flex: 1, height: 2, borderRadius: 1, opacity: 0.7 },
  familyCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, rowGap: 16 },
  cell: { width: 72, alignItems: 'center' },
  cellPressed: { opacity: 0.7 },
  cellName: {
    color: colors.gris,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  cellNameOn: { color: colors.blanc },
  dormantTag: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  dormantTagText: { color: colors.gris, fontSize: 9, letterSpacing: 0.5 },
  overlay: { backgroundColor: colors.noir },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingTop: 14,
    paddingHorizontal: spacing.cardPadding,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.grisLigne,
    marginBottom: 18,
  },
  sheetName: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginTop: 16,
    textAlign: 'center',
  },
  sheetRequirement: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
    marginTop: 8,
  },
  sheetState: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
    marginTop: 14,
    textAlign: 'center',
  },
});
