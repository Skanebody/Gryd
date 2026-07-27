/**
 * GRYD — MASQUAGE PRIVACY DES TRACES PARTAGÉES (spec produit §12.1, §1.5).
 *
 * ═══ CE QUE FAIT CE MODULE ══════════════════════════════════════════════════
 * AVANT tout rendu de partage, la trace du coureur passe ici. On RETIRE :
 *   1. les `trimM` premiers et derniers mètres — départ/arrivée = domicile
 *      potentiel (§12.1 « couper au moins 250 m autour du départ et de
 *      l'arrivée publics ») ;
 *   2. tout point tombant dans une ZONE FLOUTÉE déclarée (§12.1 « appliquer les
 *      zones floutées »).
 * PUR : aucun effet de bord, aucune horloge, aucune I/O. La géométrie de la
 * ZONE conquise n'est JAMAIS touchée — c'est un territoire public ; seule la
 * position du coureur est protégée.
 *
 * ═══ « AUTOUR », PAS SEULEMENT « LE LONG DE » ═══════════════════════════════
 * La spec dit « autour du départ ». Couper 250 m LE LONG de la polyligne ne
 * suffit pas : un aller-retour qui repasse devant chez soi laisserait le point
 * de coupe à 40 m de la porte tout en ayant parcouru 250 m. On coupe donc selon
 * DEUX critères cumulés — distance cumulée ≥ trimM ET distance à vol d'oiseau
 * ≥ trimM du vrai départ / de la vraie arrivée.
 * LIMITE CONNUE, non maquillée : un point INTÉRIEUR qui frôle le domicile en
 * milieu de course n'est pas retiré par ce mécanisme (le retirer couperait la
 * trace en deux). C'est exactement le rôle des zones floutées du §2 ci-dessous
 * — et voir « ce qui n'est pas branché » plus bas.
 *
 * ═══ POURQUOI ON PRÉFÈRE RIEN À UN MASQUAGE INSUFFISANT ═════════════════════
 * Une version antérieure retombait, pour les traces trop courtes, sur « le
 * tiers médian » ou « les 3 points du milieu ». Sur une trace de 400 m, le
 * tiers médian masque ~130 m à chaque bout — pendant que l'écran affichait
 * « départ/arrivée masqués ». C'était un mensonge de l'app : le badge promettait
 * 250 m et le pipeline en rendait 130. On rend maintenant une trace VIDE, et
 * l'appelant (`app/partage.tsx`) bascule alors sur son état « tracé inconnu »,
 * qui est un état honnête et déjà construit (`hasKnownRoute = trace.length >= 3`
 * → pas de badge privacy, pas de format « Carte seule », pas de style 3D).
 *
 * ═══ CE QUI N'EST PAS BRANCHÉ (à dire, pas à laisser croire) ════════════════
 * `applyPrivacyZones` existe, est pure et testée, mais AUCUN appelant ne lui
 * passe encore de zone : la table `privacy_zones` (0002/0003) n'a aujourd'hui
 * aucun lecteur client, et aucun écran ne permet de déclarer une adresse. Tant
 * que ce n'est pas câblé, la protection RÉELLEMENT active est la coupe des
 * extrémités — c'est d'ailleurs tout ce que le badge de `app/partage.tsx`
 * revendique. Ne pas élargir ce badge avant d'avoir câblé la source des zones.
 */
import { SHARE_TRIM_M } from '@klaim/shared';
import type { LatLngPoint } from '../map/realAnchors';

/**
 * Mètres masqués à CHAQUE extrémité de la trace partagée. Ré-exporté ici parce
 * que c'est le point d'entrée du masquage (l'écran Confidentialité l'importe
 * pour ANNONCER la distance réellement appliquée) — la valeur, elle, vient de
 * `packages/shared/src/game-rules.ts` (§12.1), source unique.
 */
export { SHARE_TRIM_M };

/**
 * Zone floutée déclarée par l'utilisateur (§12.1). Forme alignée sur la table
 * `privacy_zones` : un centre et un rayon en mètres. Le centre est ici en
 * lat/lng car le masquage est géométrique ; la PERSISTANCE, elle, stocke un
 * centre H3 res 8 volontairement grossier (`PRIVACY_ZONE_H3_RESOLUTION`).
 */
export interface PrivacyZone {
  readonly center: LatLngPoint;
  readonly radiusM: number;
}

/** Nombre minimal de points pour qu'une trace soit RENDABLE (cf. `partage.tsx`). */
const MIN_RENDERABLE_POINTS = 3;

const EARTH_R_M = 6371000;

