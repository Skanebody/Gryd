/**
 * GRYD — PROJECTION DE LA CARTE SIGNATURE (planche E15, bloc 4), fonction PURE.
 *
 * La « carte signature » est la PREUVE territoriale personnelle du Profil : le
 * contour RÉEL de ce que le joueur tient. Cette projection est le seul endroit où
 * cette preuve peut MENTIR — un mauvais cadrage flatterait (« j'occupe tout »),
 * une échelle non uniforme déformerait la ville, une latitude non inversée
 * retournerait le nord. On l'isole donc de `SignatureMapCard.tsx` (qui importe
 * react-native + react-native-svg, donc intestable sous Deno) pour la VERROUILLER
 * par des tests, exactement comme `profileTerritory.ts` l'a été pour le bloc de
 * métriques. Le composant se contente de dessiner les chemins qu'elle rend.
 *
 * PUR — zéro React, zéro réseau, zéro horloge, aucune dépendance de rendu.
 */
import type { RealTerritory } from '../map/territoryBuild';

/** Marge intérieure de la silhouette — le contour ne touche jamais le bord. */
export const FIT_PADDING_PX = 22;

/**
 * Étendue minimale cadrée, en degrés (~900 m nord-sud). Sans plancher, un joueur
 * qui ne tient qu'UN hexagone verrait sa zone dilatée à toute la card : la
 * vignette dirait « j'occupe tout », ce qui est faux. Avec, une petite
 * possession reste petite — la silhouette ne flatte personne.
 */
export const MIN_SPAN_DEG = 0.008;

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
