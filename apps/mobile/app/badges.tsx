/**
 * GRYD — écran « Collection de badges » V2 → GRAND format (AMENDEMENT-08 §8,
 * doc §23 ; conserve AMENDEMENT-06 §1.6). Header compte RÉEL « x / N débloqués
 * · Tier max : X », filtres familles + Secrets, « Proches du déblocage » — puis
 * les items passent en BadgeCard GRANDES (3 colonnes, désirables) : les ~200
 * badges du catalogue réel restent TOUS visibles. Tap → bottom sheet maison :
 * condition + jauge de progression + RÉCOMPENSE (titre à afficher, dérivé du
 * catalogue).
 *
 * ─── CORRECTIONS DU 21/07/2026 ───────────────────────────────────────────────
 * 1. LES DRAPEAUX DU HOOK ÉTAIENT IGNORÉS. `useMyBadges` expose `loading`,
 *    `failed` et `reload` EXPRÈS (cf. son en-tête : « une collection vide
 *    affichée après une panne se lit “tu n'as rien gagné” »). L'écran n'en
 *    lisait aucun : hors réseau, il affichait un serein « 0 / 200 badges
 *    débloqués » — l'app annonçait au joueur que son travail n'existait pas.
 *    Les trois absences sont désormais distinctes : pas de compte / rien encore
 *    débloqué / lecture impossible (+ réessayer).
 * 2. LE COMPTEUR PERSONNEL NE S'AFFICHE PLUS SANS SOURCE. « 0 / 200 » et les
 *    « 0/12 » par famille sont des affirmations SUR LE JOUEUR : sans compte, ils
 *    n'ont personne à décrire. Le catalogue, lui, reste entièrement navigable —
 *    c'est la liste du jeu, pas ses données.
 * 3. i18n. Tout le châssis de l'écran était en français en dur. Les NOMS et
 *    CONDITIONS des badges restent ceux du catalogue de jeu partagé
 *    (@klaim/shared) : les traduire est un chantier `packages/shared` à part.
 *
 * ─── E19 · LE MOMENT « BADGE RARE DÉBLOQUÉ » (25/07/2026) ────────────────────
 * Cet écran est aujourd'hui le SEUL endroit du client où un déverrouillage se
 * DÉCOUVRE : le serveur décerne les badges à l'ingestion, le client les lit ici
 * (`useMyBadges` → `user_badges`). Le moment dédié de la planche s'y branche
 * donc naturellement, en surcouche plein écran (`BadgeUnlockMoment`), et
 * seulement pour les badges RARES — les courants n'ont jamais droit à un écran
 * bloquant. Trois gardes tiennent l'honnêteté :
 *   · il faut une lecture SERVEUR aboutie (ni `loading`, ni `failed`, ni
 *     `source: 'none'`) — on ne fête pas ce qu'on n'a pas lu ;
 *   · il faut que la mémoire locale soit résolue (`seenBadges`), sinon un délai
 *     de disque rejouerait un moment déjà vu ;
 *   · la toute première lecture d'un compte pose une BASE sans rien célébrer :
 *     un joueur décoré qui réinstalle ne subit pas trente écrans pour des faits
 *     anciens.
 * Le point de déclenchement IDÉAL reste le résultat de course : voir l'en-tête
 * de `features/badges/BadgeUnlockMoment.tsx`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, iconSizes, motion, radii, sizes, spacing } from '@klaim/shared';
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
import { formatInt } from '../src/ui/format';
import { BadgeUnlockMoment } from '../src/features/badges/BadgeUnlockMoment';
import { useBadgeMemory } from '../src/features/badges/seenBadges';
import { selectUnlockMoments } from '../src/features/badges/unlockMoment';
import { openShareSheet } from '../src/features/share/shareActions';
import { haptics } from '../src/lib/haptics';
import { screen } from '../src/lib/analytics';
import { useSession } from '../src/lib/session';
import { BadgeCard, useReduceMotion } from '../src/ui/game';
import { useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/badges';

/** Filtre actif : une famille, la section secrets, ou tout. */
type FilterId = BadgeFamilyId | 'all';

