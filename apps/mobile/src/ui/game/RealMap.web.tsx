/**
 * GRYD — RealMap, variante WEB (AMENDEMENT-13 §1) : VRAIES tuiles vectorielles
 * de Paris/France sous les couches de jeu. `maplibre-gl` (la seule nouvelle
 * dépendance autorisée) est monté dans un conteneur react-native-web ; le CSS
 * MapLibre est importé globalement (Metro web, SDK 52). Style de dev sans clé
 * (dark-matter CARTO) surchargé aux tokens GRYD après chargement (eau plus
 * sombre, parcs discrets, labels gris atténués) — la prod passera à Protomaps
 * (point ouvert O6) en ne changeant QUE le styleURL.
 *
 * API COMMUNE avec ./RealMap.tsx (natif — fork de plateforme, interfaces
 * dupliquées à l'identique) :
 *   props  { camera, geojsonLayers, markers?, onPress?, attributionCompact }
 *   ref    { flyTo(camera) } — recentrage fluide (coupé si reduce motion)
 * Les couches de jeu restent les polygones ORGANIQUES de territory.ts
 * (AMENDEMENT-11 : zéro hexagone visible) : chaque entrée `geojsonLayers`
 * devient une source GeoJSON + fill/line layers ; `pulse` anime l'opacité du
 * contour (contesté) via requestAnimationFrame, coupé si
 * prefers-reduced-motion. Attribution © OpenStreetMap © CARTO discrète
 * (obligation légale). Tuiles indisponibles / offline → fond noir + message
 * « Carte indisponible — tes zones restent à toi », jamais d'écran blanc —
 * et l'état SE RELÈVE toujours (AMENDEMENT-13 §5) : seules les erreurs
 * réseau/tuiles le déclenchent, le pulse est suspendu tant qu'il est affiché
 * (sinon `idle` ne retombe jamais), la relève écoute `idle` + succès tuile
 * (`sourcedata`) et un re-test périodique force un rendu tant que ça dure.
 */
// CSS global MapLibre — import Metro web (supporté SDK 52).
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map as MapLibreMap,
  type GeoJSONSource,
  type MapMouseEvent,
  type MapSourceDataEvent,
} from 'maplibre-gl';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, fontSizes, mapTokens, motion } from '@klaim/shared';

// ─── API commune (dupliquée à l'identique dans RealMap.tsx — fork RN) ───────

/** Style vectoriel sombre de dev SANS CLÉ (AMENDEMENT-13 §1 — O6 pour la prod). */
export const DARK_MAP_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export interface RealMapCamera {
  lng: number;
  lat: number;
  zoom: number;
}

/** Une couche de jeu : source GeoJSON + aplat (fill*) et/ou frontière (line*). */
export interface RealMapGeoJSONLayer {
  /** Identifiant stable de la source (les layers dérivés sont `${id}-fill/-line`). */
  id: string;
  data: GeoJSON.FeatureCollection;
  fillColor?: string;
  fillOpacity?: number;
  lineColor?: string;
  lineWidth?: number;
  /** Pointillé (traitement decay AMENDEMENT-11). */
  lineDash?: readonly number[];
  /** Pulse lent du contour (contesté) — coupé si reduce motion. */
  pulse?: boolean;
}

/** Marker RN positionné au point géo (shield, sablier, pin, mates, POI…). */
export interface RealMapMarker {
  id: string;
  lng: number;
  lat: number;
  children: ReactNode;
}

export interface RealMapPressEvent {
  lng: number;
  lat: number;
}

export interface RealMapRef {
  /** Recentrage fluide (flyTo) — saut direct si reduce motion. */
  flyTo(camera: Partial<RealMapCamera> & { lng: number; lat: number }): void;
}

