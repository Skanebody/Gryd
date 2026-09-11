import { useMemo } from 'react';
import type { Activity, RunStatus } from '@klaim/shared';
import { useMyRunHistory } from '../history/real';
import { useLocalActivities2026 } from './localActivities';

export interface JournalEntry2026 {
  id: string;
  startedAtMs: number;
  km: number;
  durationS: number;
  localId?: string;
  pending?: boolean;
  /**
   * ─── CE QUE LA LIGNE DE JOURNAL A LE DROIT DE MONTRER (10/09/2026) ────────
   * Le journal n'affichait que la date, les kilomètres et les minutes : deux
   * sorties de 5 km s'y ressemblaient trait pour trait, et une sortie qui avait
   * PRIS du terrain se lisait comme une sortie sans capture. Les quatre champs
   * ci-dessous existaient déjà dans la lecture (`history/real.ts` sélectionne
   * `avg_pace_s_km`, `status` et `celebration`) — personne ne les remontait.
   *
   * Chacun est OPTIONNEL et vaut `null` quand le serveur n'a rien dit : un
   * `undefined` (sortie locale, pas encore jugée) et un `null` (le serveur ne
   * sait pas) ne se peignent pas de la même façon, et aucun des deux ne devient
   * un zéro.
   */
  /** La discipline de la ligne. Le journal filtre déjà par elle, la ligne la NOMME. */
  activity: Activity;
  /** Allure moyenne serveur (s/km). `null` = pas d'allure pour cette sortie. */
  paceSPerKm?: number | null;
  /** Verdict d'enregistrement du serveur. Absent sur une sortie non encore envoyée. */
  status?: RunStatus;
  /**
   * Terrain NOUVEAU gagné par cette sortie, en m², tel que le serveur l'a
   * publié (`celebration.territory2026`, statut `published`). `null` = aucun
   * reçu lisible ou capture non publiée — jamais un « 0 m² » affirmé.
   */
  terrainM2?: number | null;
  /**
   * Segments de trace DISPONIBLES SUR CET APPAREIL (sortie enregistrée ici).
   * Une sortie serveur n'en a pas dans la liste : lire 200 traces pour peindre
   * trois vignettes coûterait plus cher que tout le reste de l'écran. Sa trace
   * est lue à l'ouverture du détail, où elle sert vraiment.
   */
  traceSegments?: readonly (readonly { lat: number; lng: number }[])[];
  /**
   * « SPORT SEULEMENT » (0197) : la sortie a été GARDÉE dans une discipline que
   * la mesure contredisait. Elle compte pour le journal, les kilomètres, les
   * jours actifs et l'XP ; pour rien du jeu.
   *
   * `null`/absent = rien à dire. Le motif est le texte BRUT du serveur : le
   * traduire ici ferait perdre un motif futur que l'écran saurait au moins
   * nommer tel quel.
   */
  sportOnlyReason?: string | null;
}
/** One read model for the journal and sports stats; online receipts de-duplicate the local copy. */
export function useProfileJournal(activity: Activity) {
  const history = useMyRunHistory(activity);
  const local = useLocalActivities2026();
  const runs = useMemo<JournalEntry2026[]>(() => {
    const remoteIds = new Set(history.runs.map(run => run.id));
    const localByRemoteId = new Map<string, string>();
    const localTraces = new Map<string, readonly (readonly { lat: number; lng: number }[])[]>();
    const activities = local.activities.filter(run => run.activity === activity);
    for (const run of activities) {
      localByRemoteId.set(run.clientRunId, run.clientRunId);
      if (run.result?.runId) localByRemoteId.set(run.result.runId, run.clientRunId);
      localTraces.set(run.clientRunId, run.traceSegments);
    }
    // Keep the persisted trace detail after a server refresh replaces a queued entry.
    const remoteEntries = history.runs.map(run => {
      const localId = localByRemoteId.get(run.id);
      return {
        ...run,
        activity,
        localId,
        pending: false,
        ...(localId !== undefined && localTraces.has(localId)
          ? { traceSegments: localTraces.get(localId) }
          : {}),
      };
    });
    const localEntries = activities
      .filter(run => !remoteIds.has(run.result?.runId ?? '') && !remoteIds.has(run.clientRunId))
      .map(run => ({
        id: run.clientRunId,
        startedAtMs: Date.parse(run.startedAt),
        km: run.distanceM / 1000,
        durationS: run.durationS,
        activity: run.activity,
        localId: run.clientRunId,
        pending: run.pending,
        // Une sortie encore locale n'a PAS d'allure serveur. On dérive la
        // sienne de ses deux mesures — c'est la même arithmétique que le
        // serveur applique (`durationS × 1000 / distanceM`), et l'écran de
        // Résultat l'affiche déjà ainsi pour cette même sortie.
        paceSPerKm:
          run.distanceM > 0 && run.durationS > 0
            ? Math.max(1, Math.round((run.durationS * 1000) / run.distanceM))
            : null,
        terrainM2: null,
        traceSegments: run.traceSegments,
        // Une sortie encore LOCALE n'a aucun verdict serveur — mais elle porte
        // déjà la réponse du joueur dans son payload. La lire ici évite qu'un
        // badge apparaisse seulement après la synchro, c'est-à-dire que l'écran
        // change d'avis sur une sortie sans que rien n'ait changé.
        sportOnlyReason: run.uploadPayload?.disciplineMismatchKept === true
          ? 'discipline_mismatch_kept'
          : null,
      }));
    return [...remoteEntries, ...localEntries].sort((a, b) => b.startedAtMs - a.startedAtMs);
  }, [history.runs, local.activities, activity]);
  const status = runs.length > 0 ? 'ready' : local.loading ? 'loading' : local.failed && history.status !== 'ready' ? 'failed' : history.status;
  return { runs, status, historyStatus: history.status, localFailed: local.failed, reload: history.reload };
}
