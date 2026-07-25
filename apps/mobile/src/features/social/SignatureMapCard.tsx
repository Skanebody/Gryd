/**
 * GRYD — CARTE SIGNATURE (planche E15, bloc 4) : la PREUVE territoriale
 * personnelle, en 164 pt. Le contour RÉEL de ce que le joueur tient, en
 * chartreuse (couleur du RÔLE « moi »), + un lien vers la vraie carte.
 *
 * ─── POURQUOI UNE SILHOUETTE SVG ET PAS `TerritoryFranceMap preview` ────────
 * `TerritoryFranceMap` a bien une prop `preview` documentée « aperçu statique du
 * Profil », et elle serait plus proche du rendu de la planche (tuiles + rues).
 * Deux raisons de ne pas la monter ici :
 *
 *  1. ELLE RELIT `hex_claims`. Le composant appelle `useRealTerritories()` en
 *     interne, et l'écran Profil l'appelle DÉJÀ pour ses métriques. Le hook n'a
 *     aucun cache partagé (c'est écrit dans hexClaims.ts) : le monter ici
 *     rétablirait la lecture en double que la passe du 21/07 avait justement
 *     supprimée — deux `select` complets de la table pour une seule card, sur un
 *     écran consulté en déplacement. On lui passe donc les territoires DÉJÀ LUS.
 *  2. ELLE OUVRE UN 2ᵉ CONTEXTE MapLibre GL. L'onglet Carte reste monté à côté :
 *     deux contextes WebGL simultanés pour un aperçu de 164 pt, c'est de la
 *     batterie dépensée pour une vignette.
 *
 * Écart assumé, à trancher par le fondateur : la vignette montre la FORME de tes
 * zones, pas les rues autour. Le détail carto vit à un tap, dans /territoire, où
 * la vraie carte est déjà rendue en plein écran.
 *
 * ─── AUCUN NOM DE ZONE ──────────────────────────────────────────────────────
 * La planche pose un « label de zone » (« Saint-Rémy »). `TerritoryProperties.
 * displayName` est documenté « NULL tant qu'aucun secteur n'est câblé » et l'est
 * sur 100 % des captures réelles. On OMET le label plutôt que d'inventer un nom
 * de quartier — un toponyme faux est le pire des mensonges sur une carte.
 */
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, elevation, fonts, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import type { RealTerritory } from '../map/territoryBuild';

/** Hauteur de la card (planche E15). Mesure de composition, pas une règle de jeu. */
export const SIGNATURE_CARD_H = 164;
/** Marge intérieure de la silhouette — le contour ne touche jamais le bord. */
const FIT_PADDING_PX = 22;
/**
 * Étendue minimale cadrée, en degrés (~900 m nord-sud). Sans plancher, un joueur
 * qui ne tient qu'UN hexagone verrait sa zone dilatée à toute la card : la
 * vignette dirait « j'occupe tout », ce qui est faux. Avec, une petite
 * possession reste petite — la silhouette ne flatte personne.
 */
const MIN_SPAN_DEG = 0.008;

export interface SignatureMapCardProps {
  /** MES territoires DÉJÀ LUS par l'écran (status 'crew'). Jamais vide ici. */
  mine: readonly RealTerritory[];
  linkLabel: string;
  a11yLabel: string;
  onPress: () => void;
}

/**
 * Projette les anneaux en chemins SVG. Équirectangulaire corrigée en longitude
 * (× cos φ) puis échelle UNIFORME : une zone ne doit jamais paraître étirée.
 * PURE — aucune dépendance au rendu.
 */
export function signaturePaths(
  mine: readonly RealTerritory[],
  width: number,
  height: number,
): string[] {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const t of mine) {
    for (const polygon of t.polygons) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return [];

  const midLat = (minLat + maxLat) / 2;
  // `|| 1` : dégénérescence polaire — cos(90°) vaut 0 et ferait exploser l'échelle.
  const kx = Math.cos((midLat * Math.PI) / 180) || 1;
  const spanLng = Math.max(maxLng - minLng, MIN_SPAN_DEG / kx);
  const spanLat = Math.max(maxLat - minLat, MIN_SPAN_DEG);
  // Recentre la boîte quand le plancher l'a élargie (sinon la forme colle au bord).
  const cLng = (minLng + maxLng) / 2;
  const cLat = (minLat + maxLat) / 2;
  const x0 = cLng - spanLng / 2;
  const y1 = cLat + spanLat / 2;

  const innerW = Math.max(width - FIT_PADDING_PX * 2, 1);
  const innerH = Math.max(height - FIT_PADDING_PX * 2, 1);
  const scale = Math.min(innerW / (spanLng * kx), innerH / spanLat);
  const offX = FIT_PADDING_PX + (innerW - spanLng * kx * scale) / 2;
  const offY = FIT_PADDING_PX + (innerH - spanLat * scale) / 2;
  const px = (lng: number) => offX + (lng - x0) * kx * scale;
  /** y inversé : la latitude croît vers le haut, l'écran vers le bas. */
  const py = (lat: number) => offY + (y1 - lat) * scale;

  const paths: string[] = [];
  for (const t of mine) {
    for (const polygon of t.polygons) {
      let d = '';
      for (const ring of polygon) {
        if (ring.length < 3) continue;
        d += `${ring
          .map(([lng, lat], i) => `${i === 0 ? 'M' : 'L'}${px(lng).toFixed(1)} ${py(lat).toFixed(1)}`)
          .join(' ')} Z `;
      }
      if (d.length > 0) paths.push(d.trim());
    }
  }
  return paths;
}

export function SignatureMapCard({ mine, linkLabel, a11yLabel, onPress }: SignatureMapCardProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const paths = width > 0 ? signaturePaths(mine, width, SIGNATURE_CARD_H) : [];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      onLayout={onLayout}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {paths.length > 0 ? (
        <Svg width={width} height={SIGNATURE_CARD_H} style={StyleSheet.absoluteFill}>
          {paths.map((d) => (
            <Path
              key={d}
              d={d}
              // Fill de possession Night Print (16 %) + contour net : la forme se
              // lit, sans l'aplat lourd que la charte interdit.
              fill={colors.chartreuse14}
              stroke={colors.chartreuse}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      ) : null}

      {/* Lien « Voir ma carte › » — pilule N2 opaque posée sur la vignette : le
          texte ne dépend jamais de ce qu'il y a dessous. Pas un CTA chartreuse. */}
      <View style={styles.link}>
        <Text style={styles.linkLabel} numberOfLines={1}>
          {linkLabel}
        </Text>
        <Icon name="chevron" size={iconSizes.xs} color={colors.blanc} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  card: {
    height: SIGNATURE_CARD_H,
    borderRadius: radii.card,
    backgroundColor: elevation.surface,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
  },
  linkLabel: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
