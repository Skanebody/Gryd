/**
 * GRYD — LA TRACE D'UNE SORTIE PASSÉE : où elle est, et ce qu'elle vaut.
 *
 * ═══ CE QUE LE DÉPÔT AFFIRMAIT, ET CE QUE LE SERVEUR FAIT ═══════════════════
 * Trois fichiers répétaient, en toutes lettres, que GRYD n'archive aucun tracé :
 * `app/course/[id].tsx`, `features/history/runDetail.ts` (`runTraceState`) et
 * `features/history/RealRunCard.tsx`. La source citée était
 * `ingest_run/anticheat_wiring.ts:178` — un commentaire, pas un comportement.
 *
 * Le comportement, lui, est écrit dans deux endroits vérifiables :
 *   · `supabase/functions/ingest_run/index.ts:3146` écrit `polyline_masked`
 *     (trace expurgée : extrémités coupées de `SHARE_TRIM_M`, zones privées
 *     retirées, simplifiée à 15 m — cf. `tracePersist.ts`) ;
 *   · `supabase/functions/ingest_run/refonte2026.ts:167` écrit
 *     `trace_points_2026` : les points COMPLETS de la sortie (lat, lng,
 *     horodatage, précision), colonne ajoutée par la migration 0118. Le serveur
 *     les relit lui-même pour rejouer une capture (`refonte2026.ts:179`).
 * La policy `runs_select_own` (0003_rls.sql:107) ouvre la lecture de SES lignes,
 * sans restriction de colonne. Il n'y avait donc ni migration ni droit à
 * demander : personne n'avait lu ces deux colonnes.
 *
 * ═══ DEUX SOURCES, ET ELLES NE SE VALENT PAS ════════════════════════════════
 *  · `full`   — `trace_points_2026` : géométrie ET temps. C'est la seule qui
 *    permet des splits, une courbe d'allure, un temps en mouvement.
 *  · `masked` — `polyline_masked` : géométrie SEULE, déjà expurgée. Elle donne
 *    une carte, jamais un split : l'écran DIT alors ce qui manque plutôt que
 *    d'étaler l'allure moyenne sur des kilomètres jamais chronométrés.
 *  · `none`   — aucune des deux. La sortie garde ses chiffres ; sa trace, non.
 *
 * ═══ « NONE » A TROIS CAUSES, ET L'ÉCRAN N'EN INVENTE AUCUNE ════════════════
 * ⚠️ CORRIGÉ LE 11/09/2026. Ce docbloc affirmait que `polyline_masked` était
 * « purgée à 90 jours (`RAW_POLYLINE_RETENTION_DAYS`, migration 0101) ». C'était
 * vrai POUR TOUT LE MONDE jusqu'à ce lot, pendant que `trace_points_2026` ne
 * l'était jamais : deux formes de la même trace, deux durées opposées, aucun
 * choix. Depuis 0195/0196 la conservation est une préférence du joueur
 * (`user_profiles.trace_retention_2026`), dont le DÉFAUT est « tout garder ».
 * Une trace absente vient donc, aujourd'hui, de l'une de ces trois causes :
 *   ① la sortie est antérieure à l'écriture des traces (juillet 2026), ou son
 *     ingestion n'en a pas produit ;
 *   ② le joueur a CHOISI une conservation (90 jours / 1 an) et le délai est
 *     passé — `purge_traces_by_retention_2026` a mis les DEUX colonnes à null ;
 *   ③ le joueur a effacé CE tracé à la main (`delete_run_trace_2026`).
 * Ce module ne les distingue PAS, et ce n'est pas un manque : rien en base ne
 * les sépare — le journal d'effacement (`trace_purge_log_2026`) n'est servi à
 * aucun client. L'écran dit donc ce qui est VRAI dans les trois cas (« Tracé
 * non disponible pour cette sortie. Ses mesures, elles, sont conservées. »)
 * plutôt que de deviner laquelle des trois s'applique.
 *
 * ═══ VIE PRIVÉE : LE REGARD DÉCIDE, PAS L'ÉCRAN ═════════════════════════════
 * Ces deux lectures servent au JOUEUR qui regarde SA sortie (la RLS ne rend
 * rien d'autre). Aucun masquage supplémentaire n'est appliqué : cacher à
 * quelqu'un le départ de sa propre sortie n'ajoute pas un gramme de vie privée
 * et rendrait l'écran moins vrai que la réalité — c'est déjà la doctrine écrite
 * de `features/run/finishedTrace.ts`. TOUTE sortie SORTANTE (image, export,
 * lien) passe, elle, par `features/share/sharePrivacy.applySharePrivacy` : la
 * règle est indexée sur la DESTINATION, jamais sur l'écran.
 *
 * PUR : aucun import React, aucun réseau. Testable sous Deno.
 */
import type { JournalPoint } from './metrics';

