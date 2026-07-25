/**
 * GRYD — E19 · L'ÉCRAN « BADGE RARE DÉBLOQUÉ ».
 *
 * Un MOMENT, pas une notification : plein écran, fond immersif, le badge en
 * grand sous une lumière contrôlée, puis — dans l'ordre exact de la planche —
 * le kicker, le nom en display, la condition réalisée datée, la ligne de rareté,
 * et les actions. Séquence ≤ 1,4 s, skippable au tap (le minutage vit dans
 * `unlockMoment.ts`, mesuré et testé).
 *
 * ─── CE QU'IL AFFIRME, ET RIEN DE PLUS ──────────────────────────────────────
 * Tout vient d'un badge RÉELLEMENT décerné par le serveur (`user_badges`, écrit
 * par ingest_run en service_role) : la clé, donc le nom et la condition du
 * catalogue de jeu, et la date d'obtention (`earned_at`). Rien n'est déduit,
 * rien n'est arrondi. Quand la date manque, l'écran le DIT au lieu d'en poser
 * une. La ligne « possédé par 2 % des joueurs de Dieppe » de la planche n'existe
 * pas : aucune source ne la porte (audit complet dans `unlockMoment.ts`), et
 * elle n'est pas remplacée par un « rare » vague — à sa place, un fait du
 * catalogue : le MATÉRIAU et sa position dans l'échelle.
 *
 * ─── UN SEUL CTA CHARTREUSE, ET IL AGIT (§A4) ───────────────────────────────
 * « AJOUTER AU PROFIL » écrit vraiment dans `profileStore.featuredBadgeIds`
 * (le mécanisme de la vitrine, cap `FEATURED_BADGE_COUNT`). Les trois issues
 * sont peintes distinctement : ajouté · déjà là · vitrine pleine. Pleine, le CTA
 * devient « CHOISIR LEQUEL REMPLACER » et ouvre /profil-edit — la seule action
 * qui change quelque chose. Jamais un bouton qui ne fait rien.
 *
 * ─── RÉUTILISABLE HORS /badges ──────────────────────────────────────────────
 * Ce composant ne connaît ni Supabase ni l'écran d'où il est monté : on lui
 * passe des clés et des dates. Le point de déclenchement IDÉAL est le résultat
 * de course (`app/course-result.tsx` lit déjà `serverResult.newBadges`) — il
 * suffit d'y monter ce composant avec ces clés. Hors périmètre de ce chantier :
 * la marche à suivre est en observations.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fonts, motion, sizes, spacing } from '@klaim/shared';
import { Button } from '../../ui/Button';
import { useReduceMotion } from '../../ui/game/anim';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/badges';
import { haptics } from '../../lib/haptics';
import { EVENTS, track } from '../../lib/analytics';
import { openShareSheet } from '../share/shareActions';
import { FEATURED_BADGE_COUNT, useMyProfile } from '../social/profileStore';
import { BadgeHex } from './BadgeHex';
import { badgeColor, tierStyle } from './catalog';
import {
  UNLOCK_LAST_STEP,
  addToFeatured,
  unlockDelaysMs,
  unlockMomentContent,
  unlockReached,
  type UnlockMomentContent,
} from './unlockMoment';

/** Ce que l'écran doit DIRE de la vitrine du profil après une action. */
type ProfileNote = 'none' | 'added';
/** Retour honnête du partage : ce qui s'est réellement passé, ou rien. */
type ShareNote = 'none' | 'copied' | 'unavailable';

/** Diamètre du halo de lumière derrière le badge (présentation pure). */
const HALO_SIZE = 260;
/** Id du dégradé du halo (unique dans le DOM web — un seul moment à la fois). */
const HALO_GRADIENT_ID = 'gryd-badge-unlock-halo';

