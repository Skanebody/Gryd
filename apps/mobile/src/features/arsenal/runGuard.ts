/**
 * GRYD — « Aucun achat accessible pendant une course » (planche E17), côté PUR.
 *
 * LE PIÈGE À NE PAS TOMBER DEDANS : `gryd.activeRun.v1` (runStore) ne contient
 * pas « la course en cours » — il contient LE DERNIER BUFFER ÉCRIT. Une course
 * interrompue (kill OS, batterie) y reste des heures ou des jours, en attente
 * d'être reprise ou clôturée au prochain GO. Traiter cette clé comme « une
 * course est en cours » fermerait la boutique DÉFINITIVEMENT chez quelqu'un qui
 * a simplement perdu son app en route — un écran bloqué par une donnée périmée,
 * exactement le genre de mensonge d'interface qu'on chasse.
 *
 * La règle est donc une règle de FRAÎCHEUR : un buffer n'atteste d'une course
 * vivante que si quelque chose y a été écrit récemment. Le tracker flushe
 * périodiquement (RUN_AUTOSAVE_INTERVAL_S, event §8 `run_autosave`) ; passé
 * plusieurs autosaves de silence, personne n'écrit plus — la course n'est plus
 * en cours, elle est en attente.
 */
import { RUN_AUTOSAVE_INTERVAL_S } from '@klaim/shared';

/**
 * Nombre d'autosaves manqués au-delà duquel un buffer cesse d'attester d'une
 * course vivante. 8 × 15 s = 2 min : large devant un flush (~30 s, soit 2
 * intervalles) et devant une perte de signal en tunnel, court devant l'oubli
 * d'une course interrompue. Ce n'est PAS une constante de jeu (elle ne décide
 * ni claim, ni point, ni distance) — c'est un seuil d'affichage, dérivé de la
 * cadence d'écriture réelle plutôt qu'écrit au doigt mouillé.
 */
export const RUN_LIVE_MISSED_AUTOSAVES = 8;

/** Silence maximal (ms) toléré avant de considérer le buffer périmé. */
export const RUN_LIVE_MAX_SILENCE_MS = RUN_AUTOSAVE_INTERVAL_S * 1000 * RUN_LIVE_MISSED_AUTOSAVES;

/**
 * Ce que l'écran a besoin de savoir d'un buffer de course, réduit au minimum
 * (aucune position, aucune trace : la boutique n'a rien à faire de ta géo).
 */
export interface RunLiveProbe {
  /** Départ de la course (epoch ms). */
  startedAt: number;
  /** Horodatage du dernier fix enregistré (epoch ms), `null` si aucun. */
  lastFixTs: number | null;
}

/**
 * Une course est-elle RÉELLEMENT en cours ? PURE.
 *
 * `null` (aucun buffer) → non, évidemment. Un buffer dont la dernière écriture
 * remonte à plus de `RUN_LIVE_MAX_SILENCE_MS` → non : c'est une course
 * interrompue en attente de décision, pas une course vivante.
 *
 * Horodatage dans le FUTUR (horloge remise à l'heure, buffer corrompu) → non :
 * on ne conclut rien d'une durée négative. Ne rien conclure ferme moins de
 * portes que de conclure faux — ici, ne pas bloquer la boutique.
 */
export function isRunLive(probe: RunLiveProbe | null, now: number): boolean {
  if (probe === null) return false;
  const lastWrite = probe.lastFixTs ?? probe.startedAt;
  if (!Number.isFinite(lastWrite)) return false;
  const silenceMs = now - lastWrite;
  if (silenceMs < 0) return false;
  return silenceMs <= RUN_LIVE_MAX_SILENCE_MS;
}

/**
 * Réduit un buffer runStore (StoredRun) à sa sonde. Défensif : une trace vide ou
 * un timestamp illisible donnent `lastFixTs: null`, et la règle retombe alors
 * sur `startedAt` — jamais sur une valeur inventée.
 */
export function probeFromStoredRun(
  run: { startedAt: number; fixes: readonly { ts: number }[] } | null,
): RunLiveProbe | null {
  if (run === null || !Number.isFinite(run.startedAt)) return null;
  let lastFixTs: number | null = null;
  for (const fix of run.fixes) {
    if (Number.isFinite(fix.ts) && (lastFixTs === null || fix.ts > lastFixTs)) lastFixTs = fix.ts;
  }
  return { startedAt: run.startedAt, lastFixTs };
}

/**
 * Deux buffers cohabitent quand une reprise est en attente (ACTIVE + CURRENT) :
 * il suffit qu'UN des deux soit vivant pour qu'une course soit en cours.
 */
export function anyRunLive(probes: readonly (RunLiveProbe | null)[], now: number): boolean {
  return probes.some((p) => isRunLive(p, now));
}
