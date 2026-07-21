/**
 * GRYD — FORME d'une course dans l'Historique (AMENDEMENT-17 CHANTIER 3).
 *
 * ⚠ CE FICHIER EST MAL NOMMÉ — et le renommer demande une ligne dans un fichier
 * hors périmètre. Il ne contient plus AUCUNE donnée fabriquée : uniquement les
 * TYPES d'une course d'historique et le ré-export des formateurs d'effort. Le
 * nom `demo.ts` doit devenir `runEntry.ts` ; cela suppose de changer l'import de
 * `app/course/[id].tsx` (ligne 41), édité par un autre lot. Voir le rapport
 * AMENDEMENT-47.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ LE 21/07/2026 (AMENDEMENT-47) ──────────────────────
 * `RUN_HISTORY` : neuf courses entièrement fabriquées, avec leur distance, leur
 * allure, leur horodatage (« Aujourd'hui · 07:42 »), leurs zones capturées et
 * jusqu'au motif de leur refus. C'était l'historique complet d'un coureur qui
 * n'existe pas — et le plus intime des mensonges possibles, puisqu'un
 * historique de course est le récit de ce que quelqu'un a fait de son corps.
 * Sont partis avec lui ses accesseurs (`recentRuns`, `runsByFilter`, `findRun`,
 * `countByFilter`) et trois tables de libellés codées en dur en français
 * (`HISTORY_FILTERS`, `REFUSAL_TITLES`, `VERIFY_LABELS`), qui violaient de
 * surcroît la règle i18n (toute chaîne visible = Entry ×5). Les écrans vivants
 * passent par `i18n/catalog`.
 *
 * L'historique RÉEL se lit dans `history/real.ts` (table `runs`, policy
 * `runs_select_own`) et se rend avec `RealRunCard`. Les types ci-dessous
 * décrivent la forme que cette lecture doit produire : ils sont le contrat,
 * pas un contenu.
 */

/**
 * Nature d'une course. `conquest` = capture · `defense` = tenue d'une zone
 * menacée · `route` = liaison ouverte (frontière crew à fermer) · `stats` =
 * aucune capture (course privée, ou refus GPS/géométrie).
 */
export type RunKind = 'conquest' | 'defense' | 'route' | 'stats';

/** Statut GRYD Verify d'une course (miroir de la décision serveur). */
export type VerifyStatus = 'verified' | 'partial' | 'statsonly';

/**
 * Raison HONNÊTE quand une capture n'a pas eu lieu (copy §CH3 : états de refus
 * explicites). `null` = la course a bien capturé. Chaque motif = une phrase
 * courte, factuelle, jamais culpabilisante.
 */
export type RefusalReason =
  | 'loop_open'
  | 'zone_thin'
  | 'gps_unstable'
  | 'speed_incoherent'
  | null;

/** Un segment de la course (détail) : sa nature de validation Verify. */
export type SegmentState = 'valid' | 'weak_gps' | 'pause';

export interface RunSegment {
  /** Libellé court du segment (« Canal Saint-Martin », « Pause feu rouge »). */
  label: string;
  /** Longueur affichée (km) — 0 pour une pause. */
  km: number;
  state: SegmentState;
}

/**
 * Une ligne d'impact territorial du détail (résumé + détail) : une icône, un
 * chiffre, un libellé varié. Ex. « +18 zones », « 12 rues défendues »,
 * « 1 frontière fermée », « Base → République ».
 */
export interface ImpactLine {
  icon: import('@klaim/shared').IconName;
  label: string;
  /** `true` = gain (chartreuse) ; `false` = neutre/gris (info). */
  gain: boolean;
}

/**
 * Une course d'historique. Toutes ces valeurs sont des MESURES : elles ne
 * peuvent venir que de `runs` (lecture serveur), jamais d'une constante.
 */
export interface RunHistoryEntry {
  id: string;
  /** Nom éditorial de la course (« Boucle République », « Défense Ourcq »). */
  name: string;
  /** Vocabulaire varié : secteur/quartier de la course. */
  area: string;
  kind: RunKind;
  /** Horodatage relatif (« Aujourd'hui · 07:42 », « Hier », « Lun. »). */
  when: string;
  // ── Effort ──
  km: number;
  /** Durée en secondes. */
  durationS: number;
  /** Allure en secondes / km. */
  paceSPerKm: number;
  // ── Impact (résumé card : 2-3 fragments courts déjà mis en forme) ──
  /** Fragments d'impact affichés sur la card (« +18 zones », « 1 frontière fermée »). */
  impactChips: readonly string[];
  verify: VerifyStatus;
  refusal: RefusalReason;
  // ── Détail ──
  /** Boucle fermée → mini-carte avant/après disponible. */
  hasLoopMap: boolean;
  /**
   * Ancre géométrique pour la mini-carte avant/après (réutilise realAnchors).
   * Absent = pas de carte (défense/route/stats/refus). Les zones avant/après
   * sont des estimations d'affichage (le serveur décide).
   */
  loopMap?: { anchor: 'republique' | 'bastille'; beforeZones: number; afterZones: number };
  impactLines: readonly ImpactLine[];
  segments: readonly RunSegment[];
  /** Sous-titre du bloc raison (détail) quand `refusal !== null`. */
  refusalDetail: string | null;
  /** Une ligne de contexte crew si pertinent (frontière ouverte/fermée). */
  crewNote: string | null;
}

// ─── Formatage effort ────────────────────────────────────────────────────────
// Les fonctions vivent dans `./format` : elles servent aussi à l'historique RÉEL
// (lecture de `runs`), et du code réel ne doit pas dépendre d'un module de démo.
// Ré-export conservé pour `app/course/[id].tsx`, qui les importe encore d'ici.
export { fmtDuration, fmtKm, fmtPace } from './format';
