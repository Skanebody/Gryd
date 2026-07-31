// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/tracePrivacy.ts

/**
 * GRYD — MASQUAGE PRIVACY D'UNE TRACE (spec produit §12.1, §1.5).
 *
 * ═══ POURQUOI CE MODULE EST DANS LE MOTEUR (28/07/2026) ═════════════════════
 * Il vivait dans `apps/mobile/src/features/share/sharePrivacy.ts`, donc CÔTÉ
 * CLIENT — et il n'y servait qu'au partage. Deux raisons l'ont fait migrer ici,
 * et la seconde est une leçon payée cher :
 *
 *  1. `ingest_run` doit désormais PERSISTER une trace masquée (`runs.polyline_masked`),
 *     ce qui exige d'exécuter ce pipeline SUR LE SERVEUR. Les fonctions edge ne
 *     lisent que `supabase/functions/_shared/` — alimenté par ce dossier.
 *  2. UN MASQUAGE APPLIQUÉ CÔTÉ CLIENT NE PROTÈGE PERSONNE. Ce dépôt s'est fait
 *     prendre DEUX FOIS en juillet 2026 : les zones d'un rival, puis le mode
 *     discret du classement — les deux fois, la donnée fine avait déjà quitté le
 *     serveur et n'était masquée qu'à l'affichage. La règle qui en sort : une
 *     protection de vie privée s'exécute là où la donnée est ÉCRITE.
 *
 * `apps/mobile/.../sharePrivacy.ts` RÉEXPORTE ce module : une seule
 * implémentation, jamais deux qui divergent. Le partage et l'ingestion masquent
 * donc RIGOUREUSEMENT pareil — la trace stockée ne peut pas être plus précise
 * que ce que le joueur accepte déjà de publier.
 *
 * ═══ CE QUE FAIT CE MODULE ══════════════════════════════════════════════════
 * TROIS étapes, dans CET ordre (voir « pourquoi cet ordre » plus bas) :
 *   1. on RETIRE les `trimM` premiers et derniers mètres — départ/arrivée =
 *      domicile potentiel (§12.1 « couper au moins 250 m autour du départ et de
 *      l'arrivée publics ») ;
 *   2. on RETIRE tout point tombant dans une ZONE FLOUTÉE déclarée (§12.1) ;
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
 * donc l'essentiel de la micro-géométrie ; ce qui ne disparaît pas, c'est
 * l'exactitude des sommets eux-mêmes. La vraie protection des extrémités repose
 * sur l'étape 1, celle du domicile en milieu de course sur l'étape 2 — jamais
 * sur l'étape 3. La copie du badge « Protégé » est écrite dans ces termes exacts
 * depuis le 27/07/2026 ; elle disait auparavant « jamais le trottoir exact », ce
 * que ce code ne garantit pas.
 *
 * ═══ POURQUOI LA SIMPLIFICATION VIENT EN DERNIER ════════════════════════════
 * Parce qu'elle ne doit jamais DÉCIDER de ce qui est masqué, seulement dégrader
 * ce qui a survécu. `simplifyPolyline` ne fait que SUPPRIMER des sommets — sa
 * sortie est une sous-suite de son entrée, avec les OBJETS d'origine. Deux
 * conséquences qu'on teste :
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
 * trace en deux). C'est exactement le rôle des zones floutées.
 *
 * ═══ POURQUOI ON PRÉFÈRE RIEN À UN MASQUAGE INSUFFISANT ═════════════════════
 * Une version antérieure retombait, pour les traces trop courtes, sur « le
 * tiers médian ». Sur une trace de 400 m, cela masquait ~130 m à chaque bout
 * pendant que l'écran affichait « départ/arrivée masqués » — le badge promettait
 * 250 m et le pipeline en rendait 130. On rend maintenant une trace VIDE, et
 * l'appelant bascule sur son état honnête « tracé inconnu ».
 *
 * ═══ ÉTAT RÉEL DES ZONES FLOUTÉES ══════════════════════════════════════════
 * La table `privacy_zones` (0002/0003, RLS owner-only) est la MÊME que celle que
 * `ingest_run` consomme déjà pour exclure des hexes (`loadPrivacyHexes`) : une
 * seule source. ⚠️ Mais rien dans l'app n'ÉCRIT dans cette table — aucun écran ne
 * permet de déclarer une adresse. En pratique la lecture rend donc zéro zone
 * pour tout le monde aujourd'hui. Le chemin est réel et testé ; la donnée
 * n'existe pas encore, et aucune copie ne doit laisser croire le contraire.
 */
