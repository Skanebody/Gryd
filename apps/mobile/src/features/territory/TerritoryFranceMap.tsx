/**
 * GRYD — « Mon territoire » sur VRAIE carte (AMENDEMENT-13 §3/§4bis/§4ter).
 * RealMap (vraies tuiles sombres, MONDE librement navigable — aucun verrou) +
 * les possessions en TRACÉS DE COURSE nets (§4ter : la frontière EST le tracé
 * — boucles République/Lille, rubans quai de Valmy/Faubourg-du-Temple/berges
 * du Rhône), servies par la MÊME source et le MÊME builder que la Battle Map
 * (allTerritories + territoryStateLayers — §4bis : une seule source pour les
 * deux cartes). L'écran s'OUVRE en fitBounds de l'ENSEMBLE des possessions
 * (possessionsBounds — pas un cadrage France codé en dur). Sous
 * TERRITORY_DOT_MAX_ZOOM chaque territoire est un MARQUEUR-POINT + label
 * ville, rendu en LAYERS MapLibre bornés par zoom (territoryDotLayers — le
 * seuil suit le zoom RÉEL : dézoom manuel → les points réapparaissent).
 * Navigation : tap sur un point (vue dézoomée) → flyTo la ville (Paris à
 * l'échelle coureur — on retrouve la Battle Map démo) ; chips « Mes
 * territoires » (Paris · Lille · Rival Lyon) → flyTo ; bouton retour →
 * fitBounds des possessions. `preview` = aperçu statique du Profil (aucune
 * interaction, pas d'overlays — carte NON-interactive, §7). Offline/WebGL
 * perdu : gérés par RealMap (fond noir + message — jamais d'écran blanc).
 * Couleurs : tokens uniquement. Reduce motion : géré par RealMap (flyTo →
 * saut sec, pulse coupé).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { Map3DToggle, RealMap, type RealMapPressEvent, type RealMapRef } from '../../ui/game';
import { useMap3d } from '../map/mapPref';
import {
  TERRITORY_DOT_MAX_ZOOM,
  possessionsBounds,
  territoryDotLayers,
} from '../map/allTerritories';
import { FULL_EMPHASIS, sectorStatusLayersAll, territoryStateLayers } from '../map/mapStyle';
import { FRANCE_CITIES_DEMO, type FranceCity, type FranceCityId } from './franceTerritories';

// ─── Constantes de rendu (UI uniquement) ────────────────────────────────────
/** Marge intérieure du fitBounds plein écran (l'ensemble des possessions). */
const OVERVIEW_FIT_PADDING_PX = 56;
/** Marge du fitBounds de l'APERÇU Profil (cadre mini ~190 px de haut). */
const PREVIEW_FIT_PADDING_PX = 28;
/** Rayon (en degrés ~ lat/lng) du hit-test « tap sur un territoire » dézoomé. */
const CITY_TAP_RADIUS_DEG = 1.1;

/** Vue courante (chips/bouton retour) : l'ensemble des possessions ou une ville. */
type FranceView = 'france' | FranceCityId;

