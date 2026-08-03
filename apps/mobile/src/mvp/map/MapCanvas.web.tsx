/**
 * GRYD — LA MÊME CARTE, FORK WEB (lot M3).
 *
 * Le binding natif n'existe pas sous Expo Web : `maplibre-gl` s'y monte
 * directement. Ce fork n'est PAS une démo — depuis AMENDEMENT-47, le bundle
 * mobile-web est l'instrument de preview du fondateur sur localhost, et il doit
 * donc montrer le VRAI produit : mêmes états, mêmes couleurs, même fond de nuit.
 *
 * Il partage avec le fork natif tout ce qui décide (`homeState`, `territoryGeo`)
 * et ne duplique que le collage à la bibliothèque. La différence de rendu du
 * point de position est assumée et documentée plus bas.
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MapLibreMap, Marker, type StyleSpecification } from 'maplibre-gl';
import { colors, fonts, fontSizes, spacing, withAlpha } from '@klaim/shared';
import { grydNightStyle } from './nightStyle';
import { BASEMAP_ATTRIBUTION, type TerritoryFeatureCollection } from './territoryGeo';
import type { MapCanvasProps } from './MapCanvas';

const SOURCE_ID = 'gryd-mvp-territoires';

/** Cadrage d'ouverture quand la position est inconnue — voir le fork natif. */
const HOME_FALLBACK = { lng: 1.0993, lat: 49.4431, zoom: 12.5 } as const;

/** FeatureCollection vide : `setData` refuse `null`, et retirer la source à
 *  chaque cycle ferait clignoter la carte. Une collection vide ne peint rien. */
const RIEN: TerritoryFeatureCollection = { type: 'FeatureCollection', features: [] };

export function MapCanvas({ center, zoom, territories, showUser }: MapCanvasProps) {
  const hoteRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<MapLibreMap | null>(null);
  const pointRef = useRef<Marker | null>(null);

  // Montage UNIQUE. La caméra d'ouverture est lue ici et n'est jamais réimposée
  // ensuite : une caméra contrôlée se battrait contre les gestes du joueur.
  useEffect(() => {
    const hote = hoteRef.current;
    if (hote === null || carteRef.current !== null) return;

    const ouverture = center ?? HOME_FALLBACK;
    const carte = new MapLibreMap({
      container: hote,
      style: grydNightStyle() as unknown as StyleSpecification,
      center: [ouverture.lng, ouverture.lat],
      zoom: center ? zoom : HOME_FALLBACK.zoom,
      attributionControl: false,
    });
    carteRef.current = carte;

    carte.on('load', () => {
      carte.addSource(SOURCE_ID, { type: 'geojson', data: RIEN });
      carte.addLayer({
        id: `${SOURCE_ID}-fill`,
        type: 'fill',
        source: SOURCE_ID,
        paint: { 'fill-color': withAlpha(colors.chartreuse, 0.3) },
      });
      carte.addLayer({
        id: `${SOURCE_ID}-line`,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': withAlpha(colors.chartreuse, 0.8), 'line-width': 3 },
      });
    });

    return () => {
      pointRef.current?.remove();
      pointRef.current = null;
      carte.remove();
      carteRef.current = null;
    };
    // Volontairement sans dépendances : ce montage n'a lieu QU'UNE fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Les polygones, à chaque changement. `territories === null` ne veut pas dire
  // « vide » : il veut dire « rien à peindre » — vrai pendant un chargement
  // comme après un échec. Dans les deux cas la carte se tait, et c'est l'écran
  // qui dit lequel des deux c'est.
  useEffect(() => {
    const carte = carteRef.current;
    if (carte === null) return;
    const poser = () => {
      const src = carte.getSource(SOURCE_ID);
      if (src !== undefined && 'setData' in src) {
        (src as { setData: (d: unknown) => void }).setData(territories ?? RIEN);
      }
    };
    if (carte.isStyleLoaded()) poser();
    else carte.once('load', poser);
  }, [territories]);

  /**
   * Le point de position.
   *
   * ⚠️ ÉCART ASSUMÉ AVEC LE NATIF : là-bas, `UserLocation` suit le capteur en
   * continu. Ici, on peint un point à la position que l'ÉCRAN a fournie — jamais
   * une position devinée. Sans autorisation (`showUser` faux) ou sans position
   * connue, il n'y a PAS de point : un marqueur au centre par défaut serait une
   * position inventée, exactement ce que `canCenterOnPlayer` interdit.
   */
  useEffect(() => {
    const carte = carteRef.current;
    if (carte === null) return;
    pointRef.current?.remove();
    pointRef.current = null;
    if (!showUser || center === null) return;
    const puce = document.createElement('div');
    puce.style.cssText = `width:14px;height:14px;border-radius:7px;background:${colors.chartreuse};border:2px solid ${colors.noir}`;
    pointRef.current = new Marker({ element: puce }).setLngLat([center.lng, center.lat]).addTo(carte);
  }, [showUser, center]);

  return (
    <View style={styles.root}>
      {/* `any` : l'hôte DOM n'a pas d'équivalent RN, et c'est la seule ligne du
          MVP où le web s'échappe du modèle de vue partagé. */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div ref={hoteRef} style={{ position: 'absolute', inset: 0 } as any} />
      <Text style={styles.attribution}>{BASEMAP_ATTRIBUTION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.xs,
    color: colors.grisFaible,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
  },
});
