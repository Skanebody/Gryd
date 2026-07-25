/**
 * GRYD — onglet Carte (home) : la carte EST le produit (SPEC §4.2.1).
 * Cet écran empile, au-dessus de <MapScreen/>, les quatre surfaces du HUD :
 * le HEADER (avatar + pill de lieu), le COMMUTATEUR Run/Bike (planche E14), la
 * LIGNE MISSION, et le bouton GO à DEUX ÉTATS (planche E02).
 *
 * Zéro-friction : la MISSION est lisible SANS AUCUN TAP — une LIGNE MISSION
 * fixe en haut de la carte, dérivée de `useRealMission`, c'est-à-dire de MES
 * VRAIES captures. Tap sur la ligne = détail compact + entrée VISIBLE vers le
 * Route Planner. Aucun CTA chartreuse plein ici : le SEUL CTA de l'écran reste
 * le bouton GO (anti double-CTA §A.4), rendu ICI et nulle part ailleurs — la
 * barre d'onglets est un simple rang de destinations.
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, gameColors, iconSizes, radii } from '@klaim/shared';
import { MapScreen } from '../../src/features/map/MapScreen';
import { deriveContextualAction } from '../../src/features/nav/contextualAction';
import { GO_BUTTON_GAP, NAV_BAR_HEIGHT } from '../../src/features/nav/metrics';
import { C } from '../../src/i18n/catalog/nav';
import { C as M } from '../../src/i18n/catalog/mission';
import { useRealMission } from '../../src/features/mission/useRealMission';
import { useLocale, useT } from '../../src/i18n/store';
import type { Locale } from '../../src/i18n/types';
import { screen } from '../../src/lib/analytics';
import { flags } from '../../src/lib/flags';
import { haptics } from '../../src/lib/haptics';
import { hasPendingUpload, retryPendingUpload } from '../../src/lib/pendingUpload';
import {
  useMapHudHidden,
  useMapSheetLayout,
  useZoneSheetOpen,
} from '../../src/features/map/mapUiStore';
import { useMapActivity } from '../../src/features/map/mapPref';
import { goButtonBottom } from '../../src/features/map/sheetSnap';
import {
  MapActivitySwitch,
  ACTIVITY_SWITCH_HEIGHT,
  ACTIVITY_SWITCH_WIDTH,
} from '../../src/features/map/MapActivitySwitch';
import { useReduceMotion } from '../../src/ui/game/anim';
import { Icon } from '../../src/ui/Icon';
import { effectiveInitials, useMyProfile } from '../../src/features/social/profileStore';
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
/**
 * CTA RUN À DEUX ÉTATS (planche E02) : « pill 60 pt au-dessus de la nav quand la
 * sheet est FERMÉE ; repliée en bouton ROND 60 pt ancré à droite du bloc mission
 * quand la sheet est DÉPLOYÉE (le pouce retrouve toujours le rond à droite) ».
 * Le libellé reste « GO » (override fondateur AMENDEMENT-38) dans les DEUX
 * états — c'est le picto basket qui entre et sort, jamais le mot.
 */
const GO_SIZE = 60;
const GO_PILL_WIDTH = 112;
/** Morph ~180 ms (planche) — durée d'INTERFACE, aucune règle de jeu ici. */
const GO_MORPH_MS = 180;
/**
 * Bande HAUTE que le rond GO ne franchit jamais : safe area + header (avatar +
 * pill de lieu) + rangée du commutateur Run/Bike. Sans ce plafond, au palier
 * 90 % le rond recouvrirait l'avatar et le commutateur.
 */
const GO_TOP_CLEARANCE =
  HEADER_TOP_GAP + HEADER_HEIGHT + MISSION_LINE_TOP_GAP + ACTIVITY_SWITCH_HEIGHT + 8;
/** Écart entre la ligne mission et le commutateur (jamais de chevauchement). */
const MISSION_LINE_SWITCH_GAP = 10;

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
      <ActivitySwitchRow />
      <MissionLine />
      <MapGoButton />
    </View>
  );
}

/**
 * COMMUTATEUR RUN / BIKE (planche E14) : « en haut à droite », sous la pill de
 * lieu, donc sur la rangée qui suit le header — la ligne mission lui laisse la
 * place à sa droite (cf. `MissionLine`).
 *
 * Il suit la même règle que le reste du HUD : « carte nue » (HUD masqué) le
 * retire aussi. Et il n'apparaît que si `flags.bike` est levé — la planche E14
 * dit « visible seulement si Bike est activé ; masqué sinon, jamais grisé ».
 */
