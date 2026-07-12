/**
 * GRYD — écran « Collection de badges » V2 → GRAND format (AMENDEMENT-08 §8,
 * doc §23 ; conserve AMENDEMENT-06 §1.6). Header compte RÉEL « x / N débloqués
 * · Tier max : X », filtres familles + Secrets, « Proches du déblocage » — puis
 * les items passent en BadgeCard GRANDES (2 colonnes, désirables) : les ~200
 * badges du catalogue réel restent TOUS visibles. Tap → bottom sheet maison :
 * condition + jauge de progression + RÉCOMPENSE (titre à afficher, dérivé du
 * catalogue). Déblocage/stats factices (demo.ts) — TODO(O1) brancher Supabase.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, motion, radii, spacing } from '@klaim/shared';
import { Icon } from '../src/ui/Icon';
import { BadgeHex, type BadgeHexState } from '../src/features/badges/BadgeHex';
import {
  BADGE_FAMILIES,
  BADGE_TIERS,
  BADGE_TIER_LABEL,
  BADGE_TIER_STYLE,
  BADGE_TOTAL,
  COLLECTION_BADGES,
  SECRET_BADGE_COLOR,
  badgeColor,
  badgeProgress,
  badgeRewardLabel,
  familyBadges,
  maxTierLabel,
  nextLevelOf,
  secretBadges,
  type BadgeDef,
  type BadgeFamilyId,
} from '../src/features/badges/catalog';
import { useMyBadges, type MyBadges } from '../src/features/badges/myBadges';
import { screen } from '../src/lib/analytics';
import { BadgeCard, useReduceMotion } from '../src/ui/game';

/** Filtre actif : une famille, la section secrets, ou tout. */
type FilterId = BadgeFamilyId | 'all';

function badgeState(def: BadgeDef, unlockedIds: MyBadges['unlockedIds']): BadgeHexState {
  if (unlockedIds.has(def.id)) return 'unlocked';
  return def.secret ? 'secretLocked' : 'locked';
}

/**
 * Cellule de grille : BadgeCard GRAND format (AMENDEMENT-08 §8 — désirable),
 * demi-largeur (2 colonnes). Jauge pour les badges progressifs, récompense
 * dérivée du catalogue, secrets masqués gérés par la carte (state secretLocked).
 */
