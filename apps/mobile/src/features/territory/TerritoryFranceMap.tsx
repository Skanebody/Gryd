/**
 * GRYD — « Mon territoire » sur VRAIE carte de France (AMENDEMENT-13 §3).
 * RealMap (vraies tuiles sombres, monde librement navigable §4bis) + les
 * territoires RÉELS en blobs ORGANIQUES (AMENDEMENT-11 — zéro hexagone) :
 * Paris = la scène démo République (tous les états : contesté double contour
 * pulse, decay pointillé, protégé halo, objectif, avant-poste), Lille = 2e
 * cluster chartreuse, Lyon = crew adverse (orange). Au niveau France les blobs
 * sont sub-pixel → chaque territoire est représenté par un MARQUEUR-POINT
 * coloré + label ville (§4bis), tappable : flyTo animé vers la ville (Paris à
 * l'échelle coureur — on retrouve la Battle Map démo ; Lille/Lyon vue blob) ;
 * bouton retour France + chips « Mes territoires » pour la navigation rapide.
 * `preview` = apercu statique du Profil (aucune interaction, pas d'overlays).
 * Offline géré par RealMap (fond noir + message — jamais d'écran blanc).
 * Couleurs : tokens uniquement (territoryStyle). Reduce motion : géré par
 * RealMap (flyTo → saut sec, pulse coupé).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import {
  RealMap,
  type RealMapGeoJSONLayer,
  type RealMapMarker,
  type RealMapPressEvent,
  type RealMapRef,
} from '../../ui/game';
import { territoryStyle as terr } from '../map/mapStyle';
import {
  battleTerritories,
  territoriesToGeoJSON,
  type Territory,
  type TerritoryState,
} from '../map/territory';
import {
  FRANCE_CITIES_DEMO,
  FRANCE_VIEW_CAMERA,
  franceClusters,
  type FranceCity,
  type FranceCityId,
} from './franceTerritories';

// ─── Constantes de rendu (UI uniquement — mêmes traitements que la Battle Map) ─
/** Frontière normale : contour fin semi-lumineux. */
const BORDER_WIDTH = 1.8;
/** Frontière rivale : contour orange MARQUÉ. */
const RIVAL_BORDER_WIDTH = 2.6;
/** Double contour contesté : chartreuse dedans, orange pulsé dehors. */
const CONTESTED_INNER_WIDTH = 1.8;
const CONTESTED_OUTER_WIDTH = 3;
/** Glow crew + halo protégé + lueur objectif (mêmes valeurs que MapScreen). */
const CREW_GLOW_WIDTH = 7;
const PROTECTED_HALO_WIDTH = 5;
const OBJECTIVE_SOFT_WIDTH = 12;
/** Frontière decay : pointillé organique. */
const DECAY_DASH = [6, 5] as const;
const DECAY_WIDTH = 1.8;
/** Marqueur-point ville (§4bis) : taille minimale lisible au niveau France. */
const CITY_DOT_SIZE = 12;
/** Largeur fixe du marker ville (label centré sur le point, jamais replié). */
const CITY_MARKER_WIDTH = 120;
/**
 * Caméra de l'APERÇU Profil (hauteur ~190 px) : légèrement dézoomée et
 * recentrée entre Lille et Lyon pour que les 3 marqueurs-points tiennent dans
 * le cadre mini (la vue plein écran garde FRANCE_VIEW_CAMERA).
 */
const PREVIEW_CAMERA = { lng: 3.2, lat: 47.85, zoom: 3.8 } as const;
/** Rayon (en degrés ~ lat/lng) du hit-test « tap sur un territoire » France. */
const CITY_TAP_RADIUS_DEG = 1.1;

/** Vue courante : la France entière, ou une ville zoomée. */
type FranceView = 'france' | FranceCityId;

/**
 * Marqueur-point ville (§4bis) : point coloré à taille minimale (chartreuse
 * possession / orange rival) + label ville. PARTAGÉ avec la Battle Map (même
 * représentation des possessions sous le zoom seuil, CITY_MARKERS_MAX_ZOOM).
 */
