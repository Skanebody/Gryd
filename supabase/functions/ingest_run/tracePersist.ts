/**
 * GRYD — PERSISTANCE DE LA TRACE MASQUÉE (`runs.polyline_masked`, spec §12.1).
 *
 * ═══ POURQUOI CE MODULE EXISTE (28/07/2026) ═════════════════════════════════
 * La colonne `polyline_masked` existe depuis `0002_schema.sql:107` avec son
 * intention écrite — « trace déjà expurgée des zones privées ; purge à 90 j » —
 * mais RIEN NE L'ÉCRIVAIT. Conséquence en chaîne : aucune capture ne pouvait
 * recevoir de polygone issu de la vraie boucle, la carte laissait donc des
 * territoires réels INVISIBLES (le repli hexagonal ayant été coupé, cf. `0100`),
 * et le signal anti-triche `duplicate_trace` restait indisponible.
 *
 * ═══ LE MASQUAGE S'EXÉCUTE ICI, PAS DANS L'APP ══════════════════════════════
 * Le pipeline vient de `_shared/engine/tracePrivacy.ts` — le MÊME code que le
 * partage mobile appelle. Deux raisons, et la seconde a été payée deux fois en
 * juillet 2026 (zones d'un rival, puis mode discret du classement) : une
 * protection de vie privée appliquée côté client ne protège personne, la donnée
 * fine ayant déjà quitté le serveur. Elle s'applique donc AVANT l'écriture.
 *
 * Conséquence voulue : la trace stockée ne peut JAMAIS être plus précise que ce
 * que le joueur accepte déjà de publier. Une seule règle dans tout le produit.
 *
 * ═══ CE MODULE NE PEUT PAS FAIRE ÉCHOUER UNE COURSE ═════════════════════════
 * `maskedPolylineFor` ne jette jamais : toute anomalie rend `null`, et la course
 * s'enregistre sans trace. Une capture validée reste validée — persister un
 * confort d'affichage ne doit jamais coûter un territoire au joueur.
 */
import {
  applyTracePrivacy,
  type PrivacyZone,
} from '../_shared/engine/tracePrivacy.ts';
import { SHARE_SIMPLIFY_EPSILON_M, SHARE_TRIM_M } from '../_shared/game-rules.ts';

/** Un point tel que le client l'envoie (`RunPoint`). */
interface TracePoint {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Décimales conservées à l'encodage. 5 ≈ 1,1 m — largement sous la tolérance de
 * simplification déjà appliquée (`SHARE_SIMPLIFY_EPSILON_M` = 15 m), donc
 * l'arrondi ne retire RIEN de plus que ce que le masquage a déjà retiré. Il
 * n'est pas une protection : il évite seulement de stocker 14 décimales inutiles.
 */
const ENCODE_DECIMALS = 5;

/**
 * Trace masquée prête à écrire, ou `null` s'il n'y a rien de publiable.
 *
 * `null` couvre TROIS situations qu'on ne cherche pas à distinguer ici, parce
 * qu'elles ont la même conséquence (pas de géométrie) et que la carte le dit
 * déjà : trace trop courte pour survivre à la coupe des 250 m, trace
 * intégralement dans une zone floutée, ou entrée vide.
 *
 * Format : JSON `[[lat, lng], …]`. Choisi contre un encodage type « polyline
 * Google » parce qu'il est LISIBLE — un opérateur qui inspecte une ligne doit
 * pouvoir vérifier de ses yeux que le départ est bien coupé, sans outil.
 */
export function maskedPolylineFor(
  points: readonly TracePoint[],
  zones: readonly PrivacyZone[],
): string | null {
  try {
    const masked = applyTracePrivacy(points, SHARE_TRIM_M, zones, SHARE_SIMPLIFY_EPSILON_M);
    if (masked.length < 3) return null;
    const rounded = masked.map((p) => [
      Number(p.lat.toFixed(ENCODE_DECIMALS)),
      Number(p.lng.toFixed(ENCODE_DECIMALS)),
    ]);
    return JSON.stringify(rounded);
  } catch (err) {
    // Jamais fatal : la course prime sur sa trace. On trace l'anomalie côté
    // serveur pour qu'elle ne soit pas silencieuse, et on rend `null`.
    console.error('ingest_run: masquage de trace échoué, course enregistrée sans trace :', err);
    return null;
  }
}
