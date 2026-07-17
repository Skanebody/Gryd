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
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
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

/** « 4,4 km » — décimale française, pas d'Intl (parité Hermes). */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** « 3 zones » — accord singulier/pluriel (jamais tronqué). */
const ZONES_LABEL = `${MAP_MISSION.zones} zone${MAP_MISSION.zones > 1 ? 's' : ''}`;

/**
 * SOURCE UNIQUE d'horloge de l'écran : le temps restant de la mission
 * (MAP_MISSION_SUMMARY.timeLeftLabel — « 8 h restantes »). La ligne mission et
 * son détail lisent CETTE valeur ; aucun autre compteur n'est affiché ici.
 */
const TIME_LEFT_LABEL = MAP_MISSION_SUMMARY.timeLeftLabel;

/** « République attaquée · 3 zones · 8 h restantes » — la mission en 1 ligne. */
const MISSION_LINE_TEXT = `${MAP_MISSION.headerTitle} · ${ZONES_LABEL} · ${TIME_LEFT_LABEL}`;

/** Détail au tap : distance + gain — unité unique « pts » (jamais XP ici). */
const MISSION_DETAIL_META = `${formatKm(MAP_MISSION.distanceKm)} · +${MAP_MISSION.bonusPoints} pts crew`;

/**
 * TÊTE DE CARTE (AMENDEMENT-37 §4 + §26.2) : le secteur (« PARIS EST »), la
 * FRAÎCHEUR fusionnée sur la même ligne (« ● À jour », jamais un 2ᵉ bloc), et le
 * RIVAL principal agrégé sous elle (« Canal Crew · 38 % », teinte orange). Compris
 * sans tap, en < 3 s ; textes courts jamais tronqués. Réutilise le nom de secteur
 * existant (MAP_HUD.zoneName) et les parts démo (MAP_RIVAL_HEAD).
 */
const SECTOR_NAME = MAP_HUD.zoneName.toUpperCase(); // « PARIS EST »
const RIVAL_HEAD_TEXT = `${MAP_RIVAL_HEAD.name} · ${MAP_RIVAL_HEAD.pct} %`;

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
  const action = useMemo(() => deriveContextualAction({ screen: 'map' }), []);
  return (
    <View
      style={[styles.startWrap, { bottom: insets.bottom + NAV_BAR_HEIGHT + SLIDE_START_GAP }]}
      pointerEvents="box-none"
    >
      <SlideToStart
        label="GO"
        accessibilityLabel={`GO — ${action.a11yLabel}`}
        onComplete={() => router.push(action.targetHref)}
      />
    </View>
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
  const [detailOpen, setDetailOpen] = useState(false);

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

  // O1 (états vides) : mission/secteur/rival ci-dessous sont de la DÉMO (MAP_MISSION,
  // MAP_HUD, MAP_RIVAL_HEAD) — aucune source serveur de mission n'est encore câblée.
  // Un vrai user (session) ne doit donc PAS voir « République attaquée · Canal Crew
  // 38 % » : ce serait fabriquer une mission et un rival. La carte reste honnête via
  // son bandeau `dataNote` (« cours pour prendre ta première zone »). L'accès Route
  // Planner vit ailleurs (bouton GO, Aujourd'hui, War Room). Showcase : démo intacte.
  if (configured && session) return null;

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
        accessibilityLabel={`Secteur ${SECTOR_NAME}, données ${MAP_FRESHNESS.label}. Rival principal ${MAP_RIVAL_HEAD.name}, ${MAP_RIVAL_HEAD.pct} pour cent.`}
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
          {RIVAL_HEAD_TEXT}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: detailOpen }}
        accessibilityLabel={`${MISSION_LINE_TEXT} — ${
          detailOpen ? 'fermer le détail de la mission' : 'voir le détail de la mission'
        }`}
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
          {MISSION_LINE_TEXT}
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
            {MISSION_DETAIL_META}
          </Text>
          <View style={styles.detailDivider} />
          {/* Entrée VISIBLE vers le Route Planner — action inline légère
              (texte + chevron), jamais un 2ᵉ CTA chartreuse. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Planifier un parcours — ouvrir le planificateur d'itinéraire"
            onPress={openPlanner}
            style={({ pressed }) => [styles.detailAction, pressed && styles.pressed]}
            testID="battle-map-plan-route"
          >
            <Text style={styles.detailActionLabel} numberOfLines={1}>
              Planifier un parcours
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
  startWrap: { position: 'absolute', left: 16, right: 16 },

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
