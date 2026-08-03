/**
 * GRYD — LA COURSE → CE QU'ON ENVOIE AU SERVEUR. PUR (lot M6).
 *
 * ─── CE QUE CE MODULE GARANTIT ──────────────────────────────────────────────
 * Que le payload envoyé passe la validation de forme d'`ingest_run`
 * (`isIngestRunRequest`, index.ts:224). Cette validation répond 400 sans rien
 * expliquer : un champ mal formé ne se diagnostique pas depuis l'app, il se
 * PRÉVIENT ici — et se teste, ce qu'un objet construit à la volée dans un écran
 * ne permet pas.
 *
 * ─── CE QU'IL NE DÉCIDE PAS ─────────────────────────────────────────────────
 * Ni la distance, ni la validité, ni le territoire : tout cela est décidé
 * SERVEUR sur les points bruts (constitution — « tout claim est décidé
 * serveur »). Ce module ne fait que traduire, et refuse de traduire ce qui ne
 * peut pas l'être honnêtement.
 *
 * ⚠️ `clientRunId` vient de l'appelant et n'est JAMAIS régénéré ici : c'est la
 * clé d'idempotence (D14). Un renvoi du même identifiant est neutre côté
 * serveur ; en changer ferait compter deux fois la même sortie.
 */
import type { Activity, RunMode } from '@klaim/shared';

/** Un point tel que le capteur l'a donné. */
export interface RawPoint {
  readonly lat: number;
  readonly lng: number;
  /** Epoch ms. */
  readonly ts: number;
  readonly accuracy?: number;
}

/** Le corps attendu par `ingest_run`, réduit à ce que le MVP envoie. */
export interface RunPayload {
  readonly clientRunId: string;
  readonly source: 'gps';
  /** ISO 8601 — le serveur attend une CHAÎNE, pas un nombre. */
  readonly startedAt: string;
  readonly points: readonly { readonly lat: number; readonly lng: number; readonly t: number }[];
  readonly activity: Activity;
  readonly runMode: RunMode;
}

/** Un point est-il envoyable ? Les trois champs sont OBLIGATOIRES côté serveur. */
function estEnvoyable(p: RawPoint): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Number.isFinite(p.ts) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

export interface BuildInput {
  readonly clientRunId: string;
  readonly startedAt: number;
  readonly points: readonly RawPoint[];
  readonly activity?: Activity;
}

/**
 * Trace locale → payload, ou `null` s'il n'y a rien d'envoyable. PURE.
 *
 * `null` PLUTÔT QU'UN PAYLOAD VIDE : envoyer une course sans point valide
 * ferait répondre `no_valid_points` au serveur, c'est-à-dire présenter au
 * joueur un REFUS pour une course qui n'a jamais eu lieu. Un GO annulé avant le
 * premier pas n'est pas une course rejetée.
 *
 * Les points illisibles sont ÉCARTÉS, jamais corrigés : une coordonnée hors du
 * monde ramenée dans les bornes déplacerait la trace de plusieurs kilomètres
 * sans qu'aucune ligne ne le dise.
 */
export function buildRunPayload(input: BuildInput): RunPayload | null {
  if (typeof input.clientRunId !== 'string' || input.clientRunId.length === 0) return null;
  if (!Number.isFinite(input.startedAt) || input.startedAt <= 0) return null;

  const points = input.points
    .filter(estEnvoyable)
    .map((p) => ({ lat: p.lat, lng: p.lng, t: p.ts }));
  // Deux points au minimum : un seul ne décrit aucun déplacement, et le serveur
  // le refuserait — un refus affiché pour un départ annulé serait un reproche
  // adressé à quelqu'un qui n'a rien fait (L19).
  if (points.length < 2) return null;

  return {
    clientRunId: input.clientRunId,
    source: 'gps',
    // `toISOString` et non le nombre brut : `isIngestRunRequest` exige une
    // chaîne, et un nombre y répond 400 sans un mot d'explication.
    startedAt: new Date(input.startedAt).toISOString(),
    points,
    // La discipline se DÉCLARE, elle ne se devine pas (contrat serveur) : le
    // MVP ne fait courir qu'à pied, et le dit.
    activity: input.activity ?? 'run',
    // `conquete` : le seul mode qui capture. Les modes sans claim sont §7 OUT.
    runMode: 'conquete',
  };
}