/** D'où vient la trace affichée — l'écran en dépend pour ce qu'il ose dire. */
export type TraceSource = 'full' | 'masked' | 'none';

export interface RunTrace {
  readonly source: TraceSource;
  readonly points: readonly JournalPoint[];
}

export const NO_TRACE: RunTrace = { source: 'none', points: [] };

/** Deux points suffisent à dessiner un trait ; en dessous il n'y a rien à voir. */
const MIN_POINTS = 2;

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function coordinate(lat: unknown, lng: unknown): boolean {
  return finite(lat) && Math.abs(lat) <= 90 && finite(lng) && Math.abs(lng) <= 180;
}

/**
 * `runs.trace_points_2026` — tableau JSONB de `RunPoint`. DÉFENSIF de bout en
 * bout : ce payload traverse les versions du serveur, et une forme inattendue
 * ne doit jamais faire tomber un écran de lecture. Ce qui n'est pas un point
 * est ignoré ; ce qui n'est pas un tableau rend une trace vide.
 */
export function parseTracePoints2026(raw: unknown): JournalPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: JournalPoint[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const row = entry as Record<string, unknown>;
    if (!coordinate(row.lat, row.lng)) continue;
    const point: {
      lat: number;
      lng: number;
      t?: number;
      acc?: number;
      alt?: number;
      breakBefore?: true;
    } = { lat: row.lat as number, lng: row.lng as number };
    if (finite(row.t)) point.t = row.t;
    if (finite(row.acc)) point.acc = row.acc;
    // `alt` n'est écrit par AUCUNE source aujourd'hui (`RunPoint` ne le porte
    // pas). On le lit quand même : le jour où une source en fournit, le profil
    // d'altitude s'affiche sans qu'une seule ligne d'écran change.
    if (finite(row.alt)) point.alt = row.alt;
    if (row.breakBefore === true) point.breakBefore = true;
    out.push(point);
  }
  return out;
}

/**
 * `runs.polyline_masked` — chaîne JSON `[[lat, lng], …]` (format choisi LISIBLE
 * par `tracePersist.ts`, pour qu'un opérateur puisse vérifier de ses yeux que le
 * départ est coupé). Aucun temps : la géométrie seule.
 */
export function parseMaskedPolyline(raw: unknown): JournalPoint[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: JournalPoint[] = [];
  for (const entry of parsed) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [lat, lng] = entry;
    if (!coordinate(lat, lng)) continue;
    out.push({ lat: lat as number, lng: lng as number });
  }
  return out;
}

/**
 * La meilleure trace disponible pour cette sortie. L'ordre n'est pas
 * cosmétique : la trace complète porte le temps, donc les splits et la courbe.
 * Retomber sur la masquée en premier ferait disparaître l'analyse sportive
 * d'une sortie qui la contient.
 */
export function runTraceFrom(row: {
  tracePoints2026?: unknown;
  polylineMasked?: unknown;
}): RunTrace {
  const full = parseTracePoints2026(row.tracePoints2026);
  if (full.length >= MIN_POINTS) return { source: 'full', points: full };
  const masked = parseMaskedPolyline(row.polylineMasked);
  if (masked.length >= MIN_POINTS) return { source: 'masked', points: masked };
  return NO_TRACE;
}

/**
 * Réduction pour l'AFFICHAGE. Une sortie de deux heures à 1 Hz porte 7 200
 * points : les dessiner tous produit un `Path` SVG de plusieurs dizaines de
 * milliers de caractères pour un trait que l'œil ne distingue pas d'un tracé à
 * 400 points.
 *
 * Échantillonnage à pas RÉGULIER (jamais un « lissage » qui déplacerait le
 * tracé) : le premier et le dernier point sont TOUJOURS conservés, et une
 * rupture (`breakBefore`) l'est aussi — la garder est ce qui empêche de relier
 * deux segments que le capteur n'a pas reliés.
 */
export function decimateForDisplay(
  points: readonly JournalPoint[],
  maxPoints: number,
): readonly JournalPoint[] {
  if (maxPoints < 2 || points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: JournalPoint[] = [];
  let next = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point) continue;
    if (i >= next || point.breakBefore === true || i === points.length - 1) {
      out.push(point);
      if (i >= next) next += step;
    }
  }
  return out;
}

/**
 * Découpe la trace en segments CONTINUS. Une rupture attestée reste une rupture
 * : relier les deux bords dessinerait un raccourci que personne n'a couru — la
 * faute que `RunResult` évite déjà en gardant ses `traceSegments` séparés.
 */
export function traceSegments(points: readonly JournalPoint[]): readonly (readonly JournalPoint[])[] {
  const out: JournalPoint[][] = [];
  let current: JournalPoint[] = [];
  for (const point of points) {
    if (point.breakBefore === true && current.length > 0) {
      out.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length > 0) out.push(current);
  return out.filter((segment) => segment.length >= MIN_POINTS);
}
