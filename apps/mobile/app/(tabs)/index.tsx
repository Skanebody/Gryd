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
import { deriveContextualAction, goButtonA11yLabel } from '../../src/features/nav/contextualAction';
import { GO_BUTTON_GAP, NAV_BAR_HEIGHT } from '../../src/features/nav/metrics';
import { C } from '../../src/i18n/catalog/nav';
import { C as M } from '../../src/i18n/catalog/mission';
import { useRealMission } from '../../src/features/mission/useRealMission';
import { useActivityBell } from '../../src/features/notifications/useActivityBell';
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
// `withStartActivity` vit dans `ui/activityLens` (pur, testé sous Deno) : c'est
// la MÊME dérivation que celle des états vides Bike du Classement, de
// l'Historique et des Statistiques. Une copie locale aurait fini par diverger de
// l'une d'elles, et un seul écran oublié suffit à enregistrer une course à pied
// depuis un monde vélo.
import { BikeGlyph } from '../../src/ui/ActivitySwitch';
import { withStartActivity } from '../../src/ui/activityLens';
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
 * ─── LA CLOCHE (27/07/2026) : ALLUMÉE PAR DES ÉVÉNEMENTS RÉELS ──────────────
 * Elle était VOLONTAIREMENT éteinte, et c'était juste : son badge aurait compté
 * des événements tactiques qui n'existaient pas, et elle aurait ouvert un écran
 * vide — un bouton mort (§A). Ce qui a changé : `territory_contests` (0078)
 * existe et `ingest_run` OUVRE des contestations. Une zone contestée est un
 * événement réel, daté, qui appelle une décision.
 * Elle n'est donc PAS revenue « par principe » : `useActivityBell` la rend
 * VISIBLE seulement quand au moins une zone est réellement à défendre, et
 * ABSENTE sinon (pas grisée, pas de badge « 0 »). Lecture non aboutie —
 * déconnecté, en vol, ÉCHOUÉE — ⇒ absente aussi : une cloche est une assertion,
 * et on n'assure pas ce qu'on n'a pas lu (la justification complète vit dans
 * `features/notifications/bell.ts`). Elle s'éteindra d'elle-même à l'échéance de
 * la dernière fenêtre de défense, sans qu'on ait à y revenir.
 *
 * DORMANT (planche, mais O1) : le sous-label secteur (« · Centre ») n'est
 * toujours PAS peint — il n'a pas de source réelle. « Carte nue » (HUD masqué)
 * → header retiré.
 */
function HomeHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { profile } = useMyProfile();
  const { state: onboarding } = useOnboardingState();
  const hudHidden = useMapHudHidden();
  // AVANT le `return null` : l'ordre des hooks doit rester inconditionnel.
  const bell = useActivityBell();
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
      {/* La cloche vit à l'OPPOSÉ de l'avatar : un poussoir vide s'intercale
          plutôt qu'une largeur codée en dur (le nom de ville varie). */}
      <View style={styles.headerSpacer} pointerEvents="none" />
      {bell.kind === 'visible' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(bell.count === 1 ? C.headerBellA11yOne : C.headerBellA11yMany, {
            // Le compte EXACT, jamais le texte plafonné de la pastille.
            n: bell.count,
          })}
          onPress={() => {
            haptics.light();
            router.push('/activite');
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.headerBell, pressed && styles.pressed]}
          testID="home-header-bell"
        >
          <Icon name="cloche" size={18} color={colors.blanc} />
          {/* Pastille ORANGE = rôle « rival / attaque subie » (§C : la couleur
              dit le RÔLE, jamais une identité). Texte NOIR dessus — jamais de
              chartreuse sur clair, et jamais de blanc sur orange. */}
          <View style={styles.headerBellBadge} pointerEvents="none">
            <Text style={styles.headerBellBadgeText} numberOfLines={1}>
              {bell.badgeLabel}
            </Text>
          </View>
        </Pressable>
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
  // La discipline est lue AVANT la dérivation : c'est elle qui décide des mots
  // de l'action (`deriveContextualAction`) autant que de la cible du push
  // (`withStartActivity`). Une seule et même valeur pour les deux — sinon le
  // bouton pourrait annoncer un monde et en lancer un autre.
  const { activity } = useMapActivity();
  const action = useMemo(
    () => deriveContextualAction({ screen: 'map' }, locale, activity),
    [locale, activity],
  );
  // E04 (planche + §A.4) : quand un sheet de DÉCISION de zone est ouvert, son CTA
  // (REPRENDRE) devient l'unique CTA primaire — GO se retire pour ne pas peindre
  // deux CTA à la fois. Il revient dès la fermeture du sheet.
  const zoneOpen = useZoneSheetOpen();
  const sheet = useMapSheetLayout();
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
   * ─── GO EST ROUVERT EN LENTILLE BIKE (fondateur, 26/07/2026) ───────────────
   * Il était MASQUÉ ici, et le motif était bon : « le départ écrit une course à
   * pied ; un GO en mode vélo enregistrerait une sortie vélo comme une course —
   * un mensonge — ou échouerait toujours — un bouton mort ». Les deux branches
   * de l'alternative ont disparu le même jour : `runs.activity` existe (0070,
   * appliquée), les bornes anti-triche sont par discipline, et le départ SAIT
   * recevoir une discipline.
   *
   * COMMENT LA DISCIPLINE VOYAGE, ET POURQUOI PAS AUTREMENT. Le départ ne LIT
   * PAS `gryd.mapactivity` — c'est l'interdit du 25/07, et il tient : une
   * préférence d'AFFICHAGE ne décide jamais en silence de la NATURE d'un effort.
   * Cet écran DÉCLARE donc explicitement, par le paramètre d'URL contractuel
   * `START_ACTIVITY_PARAM` (`features/run/gps/runActivity.ts`) :
   * `/course-live?mode=conquete&activity=bike`. La différence n'est pas
   * cosmétique — ici c'est l'écran qui écrit ce qu'il lance, et le préflight
   * AFFICHE cette déclaration avant le premier mètre, corrigeable d'un tap.
   *
   * `withStartActivity` est volontairement défensif sur le `?` / `&` : les
   * `targetHref` de `deriveContextualAction` portent déjà une query pour
   * certains verbes (intention, route) et pas pour d'autres.
   */
  if (zoneOpen) return null;

  const go = () => {
    haptics.medium();
    router.push(withStartActivity(action.targetHref, activity));
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
      <Pressable
        accessibilityRole="button"
        // Le lecteur d'écran entend CE QUI VA ÊTRE ENREGISTRÉ : « GO — course à
        // pied … » / « GO — sortie vélo … ». Un « GO » nu laisserait le seul
        // indice de discipline à un commutateur visuel, en haut de l'écran.
        // L'énoncé est COMPOSÉ AILLEURS (`nav/contextualAction.ts`, fonction
        // pure) : tant qu'il vivait dans ce JSX, aucun test Deno ne pouvait
        // constater qu'il se contredisait sous lentille vélo.
        accessibilityLabel={goButtonA11yLabel(action, activity, locale)}
        onPress={go}
        style={({ pressed }) => [pressed && styles.pressed]}
        testID="map-run-button"
      >
        <Animated.View style={[styles.runBtn, { width: btnWidth }]}>
          {/* Picto de la DISCIPLINE (planche : « toujours texte + icône ») — il
              s'efface quand la pill devient rond ; le mot « GO » reste dans les
              deux états (AMENDEMENT-38). Le picto change avec la lentille : le
              bouton dit ce qu'il lance, il ne se contente pas de le savoir. */}
          <Animated.View
            style={[styles.runGlyph, { opacity: glyphOpacity }]}
            pointerEvents="none"
          >
            {/* Pas de clé `velo` dans `@klaim/shared/icons` (packages/ est hors
                de ce chantier) : on réutilise LE dessin du commutateur plutôt
                que d'en recopier un second, qui finirait par en différer. */}
            {activity === 'bike' ? (
              <BikeGlyph size={iconSizes.md} color={colors.noir} />
            ) : (
              <Icon name="basket" size={iconSizes.md} color={colors.noir} />
            )}
          </Animated.View>
          <Text style={styles.runLabel}>GO</Text>
        </Animated.View>
      </Pressable>
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
  // La mission est dérivée de MES captures DE LA LENTILLE COURANTE : le hook
  // borne sa lecture de `hex_claims` à la discipline (`.eq('activity', …)`).
  // Avant le 26/07 la ligne était simplement RETIRÉE en Bike, faute de zones
  // vélo lisibles ; elle existe désormais dans les deux mondes, et une mission
  // vélo ne peut pas se retrouver dans la lentille course (ni l'inverse).
  const { mission: realMission } = useRealMission(activity);

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
  // Pousse la cloche à l'opposé de l'avatar sans largeur codée en dur.
  headerSpacer: { flex: 1 },
  // CLOCHE : un rond NEUTRE (pas de liseré chartreuse — le seul CTA de l'écran
  // reste GO, §A4). C'est la pastille, pas le rond, qui porte l'alerte.
  headerBell: {
    width: HEADER_HEIGHT,
    height: HEADER_HEIGHT,
    borderRadius: HEADER_HEIGHT / 2,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBellBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: gameColors.rival,
    // Liseré du fond : la pastille reste lisible par-dessus n'importe quelle
    // tuile de carte, claire comme sombre.
    borderWidth: 2,
    borderColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBellBadgeText: {
    color: colors.noir,
    fontFamily: fonts.textSemi,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
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
