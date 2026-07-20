/**
 * GRYD — onglet Carte (home) : la carte EST le produit (SPEC §4.2.1).
 * Le bouton d'action (DÉFENDRE) et la nav vivent dans le layout (tabs).
 *
 * Zéro-friction (audit P1) : la MISSION est lisible SANS AUCUN TAP — une
 * LIGNE MISSION fixe en haut de la carte (« République attaquée · 3 zones ·
 * 8 h restantes »), dérivée des MÊMES sources démo que le panneau Info
 * (MAP_MISSION / MAP_MISSION_SUMMARY). UNE SEULE horloge à l'écran par défaut :
 * le temps restant de la mission (MAP_MISSION_SUMMARY.timeLeftLabel). L'état
 * « attaquée » est porté par le TEXTE (l'accent orange rival ne fait que le
 * renforcer — jamais la couleur seule), et le FAB « i » ne porte plus la
 * mission à lui seul. Tap sur la ligne = détail compact (« Défendre
 * République » + distance + gain en pts crew) + entrée VISIBLE vers le Route
 * Planner (« Planifier un parcours » — l'appui long caché du bouton RUN n'est
 * plus le seul accès). Aucun CTA chartreuse plein ici : le SEUL CTA de
 * l'écran reste le bouton flottant DÉFENDRE de la nav (anti double-CTA §A.4).
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, iconSizes, radii } from '@klaim/shared';
import { MapScreen } from '../../src/features/map/MapScreen';
import { SlideToStart } from '../../src/features/nav/SlideToStart';
import { deriveContextualAction } from '../../src/features/nav/contextualAction';
import { NAV_BAR_HEIGHT, SLIDE_START_GAP } from '../../src/features/nav/metrics';
import {
  MAP_FRESHNESS,
  MAP_HUD,
  MAP_MISSION,
  MAP_MISSION_SUMMARY,
  MAP_RIVAL_HEAD,
} from '../../src/features/map/demo';
import { C } from '../../src/i18n/catalog/nav';
import { C as M } from '../../src/i18n/catalog/mission';
import { useRealMission } from '../../src/features/mission/useRealMission';
import { useLocale, useT } from '../../src/i18n/store';
import type { Locale } from '../../src/i18n/types';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { hasPendingUpload, retryPendingUpload } from '../../src/lib/pendingUpload';
import { isShowcasePlatform } from '../../src/lib/flags';
import { useSession } from '../../src/lib/session';
import { useMapHudHidden } from '../../src/features/map/mapUiStore';
import { Icon } from '../../src/ui/Icon';

// ─── Métriques locales (layout uniquement — aucune constante de jeu) ────────
/** Marges latérales de la ligne mission (alignées sur les flottants : 14 px). */
const MISSION_LINE_SIDE = 14;
/** Dégagement sous le safe-area haut. */
const MISSION_LINE_TOP_GAP = 8;
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

/**
 * SOURCE UNIQUE d'horloge de l'écran : le temps restant de la mission
 * (MAP_MISSION_SUMMARY.timeLeftLabel — « 8 h restantes »). La ligne mission et
 * son détail lisent CETTE valeur ; aucun autre compteur n'est affiché ici.
 */
const TIME_LEFT_LABEL = MAP_MISSION_SUMMARY.timeLeftLabel;
/** Temps COMPACT pour la ligne (« 8 h ») : la ligne tient sur 375 px au plancher
 *  a11y 12 px sans être coupée (§A « textes jamais tronqués »). Le détail au tap
 *  et le lecteur d'écran gardent la forme longue. */
const TIME_COMPACT = TIME_LEFT_LABEL.replace(/\s*restantes?\.?$/i, '').trim();

/**
 * TÊTE DE CARTE (AMENDEMENT-37 §4 + §26.2) : le secteur (« PARIS EST »), la
 * FRAÎCHEUR fusionnée sur la même ligne (« ● À jour », jamais un 2ᵉ bloc), et le
 * RIVAL principal agrégé sous elle (« Canal Crew · 38 % », teinte orange). Compris
 * sans tap, en < 3 s ; textes courts jamais tronqués. Réutilise le nom de secteur
 * existant (MAP_HUD.zoneName) et les parts démo (MAP_RIVAL_HEAD).
 */
