/**
 * GRYD — MASQUAGE PRIVACY DES TRACES PARTAGÉES (spec produit §12.1, §1.5).
 *
 * ═══ CE QUE FAIT CE MODULE ══════════════════════════════════════════════════
 * AVANT tout rendu de partage, la trace du coureur passe ici. TROIS étapes, dans
 * CET ordre (voir « pourquoi cet ordre » plus bas) :
 *   1. on RETIRE les `trimM` premiers et derniers mètres — départ/arrivée =
 *      domicile potentiel (§12.1 « couper au moins 250 m autour du départ et de
 *      l'arrivée publics ») ;
 *   2. on RETIRE tout point tombant dans une ZONE FLOUTÉE déclarée (§12.1
 *      « appliquer les zones floutées ») ;
 *   3. on DÉGRADE la résolution de ce qui reste — Douglas-Peucker à
 *      `SHARE_SIMPLIFY_EPSILON_M` (§12.1 « simplifier les contours »). Couper
 *      les bouts ne suffit pas : entre les deux, une trace au mètre près dit
 *      quel trottoir, quelle contre-allée, quelle entrée d'immeuble — assez
 *      pour rejouer l'itinéraire de quelqu'un.
 * PUR : aucun effet de bord, aucune horloge, aucune I/O. La géométrie de la
 * ZONE conquise n'est JAMAIS touchée — c'est un territoire public ; seule la
 * position du coureur est protégée.
 *
 * ⚠️ CE QUE L'ÉTAPE 3 NE FAIT PAS, ET QU'IL NE FAUT PROMETTRE NULLE PART.
 * Douglas-Peucker RETIRE des sommets ; il n'en DÉPLACE aucun. Les points qui
 * survivent à l'étape 3 sont des positions GPS EXACTES (mêmes objets, cf. la
 * garantie 1 de `simplifyPolyline`). `SHARE_SIMPLIFY_EPSILON_M` borne l'écart
 * des points SUPPRIMÉS à la corde qui les remplace — pas l'incertitude des
 * points publiés. Ce qui disparaît, c'est le DÉTAIL entre deux sommets gardés,
 * donc l'essentiel de la micro-géométrie (contre-allée, entrée d'immeuble) ;
 * ce qui ne disparaît pas, c'est l'exactitude des sommets eux-mêmes. C'est la
 * vraie protection des extrémités qui repose sur l'étape 1, et celle du
 * domicile en milieu de course sur l'étape 2 — jamais sur l'étape 3. La copie
 * du badge « Protégé » (`copy.ts`, `protectionSimplify`) est écrite dans ces
 * termes exacts depuis le 27/07/2026 ; elle disait auparavant « jamais le
 * trottoir exact », ce que ce code ne garantit pas.
 *
 * ═══ POURQUOI LA SIMPLIFICATION VIENT EN DERNIER ════════════════════════════
 * Parce qu'elle ne doit jamais DÉCIDER de ce qui est masqué, seulement dégrader
 * ce qui a survécu. `simplifyPolyline` (moteur, `@klaim/engine`) ne fait que
 * SUPPRIMER des sommets — sa sortie est une sous-suite de son entrée, avec les
 * OBJETS d'origine. Deux conséquences qu'on teste :
 *  · un point retiré à l'étape 1 ou 2 ne peut pas réapparaître à l'étape 3 ;
 *  · la trace publiée est toujours ≤ (en points ET en mètres) la trace reçue.
 * Simplifier D'ABORD aurait fait mesurer la coupe des 250 m sur une géométrie
 * déjà approximée — la distance annoncée aurait cessé d'être celle du terrain.
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
 * ═══ ÉTAT RÉEL DES ZONES FLOUTÉES (27/07/2026) ══════════════════════════════
 * `applyPrivacyZones` A désormais un appelant qui lui passe de VRAIES zones :
 * `features/privacy/zonesStore.ts` lit la table `privacy_zones` (0002/0003, RLS
 * owner-only) avec la session du joueur, et `app/partage.tsx` transmet le
 * résultat ici. C'est la MÊME table que le serveur consomme déjà pour exclure
 * des hexes (`supabase/functions/ingest_run/index.ts:445` `loadPrivacyHexes`) :
 * une seule source, pas un miroir client.
 *
 * ⚠️ CE QUI MANQUE ENCORE, ET QU'IL NE FAUT PAS LAISSER CROIRE : rien dans
 * l'app n'ÉCRIT dans cette table — aucun écran ne permet de déclarer une
 * adresse, l'événement `privacy_zone_set` (events.ts) n'est émis nulle part. En
 * pratique la lecture rend donc zéro zone pour tout le monde aujourd'hui. Le
 * chemin est réel et testé ; la donnée n'existe pas encore. Le badge de
 * `app/partage.tsx` ne revendique donc TOUJOURS pas les zones — il ne parlera
 * d'elles que le jour où un écran permettra d'en poser une.
 */