function badgeState(def: BadgeDef, unlockedIds: MyBadges['unlockedIds']): BadgeHexState {
  if (unlockedIds.has(def.id)) return 'unlocked';
  return def.secret ? 'secretLocked' : 'locked';
}

/**
 * Cellule de grille : BadgeCard GRAND format (AMENDEMENT-08 §8 — désirable),
 * tiers de largeur (3 colonnes, cf. planche E19). Jauge pour les badges progressifs, récompense
 * dérivée du catalogue, secrets masqués gérés par la carte (state secretLocked).
 */
function BadgeCardCell({ def, onSelect, unlockedIds, stat, personal }: {
  def: BadgeDef;
  onSelect: (def: BadgeDef) => void;
  unlockedIds: MyBadges['unlockedIds'];
  stat: MyBadges['stat'];
  /** false = aucune source personnelle : on montre le catalogue, pas de jauge. */
  personal: boolean;
}) {
  const t = useT();
  const state = badgeState(def, unlockedIds);
  const prog = personal && def.familySlug && !def.secret
    ? badgeProgress(def.id, stat(def.metric))
    : null;
  return (
    <View style={styles.gridCell}>
      <BadgeCard
        name={def.name}
        family={def.family}
        familyLabel={
          BADGE_FAMILIES.find((f) => f.id === def.family)?.name ?? t(C.secretFamily)
        }
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

/**
 * Bandeau de famille : nom + trait teinté famille + compteur x/n (§1).
 * `unlocked` est NULL quand aucune source personnelle n'existe : « 0/12 » est
 * une affirmation sur le joueur, et sans compte elle ne décrit personne. On
 * affiche alors le total seul — le catalogue reste informatif.
 */
function FamilyHeader({ name, color, unlocked, total }: {
  name: string;
  color: string;
  unlocked: number | null;
  total: number;
}) {
  return (
    <View style={styles.bandeau}>
      <Text style={styles.familyName}>{name}</Text>
      <View style={[styles.familyTrait, { backgroundColor: color }]} />
      <Text style={styles.familyCount}>
        {unlocked === null ? total : `${unlocked}/${total}`}
      </Text>
    </View>
  );
}

/** Une section famille complète (bandeau + grille). */
function FamilySection({ id, name, color, defs, onSelect, unlockedIds, stat, personal }: {
  id: string;
  name: string;
  color: string;
  defs: readonly BadgeDef[];
  onSelect: (def: BadgeDef) => void;
  unlockedIds: MyBadges['unlockedIds'];
  stat: MyBadges['stat'];
  personal: boolean;
}) {
  const unlocked = personal ? defs.filter((b) => unlockedIds.has(b.id)).length : null;
  return (
    <View key={id} style={styles.section}>
      <FamilyHeader name={name} color={color} unlocked={unlocked} total={defs.length} />
      <View style={styles.grid}>
        {defs.map((def) => (
          <BadgeCardCell
            key={def.id}
            def={def}
            onSelect={onSelect}
            unlockedIds={unlockedIds}
            stat={stat}
            personal={personal}
          />
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
  const t = useT();
  const ratio = threshold > 0 ? Math.min(1, value / threshold) : 0;
  return (
    <View style={styles.gaugeWrap}>
      <View style={styles.gaugeRow}>
        {/* Locale-aware (§26) : `formatInt` groupe les milliers selon la langue
            courante (fr « 1 000 », en « 1,000 »). L'ancien `toLocaleString('fr-FR')`
            EN DUR — l'anti-pattern que `numberFormat.ts` condamne nommément —
            affichait un séparateur français aux joueurs en/de/es/pt. */}
        <Text style={styles.gaugeValue}>
          {formatInt(value)}
          <Text style={styles.gaugeThreshold}> / {formatInt(threshold)}</Text>
        </Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${ratio * 100}%`, backgroundColor: accent }]} />
      </View>
      {nextLabel ? (
        <Text style={styles.gaugeNext}>{t(C.nextLevel, { name: nextLabel })}</Text>
      ) : null}
    </View>
  );
}

/** Fade court remplaçant la translation quand reduce motion est actif (comme anim.ts). */
const SHEET_REDUCED_FADE_MS = 120;

/**
 * Bottom sheet maison : fond assombri + panneau qui glisse (fade discret §G).
 * Reduce motion (useReduceMotion, même règle que useSlideIn/useReveal) :
 * fondu court SANS translation — le mouvement disparaît, jamais la lisibilité.
 *
 * PARTAGE (planche E19 « tap → détail … partage ») : un badge DÉBLOQUÉ propose
 * « Partager ». Action tertiaire (jamais chartreuse), mêmes rails honnêtes que
 * le moment rare (`openShareSheet` + `unlockShareText`) : on ne partage que des
 * faits du catalogue (nom + condition), jamais une stat inventée ; un appareil
 * sans partage le DIT, ce n'est pas un bouton mort. Le « template story » vers
 * E10 de la planche reste un chantier partage/E10 à part — non promis ici.
 */
function BadgeSheet({ def, onDismiss, unlockedIds, unlockedDates, stat, personal }: {
  def: BadgeDef;
  onDismiss: () => void;
  unlockedIds: MyBadges['unlockedIds'];
  unlockedDates: MyBadges['unlockedDates'];
  stat: MyBadges['stat'];
  personal: boolean;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  // Retour honnête du partage : ce qui s'est réellement passé, ou rien (un
  // « annulé » n'est pas une erreur et reste muet).
  const [shareNote, setShareNote] = useState<'none' | 'copied' | 'unavailable'>('none');

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

  // Partage d'un badge possédé — mêmes rails que le moment rare : que des faits
  // du catalogue (nom + condition), jamais une stat inventée.
  const share = useCallback(() => {
    haptics.light();
    const message = t(C.unlockShareText, { name: def.name, requirement: def.requirement });
    void openShareSheet(message).then((res) => {
      if (res.ok) setShareNote(res.via === 'clipboard' ? 'copied' : 'none');
      else if (res.reason === 'unavailable') setShareNote('unavailable');
    });
  }, [t, def.name, def.requirement]);

  const state = badgeState(def, unlockedIds);
  const unlocked = state === 'unlocked';
  const hidden = def.secret && !unlocked;
  const accent = badgeColor(def);
  const unlockedAt = unlockedDates.get(def.id);

  // Progression : uniquement pour les badges progressifs non secrets non pleins,
  // et SEULEMENT quand une source personnelle existe (sinon la jauge « 0 / 500 »
  // décrirait un joueur qu'on ne connaît pas).
  const prog = personal && def.familySlug ? badgeProgress(def.id, stat(def.metric)) : null;
  const next = nextLevelOf(def.id);
  const showGauge = prog !== null && !hidden && !prog.unlocked;
  // Récompense (titre à afficher) — dérivée du catalogue, jamais inventée.
  const reward = badgeRewardLabel(def);

  // Sans source personnelle, « Verrouillé » serait un verdict sur le joueur :
  // on ne dit alors rien de son état, seul le catalogue parle.
  let stateLine: string | null = personal ? t(C.stateLocked) : null;
  if (unlocked) {
    stateLine = unlockedAt !== undefined
      ? t(C.stateUnlockedOn, { date: unlockedAt })
      : t(C.stateUnlocked);
  } else if (hidden) stateLine = t(C.stateSecret);

  // Ligne famille · tier (surface badge, teinte accent).
  const familyName = BADGE_FAMILIES.find((f) => f.id === def.family)?.name
    ?? (def.secret ? t(C.secretFamily) : '');
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
        accessibilityLabel={t(C.a11yCloseSheet)}
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
        {/* Casse en STYLE, pas en JS : `.toUpperCase()` sans locale casse le turc
            et les accents (même correctif que `app/challenges/[id].tsx`), et un
            lecteur d'écran doit recevoir le texte d'origine — `textTransform`
            (sheetTier) met en capitales à l'affichage seul. */}
        {tierLine ? (
          <Text style={[styles.sheetTier, { color: accent }]}>{tierLine}</Text>
        ) : null}
        <Text style={styles.sheetRequirement}>
          {hidden ? t(C.secretRequirement) : def.requirement}
        </Text>
        {/* Récompense au déblocage (doc §23) : le titre à afficher, dérivé du tier */}
        {!hidden && reward ? (
          <Text style={styles.sheetReward}>{t(C.reward, { reward })}</Text>
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
        {stateLine ? (
          <Text style={[styles.sheetState, unlocked ? { color: accent } : null]}>
            {stateLine}
          </Text>
        ) : null}
        {/* Partage — badge possédé seulement (on ne partage pas ce qu'on n'a
            pas). Action tertiaire, jamais chartreuse ; l'indisponibilité se DIT. */}
        {unlocked && !hidden ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.unlockShare)}
            onPress={share}
            style={({ pressed }) => [styles.sheetShare, pressed && styles.cellPressed]}
          >
            <Text style={styles.sheetShareLabel}>{t(C.unlockShare)}</Text>
          </Pressable>
        ) : null}
        {shareNote !== 'none' ? (
          <Text style={styles.sheetShareNote}>
            {t(shareNote === 'copied' ? C.unlockShareCopied : C.unlockShareUnavailable)}
          </Text>
        ) : null}
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
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.a11yFilter, { label })}
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
  const t = useT();
  return (
    <View style={styles.section}>
      <Text style={styles.tierRowTitle}>{t(C.tiersLegend)}</Text>
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
  const t = useT();
  const insets = useSafeAreaInsets();
  const { session, configured } = useSession();
  const [selected, setSelected] = useState<BadgeDef | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    // Pas d'event §8 dédié aux badges → screen view standard (analytics.ts)
    screen('badges');
  }, []);

  // Débloqués + progression : réels (user_badges/user_stats) si session, VIDES
  // sinon. Les drapeaux du hook sont désormais TOUS lus — c'est ce qui permet
  // de ne pas confondre « rien débloqué » et « rien chargé ».
  const { unlockedIds, unlockedDates, stat, source, loading, failed, reload } = useMyBadges();

  /**
   * Y a-t-il une source qui parle DE CE JOUEUR ? `source === 'none'` = pas de
   * compte, ou lecture impossible : le catalogue reste affiché (c'est la liste
   * du jeu), mais aucun compteur personnel ne l'accompagne.
   */
  const personal = source !== 'none';
  /** Un écran de connexion qui MARCHE existe-t-il vraiment ? (cf. profil) */
  const canSignIn = configured && !session;

  const unlockedTotal = COLLECTION_BADGES.filter((b) => unlockedIds.has(b.id)).length;
  const tierMax = maxTierLabel(unlockedIds);
  const secrets = secretBadges();

  // ─── E19 · déclenchement du moment dédié ───────────────────────────────────
  // La mémoire est PAR COMPTE : sans session, elle reste inerte et rien ne peut
  // se déclencher (cf. seenBadges.ts).
  const memory = useBadgeMemory(session?.user.id ?? null);
  const [celebrating, setCelebrating] = useState<readonly string[]>([]);

  const rememberSeen = useCallback(
    (key: string) => memory.remember([key]),
    [memory],
  );
  /**
   * Fin de la file. On réinscrit TOUT ce qui y était — filet anti-boucle : si un
   * jour la sélection et le contenu divergeaient (une clé jugée célébrable que le
   * moment ne sait pas peindre), l'écran se refermerait aussitôt et la
   * sélection la reproposerait, indéfiniment. Un `remember` est idempotent.
   */
  const endCelebration = useCallback(() => {
    if (celebrating.length > 0) memory.remember(celebrating);
    setCelebrating([]);
  }, [celebrating, memory]);

  useEffect(() => {
    // On ne fête que ce qu'on a VRAIMENT lu, pour un compte identifié, une fois
    // la mémoire résolue — et jamais pendant qu'un moment est déjà à l'écran.
    if (!personal || loading || failed || !memory.ready) return;
    if (celebrating.length > 0) return;
    const { celebrate, remember } = selectUnlockMoments({
      unlocked: [...unlockedIds],
      known: [...memory.known],
      baselineDone: memory.baselineDone,
    });
    // Les clés qui n'ont pas droit à l'arrêt (courantes, inconnues, paliers
    // absorbés) entrent en mémoire tout de suite. Les autres n'y entreront
    // qu'une fois RÉELLEMENT montrées (`onSeen`).
    if (remember.length > 0) memory.remember(remember);
    if (celebrate.length > 0) setCelebrating(celebrate);
  }, [personal, loading, failed, memory, unlockedIds, celebrating.length]);

  // « Proches du déblocage » : top 3 badges verrouillés, non secrets, par ratio.
  // Sans source personnelle, toutes les stats valent 0 → la liste est vide et la
  // section disparaît d'elle-même ; le garde `personal` le rend explicite.
  const nearlyUnlocked = useMemo(() => {
    if (!personal) return [];
    return COLLECTION_BADGES
      .filter((b) => !unlockedIds.has(b.id) && !b.secret)
      .map((b) => ({ def: b, prog: badgeProgress(b.id, stat(b.metric)) }))
      .filter((x) => x.prog !== null && x.prog.ratio > 0 && !x.prog.unlocked)
      .sort((a, b) => (b.prog!.ratio - a.prog!.ratio))
      .slice(0, 3);
  }, [personal, unlockedIds, stat]);

  // Familles à afficher selon le filtre. « Secrets » ne montre QUE les secrets
  // (aucune famille normale) — sinon le chip filtrait comme « Tous ».
  const shownFamilies =
    filter === 'all'
      ? BADGE_FAMILIES
      : filter === 'secret'
        ? []
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
          accessibilityLabel={t(C.a11yBackToProfile)}
          onPress={() => goBack('/profil')}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          {/* Chevron filaire inversé (retour) — charte §F */}
          <View style={styles.backChevron}>
            <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
          </View>
          <Text style={styles.backText}>{t(C.backToProfile)}</Text>
        </Pressable>

        <Text style={styles.kicker}>{t(C.kicker)}</Text>
        <Text style={styles.title}>{t(C.title)}</Text>

        {/* ═══ LES TROIS ABSENCES, JAMAIS CONFONDUES ═══════════════════════════
            Ce bloc REMPLACE le chiffre héros tant qu'on ne peut pas l'affirmer.
            Un « 0 / 200 » affiché hors réseau dirait à un joueur décoré qu'il
            n'a rien gagné : c'est précisément ce que `failed` sert à éviter. */}
        {failed ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>{t(C.failedTitle)}</Text>
            <Text style={styles.stateBody}>{t(C.failedBody)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.retry)}
              onPress={reload}
              style={({ pressed }) => [styles.stateCta, pressed && styles.cellPressed]}
            >
              <Text style={styles.stateCtaLabel} numberOfLines={1}>
                {t(C.retry)}
              </Text>
            </Pressable>
          </View>
        ) : loading ? (
          // Borné : la lecture aboutit ou lève `failed`. Jamais un spinner sans fin.
          <Text style={styles.stateInline}>{t(C.loading)}</Text>
        ) : !personal ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>
              {canSignIn ? t(C.signedOutTitle) : t(C.noBackendTitle)}
            </Text>
            <Text style={styles.stateBody}>
              {canSignIn ? t(C.signedOutBody) : t(C.noBackendBody)}
            </Text>
            {canSignIn ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.signIn)}
                onPress={() => router.push('/sign-in')}
                style={({ pressed }) => [styles.stateCta, pressed && styles.cellPressed]}
              >
                <Text style={styles.stateCtaLabel} numberOfLines={1}>
                  {t(C.signIn)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            {/* Chiffre héros (addendum §E) — graisse 400 imposée par l'amendement */}
            <Text style={styles.heroCount}>
              {unlockedTotal}
              <Text style={styles.heroTotal}> / {BADGE_TOTAL}</Text>
            </Text>
            <Text style={styles.heroLabel}>
              {t(C.unlockedLabel)}
              {tierMax ? ` · ${t(C.maxTier, { tier: tierMax })}` : ''}
            </Text>
            {/* Collection réellement vide : un compte neuf. On dit comment
                l'ouvrir — jamais « 0 » nu, jamais culpabilisant. */}
            {unlockedTotal === 0 ? (
              <Text style={styles.stateInline}>{t(C.emptyLine)}</Text>
            ) : null}
          </>
        )}

        {/* Filtres horizontaux — Tous + 12 familles + Secrets (§1.6) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.filtersContent}
        >
          <FilterChip
            label={t(C.filterAll)}
            color={null}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
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
            label={t(C.filterSecrets)}
            color={SECRET_BADGE_COLOR}
            active={filter === 'secret'}
            onPress={() => setFilter('secret')}
          />
        </ScrollView>

        {/* Proches du déblocage — top 3 par % (uniquement en vue « Tous ») */}
        {showNearly ? (
          <View style={styles.section}>
            <Text style={styles.nearlyTitle}>{t(C.nearlyTitle)}</Text>
            {nearlyUnlocked.map(({ def, prog }) => (
              <Pressable
                key={def.id}
                accessibilityRole="button"
                accessibilityLabel={t(C.a11yNearlyBadge, {
                  name: def.name,
                  value: prog!.value,
                  threshold: prog!.threshold,
                })}
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
                  {formatInt(prog!.value)} / {formatInt(prog!.threshold)}
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
              personal={personal}
            />
          );
        })}

        {/* Secrets — masqués en « ? » jusqu'au déblocage (§2) */}
        {showSecrets ? (
          <FamilySection
            id="secret"
            name={t(C.filterSecrets)}
            color={SECRET_BADGE_COLOR}
            defs={secrets}
            onSelect={setSelected}
            unlockedIds={unlockedIds}
            stat={stat}
            personal={personal}
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
          personal={personal}
        />
      ) : null}

      {/* E19 — le moment dédié passe AU-DESSUS de tout (y compris le détail) :
          c'est un arrêt, pas une couche de plus. */}
      {celebrating.length > 0 ? (
        <BadgeUnlockMoment
          keys={celebrating}
          dates={unlockedDates}
          onSeen={rememberSeen}
          onDone={endCelebration}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: spacing.cardPadding },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', minHeight: sizes.touchTarget, gap: 4, marginBottom: 14 },
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

  // ── États vides (même grammaire que le profil et /performance) ──
  stateCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: 14,
  },
  stateTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  stateBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  // CTA chartreuse sur fond SOMBRE, libellé noir dessus (jamais l'inverse).
  stateCta: {
    marginTop: spacing.xs,
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  stateCtaLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800' },
  stateInline: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 14 },

  // ── Filtres horizontaux ──
  filters: { marginTop: 20, marginHorizontal: -spacing.cardPadding },
  filtersContent: { paddingHorizontal: spacing.cardPadding, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.touchTarget,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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

  section: { marginTop: spacing.xxl },
  bandeau: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  familyName: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  familyTrait: { flex: 1, height: 2, borderRadius: radii.pill, opacity: 0.7 },
  familyCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.6,
  },
  // Grille 3 colonnes de BadgeCards grand format (planche E19 ; AMENDEMENT-08 §8)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  gridCell: { width: '31.5%' },
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
    borderRadius: radii.sm,
    transform: [{ rotate: '45deg' }],
    backgroundColor: colors.carbone,
  },
  tierLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
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
    textTransform: 'uppercase', // casse portée par le style (locale-safe + a11y)
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

  // ── Partage (badge possédé) — tertiaire, jamais chartreuse ──
  sheetShare: {
    alignSelf: 'stretch',
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  sheetShareLabel: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sheetShareNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: 4,
  },
});