export interface BadgeUnlockMomentProps {
  /**
   * Clés à célébrer, dans l'ordre — issues de `user_badges` (ou de
   * `IngestRunResponse.newBadges`). Les clés non rares ou hors catalogue sont
   * ignorées : c'est `unlockMomentContent` qui tranche, pas l'appelant.
   */
  keys: readonly string[];
  /** badge_key → date FR réelle (`user_badges.earned_at`), quand elle existe. */
  dates: ReadonlyMap<string, string>;
  /** Un badge vient d'être montré : l'appelant l'inscrit en mémoire. */
  onSeen: (key: string) => void;
  /** La file est vide : plus rien à célébrer. */
  onDone: () => void;
}

export function BadgeUnlockMoment({ keys, dates, onSeen, onDone }: BadgeUnlockMomentProps) {
  // On ne garde que ce qui MÉRITE l'arrêt : rare + connu du catalogue.
  const queue = useMemo(
    () =>
      keys
        .map((k) => unlockMomentContent(k, dates.get(k) ?? null))
        .filter((c): c is UnlockMomentContent => c !== null),
    [keys, dates],
  );
  const [index, setIndex] = useState(0);
  const current = queue[index];

  // Rien de célébrable dans la file (que des badges courants, par exemple) :
  // on rend la main immédiatement — jamais un écran vide qui bloque.
  useEffect(() => {
    if (queue.length === 0) onDone();
  }, [queue.length, onDone]);

  const next = useCallback(() => {
    if (current) onSeen(current.key);
    if (index + 1 < queue.length) setIndex(index + 1);
    else onDone();
  }, [current, index, queue.length, onSeen, onDone]);

  if (!current) return null;

  // `key` remonte TOUT l'état (séquence, notes) à chaque badge de la file.
  return <BadgeUnlockScene key={current.key} content={current} onDismiss={next} />;
}