import { SHARE_SIMPLIFY_EPSILON_M, SHARE_TRIM_M } from '@klaim/shared';
// ⚠️ CHEMIN PROFOND VOLONTAIRE (`/src/`), et non le sous-chemin d'exports
// `@klaim/engine/polygon` : Metro laisse `unstable_enablePackageExports` à FALSE
// (Expo SDK 52) et le TS du mobile est en `moduleResolution: node` — aucun des
// deux ne lit le champ `exports`. Même raison, et même forme, que
// `@klaim/shared/src/cities-eu` dans `app/credits-donnees.tsx`.
// `polygon.ts` est le SEUL module du moteur dont le graphe d'imports est vide
// (son unique import est un `import type`, effacé à la compilation) : le tirer
// ici n'embarque ni h3-js ni game-rules dans le bundle mobile.
import { simplifyPolyline } from '@klaim/engine/src/polygon';
import type { LatLngPoint } from '../map/realAnchors';

/**
 * Mètres masqués à CHAQUE extrémité de la trace partagée. Ré-exporté ici parce
 * que c'est le point d'entrée du masquage (l'écran Confidentialité l'importe
 * pour ANNONCER la distance réellement appliquée) — la valeur, elle, vient de
 * `packages/shared/src/game-rules.ts` (§12.1), source unique.
 */
export { SHARE_TRIM_M };

/**
 * Tolérance (m) de la simplification appliquée à TOUT ce qui reste après
 * masquage. Ré-exportée pour la même raison que `SHARE_TRIM_M` : qui veut
 * ANNONCER la dégradation doit lire la valeur réellement appliquée. Source
 * unique : `packages/shared/src/game-rules.ts` (§12.1).
 */
export { SHARE_SIMPLIFY_EPSILON_M };

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
 * Simplification du segment publiable — étape 3, jamais une étape de décision.
 *
 * Elle délègue au moteur (`simplifyPolyline`, `packages/engine/src/polygon.ts`,
 * le Douglas-Peucker qui sert déjà à généraliser les contours de territoire) :
 * aucun algorithme n'est réécrit ici, on se contente d'imposer la tolérance et
 * le plancher de rendabilité.
 *
 * PLANCHER, et pourquoi il n'affaiblit rien : DP garantit seulement 2 points en
 * sortie. Une avenue rectiligne peut donc réduire un vrai parcours à un segment,
 * que `hasKnownRoute` (≥ 3 points, `app/partage.tsx`) lirait comme « tracé
 * inconnu » — un mensonge par sous-affichage : la route EST connue. On réinsère
 * alors le point MÉDIAN de l'entrée. C'est un point RÉEL (jamais interpolé), et
 * il ne dit rien de plus que la droite : DP n'a rendu 2 points que parce que
 * TOUS les points intermédiaires tiennent à moins de `toleranceM` de la corde.
 */
function simplifyForShare(
  kept: readonly LatLngPoint[],
  toleranceM: number,
): readonly LatLngPoint[] {
  const simplified = simplifyPolyline(kept, toleranceM);
  if (simplified.length >= MIN_RENDERABLE_POINTS || kept.length < MIN_RENDERABLE_POINTS) {
    return simplified;
  }
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  const middle = kept[Math.floor(kept.length / 2)];
  return first && last && middle ? [first, middle, last] : simplified;
}

/**
 * LE POINT D'ENTRÉE du partage : coupe les extrémités, PUIS applique les zones
 * floutées, PUIS simplifie — et rend le plus long segment survivant, parce que
 * l'appelant actuel (`app/partage.tsx`) dessine une seule polyligne. Un tableau
 * vide signifie « rien de publiable », pas « course vide » : l'appelant a un
 * état dédié.
 *
 * `trimM <= 0` = coupe des extrémités explicitement désactivée (l'appelant ne
 * montre alors pas le badge « masqués »). Les ZONES FLOUTÉES, elles, restent
 * appliquées : §1.5 dit qu'elles « prévalent sur tout rendu social » — elles ne
 * dépendent donc d'aucun autre réglage.
 *
 * `simplifyM` NE SE DÉSACTIVE PAS, et c'est délibéré : la coupe des extrémités
 * est un RÉGLAGE du joueur (`maskEndpoints`), la simplification est une RÈGLE du
 * produit (§12.1) que rien dans l'app n'expose. Le paramètre existe pour qu'un
 * appelant puisse flouter DAVANTAGE ; il est plafonné par le bas à
 * `SHARE_SIMPLIFY_EPSILON_M` — une valeur plus fine publierait une trace plus
 * précise que ce que la règle promet.
 */
export function applySharePrivacy(
  trace: readonly LatLngPoint[],
  trimM: number = SHARE_TRIM_M,
  zones: readonly PrivacyZone[] = [],
  simplifyM: number = SHARE_SIMPLIFY_EPSILON_M,
): readonly LatLngPoint[] {
  const trimmed = trimM <= 0 ? trace : trimTraceEnds(trace, trimM);
  const segments = applyPrivacyZones(trimmed, zones);
  if (segments.length === 0) return [];
  let longest: readonly LatLngPoint[] = segments[0] ?? [];
  for (const seg of segments) if (seg.length > longest.length) longest = seg;
  return simplifyForShare(longest, Math.max(SHARE_SIMPLIFY_EPSILON_M, simplifyM));
}