export function CityMarkerBadge({ city }: { city: FranceCity }) {
  return (
    <View style={styles.cityMarker}>
      <View style={[styles.cityDot, city.rival ? styles.cityDotRival : styles.cityDotCrew]} />
      <Text style={[styles.cityLabel, city.rival && styles.cityLabelRival]} numberOfLines={1}>
        {city.rival ? `${city.label.toUpperCase()} · RIVAL` : city.label.toUpperCase()}
      </Text>
    </View>
  );
}

/** Une couche RealMap par territoire+traitement (frontière AMENDEMENT-11). */
function layersOfTerritory(idPrefix: string, t: Territory): RealMapGeoJSONLayer[] {
  const data = territoriesToGeoJSON([t]) as unknown as GeoJSON.FeatureCollection;
  const byState: Record<TerritoryState, RealMapGeoJSONLayer[]> = {
    crew: [
      { id: `${idPrefix}-glow`, data, lineColor: terr.crewGlow, lineWidth: CREW_GLOW_WIDTH },
      {
        id: idPrefix,
        data,
        fillColor: terr.crewFill,
        lineColor: terr.crewStroke,
        lineWidth: BORDER_WIDTH,
      },
    ],
    rival: [
      {
        id: idPrefix,
        data,
        fillColor: terr.rivalFill,
        lineColor: terr.rivalStroke,
        lineWidth: RIVAL_BORDER_WIDTH,
      },
    ],
    contested: [
      {
        id: idPrefix,
        data,
        fillColor: terr.contestedFill,
        lineColor: terr.contestedInnerStroke,
        lineWidth: CONTESTED_INNER_WIDTH,
      },
      {
        id: `${idPrefix}-out`,
        data,
        lineColor: terr.contestedOuterStroke,
        lineWidth: CONTESTED_OUTER_WIDTH,
        pulse: true,
      },
    ],
    protected: [
      { id: idPrefix, data, lineColor: terr.protectedHalo, lineWidth: PROTECTED_HALO_WIDTH },
    ],
    decay: [
      {
        id: idPrefix,
        data,
        lineColor: terr.decayStroke,
        lineWidth: DECAY_WIDTH,
        lineDash: DECAY_DASH,
      },
    ],
    decayUrgent: [
      {
        id: idPrefix,
        data,
        fillColor: terr.decayUrgentFill,
        lineColor: terr.decayUrgentStroke,
        lineWidth: DECAY_WIDTH,
        lineDash: DECAY_DASH,
      },
    ],
    objective: [
      { id: `${idPrefix}-soft`, data, lineColor: terr.objectiveSoft, lineWidth: OBJECTIVE_SOFT_WIDTH },
      { id: idPrefix, data, fillColor: terr.objectiveFill },
    ],
    outpost: [
      {
        id: idPrefix,
        data,
        fillColor: terr.outpostFill,
        lineColor: terr.outpostStroke,
        lineWidth: BORDER_WIDTH,
      },
    ],
  };
  return byState[t.state];
}

/**
 * TOUTES les couches de la vue France (une seule source pour les deux cartes,
 * §4bis — pas de filtrage par viewport, volumes MVP négligeables) : Lyon rival
 * + Lille crew + la scène Paris complète, dans l'ordre de peinture Battle Map
 * (rival → objectif → crew → avant-poste → decay → protégé → contesté).
 */
function buildFranceLayers(): RealMapGeoJSONLayer[] {
  const clusters = franceClusters();
  const paris = new Map<TerritoryState, Territory>();
  for (const t of battleTerritories()) paris.set(t.state, t);
  const order: readonly TerritoryState[] = [
    'rival',
    'objective',
    'crew',
    'outpost',
    'decay',
    'decayUrgent',
    'protected',
    'contested',
  ];
  const layers: RealMapGeoJSONLayer[] = [
    ...layersOfTerritory('fr-lyon', clusters.lyonRival),
    ...layersOfTerritory('fr-lille', clusters.lille),
  ];
  for (const state of order) {
    const t = paris.get(state);
    if (t) layers.push(...layersOfTerritory(`fr-paris-${state}`, t));
  }
  return layers;
}

