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
// La projection est PURE et vit dans son propre module (testable sous Deno,
// contrairement à ce fichier qui importe react-native / react-native-svg).
import { signaturePaths } from './signaturePaths';

/** Hauteur de la card (planche E15). Mesure de composition, pas une règle de jeu. */
export const SIGNATURE_CARD_H = 164;

export interface SignatureMapCardProps {
  /** MES territoires DÉJÀ LUS par l'écran (status 'crew'). Jamais vide ici. */
  mine: readonly RealTerritory[];
  linkLabel: string;
  a11yLabel: string;
  onPress: () => void;
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