function BadgeCardCell({ def, onSelect, unlockedIds, stat }: {
  def: BadgeDef;
  onSelect: (def: BadgeDef) => void;
  unlockedIds: MyBadges['unlockedIds'];
  stat: MyBadges['stat'];
}) {
  const state = badgeState(def, unlockedIds);
  const prog = def.familySlug && !def.secret
    ? badgeProgress(def.id, stat(def.metric))
    : null;
  return (
    <View style={styles.gridCell}>
      <BadgeCard
        name={def.name}
        family={def.family}
        familyLabel={BADGE_FAMILIES.find((f) => f.id === def.family)?.name ?? 'Secret'}
        familyColor={badgeColor(def)}
        tier={def.tier}
        state={state}
        requirement={def.requirement}
        progress={prog ? { value: prog.value, threshold: prog.threshold } : undefined}
        reward={badgeRewardLabel(def)}
        secret={def.secret}
        onPress={() => onSelect(def)}
      />
    </View>
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

/** Une section famille complète (bandeau + grille). */
function FamilySection({ id, name, color, defs, onSelect, unlockedIds, stat }: {
  id: string;
  name: string;
  color: string;
  defs: readonly BadgeDef[];
  onSelect: (def: BadgeDef) => void;
  unlockedIds: MyBadges['unlockedIds'];
  stat: MyBadges['stat'];
}) {
  const unlocked = defs.filter((b) => unlockedIds.has(b.id)).length;
  return (
    <View key={id} style={styles.section}>
      <FamilyHeader name={name} color={color} unlocked={unlocked} total={defs.length} />
      <View style={styles.grid}>
        {defs.map((def) => (
          <BadgeCardCell key={def.id} def={def} onSelect={onSelect} unlockedIds={unlockedIds} stat={stat} />
        ))}
      </View>
    </View>
  );
}

/** Jauge horizontale « value / threshold » (surface badge = teinte accent §1). */
function ProgressGauge({ value, threshold, accent, nextLabel }: {
  value: number;
  threshold: number;
  accent: string;
  nextLabel: string | null;
}) {
  const ratio = threshold > 0 ? Math.min(1, value / threshold) : 0;
  return (
    <View style={styles.gaugeWrap}>
      <View style={styles.gaugeRow}>
        <Text style={styles.gaugeValue}>
          {value.toLocaleString('fr-FR')}
          <Text style={styles.gaugeThreshold}> / {threshold.toLocaleString('fr-FR')}</Text>
        </Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${ratio * 100}%`, backgroundColor: accent }]} />
      </View>
      {nextLabel ? <Text style={styles.gaugeNext}>Prochain niveau : {nextLabel}</Text> : null}
    </View>
  );
}

/** Fade court remplaçant la translation quand reduce motion est actif (comme anim.ts). */
const SHEET_REDUCED_FADE_MS = 120;

/**
 * Bottom sheet maison : fond assombri + panneau qui glisse (fade discret §G).
 * Reduce motion (useReduceMotion, même règle que useSlideIn/useReveal) :
 * fondu court SANS translation — le mouvement disparaît, jamais la lisibilité.
 */
function BadgeSheet({ def, onDismiss, unlockedIds, unlockedDates, stat }: {
  def: BadgeDef;
  onDismiss: () => void;
  unlockedIds: MyBadges['unlockedIds'];
  unlockedDates: MyBadges['unlockedDates'];
  stat: MyBadges['stat'];
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: reduce ? SHEET_REDUCED_FADE_MS : motion.transitionMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress, reduce]);

  const close = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: reduce ? SHEET_REDUCED_FADE_MS : motion.transitionMs,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, progress, reduce]);

  const state = badgeState(def, unlockedIds);
  const unlocked = state === 'unlocked';
  const hidden = def.secret && !unlocked;
  const accent = badgeColor(def);
  const unlockedAt = unlockedDates.get(def.id);

  // Progression : uniquement pour les badges progressifs non secrets non pleins.
  const prog = def.familySlug ? badgeProgress(def.id, stat(def.metric)) : null;
  const next = nextLevelOf(def.id);
  const showGauge = prog !== null && !hidden && !prog.unlocked;
  // Récompense (titre à afficher) — dérivée du catalogue, jamais inventée.
  const reward = badgeRewardLabel(def);

  let stateLine = 'Verrouillé';
  if (unlocked) stateLine = unlockedAt !== undefined ? `Débloqué le ${unlockedAt}` : 'Débloqué';
  else if (hidden) stateLine = 'Badge secret';

  // Ligne famille · tier (surface badge, teinte accent).
  const familyName = BADGE_FAMILIES.find((f) => f.id === def.family)?.name
    ?? (def.secret ? 'Secret' : '');
  const tierLine = hidden ? null : `${familyName} · ${BADGE_TIER_LABEL[def.tier]}`;

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
            // Reduce motion → fondu seul, aucune translation.
            transform: reduce
              ? []
              : [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [60, 0],
                    }),
                  },
                ],
          },
        ]}
      >
        <View style={styles.sheetHandle} />
        <BadgeHex
          family={def.family}
          familyColor={accent}
          tier={def.tier}
          state={state}
          size="lg"
          secret={def.secret}
        />
        <Text style={styles.sheetName}>{hidden ? '???' : def.name}</Text>
        {tierLine ? (
          <Text style={[styles.sheetTier, { color: accent }]}>{tierLine.toUpperCase()}</Text>
        ) : null}
        <Text style={styles.sheetRequirement}>
          {hidden ? 'Condition secrète — continue à courir pour la découvrir.' : def.requirement}
        </Text>
        {/* Récompense au déblocage (doc §23) : le titre à afficher, dérivé du tier */}
        {!hidden && reward ? (
          <Text style={styles.sheetReward}>Récompense : {reward}</Text>
        ) : null}
        {showGauge && prog ? (
          <ProgressGauge
            value={prog.value}
            threshold={prog.threshold}
            accent={accent}
            nextLabel={next ? next.name : null}
          />
        ) : null}
        {/* État teinté famille : surface badge = exception polychrome §1 */}
        <Text style={[styles.sheetState, unlocked ? { color: accent } : null]}>{stateLine}</Text>
      </Animated.View>
    </View>
  );
}

/** Chip de filtre horizontal (Tous + 12 familles + Secrets). */
function FilterChip({ label, color, active, onPress }: {
  label: string;
  color: string | null;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtre ${label}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      {color ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/** Rangée de légende des 6 tiers (bas de collection §1.6). */
function TierRow() {
  return (
    <View style={styles.section}>
      <Text style={styles.tierRowTitle}>TIERS</Text>
      <View style={styles.tierRow}>
        {BADGE_TIERS.map((tier) => {
          const ts = BADGE_TIER_STYLE[tier];
          return (
            <View key={tier} style={styles.tierItem}>
              <View
                style={[
                  styles.tierHex,
                  { borderColor: ts.ring, borderWidth: ts.strokeWidth },
                  ts.glow ? { backgroundColor: ts.glow } : null,
                ]}
              />
              <Text style={styles.tierLabel}>{BADGE_TIER_LABEL[tier]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<BadgeDef | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    // Pas d'event §8 dédié aux badges → screen view standard (analytics.ts)
    screen('badges');
  }, []);

  // Débloqués + progression : réels (user_badges/user_stats) si session, sinon démo.
  const { unlockedIds, unlockedDates, stat } = useMyBadges();

  const unlockedTotal = COLLECTION_BADGES.filter((b) => unlockedIds.has(b.id)).length;
  const tierMax = maxTierLabel(unlockedIds);
  const secrets = secretBadges();
  const secretsUnlocked = secrets.filter((b) => unlockedIds.has(b.id)).length;

  // « Proches du déblocage » : top 3 badges verrouillés, non secrets, par ratio.
  const nearlyUnlocked = useMemo(() => {
    return COLLECTION_BADGES
      .filter((b) => !unlockedIds.has(b.id) && !b.secret)
      .map((b) => ({ def: b, prog: badgeProgress(b.id, stat(b.metric)) }))
      .filter((x) => x.prog !== null && x.prog.ratio > 0 && !x.prog.unlocked)
      .sort((a, b) => (b.prog!.ratio - a.prog!.ratio))
      .slice(0, 3);
  }, [unlockedIds, stat]);

  // Familles à afficher selon le filtre.
  const shownFamilies = filter === 'all' || filter === 'secret'
    ? BADGE_FAMILIES
    : BADGE_FAMILIES.filter((f) => f.id === filter);
  const showSecrets = filter === 'all' || filter === 'secret';
  const showNearly = filter === 'all' && nearlyUnlocked.length > 0;

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
          onPress={() => goBack('/profil')}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          {/* Chevron filaire inversé (retour) — charte §F */}
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>Profil</Text>
        </Pressable>

        <Text style={styles.kicker}>PROFIL · BADGES</Text>
        <Text style={styles.title}>Collection</Text>

        {/* Chiffre héros (addendum §E) — graisse 400 imposée par l'amendement */}
        <Text style={styles.heroCount}>
          {unlockedTotal}
          <Text style={styles.heroTotal}> / {BADGE_TOTAL}</Text>
        </Text>
        <Text style={styles.heroLabel}>
          badges débloqués{tierMax ? ` · Tier max : ${tierMax}` : ''}
        </Text>

        {/* Filtres horizontaux — Tous + 12 familles + Secrets (§1.6) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.filtersContent}
        >
          <FilterChip label="Tous" color={null} active={filter === 'all'} onPress={() => setFilter('all')} />
          {BADGE_FAMILIES.map((f) => (
            <FilterChip
              key={f.id}
              label={f.name}
              color={f.color}
              active={filter === f.id}
              onPress={() => setFilter(f.id)}
            />
          ))}
          <FilterChip
            label="Secrets"
            color={SECRET_BADGE_COLOR}
            active={filter === 'secret'}
            onPress={() => setFilter('secret')}
          />
        </ScrollView>

        {/* Proches du déblocage — top 3 par % (uniquement en vue « Tous ») */}
        {showNearly ? (
          <View style={styles.section}>
            <Text style={styles.nearlyTitle}>Proches du déblocage</Text>
            {nearlyUnlocked.map(({ def, prog }) => (
              <Pressable
                key={def.id}
                accessibilityRole="button"
                accessibilityLabel={`Badge ${def.name}, ${prog!.value} sur ${prog!.threshold}`}
                onPress={() => setSelected(def)}
                style={({ pressed }) => [styles.nearlyRow, pressed && styles.cellPressed]}
              >
                <BadgeHex
                  family={def.family}
                  familyColor={badgeColor(def)}
                  tier={def.tier}
                  state="locked"
                  size="sm"
                />
                <View style={styles.nearlyBody}>
                  <Text style={styles.nearlyName}>{def.name}</Text>
                  <View style={styles.nearlyGaugeTrack}>
                    <View
                      style={[
                        styles.nearlyGaugeFill,
                        { width: `${prog!.ratio * 100}%`, backgroundColor: badgeColor(def) },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.nearlyCount}>
                  {prog!.value.toLocaleString('fr-FR')} / {prog!.threshold.toLocaleString('fr-FR')}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Sections familles filtrées */}
        {shownFamilies.map((family) => {
          const defs = familyBadges(family.id);
          if (defs.length === 0) return null;
          return (
            <FamilySection
              key={family.id}
              id={family.id}
              name={family.name}
              color={family.color}
              defs={defs}
              onSelect={setSelected}
              unlockedIds={unlockedIds}
              stat={stat}
            />
          );
        })}

        {/* Secrets — masqués en « ? » jusqu'au déblocage (§2) */}
        {showSecrets ? (
          <FamilySection
            id="secret"
            name="Secrets"
            color={SECRET_BADGE_COLOR}
            defs={secrets}
            onSelect={setSelected}
            unlockedIds={unlockedIds}
            stat={stat}
          />
        ) : null}

        {/* Rangée de légende des 6 tiers */}
        <TierRow />
      </ScrollView>

      {selected ? (
        <BadgeSheet
          def={selected}
          onDismiss={() => setSelected(null)}
          unlockedIds={unlockedIds}
          unlockedDates={unlockedDates}
          stat={stat}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: spacing.cardPadding },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backChevron: { transform: [{ scaleX: -1 }] },
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

  // ── Filtres horizontaux ──
  filters: { marginTop: 20, marginHorizontal: -spacing.cardPadding },
  filtersContent: { paddingHorizontal: spacing.cardPadding, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  chipActive: { borderColor: colors.blanc, backgroundColor: colors.carbone2 },
  chipPressed: { opacity: 0.7 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },
  chipLabelActive: { color: colors.blanc },

  // ── Proches du déblocage ──
  nearlyTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  nearlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  nearlyBody: { flex: 1, gap: 7 },
  nearlyName: { color: colors.blanc, fontSize: fontSizes.sm, letterSpacing: 0.2 },
  nearlyGaugeTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.grisLigne,
    overflow: 'hidden',
  },
  nearlyGaugeFill: { height: 4, borderRadius: radii.pill, opacity: 0.85 },
  nearlyCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },

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
  // Grille 2 colonnes de BadgeCards grand format (AMENDEMENT-08 §8)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  gridCell: { width: '48.5%' },
  cellPressed: { opacity: 0.7 },

  // ── Rangée des tiers ──
  tierRowTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 14,
  },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tierItem: { alignItems: 'center', gap: 8 },
  tierHex: {
    width: 22,
    height: 22,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
    backgroundColor: colors.carbone,
  },
  tierLabel: {
    color: colors.gris,
    fontSize: 10,
    letterSpacing: 0.4,
  },

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
  sheetTier: {
    fontSize: fontSizes.xs,
    letterSpacing: 1.4,
    marginTop: 6,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  sheetRequirement: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
    marginTop: 8,
  },
  // Or victoire : la récompense est un GAIN (état de jeu, pas décor)
  sheetReward: {
    color: gameColors.gold,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // ── Jauge de progression (badges progressifs) ──
  gaugeWrap: { alignSelf: 'stretch', marginTop: 16, gap: 8 },
  gaugeRow: { flexDirection: 'row', justifyContent: 'center' },
  gaugeValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  gaugeThreshold: { color: colors.gris, fontWeight: '400' },
  gaugeTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.grisLigne,
    overflow: 'hidden',
  },
  gaugeFill: { height: 6, borderRadius: radii.pill, opacity: 0.9 },
  gaugeNext: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  sheetState: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
    marginTop: 14,
    textAlign: 'center',
  },
});