const SECTOR_NAME = MAP_HUD.zoneName.toUpperCase(); // « PARIS EST » — nom propre, invariant.

export default function CarteTab() {
  return (
    <View style={styles.root}>
      <MapScreen />
      <MissionLine />
      <MapStartSlider />
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
  const { session, configured } = useSession();
  const hudHidden = useMapHudHidden();
  const t = useT();
  const locale = useLocale();
  const [detailOpen, setDetailOpen] = useState(false);
  // NATIF : la mission RÉELLE dérivée de MES vraies captures + ma position.
  // null en showcase / sans session / échec (voir hook) — appelé inconditionnellement.
  const { mission: realMission } = useRealMission();

  // Retour sur la Carte = détail refermé (même règle « carte nue » que le HUD).
  // TOUS les hooks AVANT les retours conditionnels ci-dessous (Rules of Hooks) :
  // le HUD masqué / un vrai user sortent tôt, mais jamais en sautant un hook.
  useFocusEffect(
    useCallback(() => {
      setDetailOpen(false);
    }, []),
  );

  // « Carte nue » : l'utilisateur a masqué tout le HUD → plus de ligne mission.
  if (hudHidden) return null;

  // ── NATIF (device installé) : mission RÉELLE ou RIEN — jamais la démo. ──
  // CLAUDE.md / retour terrain 20/07 : sur l'app native, « République attaquée ·
  // Canal Crew 38 % » n'a pas le droit d'exister (fabriquer une mission ET un
  // rival). isShowcasePlatform est toujours false ici → on prend cette branche,
  // qui ne lit QUE la mission dérivée de MES vraies captures (useRealMission),
  // sans tête de secteur ni rival (aucune donnée fabriquée). Deux cas :
  //  • null / loading / first_capture → RIEN : le widget « Prends ta première
  //    zone » (BattleMapOverlays) porte déjà ce cas — pas de doublon §A ;
  //  • defend_expiring / expand → LA ligne mission réelle (gabarit démo §A).
  if (!isShowcasePlatform) {
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
        style={[styles.missionWrap, { top: insets.top + MISSION_LINE_TOP_GAP }]}
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

  // ── SHOWCASE (vitrine web) : mission DÉMO ci-dessous, INCHANGÉE. ──
  // La démo (MAP_MISSION, MAP_HUD, MAP_RIVAL_HEAD) est réservée à la vitrine, où
  // aucune géoloc réelle n'existe. Un vrai user connecté sur la vitrine (session)
  // ne voit pas la démo non plus : la carte reste honnête via son `dataNote`.
  if (configured && session) return null;

  // ── Textes de la ligne mission — résolus à l'affichage (catalogue nav) ──
  // Les libellés DÉMO (headerTitle, cardTitle, freshness…) viennent de map/demo
  // et restent tels quels ; seuls les gabarits appartiennent au catalogue.
  const zonesCount: number = MAP_MISSION.zones; // élargit le littéral démo (3) pour l'accord.
  const zonesLabel = t(zonesCount === 1 ? C.zonesOne : C.zonesMany, { n: zonesCount });
  /** « République attaquée · 3 zones · 8 h » — la mission en 1 ligne (compacte). */
  const missionLineText = `${MAP_MISSION.headerTitle} · ${zonesLabel} · ${TIME_COMPACT}`;
  /** Détail au tap : distance + gain — unité unique « pts » (jamais XP ici). */
  const missionDetailMeta = t(C.missionDetailMeta, {
    km: formatKm(MAP_MISSION.distanceKm, locale),
    pts: MAP_MISSION.bonusPoints,
  });
  const rivalHeadText = t(C.rivalShare, {
    name: MAP_RIVAL_HEAD.name,
    pct: MAP_RIVAL_HEAD.pct,
  });

  const toggleDetail = () => {
    haptics.light();
    setDetailOpen((open) => {
      const next = !open;
      if (next) screen('map_mission_line_open');
      return next;
    });
  };

  const openPlanner = () => {
    haptics.light();
    router.push('/route-planner');
  };

  return (
    <View
      style={[styles.missionWrap, { top: insets.top + MISSION_LINE_TOP_GAP }]}
      pointerEvents="box-none"
    >
      {/* Tête de carte : secteur · fraîcheur (fusionnée) + rival agrégé — lu sans
          tap, compact, jamais un pavé. La fraîcheur ne fait JAMAIS un 2ᵉ bloc. */}
      <View
        style={styles.sectorHead}
        pointerEvents="none"
        accessibilityRole="text"
        accessibilityLabel={t(C.sectorHeadA11y, {
          sector: SECTOR_NAME,
          freshness: MAP_FRESHNESS.label,
          rival: MAP_RIVAL_HEAD.name,
          pct: MAP_RIVAL_HEAD.pct,
        })}
      >
        <Text style={styles.sectorLine} numberOfLines={1}>
          <Text style={styles.sectorName}>{SECTOR_NAME}</Text>
          <Text style={styles.sectorSep}>{'   ·   '}</Text>
          {/* Point de fraîcheur : teinte de RÔLE par état (jamais couleur seule —
              le libellé porte le sens ; le ● ne fait que le renforcer). */}
          <Text style={{ color: MAP_FRESHNESS.dotTint }}>{'●'}</Text>
          <Text style={styles.sectorFresh}>{` ${MAP_FRESHNESS.label}`}</Text>
        </Text>
        <Text style={styles.rivalLine} numberOfLines={1}>
          {rivalHeadText}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: detailOpen }}
        accessibilityLabel={`${missionLineText} — ${t(
          detailOpen ? C.missionDetailCloseA11y : C.missionDetailOpenA11y,
        )}`}
        onPress={toggleDetail}
        style={({ pressed }) => [styles.missionLine, pressed && styles.pressed]}
        testID="battle-map-mission-line"
      >
        {/* Accent rival (urgence) — RENFORCE le texte, ne le remplace jamais. */}
        <View style={styles.missionBar} />
        <Text
          style={styles.missionText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={MISSION_TEXT_MIN_SCALE}
        >
          {missionLineText}
        </Text>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>

      {detailOpen ? (
        <View style={styles.missionDetail}>
          {/* L'ACTION avec son OBJET (le verbe nu est interdit) + le gain. */}
          <Text style={styles.detailTitle} numberOfLines={1}>
            {MAP_MISSION.cardTitle}
          </Text>
          <Text style={styles.detailMeta} numberOfLines={1}>
            {missionDetailMeta}
          </Text>
          <View style={styles.detailDivider} />
          {/* Entrée VISIBLE vers le Route Planner — action inline légère
              (texte + chevron), jamais un 2ᵉ CTA chartreuse. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.planRouteA11y)}
            onPress={openPlanner}
            style={({ pressed }) => [styles.detailAction, pressed && styles.pressed]}
            testID="battle-map-plan-route"
          >
            <Text style={styles.detailActionLabel} numberOfLines={1}>
              {t(C.planRoute)}
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
  // ── Tête de carte : secteur · fraîcheur + rival (compacte, non intrusive) ──
  sectorHead: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
  },
  sectorLine: { fontSize: fontSizes.xs, fontWeight: '700' },
  sectorName: { color: colors.blanc, letterSpacing: 0.4 },
  sectorSep: { color: colors.gris },
  sectorFresh: { color: colors.gris, fontWeight: '600' },
  rivalLine: { fontSize: fontSizes.xs, fontWeight: '700', color: gameColors.rival },

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
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  detailMeta: {
    color: colors.gris,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  detailDivider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 10 },
  detailAction: {
    minHeight: MIN_TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailActionLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
});