/** Distance haversine en mètres entre deux points. */
export function haversineM(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Retire `trimM` mètres au début ET à la fin de la trace — distance cumulée le
 * long de la polyligne ET distance à vol d'oiseau au vrai départ / à la vraie
 * arrivée (voir l'en-tête : « autour », pas seulement « le long de »).
 *
 * Résultat OUVERT : le trou EST le masquage, on ne le referme jamais.
 * Si moins de 3 points survivent, on rend `[]` — jamais un segment moins masqué
 * que ce que le badge de l'écran promet.
 */
export function trimTraceEnds(
  trace: readonly LatLngPoint[],
  trimM: number,
): readonly LatLngPoint[] {
  if (trace.length < MIN_RENDERABLE_POINTS) return [];

  const start = trace[0];
  const end = trace[trace.length - 1];
  if (!start || !end) return [];

  // Distances cumulées depuis le départ.
  const cum: number[] = [0];
  for (let i = 1; i < trace.length; i++) {
    const prev = trace[i - 1];
    const here = trace[i];
    cum.push((cum[i - 1] ?? 0) + (prev && here ? haversineM(prev, here) : 0));
  }
  const total = cum[cum.length - 1] ?? 0;

  // Le premier point qui satisfait LES DEUX critères en partant du début.
  let startIdx = 0;
  while (startIdx < trace.length) {
    const p = trace[startIdx];
    if (!p) break;
    const alongOk = (cum[startIdx] ?? 0) >= trimM;
    const crowOk = haversineM(start, p) >= trimM;
    if (alongOk && crowOk) break;
    startIdx++;
  }

  // Le dernier point qui satisfait LES DEUX critères en partant de la fin.
  let endIdx = trace.length - 1;
  while (endIdx >= 0) {
    const p = trace[endIdx];
    if (!p) break;
    const alongOk = total - (cum[endIdx] ?? 0) >= trimM;
    const crowOk = haversineM(end, p) >= trimM;
    if (alongOk && crowOk) break;
    endIdx--;
  }

  if (endIdx - startIdx + 1 < MIN_RENDERABLE_POINTS) return [];
  return trace.slice(startIdx, endIdx + 1);
}

/**
 * Découpe la trace en SEGMENTS publiables en retirant tout point situé dans une
 * zone floutée (§12.1). On ne recolle JAMAIS les morceaux : joindre les deux
 * bords d'un trou dessinerait une ligne droite que le coureur n'a pas parcourue
 * — l'app inventerait un trajet. Les segments de moins de 3 points sont écartés
 * (ils ne sont pas rendables).
 *
 * PURE. `zones` vide → un seul segment, la trace inchangée.
 */
export function applyPrivacyZones(
  trace: readonly LatLngPoint[],
  zones: readonly PrivacyZone[],
): readonly (readonly LatLngPoint[])[] {
  if (trace.length === 0) return [];
  if (zones.length === 0) {
    return trace.length >= MIN_RENDERABLE_POINTS ? [trace] : [];
  }

  const hidden = (p: LatLngPoint): boolean =>
    zones.some((z) => z.radiusM > 0 && haversineM(z.center, p) <= z.radiusM);

  const segments: LatLngPoint[][] = [];
  let current: LatLngPoint[] = [];
  for (const p of trace) {
    if (hidden(p)) {
      if (current.length >= MIN_RENDERABLE_POINTS) segments.push(current);
      current = [];
    } else {
      current.push(p);
    }
  }
  if (current.length >= MIN_RENDERABLE_POINTS) segments.push(current);
  return segments;
}

/**
 * LE POINT D'ENTRÉE du partage : coupe les extrémités PUIS applique les zones
 * floutées, et rend le plus long segment survivant — l'appelant actuel
 * (`app/partage.tsx`) dessine une seule polyligne. Un tableau vide signifie
 * « rien de publiable », pas « course vide » : l'appelant a un état dédié.
 *
 * `trimM <= 0` = coupe des extrémités explicitement désactivée (l'appelant ne
 * montre alors pas le badge « masqués »). Les ZONES FLOUTÉES, elles, restent
 * appliquées : §1.5 dit qu'elles « prévalent sur tout rendu social » — elles ne
 * dépendent donc d'aucun autre réglage.
 */
export function applySharePrivacy(
  trace: readonly LatLngPoint[],
  trimM: number = SHARE_TRIM_M,
  zones: readonly PrivacyZone[] = [],
): readonly LatLngPoint[] {
  const trimmed = trimM <= 0 ? trace : trimTraceEnds(trace, trimM);
  const segments = applyPrivacyZones(trimmed, zones);
  if (segments.length === 0) return [];
  let longest: readonly LatLngPoint[] = segments[0] ?? [];
  for (const seg of segments) if (seg.length > longest.length) longest = seg;
  return longest;
}
