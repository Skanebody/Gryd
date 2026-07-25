/**
 * GRYD — onglet Carte (home) : la carte EST le produit (SPEC §4.2.1).
 * Le bouton d'action (GO) et la nav vivent dans le layout (tabs).
 *
 * Zéro-friction : la MISSION est lisible SANS AUCUN TAP — une LIGNE MISSION
 * fixe en haut de la carte, dérivée de `useRealMission`, c'est-à-dire de MES
 * VRAIES captures. Tap sur la ligne = détail compact + entrée VISIBLE vers le
 * Route Planner. Aucun CTA chartreuse plein ici : le SEUL CTA de l'écran reste
 * le bouton flottant GO de la nav (anti double-CTA §A.4).
 *
 * ─── FIN DU MODE VITRINE (21/07/2026) ───────────────────────────────────────
 * La ligne mission avait DEUX implémentations : la réelle, et une démo
 * (« République attaquée · 3 zones · 8 h », tête de secteur « ●  il y a 2 h »,
 * pill « Canal Crew 38 % ») tirée de `map/demo.ts`. La seconde a disparu : elle
 * fabriquait une mission ET un rival. Il ne reste qu'un seul chemin — donc plus
 * aucun risque que localhost raconte une autre histoire que l'iPhone.
 * Conséquence directe : les returns conditionnels placés AVANT les hooks
 * (`if (!isShowcasePlatform) …`, `if (configured && session) return null`) ont
 * disparu avec la branche, et l'ordre des hooks est redevenu inconditionnel.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, gameColors, iconSizes, radii } from '@klaim/shared';
import { MapScreen } from '../../src/features/map/MapScreen';
import { SlideToStart } from '../../src/features/nav/SlideToStart';
import { deriveContextualAction } from '../../src/features/nav/contextualAction';
import { NAV_BAR_HEIGHT, SLIDE_START_GAP } from '../../src/features/nav/metrics';
import { C } from '../../src/i18n/catalog/nav';
import { C as M } from '../../src/i18n/catalog/mission';
import { useRealMission } from '../../src/features/mission/useRealMission';
import { useLocale, useT } from '../../src/i18n/store';
import type { Locale } from '../../src/i18n/types';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { hasPendingUpload, retryPendingUpload } from '../../src/lib/pendingUpload';
import { useMapHudHidden, useZoneSheetOpen } from '../../src/features/map/mapUiStore';
import { Icon } from '../../src/ui/Icon';
import { AvatarHex } from '../../src/features/social/AvatarHex';
import { useMyProfile } from '../../src/features/social/profileStore';
import { useMyEconomy } from '../../src/features/social/economy';
import { playerLevelForXp, playerTierForLevel } from '../../src/features/crew/rules';
import { cityLabel } from '../../src/features/social/cities';
import { useOnboardingState } from '../../src/features/onboarding/store';

// ─── Métriques locales (layout uniquement — aucune constante de jeu) ────────
/** Marges latérales de la ligne mission (alignées sur les flottants : 14 px). */
const MISSION_LINE_SIDE = 14;
/** Dégagement sous le safe-area haut. */
const MISSION_LINE_TOP_GAP = 8;
/** Header du Home (planche E02/E03 ①) : avatar 40 + pill lieu, ancré tout en haut. */
const HEADER_HEIGHT = 40;
const HEADER_TOP_GAP = 6;
/** La ligne mission descend SOUS le header (jamais de chevauchement) :
 *  header (gap + hauteur) puis le même dégagement qu'avant sous le header. */
const MISSION_LINE_BELOW_HEADER = HEADER_TOP_GAP + HEADER_HEIGHT + MISSION_LINE_TOP_GAP;
/** Cible tactile minimale (accessibilité — jamais sous 44 px). */
const MIN_TAP_TARGET = 44;
/**
 * La ligne mission ne se tronque JAMAIS (« … » interdit) : au pire elle
 * rétrécit — plancher 12 px (fontSizes.xs), la plus petite taille autorisée.
 */
const MISSION_TEXT_SIZE = 13;
const MISSION_TEXT_MIN_SCALE = fontSizes.xs / MISSION_TEXT_SIZE;

/** « 4,4 km » — décimale selon la langue, pas d'Intl (parité Hermes) ;
 *  « km » invariant. Seul l'anglais prend le point. */