export interface TerritoryFranceMapProps {
  /** Aperçu statique (bloc Profil) : aucune interaction, pas d'overlays. */
  preview?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function TerritoryFranceMap({ preview = false, style, testID }: TerritoryFranceMapProps) {
  const mapRef = useRef<RealMapRef>(null);
  const [view, setView] = useState<FranceView>('france');
  /**
   * AMENDEMENT-26 — vue 3D (pref `gryd.map3d`, défaut 2D) partagée entre toutes
   * les cartes. En 3D : carte pitchée + mes possessions en volume extrudé
   * chartreuse (RealMap `mode3d`). CONFORT visuel pur — zéro impact gameplay.
   */
  const { map3d, setMap3d } = useMap3d();
  /**
   * Le tap-vers-ville n'est actif que sous le zoom seuil (là où les points
   * villes sont visibles) — piloté par le zoom RÉEL de la caméra (§4bis),
   * pas par l'état de vue : après un flyTo puis un dézoom manuel, ça remarche.
   */
  const [dotsVisible, setDotsVisible] = useState(true);
  const onZoomChange = useCallback((zoom: number) => {
    setDotsVisible(zoom < TERRITORY_DOT_MAX_ZOOM);
  }, []);

  /**
   * Couches TRACÉ-BASED partagées avec la Battle Map (§4bis/§4ter) + les
   * SECTEURS agrégés par statut (§C) au-dessus : au zoom quartier/rue « Mon
   * territoire » lit les mêmes zones contestées / attaques / urgences que la
   * Battle Map (double contour + violet + pulse), avec leurs badges (portés par
   * territoryDotLayers, bornés en minZoom). Au dézoom, disques sub-pixel +
   * badges masqués → seuls les marqueurs-points villes/fronts restent (LOD §C).
   */
  const layers = useMemo(
    () => [...territoryStateLayers(FULL_EMPHASIS), ...sectorStatusLayersAll(FULL_EMPHASIS.contested)],
    [],
  );
  /** Cadrage d'ouverture : fitBounds de TOUTES les possessions (§4bis). */
  const bounds = useMemo(
    () => possessionsBounds(preview ? PREVIEW_FIT_PADDING_PX : OVERVIEW_FIT_PADDING_PX),
    [preview],
  );

  const goCity = useCallback((city: FranceCity) => {
    setView(city.id);
    mapRef.current?.flyTo({ lng: city.center.lng, lat: city.center.lat, zoom: city.zoom });
  }, []);

  const backToOverview = useCallback(() => {
    setView('france');
    mapRef.current?.fitBounds(possessionsBounds(OVERVIEW_FIT_PADDING_PX));
  }, []);

  /** Tap sur un point ville (vue dézoomée) : flyTo la ville la plus proche. */
  const onMapPress = useCallback(
    (e: RealMapPressEvent) => {
      if (!dotsVisible) return;
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
    [dotsVisible, goCity],
  );

  return (
    <View style={[styles.root, style]} pointerEvents={preview ? 'none' : 'auto'} testID={testID}>
      <RealMap
        ref={mapRef}
        bounds={bounds}
        geojsonLayers={layers}
        pointLayers={territoryDotLayers()}
        mode3d={map3d}
        onPress={preview ? undefined : onMapPress}
        onZoomChange={preview ? undefined : onZoomChange}
        style={styles.map}
      />

      {/* ── Contrôle d'apparence 2D/3D (AMENDEMENT-26/22) — discret, jamais en aperçu ── */}
      {!preview ? (
        <Map3DToggle
          value={map3d}
          onChange={setMap3d}
          style={styles.map3dToggle}
          testID="territoire-map3d-toggle"
        />
      ) : null}

      {/* ── Retour à l'ensemble des possessions (vue ville) — jamais en aperçu ── */}
      {!preview && view !== 'france' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir à la vue de toutes mes possessions"
          onPress={backToOverview}
          hitSlop={8}
          style={({ pressed }) => [styles.backFrance, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={13} color={colors.blanc} />
          </View>
          <Text style={styles.backFranceText}>Mes territoires</Text>
        </Pressable>
      ) : null}

      {/* ── Chips « Mes territoires » (§4bis — navigation rapide, flyTo) ── */}
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
                  style={[styles.chipDot, city.rival ? styles.chipDotRival : styles.chipDotCrew]}
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

  // ── Bouton retour (vue ville → fitBounds des possessions) ──
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

  // ── Contrôle d'apparence 2D/3D (haut droite, ne heurte pas le retour à gauche) ──
  map3dToggle: { position: 'absolute', top: 12, right: 12 },

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
  chipDotCrew: { backgroundColor: colors.chartreuse },
  chipDotRival: { backgroundColor: gameColors.rival },
  chipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  chipTextActive: { color: colors.blanc },
});