function BadgeUnlockScene({
  content,
  onDismiss,
}: {
  content: UnlockMomentContent;
  onDismiss: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { profile, save } = useMyProfile();

  // Reduce motion → tout est là dès la première image (fondu seul, aucun halo
  // animé, aucune translation) : l'information n'est jamais portée par le
  // mouvement, elle est seulement RÉVÉLÉE par lui.
  const [step, setStep] = useState(reduce ? UNLOCK_LAST_STEP : 0);
  const [profileNote, setProfileNote] = useState<ProfileNote>('none');
  const [shareNote, setShareNote] = useState<ShareNote>('none');
  const fade = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const def = content.def;
  const accent = badgeColor(def);
  // Teinte du halo : la couleur du MATÉRIAU (glow du tier, sinon son anneau),
  // rendue OPAQUE pour que l'intensité soit décidée par les seuls arrêts du
  // dégradé — sinon un tier dont l'anneau porte déjà un alpha (race, tempo)
  // s'allumerait deux fois moins qu'un tier en hex plein (carbon, legend).
  const ts = tierStyle(def);
  const glow = opaque(ts.glow ?? ts.ring ?? accent);

  useEffect(() => {
    track(EVENTS.celebrationViewed, { surface: 'badge_unlock', badge: content.key });
    haptics.success();
  }, [content.key]);

  // Fondu d'entrée : la seule animation que reduce motion conserve.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: motion.transitionMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  // Les temps de la planche. Un timer par temps, tous annulés au skip/démontage.
  useEffect(() => {
    if (reduce) return;
    const started = timers.current;
    unlockDelaysMs(motion.transitionMs).forEach((ms, i) => {
      if (i === 0) return;
      started.push(setTimeout(() => setStep((s) => (s < i ? i : s)), ms));
    });
    return () => {
      for (const id of started) clearTimeout(id);
      started.length = 0;
    };
  }, [reduce]);

  /** Skip : on saute au dernier temps — jamais on ne ferme par surprise. */
  const skip = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current.length = 0;
    setStep(UNLOCK_LAST_STEP);
  }, []);

  // La décision d'ajout est PURE (`addToFeatured`) : cet écran l'exécute et la
  // dit, il ne la ré-invente pas.
  const outcome = addToFeatured(profile.featuredBadgeIds, content.key, FEATURED_BADGE_COUNT);

  const addToProfile = useCallback(() => {
    haptics.medium();
    setShareNote('none');
    const result = addToFeatured(profile.featuredBadgeIds, content.key, FEATURED_BADGE_COUNT);
    if (result.kind === 'added') {
      void save({ featuredBadgeIds: result.next });
      setProfileNote('added');
    }
    // 'already' / 'full' : rien à écrire ici — `outcome` les dit déjà, en
    // permanence, au-dessus du CTA. Un message de plus serait un doublon.
  }, [profile.featuredBadgeIds, content.key, save]);

  const share = useCallback(() => {
    haptics.light();
    const message = t(C.unlockShareText, { name: def.name, requirement: content.requirement });
    void openShareSheet(message).then((res) => {
      // On ne dit « copié » que si ça l'a été. Un « annulé » n'est pas une
      // erreur et ne mérite aucun message.
      if (res.ok) setShareNote(res.via === 'clipboard' ? 'copied' : 'none');
      else if (res.reason === 'unavailable') setShareNote('unavailable');
    });
  }, [t, def.name, content.requirement]);

  const goReplace = useCallback(() => {
    haptics.medium();
    onDismiss();
    router.push('/profil-edit');
  }, [onDismiss]);

  const showActions = unlockReached(step, 'actions');
  // Le CTA unique. `full` n'est PAS un cul-de-sac : il route vers l'écran qui
  // permet de choisir le badge à remplacer.
  const ctaFull = outcome.kind === 'full';
  const ctaDone = outcome.kind === 'already';

  // Une seule ligne d'état, la plus RÉCENTE d'abord : le retour de partage prime
  // sur l'état permanent de la vitrine (sinon l'action qu'on vient de faire
  // resterait muette).
  const note: { text: string; done: boolean } | null =
    shareNote === 'copied'
      ? { text: t(C.unlockShareCopied), done: false }
      : shareNote === 'unavailable'
        ? { text: t(C.unlockShareUnavailable), done: false }
        : profileNote === 'added'
          ? { text: t(C.unlockAdded), done: true }
          : ctaDone
            ? { text: t(C.unlockAlready), done: false }
            : ctaFull
              ? { text: t(C.unlockFull, { max: FEATURED_BADGE_COUNT }), done: false }
              : null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      {/* Le SKIP couvre toute la scène, DERRIÈRE le contenu : la mise en scène
          reste lisible par un lecteur d'écran (elle ne devient pas « un bouton »),
          et un tap n'importe où saute au dernier temps. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.a11yUnlockSkip)}
        onPress={skip}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.stage, { opacity: fade, paddingTop: insets.top + spacing.xxl }]}
      >
        {/* LUMIÈRE CONTRÔLÉE — un dégradé radial qui s'éteint vers les bords,
            teinté par le MATÉRIAU du badge. Un aplat circulaire (ce qu'un
            `backgroundColor` produirait) se lit comme un DISQUE posé derrière le
            badge, pas comme de la lumière : d'où le vrai gradient SVG
            (react-native-svg est déjà la dépendance de BadgeHex). Jamais animé —
            la planche l'interdit sous Reduce Motion, et un halo qui respire
            attirerait l'œil hors du badge. */}
        <View style={styles.badgeWrap}>
          <Svg width={HALO_SIZE} height={HALO_SIZE} style={styles.halo} pointerEvents="none">
            <Defs>
              <RadialGradient id={HALO_GRADIENT_ID} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={glow} stopOpacity={0.26} />
                <Stop offset="0.5" stopColor={glow} stopOpacity={0.1} />
                <Stop offset="1" stopColor={glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={HALO_SIZE} height={HALO_SIZE} fill={`url(#${HALO_GRADIENT_ID})`} />
          </Svg>
          <BadgeHex
            family={def.family}
            familyColor={accent}
            tier={def.tier}
            state="unlocked"
            size="xl"
            secret={def.secret}
            slug={def.id}
          />
        </View>

        {unlockReached(step, 'kicker') ? (
          <Text style={styles.kicker}>{t(C.unlockKicker)}</Text>
        ) : null}

        {unlockReached(step, 'name') ? (
          <Text style={styles.name} accessibilityRole="header">
            {def.name}
          </Text>
        ) : null}

        {unlockReached(step, 'condition') ? (
          <>
            <Text style={styles.requirement}>{content.requirement}</Text>
            {/* La date vient de `user_badges.earned_at`. Absente, on le DIT. */}
            <Text style={styles.date}>
              {content.dateLabel
                ? t(C.unlockObtainedOn, { date: content.dateLabel })
                : t(C.unlockDateUnknown)}
            </Text>
          </>
        ) : null}

        {unlockReached(step, 'material') ? (
          <Text style={[styles.material, { color: accent }]}>
            {t(C.unlockMaterial, {
              tier: content.material.tierLabel,
              position: content.material.position,
              total: content.material.total,
            })}
          </Text>
        ) : null}
      </Animated.View>

      {showActions ? (
        <Animated.View
          style={[styles.actions, { opacity: fade, paddingBottom: insets.bottom + spacing.xl }]}
        >
          {note ? (
            <Text style={[styles.note, note.done ? styles.noteDone : null]}>{note.text}</Text>
          ) : null}

          {/* UN seul CTA chartreuse (§A4) — et il agit toujours. */}
          {ctaFull ? (
            <Button
              label={t(C.unlockChooseReplace)}
              onPress={goReplace}
              analyticsId="badge_unlock_replace"
            />
          ) : ctaDone ? null : (
            <Button
              label={t(C.unlockAddToProfile)}
              onPress={addToProfile}
              analyticsId="badge_unlock_feature"
            />
          )}

          {/* Actions tertiaires — jamais chartreuse, jamais tronquées. */}
          <View style={styles.tertiaryRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.unlockShare)}
              onPress={share}
              style={({ pressed }) => [styles.tertiary, pressed && styles.pressed]}
            >
              <Text style={styles.tertiaryLabel}>{t(C.unlockShare)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.unlockContinue)}
              onPress={() => {
                haptics.light();
                onDismiss();
              }}
              style={({ pressed }) => [styles.tertiary, pressed && styles.pressed]}
            >
              <Text style={styles.tertiaryLabel}>{t(C.unlockContinue)}</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** `rgba(r,g,b,a)` → `rgb(r,g,b)` ; un hex reste tel quel. Présentation pure. */
function opaque(color: string): string {
  const m = /^rgba\(\s*([^)]+)\)$/i.exec(color);
  if (!m) return color;
  const parts = m[1]!.split(',').map((p) => p.trim());
  return parts.length >= 3 ? `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})` : color;
}

const styles = StyleSheet.create({
  // Fond immersif (pas la surface d'écran ordinaire) : c'est un moment, il sort
  // du flux. Opaque : rien de la collection ne transparaît derrière.
  root: { backgroundColor: colors.carbonImmersive },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  badgeWrap: { alignItems: 'center', justifyContent: 'center' },
  // Le dégradé porte lui-même sa forme : aucun borderRadius à découper.
  halo: { position: 'absolute', width: HALO_SIZE, height: HALO_SIZE },
  kicker: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  name: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: fontSizes.xl * 1.15,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  requirement: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  date: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  // Teinte du MATÉRIAU (surface badge = seule exception polychrome, §1).
  material: {
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginTop: spacing.lg,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  actions: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  note: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  // Chartreuse sur fond SOMBRE uniquement (jamais l'inverse).
  noteDone: { color: colors.chartreuse },
  tertiaryRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  tertiary: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  tertiaryLabel: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pressed: { opacity: 0.6 },
});