function ActivitySwitchRow() {
  const insets = useSafeAreaInsets();
  const hudHidden = useMapHudHidden();
  if (!flags.bike || hudHidden) return null;
  return (
    <View
      style={[styles.switchWrap, { top: insets.top + MISSION_LINE_BELOW_HEADER }]}
      pointerEvents="box-none"
    >
      <MapActivitySwitch testID="map-activity-switch" />
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
  const { state: onboarding } = useOnboardingState();
  const hudHidden = useMapHudHidden();
  if (hudHidden) return null;

  const initials = effectiveInitials(profile);
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
        {/* Avatar CERCLE à liseré chartreuse + initiales réelles (planche E02). */}
        <Text style={styles.headerAvatarInitials}>{initials}</Text>
      </Pressable>
      {city ? (
        <View style={styles.headerPill} pointerEvents="none">
          {/* Pastille « lieu » chartreuse (façon pin de la planche). */}
          <View style={styles.headerPillPin} />
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
 * DÉPART DE COURSE sur la Carte (override fondateur) : UNIQUEMENT ici, pas dans
 * la nav. Le routing reste contextuel (deriveContextualAction → cible du live).
 *
 * DEUX ÉTATS (planche E02) — c'est la réponse de la planche à « placer GO
 * intelligemment » :
 *   • sheet compacte / absente → PILL (picto basket + « GO ») au-dessus de la
 *     barre d'onglets ;
 *   • sheet DÉPLOYÉE → ROND ancré en haut à DROITE de la sheet, chevauchant son
 *     bord supérieur : il ne recouvre jamais le contenu, et le pouce le retrouve
 *     toujours au même endroit à droite.
 * Le passage est un MORPH de 180 ms (largeur + montée), jamais un saut ;
 * reduce motion → position finale posée directement.
 *
 * POURQUOI GO VIT ICI ET PAS DANS LA SHEET : `sheetWrap` (BattleMapOverlays)
 * porte `overflow:'hidden'` — un rond qui chevauche le bord haut de la sheet y
 * serait tronqué. Il reste donc un frère de <MapScreen/>, et lit la géométrie
 * publiée au SNAP via `useMapSheetLayout`.
 *
 * DEUX RETRAITS, tous deux volontaires :
 *   • sheet de DÉCISION de zone ouverte (E04) → son CTA REPRENDRE devient
 *     l'unique CTA primaire, GO se retire (§A.4, invariant préexistant) ;
 *   • lentille BIKE → voir le commentaire de `bike` plus bas.
 */
function MapGoButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const locale = useLocale();
  const action = useMemo(() => deriveContextualAction({ screen: 'map' }, locale), [locale]);
  // E04 (planche + §A.4) : quand un sheet de DÉCISION de zone est ouvert, son CTA
  // (REPRENDRE) devient l'unique CTA primaire — GO se retire pour ne pas peindre
  // deux CTA à la fois. Il revient dès la fermeture du sheet.
  const zoneOpen = useZoneSheetOpen();
  const sheet = useMapSheetLayout();
  const { activity } = useMapActivity();
  const reduce = useReduceMotion();
  /** 0 = pill, 1 = rond (largeur + opacité du picto). */
  const morph = useRef(new Animated.Value(0)).current;
  /** Montée du bouton vers le bord haut de la sheet (px, négatif = vers le haut). */
  const lift = useRef(new Animated.Value(0)).current;

  /** Position de repos : la PILL, juste au-dessus de la barre d'onglets. */
  const pillBottom = insets.bottom + NAV_BAR_HEIGHT + GO_BUTTON_GAP;
  /** Cible du rond quand la sheet est déployée (fonction PURE, testée en Deno). */
  const targetBottom = goButtonBottom({
    pillBottom,
    sheetTop: sheet.topPx,
    expanded: sheet.expanded,
    size: GO_SIZE,
    screenH,
    topClearance: insets.top + GO_TOP_CLEARANCE,
  });
  const shift = targetBottom - pillBottom;

  useEffect(() => {
    const toMorph = sheet.expanded ? 1 : 0;
    if (reduce) {
      morph.setValue(toMorph);
      lift.setValue(-shift);
      return;
    }
    Animated.parallel([
      // Largeur + opacité du picto : driver JS (la largeur n'est pas native).
      Animated.timing(morph, {
        toValue: toMorph,
        duration: GO_MORPH_MS,
        useNativeDriver: false,
      }),
      Animated.timing(lift, {
        toValue: -shift,
        duration: GO_MORPH_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sheet.expanded, shift, reduce, morph, lift]);

  /**
   * LENTILLE BIKE — GO est MASQUÉ, et c'est un choix argumenté.
   * Le départ de course écrit une course À PIED (`runs` n'a aucune colonne de
   * type d'activité) : un GO en mode vélo enregistrerait une sortie vélo comme
   * une course à pied — un mensonge — ou échouerait toujours — un bouton mort.
   * Restaient deux options : le peindre indisponible avec son motif, ou le
   * retirer. On retire, pour deux raisons : « l'absence d'un bouton n'est pas un
   * mensonge, un bouton qui échoue toujours en est un » (CLAUDE.md), et le MOTIF
   * est déjà écrit à l'endroit où l'œil va — le peek Bike, juste en dessous
   * (« GRYD ne chronomètre pas encore le vélo »). Le répéter sur un bouton grisé
   * ferait deux messages pour une seule situation (§A : 1 écran = 1 décision).
   * La note « où est mon run », elle, RESTE : elle parle de fiabilité d'envoi,
   * pas de territoire, et la taire cacherait un vrai problème.
   */
  const bike = activity === 'bike';
  if (zoneOpen) return null;

  const go = () => {
    haptics.medium();
    router.push(action.targetHref);
  };
  const btnWidth = morph.interpolate({
    inputRange: [0, 1],
    outputRange: [GO_PILL_WIDTH, GO_SIZE],
  });
  const glyphOpacity = morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      style={[styles.startWrap, { bottom: pillBottom, transform: [{ translateY: lift }] }]}
      pointerEvents="box-none"
    >
      <PendingRunNote />
      {bike ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`GO — ${action.a11yLabel}`}
          onPress={go}
          style={({ pressed }) => [pressed && styles.pressed]}
          testID="map-run-button"
        >
          <Animated.View style={[styles.runBtn, { width: btnWidth }]}>
            {/* Picto basket (planche) — il s'efface quand la pill devient rond ;
                le mot « GO » reste dans les deux états (AMENDEMENT-38). */}
            <Animated.View
              style={[styles.runGlyph, { opacity: glyphOpacity }]}
              pointerEvents="none"
            >
              <Icon name="basket" size={iconSizes.md} color={colors.noir} />
            </Animated.View>
            <Text style={styles.runLabel}>GO</Text>
          </Animated.View>
        </Pressable>
      )}
    </Animated.View>
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
  const { activity } = useMapActivity();
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

  // Lentille BIKE (planche E14) : la mission est dérivée de MES captures À PIED
  // (useRealMission → hex_claims). L'afficher sous étiquette vélo serait une
  // mission de course à pied déguisée en mission vélo — donnée fabriquée.
  if (activity === 'bike') return null;

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
        style={({ pressed }) => [
          styles.missionLine,
          // Le commutateur Run/Bike occupe le coin droit de CETTE rangée : la
          // LIGNE lui cède la place (le détail, plus bas, garde toute la largeur).
          flags.bike
            ? { marginRight: ACTIVITY_SWITCH_WIDTH + MISSION_LINE_SWITCH_GAP }
            : null,
          pressed && styles.pressed,
        ]}
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
  // Avatar CERCLE à liseré chartreuse (planche E02) — pas l'hexagone.
  headerAvatar: {
    width: HEADER_HEIGHT,
    height: HEADER_HEIGHT,
    borderRadius: HEADER_HEIGHT / 2,
    backgroundColor: colors.carbone2,
    borderWidth: 2,
    borderColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitials: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Pill de contexte « lieu » : pastille + ville, radius 18 (planche). Fond
  // carbone, texte blanc (jamais chartreuse sur clair). Rétrécit — jamais coupé (§A).
  headerPill: {
    maxWidth: '64%',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.btn,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerPillPin: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.chartreuse },
  headerPillText: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },

  // ── Commutateur Run/Bike (planche E14) : rangée sous le header, à droite ──
  switchWrap: { position: 'absolute', right: MISSION_LINE_SIDE, alignItems: 'flex-end' },

  // ── GO : pill (sheet compacte) ⇄ rond (sheet déployée), toujours à DROITE ──
  startWrap: { position: 'absolute', right: 16, alignItems: 'flex-end', gap: 8 },
  runBtn: {
    // `width` est ANIMÉE (pill ⇄ rond) : seule la hauteur est figée ici. Le
    // radius vaut la demi-hauteur → pill quand c'est large, cercle à 60 px.
    height: GO_SIZE,
    borderRadius: GO_SIZE / 2,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.chartreuse,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // Picto ABSOLU : il s'efface au morph sans jamais pousser le mot « GO », qui
  // reste centré dans les deux états.
  runGlyph: { position: 'absolute', left: 16 },
  runLabel: { color: colors.noir, fontFamily: fonts.display, fontSize: fontSizes.md, fontWeight: '800', letterSpacing: 1 },
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