function formatKm(km: number, locale: Locale): string {
  const fixed = km.toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

/*
 * Ont disparu avec la ligne mission de démo (21/07/2026) :
 *   • TIME_LEFT_LABEL / TIME_COMPACT — l'« horloge unique » de l'écran lisait
 *     MAP_MISSION_SUMMARY.timeLeftLabel (« 8 h restantes »), une échéance
 *     fabriquée. La mission RÉELLE porte sa propre échéance (`hoursLeft`).
 *   • SECTOR_NAME / la tête de carte (MAP_HUD.zoneName « PARIS EST », fraîcheur
 *     « ● À jour », rival « Canal Crew · 38 % ») — un secteur, une fraîcheur et
 *     un rival inventés, affichés au-dessus de la carte de n'importe qui.
 * Elles reviendront quand une agrégation serveur les portera.
 */

export default function CarteTab() {
  return (
    <View style={styles.root}>
      <MapScreen />
      <HomeHeader />
      <MissionLine />
      <MapStartSlider />
    </View>
  );
}

/**
 * HEADER du Home (planche E02/E03 ①) : avatar (→ Profil) + pill de contexte
 * « lieu ». ZÉRO fabrication — l'avatar grave les VRAIES initiales du profil
 * (défaut neutre « Coureur » hors session, jamais un persona), la pill nomme la
 * VRAIE ville de jeu (onboarding.cityId → nom réel) et DISPARAÎT si aucune ville
 * n'est connue (jamais un lieu inventé, §47).
 *
 * DORMANTS (planche, mais O1) : la cloche de notifications + son badge orange
 * (« événement territorial ») et le sous-label secteur (« · Centre ») ne sont
 * PAS peints — aucun événement territorial réel n'existe avant O1, et une cloche
 * qui n'ouvre rien / un badge qui ne compte rien seraient des boutons morts (§A).
 * Ils reviendront alimentés serveur. « Carte nue » (HUD masqué) → header retiré.
 */
function HomeHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { profile } = useMyProfile();
  const economy = useMyEconomy();
  const { state: onboarding } = useOnboardingState();
  const hudHidden = useMapHudHidden();
  if (hudHidden) return null;

  const tier = playerTierForLevel(playerLevelForXp(economy.xp));
  // Le NOM RÉEL que le joueur a vu au choix de ville (le plus honnête), sinon
  // résolu depuis l'id (états d'une version antérieure), sinon rien (pill tue).
  const city = onboarding.cityName ?? cityLabel(onboarding.cityId);
  const openProfile = () => {
    haptics.light();
    router.push('/(tabs)/profil');
  };

  return (
    <View
      style={[styles.headerWrap, { top: insets.top + HEADER_TOP_GAP }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.headerProfileA11y)}
        onPress={openProfile}
        hitSlop={8}
        style={({ pressed }) => [styles.headerAvatar, pressed && styles.pressed]}
        testID="home-header-avatar"
      >
        <AvatarHex handle={profile.displayName} tier={tier} size={HEADER_HEIGHT} />
      </Pressable>
      {city ? (
        <View style={styles.headerPill} pointerEvents="none">
          {/* Nom de ville jamais tronqué par « … » (§A) : il rétrécit au besoin. */}
          <Text
            style={styles.headerPillText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MISSION_TEXT_MIN_SCALE}
          >
            {city}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Départ de course sur la Carte (override fondateur) : « glisser pour courir »
 * (SlideToStart), UNIQUEMENT ici — pas dans la nav. Ancré au-dessus de la barre
 * d'onglets. Toujours présent (même en carte nue) : c'est L'ACTION, pas de l'info.
 * Le routing reste contextuel (deriveContextualAction → cible du live).
 */
function MapStartSlider() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useLocale();
  const action = useMemo(() => deriveContextualAction({ screen: 'map' }, locale), [locale]);
  // E04 (planche + §A.4) : quand un sheet de DÉCISION de zone est ouvert, son CTA
  // (REPRENDRE) devient l'unique CTA primaire — GO se retire pour ne pas peindre
  // deux CTA à la fois. Il revient dès la fermeture du sheet.
  const zoneOpen = useZoneSheetOpen();
  if (zoneOpen) return null;
  return (
    <View
      style={[styles.startWrap, { bottom: insets.bottom + NAV_BAR_HEIGHT + SLIDE_START_GAP }]}
      pointerEvents="box-none"
    >
      <PendingRunNote />
      <SlideToStart
        label="GO"
        accessibilityLabel={`GO — ${action.a11yLabel}`}
        onComplete={() => router.push(action.targetHref)}
      />
    </View>
  );
}

/**
 * « Où est mon run » (fiabilité — « aucun run perdu », 21/07) : quand une fin
 * de course attend dans le slot pendingUpload, le DIRE au lieu du silence.
 * Le retry automatique existe déjà (_layout au lancement, useRealRun en fin de
 * course) — ceci est la fenêtre de VÉRITÉ + une relance manuelle au toucher.
 * État discret au-dessus de GO (pas un 2ᵉ CTA — §A) ; disparaît sitôt envoyé.
 */
function PendingRunNote() {
  const t = useT();
  const [pending, setPending] = useState(false);
  const refresh = useCallback(() => {
    void hasPendingUpload().then(setPending);
  }, []);
  useFocusEffect(refresh);
  if (!pending) return null;
  const resend = () => {
    haptics.light();
    void retryPendingUpload().then(refresh);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.pendingRunNote)}
      onPress={resend}
      style={({ pressed }) => [styles.pendingNote, pressed && { opacity: 0.7 }]}
      testID="pending-run-note"
    >
      <Text style={styles.pendingNoteText} numberOfLines={1} adjustsFontSizeToFit>
        {t(C.pendingRunNote)}
      </Text>
    </Pressable>
  );
}

/**
 * LIGNE MISSION fixe (haut de carte) : toujours visible, jamais tronquée —
 * l'écran mission montre sa mission sans tap. Tap = détail compact (l'action
 * « Défendre République », le gain, et « Planifier un parcours » → Route
 * Planner). Le détail se referme à chaque retour sur l'onglet (carte nue).
 */
function MissionLine() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hudHidden = useMapHudHidden();
  const t = useT();
  const locale = useLocale();
  const [detailOpen, setDetailOpen] = useState(false);
  // La mission RÉELLE dérivée de MES vraies captures + ma position.
  // null sans session / pendant la lecture / en cas d'échec (voir hook).
  const { mission: realMission } = useRealMission();

  // Retour sur la Carte = détail refermé (même règle « carte nue » que le HUD).
  // TOUS les hooks AVANT les retours conditionnels ci-dessous (Rules of Hooks) :
  // carte nue et « pas de mission réelle » sortent tôt, jamais en sautant un hook.
  useFocusEffect(
    useCallback(() => {
      setDetailOpen(false);
    }, []),
  );

  // « Carte nue » : l'utilisateur a masqué tout le HUD → plus de ligne mission.
  if (hudHidden) return null;

  // Mission RÉELLE ou RIEN. Deux cas :
  //  • null / lecture en cours / first_capture → RIEN : le widget « Prends ta
  //    première zone » (BattleMapOverlays) porte déjà ce cas — pas de doublon §A ;
  //  • defend_expiring / expand → LA ligne mission réelle.
  if (!realMission || realMission.kind === 'first_capture') return null;

  // Narrow UNE fois : `defend` non-null ⟺ mission de défense — accès `hoursLeft`
  // sûr (un booléen isDefend séparé ne rétrécirait pas l'union → erreur TS).
  const defend = realMission.kind === 'defend_expiring' ? realMission : null;
  const kmLabel =
    realMission.distanceM != null ? formatKm(realMission.distanceM / 1000, locale) : null;
  // Titre COURT (détail au tap) : sans distance — la distance vit sur la ligne.
  const nearText = defend ? t(M.missionDefend, { h: defend.hoursLeft }) : t(M.missionExpand);
  // Ligne compacte : ajoute la distance dès qu'un fix GPS existe (variante Far).
  const lineText =
    kmLabel != null
      ? defend
        ? t(M.missionDefendFar, { km: kmLabel, h: defend.hoursLeft })
        : t(M.missionExpandFar, { km: kmLabel })
      : nearText;
  // Accent par RÔLE (§C — renforce le texte, jamais seul porteur de sens) :
  // decay urgent = danger (rouge) ; croissance de MON territoire = chartreuse.
  const accent = defend ? gameColors.danger : colors.chartreuse;

  const toggleRealDetail = () => {
    haptics.light();
    setDetailOpen((open) => {
      const next = !open;
      if (next) screen('map_mission_line_open');
      return next;
    });
  };
  const openRealPlanner = () => {
    haptics.light();
    // Le planner lit `type` (defense → défendre, sinon conquérir) et prend son
    // origine du GPS LIVE — il ne consomme pas l'anchor de la mission (cf. risks).
    router.push(defend ? '/route-planner?type=defense' : '/route-planner');
  };

  return (
    <View
      style={[styles.missionWrap, { top: insets.top + MISSION_LINE_BELOW_HEADER }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: detailOpen }}
        accessibilityLabel={`${lineText} — ${t(
          detailOpen ? C.missionDetailCloseA11y : C.missionDetailOpenA11y,
        )}`}
        onPress={toggleRealDetail}
        style={({ pressed }) => [styles.missionLine, pressed && styles.pressed]}
        testID="battle-map-mission-line-real"
      >
        {/* Accent de RÔLE — renforce le texte, ne le remplace jamais (§C). */}
        <View style={[styles.missionBar, { backgroundColor: accent }]} />
        <Text
          style={styles.missionText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={MISSION_TEXT_MIN_SCALE}
        >
          {lineText}
        </Text>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>

      {detailOpen ? (
        <View style={styles.missionDetail}>
          {/* Détail au tap (jamais imposé) : rappel court + entrée Route Planner. */}
          <Text
            style={styles.detailTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MISSION_TEXT_MIN_SCALE}
          >
            {nearText}
          </Text>
          <View style={styles.detailDivider} />
          {/* Entrée VISIBLE vers le Route Planner — action inline, jamais un
              2ᵉ CTA chartreuse plein (§A.4 : le seul CTA reste GO). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(M.missionPlanA11y)}
            onPress={openRealPlanner}
            style={({ pressed }) => [styles.detailAction, pressed && styles.pressed]}
            testID="battle-map-plan-route-real"
          >
            <Text style={styles.detailActionLabel} numberOfLines={1}>
              {t(M.missionPlan)}
            </Text>
            <Icon name="chevron" size={iconSizes.sm} color={colors.blanc} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  pressed: { opacity: 0.7 },

  // ── Header du Home (planche E02/E03 ①) : avatar + pill lieu, tout en haut ──
  headerWrap: {
    position: 'absolute',
    left: MISSION_LINE_SIDE,
    right: MISSION_LINE_SIDE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: { width: HEADER_HEIGHT, height: HEADER_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  // Pill de contexte « lieu » : fond carbone, texte blanc (jamais chartreuse sur
  // clair). Se rétrécit au besoin (maxWidth) — jamais tronquée par « … » (§A).
  headerPill: {
    maxWidth: '64%',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPillText: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },

  // ── Départ de course « glisser pour courir » (au-dessus de la barre d'onglets) ──
  startWrap: { position: 'absolute', left: 16, right: 16, gap: 8 },
  // « Où est mon run » : état discret (fond sombre, texte blanc) — jamais un
  // 2ᵉ CTA chartreuse (§A), disparaît sitôt la course envoyée.
  pendingNote: {
    alignSelf: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grisLigne,
  },
  pendingNoteText: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },

  // ── Ligne mission (toujours visible, sur la carte) ──
  missionWrap: {
    position: 'absolute',
    left: MISSION_LINE_SIDE,
    right: MISSION_LINE_SIDE,
    gap: 8,
  },
  missionLine: {
    minHeight: MIN_TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    overflow: 'hidden',
  },
  missionBar: { width: 4, alignSelf: 'stretch', backgroundColor: gameColors.rival },
  missionText: {
    flex: 1,
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: MISSION_TEXT_SIZE,
    fontWeight: '700',
    paddingLeft: 10,
  },

  // ── Détail (au tap — jamais imposé) ──
  missionDetail: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailTitle: {
    color: colors.blanc,
    fontFamily: fonts.displaySemi,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  detailDivider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 10 },
  detailAction: {
    minHeight: MIN_TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
    detailActionLabel: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.sm, fontWeight: '700' },
});