import { simplifyPolyline } from './polygon.ts';

/**
 * Point géographique. Défini localement plutôt qu'importé : TypeScript étant
 * STRUCTUREL, ce type et ceux de `polygon.ts` / `hexing.ts` restent
 * interchangeables sans créer de dépendance entre modules du moteur.
 */
interface LatLngPoint {
  readonly lat: number;
  readonly lng: number;
}

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

/** Nombre minimal de points pour qu'une trace soit RENDABLE. */
const MIN_RENDERABLE_POINTS = 3;

const EARTH_R_M = 6371000;

/** Distance haversine en mètres entre deux points. */
export function haversineM(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
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

  const cum: number[] = [0];
  for (let i = 1; i < trace.length; i++) {
    const prev = trace[i - 1];
    const here = trace[i];
    cum.push((cum[i - 1] ?? 0) + (prev && here ? haversineM(prev, here) : 0));
  }

  let startIdx = 0;
  while (startIdx < trace.length) {
    const p = trace[startIdx];
    if (!p) break;
    const alongOk = (cum[startIdx] ?? 0) >= trimM;
    const crowOk = haversineM(start, p) >= trimM;
    if (alongOk && crowOk) break;
    startIdx++;
  }

  const total = cum[cum.length - 1] ?? 0;
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
 * Coupe la trace en SEGMENTS en retirant tout point tombant dans une zone
 * floutée. Les segments de moins de 3 points sont abandonnés (ils ne sont pas
 * rendables). PURE. `zones` vide → un seul segment, la trace inchangée.
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
 * PLANCHER, et pourquoi il n'affaiblit rien : DP garantit seulement 2 points en
 * sortie. Une avenue rectiligne peut donc réduire un vrai parcours à un segment,
 * qu'un appelant lirait comme « tracé inconnu » — un mensonge par sous-affichage.
 * On réinsère alors le point MÉDIAN de l'entrée. C'est un point RÉEL (jamais
 * interpolé), et il ne dit rien de plus que la droite : DP n'a rendu 2 points que
 * parce que TOUS les points intermédiaires tiennent à moins de `toleranceM` de
 * la corde.
 */
function simplifyKept(
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
 * LE POINT D'ENTRÉE : coupe les extrémités, PUIS applique les zones floutées,
 * PUIS simplifie — et rend le plus long segment survivant. Un tableau vide
 * signifie « rien de publiable », pas « course vide ».
 *
 * `trimM <= 0` = coupe des extrémités explicitement désactivée. Les ZONES
 * FLOUTÉES, elles, restent appliquées : §1.5 dit qu'elles « prévalent sur tout
 * rendu social » — elles ne dépendent donc d'aucun autre réglage.
 *
 * `simplifyM` NE SE DÉSACTIVE PAS : la coupe des extrémités est un RÉGLAGE du
 * joueur, la simplification est une RÈGLE du produit (§12.1). Le paramètre
 * existe pour flouter DAVANTAGE ; il est plafonné par le bas par l'appelant, qui
 * passe `SHARE_SIMPLIFY_EPSILON_M` depuis game-rules (source unique — ce module
 * n'importe aucune constante de jeu, il les REÇOIT).
 */
export function applyTracePrivacy(
  trace: readonly LatLngPoint[],
  trimM: number,
  zones: readonly PrivacyZone[],
  simplifyM: number,
): readonly LatLngPoint[] {
  const trimmed = trimM <= 0 ? trace : trimTraceEnds(trace, trimM);
  const segments = applyPrivacyZones(trimmed, zones);
  if (segments.length === 0) return [];
  let longest: readonly LatLngPoint[] = segments[0] ?? [];
  for (const seg of segments) if (seg.length > longest.length) longest = seg;
  return simplifyKept(longest, simplifyM);
}