export interface TerritoryFranceMapProps {
  /** Aperçu statique (bloc Profil) : aucune interaction, pas d'overlays. */
  preview?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function TerritoryFranceMap({ preview = false, style, testID }: TerritoryFranceMapProps) {
  const mapRef = useRef<RealMapRef>(null);
  const [view, setView] = useState<FranceView>('france');

  /** Couches mémoïsées (perf AMENDEMENT-13 §5 — jamais de re-render par frame). */
  const layers = useMemo(buildFranceLayers, []);

  const goCity = useCallback((city: FranceCity) => {
    setView(city.id);
    mapRef.current?.flyTo({ lng: city.center.lng, lat: city.center.lat, zoom: city.zoom });
  }, []);

  const backToFrance = useCallback(() => {
    setView('france');
    mapRef.current?.flyTo({ ...FRANCE_VIEW_CAMERA });
  }, []);

  /** Tap sur un territoire (vue France) : flyTo la ville la plus proche. */
  const onMapPress = useCallback(
    (e: RealMapPressEvent) => {
      if (view !== 'france') return;
      let best: FranceCity | null = null;
      let bestDist = CITY_TAP_RADIUS_DEG;
      for (const city of FRANCE_CITIES_DEMO) {
        const d = Math.hypot(city.center.lng - e.lng, city.center.lat - e.lat);
        if (d < bestDist) {
          best = city;
          bestDist = d;
        }
      }
      if (best) goCity(best);
    },
    [view, goCity],
  );

  /** Marqueurs-points ville (§4bis) — visibles seulement au niveau France. */
  const markers = useMemo((): readonly RealMapMarker[] => {
    if (view !== 'france') return [];
    return FRANCE_CITIES_DEMO.map((city) => {
      return {
        id: `city-${city.id}`,
        lng: city.center.lng,
        lat: city.center.lat,
        children: preview ? (
          // Aperçu Profil : jamais de bouton dans le bouton (le card est Pressable).
          <CityMarkerBadge city={city} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Voir ${city.label}`}
            onPress={() => goCity(city)}
            hitSlop={10}
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            <CityMarkerBadge city={city} />
          </Pressable>
        ),
      };
    });
  }, [view, preview, goCity]);

  return (
    <View style={[styles.root, style]} pointerEvents={preview ? 'none' : 'auto'} testID={testID}>
      <RealMap
        ref={mapRef}
        camera={preview ? PREVIEW_CAMERA : FRANCE_VIEW_CAMERA}
        geojsonLayers={layers}
        markers={markers}
        onPress={preview ? undefined : onMapPress}
        style={styles.map}
      />

      {/* ── Retour France (vue ville) — jamais en aperçu ── */}
      {!preview && view !== 'france' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir à la vue France"
          onPress={backToFrance}
          hitSlop={8}
          style={({ pressed }) => [styles.backFrance, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={13} color={colors.blanc} />
          </View>
          <Text style={styles.backFranceText}>France</Text>
        </Pressable>
      ) : null}

      {/* ── Chips « Mes territoires » (§4bis — navigation rapide) ── */}
      {!preview ? (
        <View style={styles.chipsRow} pointerEvents="box-none">
          {FRANCE_CITIES_DEMO.map((city) => {
            const active = view === city.id;
            return (
              <Pressable
                key={city.id}
                accessibilityRole="button"
                accessibilityLabel={`Aller à ${city.label}`}
                onPress={() => goCity(city)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[styles.chipDot, city.rival ? styles.cityDotRival : styles.cityDotCrew]}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {city.rival ? `Rival ${city.label}` : city.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, overflow: 'hidden' },
  map: { flex: 1 },
  pressed: { opacity: 0.7 },

  // ── Marqueur-point ville (niveau France) ──
  cityMarker: { width: CITY_MARKER_WIDTH, alignItems: 'center', gap: 4 },
  cityDot: {
    width: CITY_DOT_SIZE,
    height: CITY_DOT_SIZE,
    borderRadius: CITY_DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.noir,
  },
  cityDotCrew: { backgroundColor: colors.chartreuse },
  cityDotRival: { backgroundColor: gameColors.rival },
  cityLabel: {
    color: colors.chartreuse,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cityLabelRival: { color: gameColors.rival },

  // ── Bouton retour France (vue ville) ──
  backFrance: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backChevron: { transform: [{ scaleX: -1 }] },
  backFranceText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },

  // ── Chips navigation rapide ──
  chipsRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipActive: { borderColor: colors.chartreuse40 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  chipTextActive: { color: colors.blanc },
});