export interface RealMapProps {
  /** Caméra contrôlée : appliquée au montage puis à chaque changement (easeTo). */
  camera: RealMapCamera;
  /** Couches de jeu, peintes dans l'ordre du tableau (la dernière au-dessus). */
  geojsonLayers: readonly RealMapGeoJSONLayer[];
  markers?: readonly RealMapMarker[];
  onPress?: (event: RealMapPressEvent) => void;
  /** Zoom courant, notifié à chaque mouvement de caméra (seuil marqueurs §4bis). */
  onZoomChange?: (zoom: number) => void;
  /** Attribution compacte © OpenStreetMap © CARTO (défaut true — obligatoire). */
  attributionCompact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────

/** Message offline imposé (AMENDEMENT-13 §5). */
const OFFLINE_MESSAGE = 'Carte indisponible — tes zones restent à toi';
/** Période du pulse contesté (lent, doc §8). */
const PULSE_PERIOD_MS = 2_400;
/** Amplitude du pulse : l'opacité du contour oscille entre min et 1. */
const PULSE_MIN_OPACITY_RATIO = 0.35;
/** Labels des tuiles atténués (sobriété AMENDEMENT-13 §5). */
const TILE_LABEL_OPACITY = 0.55;
const TILE_ICON_OPACITY = 0.35;
/**
 * L'état offline ne se relève (`idle`/succès tuile) que si aucune erreur
 * tuile n'est survenue récemment (les tuiles en échec produisent aussi un
 * `idle`).
 */
const OFFLINE_CLEAR_QUIET_MS = 1_500;
/**
 * Tant que l'état offline est affiché, on force un rendu à cette période
 * (> OFFLINE_CLEAR_QUIET_MS) pour que `idle` retombe et relève l'état après
 * une erreur TRANSITOIRE (blip réseau, une tuile isolée) même sans
 * interaction — l'overlay ne doit JAMAIS rester bloqué (AMENDEMENT-13 §5).
 */
const OFFLINE_RECHECK_MS = 2_000;

/**
 * `map.on('error')` capte N'IMPORTE quelle erreur MapLibre — on ne passe
 * offline que pour une vraie indisponibilité tuiles/style : jamais pour une
 * source de JEU locale (GeoJSON — toujours disponible), et seulement pour
 * les échecs réseau (AJAXError = HTTP tuiles/style/glyphes, fetch coupé…).
 * Événement sans cause identifiable → prudence : offline (l'état se relève
 * tout seul désormais).
 */
function isTilesAvailabilityError(event: unknown, gameSourceIds: readonly string[]): boolean {
  const e = event as { error?: unknown; sourceId?: string };
  if (typeof e.sourceId === 'string' && gameSourceIds.includes(e.sourceId)) return false;
  if (e.error instanceof Error) {
    if (e.error.name === 'AJAXError') return true;
    return /fetch|network|tile|glyph|sprite/i.test(e.error.message);
  }
  return true;
}

/** prefers-reduced-motion (web) — jamais d'animation si actif. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Surcharge du style dark-matter aux tokens GRYD (AMENDEMENT-13 §1) : eau plus
 * sombre, parcs quasi éteints, labels gris discrets. Défensif : les ids de
 * calques varient selon le style hébergé → filtres par sous-chaîne + try/catch
 * (un style différent ne doit JAMAIS faire tomber la carte).
 */
function applyGrydStyleOverrides(map: MapLibreMap): void {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    try {
      const id = layer.id.toLowerCase();
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', colors.noir);
      } else if (layer.type === 'fill' && id.includes('water')) {
        map.setPaintProperty(layer.id, 'fill-color', mapTokens.water);
      } else if (
        layer.type === 'fill' &&
        (id.includes('park') || id.includes('green') || id.includes('wood'))
      ) {
        map.setPaintProperty(layer.id, 'fill-color', mapTokens.parks);
      } else if (layer.type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-color', colors.gris);
        map.setPaintProperty(layer.id, 'text-opacity', TILE_LABEL_OPACITY);
        map.setPaintProperty(layer.id, 'icon-opacity', TILE_ICON_OPACITY);
      }
    } catch {
      // Calque sans cette propriété — on n'interrompt jamais le rendu.
    }
  }
}

/** Ajoute (ou remplace) la source + les layers d'une couche de jeu. */
function upsertLayer(map: MapLibreMap, spec: RealMapGeoJSONLayer): void {
  const existing = map.getSource(spec.id) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(spec.data);
  } else {
    map.addSource(spec.id, { type: 'geojson', data: spec.data });
  }
  const fillId = `${spec.id}-fill`;
  if (spec.fillColor !== undefined && !map.getLayer(fillId)) {
    map.addLayer({
      id: fillId,
      type: 'fill',
      source: spec.id,
      paint: { 'fill-color': spec.fillColor, 'fill-opacity': spec.fillOpacity ?? 1 },
    });
  } else if (spec.fillColor !== undefined) {
    map.setPaintProperty(fillId, 'fill-color', spec.fillColor);
    map.setPaintProperty(fillId, 'fill-opacity', spec.fillOpacity ?? 1);
  }
  const lineId = `${spec.id}-line`;
  if (spec.lineColor !== undefined && !map.getLayer(lineId)) {
    map.addLayer({
      id: lineId,
      type: 'line',
      source: spec.id,
      paint: {
        'line-color': spec.lineColor,
        'line-width': spec.lineWidth ?? 1,
        ...(spec.lineDash ? { 'line-dasharray': [...spec.lineDash] } : {}),
      },
    });
  } else if (spec.lineColor !== undefined) {
    map.setPaintProperty(lineId, 'line-color', spec.lineColor);
    map.setPaintProperty(lineId, 'line-width', spec.lineWidth ?? 1);
    if (spec.lineDash) map.setPaintProperty(lineId, 'line-dasharray', [...spec.lineDash]);
  }
}

// ─── Composant ──────────────────────────────────────────────────────────────

export const RealMap = forwardRef<RealMapRef, RealMapProps>(function RealMap(
  {
    camera,
    geojsonLayers,
    markers,
    onPress,
    onZoomChange,
    attributionCompact = true,
    style,
    testID,
  }: RealMapProps,
  ref,
) {
  const containerRef = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const layersRef = useRef<readonly RealMapGeoJSONLayer[]>(geojsonLayers);
  layersRef.current = geojsonLayers;
  const onPressRef = useRef<RealMapProps['onPress']>(onPress);
  onPressRef.current = onPress;
  const onZoomChangeRef = useRef<RealMapProps['onZoomChange']>(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const [styleReady, setStyleReady] = useState(false);
  const [offline, setOffline] = useState(false);
  /** Miroir de `offline` lisible par les handlers MapLibre (posés une fois). */
  const offlineRef = useRef(false);
  /** Horodatage de la dernière erreur tuiles/style (voir OFFLINE_CLEAR_QUIET_MS). */
  const lastErrorAtRef = useRef(0);
  /** Timer du re-test périodique tant que l'état offline est affiché. */
  const offlineRecheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Compteur bumpé à chaque mouvement de caméra → reprojection des markers. */
  const [, setMoveTick] = useState(0);

  // Création de la carte (une seule fois — le conteneur RNW est un div).
  useEffect(() => {
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return undefined;
    const map = new MapLibreMap({
      container: node,
      style: DARK_MAP_STYLE_URL,
      center: [camera.lng, camera.lat],
      zoom: camera.zoom,
      attributionControl: false, // remplacée par la mention compacte GRYD
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    // Poignée de debug non énumérée par React (vérifs preview/dev uniquement).
    (node as unknown as { __grydMap?: MapLibreMap }).__grydMap = map;

    const setOfflineState = (value: boolean) => {
      offlineRef.current = value;
      setOffline(value);
    };
    const clearOfflineIfQuiet = () => {
      if (!offlineRef.current) return;
      if (Date.now() - lastErrorAtRef.current > OFFLINE_CLEAR_QUIET_MS) setOfflineState(false);
    };
    // Tant que l'état offline persiste : force un rendu (→ `idle` retombe →
    // relève si la période calme est passée). Appareil hors ligne avéré
    // (navigator.onLine === false) : inutile de re-tester, on attend.
    const scheduleOfflineRecheck = () => {
      if (offlineRecheckRef.current !== null) return;
      offlineRecheckRef.current = setTimeout(() => {
        offlineRecheckRef.current = null;
        if (!offlineRef.current || mapRef.current !== map) return;
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          map.triggerRepaint();
        }
        scheduleOfflineRecheck();
      }, OFFLINE_RECHECK_MS);
    };

    map.on('load', () => {
      applyGrydStyleOverrides(map);
      for (const spec of layersRef.current) upsertLayer(map, spec);
      setStyleReady(true);
      onZoomChangeRef.current?.(map.getZoom());
    });
    // Tuiles/style indisponibles → état offline (fond noir + message).
    // Erreurs de sources de jeu locales / non-réseau : jamais offline.
    map.on('error', (event) => {
      if (!isTilesAvailabilityError(event, layersRef.current.map((l) => l.id))) return;
      lastErrorAtRef.current = Date.now();
      setOfflineState(true);
      scheduleOfflineRecheck();
    });
    // Relève : `idle` (le pulse est suspendu tant qu'offline — il retombe
    // donc toujours) + succès tuile réel (`sourcedata` avec tile, hors
    // sources de jeu locales) — signal qui survit à toute animation.
    map.on('idle', clearOfflineIfQuiet);
    map.on('sourcedata', (event: MapSourceDataEvent) => {
      if (!event.tile) return;
      if (layersRef.current.some((l) => l.id === event.sourceId)) return;
      clearOfflineIfQuiet();
    });
    map.on('move', () => {
      setMoveTick((t) => t + 1);
      onZoomChangeRef.current?.(map.getZoom());
    });
    map.on('click', (e: MapMouseEvent) => {
      onPressRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    return () => {
      if (offlineRecheckRef.current !== null) {
        clearTimeout(offlineRecheckRef.current);
        offlineRecheckRef.current = null;
      }
      mapRef.current = null;
      map.remove();
    };
    // Caméra initiale seulement — les changements suivants passent par easeTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Caméra contrôlée : ease fluide (saut direct si reduce motion).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = { center: [camera.lng, camera.lat] as [number, number], zoom: camera.zoom };
    if (prefersReducedMotion()) map.jumpTo(target);
    else map.easeTo({ ...target, duration: motion.transitionMs });
  }, [camera.lng, camera.lat, camera.zoom]);

  // Couches de jeu : upsert mémoïsé par identité du tableau. Si le style
  // n'est pas (encore/plus) chargé — remontage, fast refresh — on laisse le
  // handler `load` poser `layersRef.current` : jamais de throw en rendu.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded()) return;
    try {
      for (const spec of geojsonLayers) upsertLayer(map, spec);
    } catch {
      // Style en cours de rechargement — le prochain `load` réappliquera tout.
    }
  }, [geojsonLayers, styleReady]);

  // Pulse du/des calques contestés : line-opacity animée en rAF, coupée si
  // reduce motion (le contour reste alors plein — jamais invisible) et
  // SUSPENDUE tant que l'état offline est affiché (l'overlay cache le contour
  // et la carte doit pouvoir retomber `idle` pour relever l'état).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || offline) return undefined;
    const pulseIds = geojsonLayers
      .filter((l) => l.pulse && l.lineColor !== undefined)
      .map((l) => `${l.id}-line`);
    if (pulseIds.length === 0 || prefersReducedMotion()) return undefined;
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const phase = ((Date.now() - start) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      const opacity =
        PULSE_MIN_OPACITY_RATIO +
        (1 - PULSE_MIN_OPACITY_RATIO) * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
      for (const id of pulseIds) {
        try {
          if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', opacity);
        } catch {
          // Style rechargé entre deux frames — frame suivante.
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geojsonLayers, styleReady, offline]);

  useImperativeHandle(
    ref,
    (): RealMapRef => ({
      flyTo(target) {
        const map = mapRef.current;
        if (!map) return;
        const stop = {
          center: [target.lng, target.lat] as [number, number],
          ...(target.zoom !== undefined ? { zoom: target.zoom } : {}),
        };
        if (prefersReducedMotion()) map.jumpTo(stop);
        else map.flyTo(stop);
      },
    }),
    [],
  );

  /** Projette un marker en px conteneur (null tant que la carte n'existe pas). */
  const projectMarker = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return null;
    const p = map.project([lng, lat]);
    return { x: p.x, y: p.y };
  }, []);

  return (
    <View style={[styles.root, style]} testID={testID}>
      {/* Conteneur DOM de maplibre-gl (div via RNW). */}
      <View ref={containerRef} style={styles.mapHost} />

      {/* Markers RN projetés (ancre = le point ; enfant centré dessus). */}
      {markers?.map((marker) => {
        const xy = projectMarker(marker.lng, marker.lat);
        if (!xy) return null;
        return (
          <View
            key={marker.id}
            pointerEvents="box-none"
            style={[styles.markerAnchor, { left: xy.x, top: xy.y }]}
          >
            {marker.children}
          </View>
        );
      })}

      {/* Attribution compacte OBLIGATOIRE (données © OpenStreetMap, tuiles CARTO). */}
      {attributionCompact ? (
        <Text style={styles.attribution} accessibilityRole="text">
          © OpenStreetMap © CARTO
        </Text>
      ) : null}

      {/* Tuiles indisponibles : fond noir + message — jamais d'écran blanc. */}
      {offline ? (
        <View style={styles.offline} pointerEvents="none">
          <Text style={styles.offlineText}>{OFFLINE_MESSAGE}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir, // le fond derrière les tuiles reste noir
    overflow: 'hidden',
  },
  // PAS d'absoluteFill : la classe .maplibregl-map (CSS global) impose
  // position:relative et écraserait les classes atomiques RNW → flex:1.
  mapHost: {
    flex: 1,
    backgroundColor: colors.noir,
  },
  markerAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    color: colors.gris,
    opacity: 0.7,
    fontFamily: fonts.mono,
    fontSize: 9,
  },
  offline: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  offlineText: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
});
